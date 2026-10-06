import { list, put } from "@vercel/blob";
import fs from "fs";
import path from "path";

export const HTML_LIBRARY_PREFIX = "html-library/";
export const MAX_UPLOAD_SIZE_BYTES = 4 * 1024 * 1024;
export const LOCAL_STORAGE_DIR = path.join(process.cwd(), "public", "html-library");
export const VAULT_META_TAGS_PATH = "_vault_meta/tags.json";
export const VAULT_META_DATES_PATH = "_vault_meta/dates.json";

export type HtmlLibraryItem = {
  filename: string;
  pathname: string;
  uploadedAt: string;
  url: string;
  size?: number;
  tags?: string[];
};

export function sanitizeFilename(filename: string): string {
  const trimmed = filename.trim();
  const isMd = trimmed.toLowerCase().endsWith(".md");
  const withoutExtension = trimmed.replace(/\.(html?|md)$/i, "");
  // Support Unicode letters and numbers (including Persian/Arabic, etc.)
  const slug = withoutExtension
    .replace(/[^\p{L}\p{N}\s\-_]/gu, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);

  return `${slug || "document"}.${isMd ? "md" : "html"}`;
}

export function isHtmlFile(file: File): boolean {
  const nameLower = file.name.toLowerCase();
  const htmlType = file.type.toLowerCase();
  return (
    nameLower.endsWith(".html") ||
    nameLower.endsWith(".htm") ||
    nameLower.endsWith(".md") ||
    htmlType === "text/html" ||
    htmlType === "text/markdown" ||
    htmlType === "text/x-markdown" ||
    htmlType === "application/xhtml+xml"
  );
}

export function buildBlobPath(filename: string): {
  pathname: string;
  uploadedAt: string;
} {
  const uploadedAt = new Date().toISOString();
  return {
    pathname: `${HTML_LIBRARY_PREFIX}${sanitizeFilename(filename)}`,
    uploadedAt,
  };
}

export function filenameFromPathname(pathname: string): string {
  // 1. Remove prefix
  let name = pathname.startsWith(HTML_LIBRARY_PREFIX)
    ? pathname.slice(HTML_LIBRARY_PREFIX.length)
    : pathname;

  // 2. Remove any date prefix if it exists
  name = name.replace(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}(?:-\d{2})?(?:-\d{3}Z)?-/, "");
  name = name.replace(/^\d{8}-/, "");
  name = name.replace(/^\d{4}-\d{2}-\d{2}-/, "");
  name = name.replace(/^\d{4}-\d{2}-/, "");

  // 3. Remove Vercel random suffix (e.g., -lXdk1Z8q6puT1IW5xm8YfFU6HVmdzr)
  name = name.replace(/-[a-zA-Z0-9]{20,30}(\.[a-z]+)?$/, (match, ext) => ext || "");

  const isMarkdown = name.toLowerCase().endsWith(".md");

  if (!isMarkdown) {
    name = name.replace(/\.(html?)$/i, "");
  }

  if (isMarkdown) {
    const base = name.slice(0, -3);
    const readableBase = base
      .split(/[-_]/)
      .filter(Boolean)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
    return `${readableBase || "Untitled"}.md`;
  }

  return name
    .split(/[-_]/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ") || "Untitled Document";
}

export async function loadTagsMap(): Promise<Record<string, string[]>> {
  // 1. If Vercel Blob token is configured, try loading from blob
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { blobs } = await list({ prefix: "_vault_meta/", limit: 10 });
      const metaBlob = blobs.find((b) => b.pathname === VAULT_META_TAGS_PATH);
      if (metaBlob) {
        const res = await fetch(metaBlob.url, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          return (data && typeof data === "object" && data.tags) ? data.tags : data;
        }
      }
    } catch (e) {
      console.warn("Could not load tags from Vercel Blob storage:", e);
    }
  }

  // 2. Fallback to local filesystem
  const tagsFilePath = path.join(process.cwd(), "data", "tags.json");
  if (fs.existsSync(tagsFilePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(tagsFilePath, "utf-8"));
      return (data && typeof data === "object" && data.tags) ? data.tags : data;
    } catch (e) {
      return {};
    }
  }

  return {};
}

export async function saveTagsMap(tagsMap: Record<string, string[]>): Promise<void> {
  // 1. If Vercel Blob token is configured, save to blob
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      await put(VAULT_META_TAGS_PATH, JSON.stringify(tagsMap, null, 2), {
        access: "public",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: "application/json",
      });
      return;
    } catch (e) {
      console.error("Failed to save tags to Vercel Blob storage:", e);
    }
  }

  // 2. Fallback to local filesystem
  try {
    const dataDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const tagsFilePath = path.join(dataDir, "tags.json");
    fs.writeFileSync(tagsFilePath, JSON.stringify(tagsMap, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to save tags to local disk:", e);
  }
}

export type VaultComment = {
  id: string;
  text: string;
  createdAt: string;
};

export const VAULT_META_COMMENTS_PATH = "_vault_meta/comments.json";

export async function loadCommentsMap(): Promise<Record<string, VaultComment[]>> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { blobs } = await list({ prefix: "_vault_meta/", limit: 10 });
      const metaBlob = blobs.find((b) => b.pathname === VAULT_META_COMMENTS_PATH);
      if (metaBlob) {
        const res = await fetch(metaBlob.url, { cache: "no-store" });
        if (res.ok) {
          return await res.json();
        }
      }
    } catch (e) {
      console.warn("Could not load comments from Vercel Blob:", e);
    }
  }

  const commentsFilePath = path.join(process.cwd(), "data", "comments.json");
  if (fs.existsSync(commentsFilePath)) {
    try {
      return JSON.parse(fs.readFileSync(commentsFilePath, "utf-8"));
    } catch (e) {
      return {};
    }
  }

  return {};
}

export async function saveCommentsMap(commentsMap: Record<string, VaultComment[]>): Promise<void> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      await put(VAULT_META_COMMENTS_PATH, JSON.stringify(commentsMap, null, 2), {
        access: "public",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: "application/json",
      });
      return;
    } catch (e) {
      console.error("Failed to save comments to Vercel Blob:", e);
    }
  }

  try {
    const dataDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const commentsFilePath = path.join(dataDir, "comments.json");
    fs.writeFileSync(commentsFilePath, JSON.stringify(commentsMap, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to save comments to disk:", e);
  }
}

export async function loadDatesMap(): Promise<Record<string, string>> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { blobs } = await list({ prefix: "_vault_meta/", limit: 10 });
      const metaBlob = blobs.find((b) => b.pathname === VAULT_META_DATES_PATH);
      if (metaBlob) {
        const res = await fetch(metaBlob.url, { cache: "no-store" });
        if (res.ok) {
          return await res.json();
        }
      }
    } catch (e) {
      console.warn("Could not load dates from Vercel Blob storage:", e);
    }
  }

  const datesFilePath = path.join(process.cwd(), "data", "dates.json");
  if (fs.existsSync(datesFilePath)) {
    try {
      return JSON.parse(fs.readFileSync(datesFilePath, "utf-8"));
    } catch (e) {
      return {};
    }
  }

  return {};
}

export async function saveDatesMap(datesMap: Record<string, string>): Promise<void> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      await put(VAULT_META_DATES_PATH, JSON.stringify(datesMap, null, 2), {
        access: "public",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: "application/json",
      });
      return;
    } catch (e) {
      console.error("Failed to save dates to Vercel Blob storage:", e);
    }
  }

  try {
    const dataDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const datesFilePath = path.join(dataDir, "dates.json");
    fs.writeFileSync(datesFilePath, JSON.stringify(datesMap, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to save dates to disk:", e);
  }
}

export async function listHtmlFiles(): Promise<HtmlLibraryItem[]> {
  // If no token is provided, fall back to local filesystem
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    const tagsMap = await loadTagsMap();
    const datesMap = await loadDatesMap();
    if (!fs.existsSync(LOCAL_STORAGE_DIR)) {
      return [];
    }

    const files = fs.readdirSync(LOCAL_STORAGE_DIR);
    return files
      .filter((file) => file.endsWith(".html") || file.endsWith(".htm") || file.endsWith(".md"))
      .map((file) => {
        const stats = fs.statSync(path.join(LOCAL_STORAGE_DIR, file));
        const pathname = `${HTML_LIBRARY_PREFIX}${file}`;
        return {
          filename: filenameFromPathname(pathname),
          pathname: pathname,
          uploadedAt: datesMap[pathname] || stats.mtime.toISOString(),
          url: `/${pathname}`,
          size: stats.size,
          tags: tagsMap[pathname] || [],
        };
      })
      .sort(
        (left, right) =>
          new Date(right.uploadedAt).getTime() - new Date(left.uploadedAt).getTime(),
      );
  }

  const blobs: Awaited<ReturnType<typeof list>>["blobs"] = [];
  let cursor: string | undefined;
  let hasMore = true;

  while (hasMore) {
    const page = await list({
      cursor,
      limit: 1000,
    });

    blobs.push(...page.blobs);
    cursor = page.cursor;
    hasMore = page.hasMore;
  }

  // Load tags mapping
  let tagsMap: Record<string, string[]> = {};
  const tagsBlob = blobs.find((b) => b.pathname === VAULT_META_TAGS_PATH);
  if (tagsBlob) {
    try {
      const res = await fetch(tagsBlob.url, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        tagsMap = (data && typeof data === "object" && data.tags) ? data.tags : data;
      }
    } catch (e) {
      console.warn("Failed fetching tags from blob:", e);
    }
  } else {
    tagsMap = await loadTagsMap();
  }

  // Load dates mapping
  let datesMap: Record<string, string> = {};
  const datesBlob = blobs.find((b) => b.pathname === VAULT_META_DATES_PATH);
  if (datesBlob) {
    try {
      const res = await fetch(datesBlob.url, { cache: "no-store" });
      if (res.ok) {
        datesMap = await res.json();
      }
    } catch (e) {
      console.warn("Failed fetching dates from blob:", e);
    }
  } else {
    datesMap = await loadDatesMap();
  }

  // Filter out metadata and internal files
  const documentBlobs = blobs.filter((b) => !b.pathname.startsWith("_vault_meta/") && !b.pathname.startsWith("_"));

  return documentBlobs
    .sort((left, right) => {
      const leftDate = datesMap[left.pathname] || left.uploadedAt.toISOString();
      const rightDate = datesMap[right.pathname] || right.uploadedAt.toISOString();
      return new Date(rightDate).getTime() - new Date(leftDate).getTime();
    })
    .map((blob) => ({
      filename: filenameFromPathname(blob.pathname),
      pathname: blob.pathname,
      uploadedAt: datesMap[blob.pathname] || blob.uploadedAt.toISOString(),
      url: blob.url,
      size: blob.size,
      tags: tagsMap[blob.pathname] || [],
    }));
}
