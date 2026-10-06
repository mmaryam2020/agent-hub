const items = [
  { filename: "Coaching Report May16", pathname: "html-library/2026-05-16T11-20-coaching-report-may16-O7MS5.html", uploadedAt: "2026-05-16T11:20:00.000Z", url: "https://example.com/file1" },
  { filename: "Coaching Report May16", pathname: "html-library/2026-05-16T11-25-coaching-report-may16-9L2xS.html", uploadedAt: "2026-05-16T11:25:00.000Z", url: "https://example.com/file2" }, // Absolute latest Coaching Report
  { filename: "Coaching Report May16", pathname: "html-library/2026-05-16T11-15-coaching-report-may16-1A2bC.html", uploadedAt: "2026-05-16T11:15:00.000Z", url: "https://example.com/file3" },
  { filename: "LLM Wiki May16", pathname: "html-library/llm-wiki-may16-6lfaKQ61KY.html", uploadedAt: "2026-05-16T10:00:00.000Z", url: "https://example.com/wiki1" },
  { filename: "LLM Wiki May16", pathname: "html-library/llm-wiki-may16-as8f7a.html", uploadedAt: "2026-05-16T10:05:00.000Z", url: "https://example.com/wiki2" } // Absolute latest Wiki
];

function groupLibraryItems(items) {
  const groupsMap = new Map();
  for (const item of items) {
    const list = groupsMap.get(item.filename) || [];
    list.push(item);
    groupsMap.set(item.filename, list);
  }
  const grouped = [];
  for (const [filename, versionItems] of groupsMap.entries()) {
    const sortedVersions = [...versionItems].sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );
    grouped.push({
      filename,
      latestItem: sortedVersions[0],
      versions: sortedVersions,
    });
  }
  return grouped.sort(
    (a, b) => new Date(b.latestItem.uploadedAt).getTime() - new Date(a.latestItem.uploadedAt).getTime()
  );
}

const result = groupLibraryItems(items);
console.log("==============================================");
console.log("EXECUTION SUCCESS: Mathematical Grouping Test");
console.log("==============================================");
console.log("Grouped Unique Documents count:", result.length);
console.log("\n1st Document (Should be Coaching Report since its latest version is 11:25):");
console.log("  Filename:", result[0].filename);
console.log("  Latest Version URL:", result[0].latestItem.url);
console.log("  Total versions bundled:", result[0].versions.length);
console.log("  Timeline (newest first):", result[0].versions.map(v => v.uploadedAt).join(" -> "));

console.log("\n2nd Document (Should be LLM Wiki since its latest version is 10:05):");
console.log("  Filename:", result[1].filename);
console.log("  Latest Version URL:", result[1].latestItem.url);
console.log("  Total versions bundled:", result[1].versions.length);
console.log("  Timeline (newest first):", result[1].versions.map(v => v.uploadedAt).join(" -> "));
