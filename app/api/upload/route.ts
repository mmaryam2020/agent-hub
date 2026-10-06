import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import {
  MAX_UPLOAD_SIZE_BYTES,
  buildBlobPath,
  isHtmlFile,
  LOCAL_STORAGE_DIR,
  loadDatesMap,
  saveDatesMap,
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
    const formData = await request.formData();
    const secret = formData.get("secret");
    const fileEntry = formData.get("file");

    const cookieHeader = request.headers.get("cookie") || "";
    const isSessionAuth = cookieHeader.includes("vault_auth=true");

    if (!isSessionAuth && (typeof secret !== "string" || secret !== configuredSecret)) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (!(fileEntry instanceof File)) {
      return NextResponse.json({ error: "A file is required." }, { status: 400 });
    }

    if (fileEntry.size === 0) {
      return NextResponse.json({ error: "The uploaded file is empty." }, { status: 400 });
    }

    if (fileEntry.size > MAX_UPLOAD_SIZE_BYTES) {
      return NextResponse.json(
        {
          error:
            "File is too large. Keep uploads under 4 MB to stay below the Vercel Function request limit.",
        },
        { status: 400 },
      );
    }

    if (!isHtmlFile(fileEntry)) {
      return NextResponse.json(
        { error: "Only .html, .htm, or .md files are accepted." },
        { status: 400 },
      );
    }

    const { pathname, uploadedAt } = buildBlobPath(fileEntry.name);

    // If no token is provided, fall back to local filesystem
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      if (!fs.existsSync(LOCAL_STORAGE_DIR)) {
        fs.mkdirSync(LOCAL_STORAGE_DIR, { recursive: true });
      }

      let fileName = path.basename(pathname);
      let filePath = path.join(LOCAL_STORAGE_DIR, fileName);

      // Avoid collision locally if needed
      if (fs.existsSync(filePath)) {
        const ext = path.extname(fileName);
        const base = path.basename(fileName, ext);
        const rand = Math.random().toString(36).substring(2, 8);
        fileName = `${base}-${rand}${ext}`;
        filePath = path.join(LOCAL_STORAGE_DIR, fileName);
      }

      const buffer = Buffer.from(await fileEntry.arrayBuffer());
      fs.writeFileSync(filePath, buffer);

      const localPathname = `html-library/${fileName}`;
      const datesMap = await loadDatesMap();
      datesMap[localPathname] = uploadedAt;
      await saveDatesMap(datesMap);

      return NextResponse.json({
        filename: fileEntry.name,
        pathname: localPathname,
        uploadedAt,
        url: `/${localPathname}`,
      });
    }

    const blob = await put(pathname, fileEntry, {
      access: "public",
      addRandomSuffix: true,
      contentType: pathname.endsWith(".md") ? "text/markdown; charset=utf-8" : "text/html; charset=utf-8",
    });

    const datesMap = await loadDatesMap();
    datesMap[blob.pathname] = uploadedAt;
    await saveDatesMap(datesMap);

    return NextResponse.json({
      filename: fileEntry.name,
      pathname: blob.pathname,
      uploadedAt,
      url: blob.url,
    });
  } catch (error) {
    console.error("Upload failed", error);
    return NextResponse.json(
      { error: "Failed to upload the HTML file." },
      { status: 500 },
    );
  }
}

