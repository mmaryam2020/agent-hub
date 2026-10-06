import { list, copy, del, put } from "@vercel/blob";

const VAULT_META_DATES_PATH = "_vault_meta/dates.json";
const VAULT_META_TAGS_PATH = "_vault_meta/tags.json";
const VAULT_META_COMMENTS_PATH = "_vault_meta/comments.json";

export function planRename(pathname, uploadedAtIso) {
  let newPath = null;
  let extractedDate = null;

  // 1. html-library/YYYY-MM-DDTHH-mm-ss-SSSZ-...
  const isoMatch = pathname.match(/^html-library\/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z-)(.+)$/);
  if (isoMatch) {
    const rawIso = isoMatch[1].slice(0, -1); // remove trailing '-'
    // Convert 2026-05-17T22-31-42-962Z to 2026-05-17T22:31:42.962Z
    const fixedIso = rawIso.replace(/T(\d{2})-(\d{2})-(\d{2})-(\d{3}Z)/, 'T$1:$2:$3.$4');
    extractedDate = fixedIso;
    newPath = 'html-library/' + isoMatch[2];
    return { original: pathname, newPath, extractedDate, category: 'html-library-iso' };
  }

  // 2. 2026-05 and 2026-06 good moments files
  if (pathname === '2026-05-ijr4jIsIaVQUzxu4rksbAtOBSTEOKH.md') {
    return {
      original: pathname,
      newPath: 'good-moments-may-2026-ijr4jIsIaVQUzxu4rksbAtOBSTEOKH.md',
      extractedDate: uploadedAtIso || '2026-05-01T00:00:00.000Z',
      category: 'good-moments-may',
    };
  }
  if (pathname.startsWith('2026-06-')) {
    const suffix = pathname.slice('2026-06-'.length);
    const isFa = pathname.includes('6WnO') || pathname.includes('wnPF');
    return {
      original: pathname,
      newPath: isFa ? `good-moments-june-2026-fa-${suffix}` : `good-moments-june-2026-${suffix}`,
      extractedDate: uploadedAtIso || '2026-06-01T00:00:00.000Z',
      category: 'good-moments-june',
    };
  }

  // 3. 2026-07-july-review...
  if (pathname.startsWith('2026-07-july-review')) {
    return {
      original: pathname,
      newPath: pathname.slice('2026-07-'.length),
      extractedDate: uploadedAtIso || '2026-07-01T00:00:00.000Z',
      category: 'july-review',
    };
  }

  // 4. Root files: YYYYMMDD-... (e.g. 20260928-smart-agents-...)
  const ymdMatch = pathname.match(/^(\d{8}-)(.+)$/);
  if (ymdMatch) {
    const ymd = ymdMatch[1].slice(0, 8);
    const y = ymd.slice(0, 4);
    const m = ymd.slice(4, 6);
    const d = ymd.slice(6, 8);
    // Prefer original uploadedAt if it matches the same day, otherwise use YYYY-MM-DDT12:00:00.000Z
    const parsedDate = uploadedAtIso || `${y}-${m}-${d}T12:00:00.000Z`;
    return {
      original: pathname,
      newPath: ymdMatch[2],
      extractedDate: parsedDate,
      category: 'root-ymd',
    };
  }

  // 5. Root files: YYYY-MM-DD-...
  const ymdHyphenMatch = pathname.match(/^(\d{4}-\d{2}-\d{2}-)(.+)$/);
  if (ymdHyphenMatch) {
    return {
      original: pathname,
      newPath: ymdHyphenMatch[2],
      extractedDate: uploadedAtIso || `${ymdHyphenMatch[1].slice(0, 10)}T12:00:00.000Z`,
      category: 'root-ymd-hyphen',
    };
  }

  return null;
}

export async function runMigration({ execute = false } = {}) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not set.");
  }

  console.log(`Starting blob migration (Mode: ${execute ? "LIVE EXECUTE" : "DRY RUN"})...`);

  // 1. Fetch all blobs
  const blobs = [];
  let cursor;
  let hasMore = true;
  while (hasMore) {
    const page = await list({ cursor, limit: 1000, token });
    blobs.push(...page.blobs);
    cursor = page.cursor;
    hasMore = page.hasMore;
  }
  console.log(`Total blobs retrieved from store: ${blobs.length}`);

  // 2. Fetch existing metadata
  let datesMap = {};
  let tagsMap = {};
  let commentsMap = {};

  const datesBlob = blobs.find((b) => b.pathname === VAULT_META_DATES_PATH);
  if (datesBlob) {
    try {
      const res = await fetch(datesBlob.url, { cache: "no-store" });
      if (res.ok) datesMap = await res.json();
    } catch (e) {
      console.warn("Could not fetch existing dates.json", e);
    }
  }

  const tagsBlob = blobs.find((b) => b.pathname === VAULT_META_TAGS_PATH);
  if (tagsBlob) {
    try {
      const res = await fetch(tagsBlob.url, { cache: "no-store" });
      if (res.ok) {
        const d = await res.json();
        tagsMap = d && typeof d === "object" && d.tags ? d.tags : d;
      }
    } catch (e) {
      console.warn("Could not fetch existing tags.json", e);
    }
  }

  const commentsBlob = blobs.find((b) => b.pathname === VAULT_META_COMMENTS_PATH);
  if (commentsBlob) {
    try {
      const res = await fetch(commentsBlob.url, { cache: "no-store" });
      if (res.ok) commentsMap = await res.json();
    } catch (e) {
      console.warn("Could not fetch existing comments.json", e);
    }
  }

  // 3. Plan renames
  const plan = [];
  const existingPathnames = new Set(blobs.map((b) => b.pathname));

  for (const b of blobs) {
    if (b.pathname.startsWith("_vault_meta/")) continue;
    const rename = planRename(b.pathname, b.uploadedAt ? b.uploadedAt.toISOString() : null);
    if (rename) {
      plan.push({
        ...rename,
        url: b.url,
        currentUploadedAt: b.uploadedAt ? b.uploadedAt.toISOString() : null,
      });
    }
  }

  console.log(`\nFound ${plan.length} files with date prefixes that will be modified.`);

  // 4. Validate collision safety
  const targetMap = new Map();
  const errors = [];
  for (const item of plan) {
    if (targetMap.has(item.newPath)) {
      errors.push(`Duplicate target detected: "${item.newPath}" planned for both "${item.original}" and "${targetMap.get(item.newPath)}"`);
    }
    targetMap.set(item.newPath, item.original);

    // If newPath exists in store and is not one of the files being renamed
    if (existingPathnames.has(item.newPath) && !plan.some((p) => p.original === item.newPath)) {
      errors.push(`Target pathname "${item.newPath}" already exists in blob storage!`);
    }
  }

  if (errors.length > 0) {
    console.error("Collision validation failed:", errors);
    throw new Error("Aborting due to pathname conflicts.");
  }

  console.log("Collision validation passed: 0 conflicts detected.");

  // Print sample plan
  console.log("\nSample Planned Modifications:");
  for (const item of plan.slice(0, 10)) {
    console.log(`  [${item.category}] ${item.original}\n    -> ${item.newPath} (Date: ${item.extractedDate})`);
  }
  if (plan.length > 10) {
    console.log(`  ... and ${plan.length - 10} more files.`);
  }

  if (!execute) {
    console.log("\n[DRY RUN COMPLETE] No remote blob storage changes were made.");
    console.log("Run with --execute to perform the migration.");
    return { plannedCount: plan.length, plan };
  }

  // 5. LIVE EXECUTION
  console.log(`\nExecuting live migration of ${plan.length} blobs in batches...`);
  const batchSize = 5;
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < plan.length; i += batchSize) {
    const batch = plan.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (item) => {
        try {
          // 1. Copy blob to new clean pathname
          const newBlob = await copy(item.url, item.newPath, {
            access: "public",
            token,
          });

          // 2. Delete old blob
          await del(item.url, { token });

          // 3. Save date metadata (preserve the extracted/original date)
          datesMap[item.newPath] = item.extractedDate || item.currentUploadedAt;

          // 4. Migrate tags and comments if any exist for original
          if (tagsMap[item.original]) {
            tagsMap[item.newPath] = tagsMap[item.original];
            delete tagsMap[item.original];
          }
          if (commentsMap[item.original]) {
            commentsMap[item.newPath] = commentsMap[item.original];
            delete commentsMap[item.original];
          }

          successCount++;
          console.log(`[${successCount}/${plan.length}] Renamed: ${item.original} -> ${item.newPath}`);
        } catch (err) {
          failCount++;
          console.error(`FAILED to rename ${item.original} -> ${item.newPath}:`, err);
        }
      })
    );
  }

  console.log(`\nBlob copy & delete complete. Success: ${successCount}, Failed: ${failCount}`);

  // 6. Save updated metadata maps to blob
  console.log("Saving updated metadata maps (_vault_meta/dates.json, tags.json, comments.json)...");
  await put(VAULT_META_DATES_PATH, JSON.stringify(datesMap, null, 2), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    token,
  });

  if (Object.keys(tagsMap).length > 0) {
    await put(VAULT_META_TAGS_PATH, JSON.stringify(tagsMap, null, 2), {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
      token,
    });
  }

  if (Object.keys(commentsMap).length > 0) {
    await put(VAULT_META_COMMENTS_PATH, JSON.stringify(commentsMap, null, 2), {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
      token,
    });
  }

  console.log("All metadata successfully persisted to Vercel Blob storage!");
  return { successCount, failCount };
}

// Auto-run when executed directly via node
if (process.argv[1] && process.argv[1].endsWith("migrate-blob-names.mjs")) {
  const isExecute = process.argv.includes("--execute");
  runMigration({ execute: isExecute }).catch((err) => {
    console.error("Migration fatal error:", err);
    process.exit(1);
  });
}
