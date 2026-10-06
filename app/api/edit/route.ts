import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import {
  LOCAL_STORAGE_DIR,
  HTML_LIBRARY_PREFIX,
  buildBlobPath,
  filenameFromPathname,
  loadTagsMap,
  saveTagsMap,
  loadDatesMap,
  saveDatesMap,
} from "@/lib/html-library";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const cookieHeader = request.headers.get("cookie") || "";
    const isSessionAuth = cookieHeader.includes("vault_auth=true");

    if (!isSessionAuth) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const pathname = searchParams.get("pathname");
    const url = searchParams.get("url");

    if (!pathname && !url) {
      return NextResponse.json(
        { error: "pathname or url is required." },
        { status: 400 },
      );
    }

    let content = "";
    const isMarkdown = (pathname || "").toLowerCase().endsWith(".md") || (url || "").toLowerCase().endsWith(".md");

    // Local filesystem read fallback
    if (!process.env.BLOB_READ_WRITE_TOKEN && pathname) {
      const filename = pathname.startsWith(HTML_LIBRARY_PREFIX)
        ? pathname.slice(HTML_LIBRARY_PREFIX.length)
        : pathname;
      const filePath = path.join(LOCAL_STORAGE_DIR, filename);

      if (!fs.existsSync(filePath)) {
        return NextResponse.json({ error: "File not found on disk." }, { status: 404 });
      }

      content = fs.readFileSync(filePath, "utf-8");
    } else if (url) {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        return NextResponse.json(
          { error: `Failed to fetch blob content: ${res.statusText}` },
          { status: res.status },
        );
      }
      content = await res.text();
    } else {
      return NextResponse.json({ error: "Unable to retrieve document content." }, { status: 400 });
    }

    const tagsMap = await loadTagsMap();
    const currentTags = pathname ? (tagsMap[pathname] || []) : [];

    return NextResponse.json({
      content,
      pathname: pathname || "",
      url: url || "",
      filename: pathname ? filenameFromPathname(pathname) : "Document",
      isMarkdown,
      tags: currentTags,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to load document content.";
    console.error("Edit GET failed", error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieHeader = request.headers.get("cookie") || "";
    const isSessionAuth = cookieHeader.includes("vault_auth=true");

    if (!isSessionAuth) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const {
      pathname,
      url,
      filename,
      content,
      saveMode = "new_version",
      tags,
    } = await request.json();

    if (!pathname && !filename) {
      return NextResponse.json(
        { error: "pathname or filename is required." },
        { status: 400 },
      );
    }

    if (typeof content !== "string") {
      return NextResponse.json(
        { error: "content must be a string." },
        { status: 400 },
      );
    }

    const cleanFilename = filename || (pathname ? filenameFromPathname(pathname) : "document.html");
    const isMd = cleanFilename.toLowerCase().endsWith(".md") || (pathname || "").toLowerCase().endsWith(".md");
    const contentType = isMd ? "text/markdown; charset=utf-8" : "text/html; charset=utf-8";

    // MODE 1: Save as New Version
    if (saveMode === "new_version") {
      const { pathname: newPathname, uploadedAt } = buildBlobPath(cleanFilename);

      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        if (!fs.existsSync(LOCAL_STORAGE_DIR)) {
          fs.mkdirSync(LOCAL_STORAGE_DIR, { recursive: true });
        }
        let diskName = path.basename(newPathname);
        let filePath = path.join(LOCAL_STORAGE_DIR, diskName);
        if (fs.existsSync(filePath)) {
          const ext = path.extname(diskName);
          const base = path.basename(diskName, ext);
          const rand = Math.random().toString(36).substring(2, 8);
          diskName = `${base}-${rand}${ext}`;
          filePath = path.join(LOCAL_STORAGE_DIR, diskName);
        }
        fs.writeFileSync(filePath, content, "utf-8");

        const localPathname = `html-library/${diskName}`;
        const tagsMap = await loadTagsMap();
        const inheritedTags = Array.isArray(tags) ? tags : (pathname ? (tagsMap[pathname] || []) : []);
        if (inheritedTags.length > 0) {
          tagsMap[localPathname] = inheritedTags;
          await saveTagsMap(tagsMap);
        }

        const datesMap = await loadDatesMap();
        datesMap[localPathname] = uploadedAt;
        await saveDatesMap(datesMap);

        return NextResponse.json({
          success: true,
          saveMode: "new_version",
          item: {
            filename: filenameFromPathname(localPathname),
            pathname: localPathname,
            uploadedAt,
            url: `/${localPathname}`,
            tags: inheritedTags,
          },
        });
      }

      // Vercel Blob new version
      const blob = await put(newPathname, content, {
        access: "public",
        addRandomSuffix: true,
        contentType,
      });

      const tagsMap = await loadTagsMap();
      const inheritedTags = Array.isArray(tags) ? tags : (pathname ? (tagsMap[pathname] || []) : []);
      if (inheritedTags.length > 0) {
        tagsMap[blob.pathname] = inheritedTags;
        await saveTagsMap(tagsMap);
      }

      const datesMap = await loadDatesMap();
      datesMap[blob.pathname] = uploadedAt;
      await saveDatesMap(datesMap);

      return NextResponse.json({
        success: true,
        saveMode: "new_version",
        item: {
          filename: filenameFromPathname(blob.pathname),
          pathname: blob.pathname,
          uploadedAt,
          url: blob.url,
          tags: inheritedTags,
        },
      });
    }

    // MODE 2: Overwrite Current Version
    if (!pathname) {
      return NextResponse.json({ error: "pathname is required to overwrite." }, { status: 400 });
    }

    const uploadedAt = new Date().toISOString();

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      const filenamePart = pathname.startsWith(HTML_LIBRARY_PREFIX)
        ? pathname.slice(HTML_LIBRARY_PREFIX.length)
        : pathname;
      const filePath = path.join(LOCAL_STORAGE_DIR, filenamePart);
      fs.writeFileSync(filePath, content, "utf-8");

      if (Array.isArray(tags)) {
        const tagsMap = await loadTagsMap();
        tagsMap[pathname] = tags;
        await saveTagsMap(tagsMap);
      }

      const datesMap = await loadDatesMap();
      datesMap[pathname] = uploadedAt;
      await saveDatesMap(datesMap);

      return NextResponse.json({
        success: true,
        saveMode: "overwrite",
        item: {
          filename: filenameFromPathname(pathname),
          pathname,
          uploadedAt,
          url: `/${pathname}`,
          tags: tags || [],
        },
      });
    }

    // Vercel Blob overwrite
    const blob = await put(pathname, content, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType,
    });

    if (Array.isArray(tags)) {
      const tagsMap = await loadTagsMap();
      tagsMap[blob.pathname] = tags;
      await saveTagsMap(tagsMap);
    }

    const datesMap = await loadDatesMap();
    datesMap[blob.pathname] = uploadedAt;
    await saveDatesMap(datesMap);

    return NextResponse.json({
      success: true,
      saveMode: "overwrite",
      item: {
        filename: filenameFromPathname(blob.pathname),
        pathname: blob.pathname,
        uploadedAt,
        url: blob.url,
        tags: tags || [],
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to save document.";
    console.error("Edit POST failed", error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
