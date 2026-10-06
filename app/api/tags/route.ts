import { NextResponse } from "next/server";
import { loadTagsMap, saveTagsMap } from "@/lib/html-library";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const cookieHeader = request.headers.get("cookie") || "";
    const isSessionAuth = cookieHeader.includes("vault_auth=true");

    if (!isSessionAuth) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const tagsMap = await loadTagsMap();
    const tagCounts: Record<string, number> = {};
    for (const tags of Object.values(tagsMap)) {
      if (Array.isArray(tags)) {
        for (const tag of tags) {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        }
      }
    }

    return NextResponse.json({ tagsMap, tagCounts });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to get tags.";
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

    const body = await request.json();
    const tagsMap = await loadTagsMap();

    // Batch mode: { pathnames: string[], addTags?: string[], removeTags?: string[] }
    if (Array.isArray(body.pathnames)) {
      const { pathnames, addTags = [], removeTags = [] } = body;
      const cleanAdd = addTags.map((t: string) => String(t).trim()).filter(Boolean);
      const cleanRemove = new Set(removeTags.map((t: string) => String(t).trim()));

      for (const p of pathnames) {
        let current = tagsMap[p] || [];
        if (cleanRemove.size > 0) {
          current = current.filter((t) => !cleanRemove.has(t));
        }
        if (cleanAdd.length > 0) {
          current = Array.from(new Set([...current, ...cleanAdd]));
        }
        if (current.length === 0) {
          delete tagsMap[p];
        } else {
          tagsMap[p] = current;
        }
      }

      await saveTagsMap(tagsMap);
      return NextResponse.json({ success: true, updatedCount: pathnames.length });
    }

    // Single item mode: { pathname: string, tags: string[] }
    const { pathname, tags } = body;

    if (!pathname || !Array.isArray(tags)) {
      return NextResponse.json(
        { error: "pathname and tags array (or pathnames array) are required." },
        { status: 400 },
      );
    }

    // Clean and validate tags (remove duplicates/empty)
    const cleanTags = Array.from(new Set(tags.map(t => String(t).trim()).filter(Boolean)));

    if (cleanTags.length === 0) {
      delete tagsMap[pathname];
    } else {
      tagsMap[pathname] = cleanTags;
    }

    await saveTagsMap(tagsMap);

    return NextResponse.json({ success: true, tags: cleanTags });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to update tags.";
    console.error("Tags update failed", error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 },
    );
  }
}
