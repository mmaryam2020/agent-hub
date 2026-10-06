import { copy, del } from "@vercel/blob";
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import {
  LOCAL_STORAGE_DIR,
  HTML_LIBRARY_PREFIX,
  sanitizeFilename,
  loadTagsMap,
  saveTagsMap,
  loadDatesMap,
  saveDatesMap,
  loadCommentsMap,
  saveCommentsMap,
} from "@/lib/html-library";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const configuredSecret = process.env.UPLOAD_SECRET;
  if (!configuredSecret) {
    return NextResponse.json(
      { error: "UPLOAD_SECRET is not configured on the server." },
      { status: 500 },
    );
  }

  try {
    const cookieHeader = request.headers.get("cookie") || "";
    const isSessionAuth = cookieHeader.includes("vault_auth=true");

    if (!isSessionAuth) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { url, pathname, newFilename } = await request.json();

    if (!pathname || !newFilename) {
      return NextResponse.json(
        { error: "pathname and newFilename are required." },
        { status: 400 },
      );
    }

    const hasPrefix = pathname.startsWith(HTML_LIBRARY_PREFIX);
    const filenamePart = hasPrefix
      ? pathname.slice(HTML_LIBRARY_PREFIX.length)
      : pathname;

    const sanitizedName = sanitizeFilename(newFilename);
    const prefix = hasPrefix ? HTML_LIBRARY_PREFIX : "";
    const newPathname = `${prefix}${sanitizedName}`;

    // Local filesystem rename fallback
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      const oldFilePath = path.join(LOCAL_STORAGE_DIR, filenamePart);
      const newFilePath = path.join(LOCAL_STORAGE_DIR, sanitizedName);

      // Security checks
      const resolvedOld = path.resolve(oldFilePath);
      const resolvedNew = path.resolve(newFilePath);
      const resolvedDir = path.resolve(LOCAL_STORAGE_DIR);

      if (!resolvedOld.startsWith(resolvedDir) || !resolvedNew.startsWith(resolvedDir)) {
        return NextResponse.json({ error: "Forbidden path." }, { status: 403 });
      }

      if (!fs.existsSync(oldFilePath)) {
        return NextResponse.json({ error: "Original file not found." }, { status: 404 });
      }

      fs.renameSync(oldFilePath, newFilePath);

      // Migrate tags if any
      const tagsMap = await loadTagsMap();
      if (tagsMap[pathname]) {
        tagsMap[newPathname] = tagsMap[pathname];
        delete tagsMap[pathname];
        await saveTagsMap(tagsMap);
      }

      // Migrate dates if any
      const datesMap = await loadDatesMap();
      if (datesMap[pathname]) {
        datesMap[newPathname] = datesMap[pathname];
        delete datesMap[pathname];
        await saveDatesMap(datesMap);
      }

      // Migrate comments if any
      const commentsMap = await loadCommentsMap();
      if (commentsMap[pathname]) {
        commentsMap[newPathname] = commentsMap[pathname];
        delete commentsMap[pathname];
        await saveCommentsMap(commentsMap);
      }

      return NextResponse.json({
        success: true,
        pathname: newPathname,
        url: `/${newPathname}`,
      });
    }

    // Vercel Blob rename (copy + delete)
    if (!url) {
      return NextResponse.json(
        { error: "URL is required for blob renaming." },
        { status: 400 },
      );
    }

    // 1. Copy blob to the new pathname
    const newBlob = await copy(url, newPathname, {
      access: "public",
    });

    // 2. Delete original blob
    await del(url);

    // 3. Migrate tags if any
    const tagsMap = await loadTagsMap();
    if (tagsMap[pathname]) {
      tagsMap[newBlob.pathname] = tagsMap[pathname];
      delete tagsMap[pathname];
      await saveTagsMap(tagsMap);
    }

    // 4. Migrate dates if any
    const datesMap = await loadDatesMap();
    if (datesMap[pathname]) {
      datesMap[newBlob.pathname] = datesMap[pathname];
      delete datesMap[pathname];
      await saveDatesMap(datesMap);
    }

    // 5. Migrate comments if any
    const commentsMap = await loadCommentsMap();
    if (commentsMap[pathname]) {
      commentsMap[newBlob.pathname] = commentsMap[pathname];
      delete commentsMap[pathname];
      await saveCommentsMap(commentsMap);
    }

    return NextResponse.json({
      success: true,
      pathname: newBlob.pathname,
      url: newBlob.url,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to rename file.";
    console.error("Rename failed", error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 },
    );
  }
}
