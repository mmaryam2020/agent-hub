import { del } from "@vercel/blob";
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import {
  LOCAL_STORAGE_DIR,
  HTML_LIBRARY_PREFIX,
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

    const { urls, pathnames } = await request.json();

    if (!Array.isArray(urls) || !Array.isArray(pathnames)) {
      return NextResponse.json(
        { error: "urls and pathnames must be arrays." },
        { status: 400 },
      );
    }

    // Clean up tags
    const tagsMap = await loadTagsMap();
    let tagsChanged = false;
    for (const p of pathnames) {
      if (tagsMap[p]) {
        delete tagsMap[p];
        tagsChanged = true;
      }
    }
    if (tagsChanged) {
      await saveTagsMap(tagsMap);
    }

    // Clean up dates
    const datesMap = await loadDatesMap();
    let datesChanged = false;
    for (const p of pathnames) {
      if (datesMap[p]) {
        delete datesMap[p];
        datesChanged = true;
      }
    }
    if (datesChanged) {
      await saveDatesMap(datesMap);
    }

    // Clean up comments
    const commentsMap = await loadCommentsMap();
    let commentsChanged = false;
    for (const p of pathnames) {
      if (commentsMap[p]) {
        delete commentsMap[p];
        commentsChanged = true;
      }
    }
    if (commentsChanged) {
      await saveCommentsMap(commentsMap);
    }

    // If no token is provided, fall back to local filesystem delete
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      for (const pathname of pathnames) {
        const filename = pathname.startsWith(HTML_LIBRARY_PREFIX)
          ? pathname.slice(HTML_LIBRARY_PREFIX.length)
          : pathname;
        const filePath = path.join(LOCAL_STORAGE_DIR, filename);
        
        // Security check: ensure the resolved path stays inside LOCAL_STORAGE_DIR
        const resolvedPath = path.resolve(filePath);
        if (!resolvedPath.startsWith(path.resolve(LOCAL_STORAGE_DIR))) {
          continue; // skip if trying to delete files outside the directory
        }

        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      return NextResponse.json({ success: true });
    }

    // Vercel Blob storage delete
    if (urls.length > 0) {
      await del(urls);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to delete files.";
    console.error("Delete failed", error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 },
    );
  }
}
