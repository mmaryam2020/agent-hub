// No imports needed for Request and Response as they are global in Edge runtime

export const runtime = "edge";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return new Response("Missing url parameter", { status: 400 });
  }

  try {
    const parsedUrl = new URL(url);
    
    // Simple security check: Ensure it's a Vercel Blob URL
    if (!parsedUrl.hostname.endsWith(".public.blob.vercel-storage.com")) {
      return new Response("Invalid URL. Only Vercel Blob URLs are allowed.", { status: 403 });
    }

    const response = await fetch(url, {
      // Avoid caching the proxy response itself if the underlying blob might change, 
      // but usually blobs are immutable or have their own cache headers.
      next: { revalidate: 3600 } 
    });

    if (!response.ok) {
      return new Response(`Failed to fetch blob: ${response.statusText}`, { status: response.status });
    }

    const content = await response.text();

    return new Response(content, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Blob proxy error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
