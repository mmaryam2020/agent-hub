import { NextResponse } from "next/server";
import { loadCommentsMap, saveCommentsMap, type VaultComment } from "@/lib/html-library";

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

    if (!pathname) {
      return NextResponse.json({ error: "pathname is required" }, { status: 400 });
    }

    const commentsMap = await loadCommentsMap();
    const comments = commentsMap[pathname] || [];

    return NextResponse.json({ comments });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to load comments.";
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

    const { pathname, text, action = "add", commentId } = await request.json();

    if (!pathname) {
      return NextResponse.json({ error: "pathname is required" }, { status: 400 });
    }

    const commentsMap = await loadCommentsMap();
    let current = commentsMap[pathname] || [];

    if (action === "delete") {
      if (!commentId) {
        return NextResponse.json({ error: "commentId is required to delete" }, { status: 400 });
      }
      current = current.filter((c) => c.id !== commentId);
    } else {
      // Add comment
      if (!text || !text.trim()) {
        return NextResponse.json({ error: "text is required" }, { status: 400 });
      }

      const newComment: VaultComment = {
        id: "c_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
        text: text.trim(),
        createdAt: new Date().toISOString(),
      };

      current = [newComment, ...current];
    }

    if (current.length === 0) {
      delete commentsMap[pathname];
    } else {
      commentsMap[pathname] = current;
    }

    await saveCommentsMap(commentsMap);

    return NextResponse.json({ success: true, comments: current });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to update comments.";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
