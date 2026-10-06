"use client";

import { useDeferredValue, useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import type { HtmlLibraryItem, VaultComment } from "@/lib/html-library";

export type GroupedHtmlItem = {
  filename: string;
  latestItem: HtmlLibraryItem;
  versions: HtmlLibraryItem[];
};

export function groupLibraryItems(items: HtmlLibraryItem[]): GroupedHtmlItem[] {
  const groupsMap = new Map<string, HtmlLibraryItem[]>();

  for (const item of items) {
    const list = groupsMap.get(item.filename) || [];
    list.push(item);
    groupsMap.set(item.filename, list);
  }

  const grouped: GroupedHtmlItem[] = [];

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

function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateString));
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return "~12 KB";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getRecencyTag(dateString: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 5) return "Just Now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;

  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

// Intelligent auto-categorizer matching the vault's actual documents
export function getFileCategory(filename: string): string {
  const lower = filename.toLowerCase();
  if (
    lower.includes("ifs") ||
    lower.includes("parts") ||
    lower.includes("character-card") ||
    lower.includes("character card") ||
    lower.includes("dating loop") ||
    lower.includes("dating-loop")
  ) {
    return "IFS & Psychology";
  }
  if (
    lower.includes("living os") ||
    lower.includes("living-os") ||
    lower.includes("second brain") ||
    lower.includes("second-brain") ||
    lower.includes("belief") ||
    lower.includes("reflection") ||
    lower.includes("midnight") ||
    lower.includes("manifestation") ||
    lower.includes("diaspora") ||
    lower.includes("love letter") ||
    lower.includes("love-letter") ||
    lower.includes("portfolio check") ||
    lower.includes("playbook") ||
    lower.includes("مریم") ||
    lower.includes("مرداد") ||
    lower.includes("gene keys") ||
    lower.includes("gene-keys") ||
    lower.includes("nervous system")
  ) {
    return "Life OS & Mindset";
  }
  if (
    lower.includes("coaching") ||
    lower.includes("multipotentialite") ||
    lower.includes("career") ||
    lower.includes("job application") ||
    lower.includes("job-application") ||
    lower.includes("resume")
  ) {
    return "Coaching & Career";
  }
  if (
    lower.includes("agent") ||
    lower.includes("hermes") ||
    lower.includes("grok") ||
    lower.includes("adk") ||
    lower.includes("smoke") ||
    lower.includes("system") ||
    lower.includes("loop") ||
    lower.includes("gcp") ||
    lower.includes("cloud") ||
    lower.includes("docker") ||
    lower.includes("kubernetes") ||
    lower.includes("k8s") ||
    lower.includes("infra") ||
    lower.includes("devops")
  ) {
    return "AI & Engineering";
  }
  if (
    lower.includes("workout") ||
    lower.includes("physio") ||
    lower.includes("exercise") ||
    lower.includes("energy") ||
    lower.includes("spirit") ||
    lower.includes("health")
  ) {
    return "Health & Fitness";
  }
  if (
    lower.includes("landing") ||
    lower.includes("home") ||
    lower.includes("dashboard") ||
    lower.includes("admin") ||
    lower.includes("auth") ||
    lower.includes("pricing") ||
    lower.includes("ui")
  ) {
    return "UI & Products";
  }
  return "Vault Notes";
}

export function getCategoryBadgeClass(category: string): string {
  switch (category) {
    case "Life OS & Mindset":
      return "cat-life-os";
    case "IFS & Psychology":
      return "cat-ifs";
    case "AI & Engineering":
      return "cat-ai";
    case "Coaching & Career":
      return "cat-coaching";
    case "Health & Fitness":
      return "cat-health";
    default:
      return "";
  }
}

export function getFileDescription(filename: string): string {
  const cat = getFileCategory(filename);
  const isMd = filename.toLowerCase().endsWith(".md");
  const extLabel = isMd ? "Markdown Document" : "Interactive HTML Document";

  if (cat === "IFS & Psychology") {
    return `Internal Family Systems analysis, parts mapping, and therapeutic behavioral models in ${extLabel} format.`;
  }
  if (cat === "Life OS & Mindset") {
    return `Personal reflection, living architecture playbook, mindset rituals, and second-brain knowledge synthesis.`;
  }
  if (cat === "Coaching & Career") {
    return `Strategic career roadmap, coaching frameworks, leadership analysis, and professional milestones.`;
  }
  if (cat === "AI & Engineering") {
    return `Multi-agent blueprints, LLM loops, cloud infrastructure orchestration, and systems engineering documentation.`;
  }
  if (cat === "Health & Fitness") {
    return `Biometric workout metrics, physical therapy routines, vital tracking, and wellness routines.`;
  }
  if (cat === "UI & Products") {
    return `High-fidelity responsive UI mock-up featuring styled components, design systems, and interaction models.`;
  }
  return `High-fidelity ${extLabel} archived in your private encrypted vault storage.`;
}

// Icons
function FileIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function BeakerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 3h15" />
      <path d="M6 3v16a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V3" />
      <path d="M6 14h12" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function CodeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function ColumnsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="12" y1="3" x2="12" y2="21" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function generateHtmlFromMokaJson(payload: any, theme: string = "clean-light"): string {
  let themeCss = "";
  if (theme === "clean-light") {
    themeCss = `
      :root {
        --bg: #F8F8F6;
        --card-bg: #ffffff;
        --text: #2c2b2a;
        --text-dark: #1E1E1E;
        --border: #E5E5E0;
        --muted: #a1a1aa;
        --accent: #3b82f6;
      }
      body {
        font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      }
    `;
  } else if (theme === "sleek-cyber") {
    themeCss = `
      :root {
        --bg: #0B0C0E;
        --card-bg: #121316;
        --text: #C5C6C7;
        --text-dark: #66FCF1;
        --border: #1F2833;
        --muted: #45A29E;
        --accent: #66FCF1;
      }
      body {
        font-family: 'JetBrains Mono', monospace;
      }
      .nav-btn, .search-input, .card-title, .status-badge, .detail-item, .category-section h2 {
        font-family: 'JetBrains Mono', monospace;
      }
      .card {
        box-shadow: 0 0 15px rgba(102, 252, 241, 0.05);
      }
    `;
  } else if (theme === "nordic-forest") {
    themeCss = `
      :root {
        --bg: #EAECE6;
        --card-bg: #F4F6F0;
        --text: #2D3E33;
        --text-dark: #1E3024;
        --border: #D1D6C7;
        --muted: #6B7C6E;
        --accent: #558266;
      }
      body {
        font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      }
      .card {
        border-radius: 20px;
      }
    `;
  }

  let title = "Vault Document";
  let subtitle = "";
  let navigation: { id: string; label: string }[] = [];
  let content: { [key: string]: { cards: { title: string; status?: string; details: string[] }[] } } = {};

  if (payload.report === "workout" && payload.sessions && payload.physio_routine) {
    title = "Moka Workout & Physio Vault";
    subtitle = `Generated: ${payload.generated || ""} • Period: ${payload.period || ""}`;
    navigation = [
      { id: "sessions", label: `Sessions (${payload.sessions.length})` },
      { id: "routine", label: "Physio Routine" },
    ];

    const sessionCards = payload.sessions.map((session: any) => {
      const details: string[] = [];
      if (session.duration_min) details.push(`Duration: ${session.duration_min} minutes`);
      if (session.distance_km) details.push(`Distance: ${session.distance_km} km`);
      if (session.pace) details.push(`Pace: ${session.pace}`);
      if (session.notes) details.push(`Notes: ${session.notes}`);

      return {
        title: `${session.type} (${session.date})`,
        status: "done",
        details,
      };
    });

    const routineCards = [
      {
        title: `Physio Exercises (Frequency: ${payload.physio_routine.frequency || "regular"})`,
        status: "active",
        details: payload.physio_routine.exercises || [],
      },
    ];

    content = {
      sessions: { cards: sessionCards },
      routine: { cards: routineCards },
    };
  } else {
    title = payload.title || "Vault Document";
    subtitle = payload.subtitle || "";
    navigation = payload.navigation || [];
    content = payload.content || {};
  }

  if (navigation.length === 0) {
    const keys = Object.keys(content);
    if (keys.length > 0) {
      navigation = keys.map((k) => ({ id: k, label: k.replace(/_/g, " ").toUpperCase() }));
    }
  }

  const tabsHtml =
    navigation.length > 0
      ? `<div class="nav-wrapper">
        <div class="nav-tabs">
          ${navigation
            .map(
              (nav, idx) => `
            <button class="nav-btn ${idx === 0 ? "active" : ""}" data-tab="${nav.id}">
              ${nav.label}
            </button>
          `
            )
            .join("")}
        </div>
      </div>`
      : "";

  const mainHtml = navigation
    .map((nav, tabIdx) => {
      const tabContent = content[nav.id] || { cards: [] };
      return `
    <div class="tab-content ${tabIdx === 0 ? "active" : ""}" id="tab-${nav.id}">
      <div class="grid">
        ${tabContent.cards
          .map(
            (card) => `
          <div class="card" data-searchable="${(card.title + " " + card.details.join(" ")).toLowerCase()}">
            <div class="card-header">
              <h3 class="card-title">${card.title}</h3>
              ${
                card.status
                  ? `
                <span class="status-badge ${card.status}">${card.status}</span>
              `
                  : ""
              }
            </div>
            <ul class="details-list">
              ${card.details
                .map(
                  (detail) => `
                <li class="detail-item">
                  <span class="detail-bullet">•</span>
                  <span>${detail}</span>
                </li>
              `
                )
                .join("")}
            </ul>
          </div>
        `
          )
          .join("")}
      </div>
    </div>
    `;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    ${themeCss}
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background-color: var(--bg); color: var(--text); padding: 2.5rem 1.5rem; min-height: 100vh; }
    .container { max-width: 896px; margin: 0 auto; }
    header { margin-bottom: 2rem; }
    .title-group h1 { font-size: 1.5rem; font-weight: 800; color: var(--text-dark); }
    .title-group p { font-size: 0.8rem; color: var(--muted); margin-top: 0.25rem; }
    .nav-wrapper { border-bottom: 1px solid var(--border); margin-bottom: 2rem; }
    .nav-tabs { display: flex; gap: 1rem; overflow-x: auto; }
    .nav-btn { background: transparent; border: none; font-size: 0.85rem; font-weight: 700; color: var(--muted); padding: 0.75rem 0.25rem; border-bottom: 2px solid transparent; cursor: pointer; }
    .nav-btn.active { color: var(--text-dark); border-bottom-color: var(--accent); }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; }
    .card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 16px; padding: 1.25rem; }
    .card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem; }
    .card-title { font-size: 0.95rem; font-weight: 700; color: var(--text-dark); }
    .status-badge { font-size: 0.65rem; font-weight: 700; padding: 0.15rem 0.5rem; border-radius: 100px; text-transform: uppercase; background: #ecfdf5; color: #059669; }
    .details-list { list-style: none; display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.8rem; color: var(--text); }
    .detail-item { display: flex; gap: 0.5rem; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="title-group">
        <h1>${title}</h1>
        ${subtitle ? `<p>${subtitle}</p>` : ""}
      </div>
    </header>
    ${tabsHtml}
    <main>${mainHtml}</main>
  </div>
  <script>
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        const target = document.getElementById('tab-' + btn.getAttribute('data-tab'));
        if (target) target.classList.add('active');
      });
    });
  </script>
</body>
</html>`;
}

function parseMarkdownToHtml(md: string, filename: string, theme: string = "clean-light"): string {
  let themeCss = "";
  if (theme === "clean-light") {
    themeCss = `
      :root {
        --bg: #F8F8F6;
        --card-bg: #ffffff;
        --text: #2c2b2a;
        --text-dark: #1E1E1E;
        --border: #E5E5E0;
        --muted: #a1a1aa;
        --accent: #2563eb;
      }
      body { font-family: 'Plus Jakarta Sans', sans-serif; line-height: 1.7; }
    `;
  } else if (theme === "sleek-cyber") {
    themeCss = `
      :root {
        --bg: #0B0C0E;
        --card-bg: #121316;
        --text: #C5C6C7;
        --text-dark: #66FCF1;
        --border: #1F2833;
        --muted: #45A29E;
        --accent: #66FCF1;
      }
      body { font-family: 'JetBrains Mono', monospace; line-height: 1.7; }
    `;
  } else if (theme === "nordic-forest") {
    themeCss = `
      :root {
        --bg: #EAECE6;
        --card-bg: #F4F6F0;
        --text: #2D3E33;
        --text-dark: #1E3024;
        --border: #D1D6C7;
        --muted: #6B7C6E;
        --accent: #558266;
      }
      body { font-family: 'Plus Jakarta Sans', sans-serif; line-height: 1.7; }
    `;
  }

  const lines = md.split(/\r\n|\r|\n/);
  let html = "";
  let inList = false;
  let inCodeBlock = false;
  let codeLang = "";
  let codeContent: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (line.startsWith("```")) {
      if (inCodeBlock) {
        inCodeBlock = false;
        html += `<pre><code>${escapeHtml(codeContent.join("\n"))}</code></pre>\n`;
        codeContent = [];
      } else {
        inCodeBlock = true;
        codeLang = line.slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeContent.push(line);
      continue;
    }

    if (trimmed === "") {
      if (inList) {
        html += "</ul>\n";
        inList = false;
      }
      html += "<br/>\n";
      continue;
    }

    if (line.startsWith("# ")) {
      html += `<h1>${parseInlineMarkdown(line.slice(2))}</h1>\n`;
      continue;
    }
    if (line.startsWith("## ")) {
      html += `<h2>${parseInlineMarkdown(line.slice(3))}</h2>\n`;
      continue;
    }
    if (line.startsWith("### ")) {
      html += `<h3>${parseInlineMarkdown(line.slice(4))}</h3>\n`;
      continue;
    }

    if (trimmed === "---" || trimmed === "***") {
      html += "<hr/>\n";
      continue;
    }

    const listMatch = line.match(/^(\s*)([-*+])\s+(.*)$/);
    if (listMatch) {
      if (!inList) {
        html += "<ul>\n";
        inList = true;
      }
      html += `<li>${parseInlineMarkdown(listMatch[3])}</li>\n`;
      continue;
    }

    html += `<p>${parseInlineMarkdown(line)}</p>\n`;
  }

  if (inList) html += "</ul>\n";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${filename}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    ${themeCss}
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: var(--bg); color: var(--text); padding: 3rem 1.5rem; }
    .container { max-width: 820px; margin: 0 auto; background: var(--card-bg); border: 1px solid var(--border); border-radius: 24px; padding: 3rem 2.5rem; }
    h1 { font-size: 1.85rem; font-weight: 800; color: var(--text-dark); margin-bottom: 1.5rem; line-height: 1.25; }
    h2 { font-size: 1.35rem; font-weight: 700; color: var(--text-dark); margin-top: 2rem; margin-bottom: 0.75rem; }
    h3 { font-size: 1.1rem; font-weight: 700; color: var(--text-dark); margin-top: 1.5rem; margin-bottom: 0.5rem; }
    p { margin-bottom: 1rem; font-size: 0.95rem; }
    ul { margin: 1rem 0 1rem 1.5rem; }
    li { margin-bottom: 0.4rem; font-size: 0.95rem; }
    code { font-family: 'JetBrains Mono', monospace; background: rgba(0,0,0,0.06); padding: 0.2rem 0.4rem; border-radius: 4px; font-size: 0.85rem; }
    pre { background: #18181b; color: #f4f4f5; padding: 1rem; border-radius: 12px; overflow-x: auto; margin: 1.25rem 0; }
    pre code { background: transparent; padding: 0; color: inherit; }
    hr { border: none; border-top: 1px solid var(--border); margin: 2rem 0; }
  </style>
</head>
<body>
  <div class="container">${html}</div>
</body>
</html>`;
}

function parseInlineMarkdown(text: string): string {
  let escaped = escapeHtml(text);
  escaped = escaped.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  escaped = escaped.replace(/__(.*?)__/g, "<strong>$1</strong>");
  escaped = escaped.replace(/\*(.*?)\*/g, "<em>$1</em>");
  escaped = escaped.replace(/_(.*?)_/g, "<em>$1</em>");
  escaped = escaped.replace(/`(.*?)`/g, "<code>$1</code>");
  escaped = escaped.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  return escaped;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// =========================================================
// FILE VIEWER COMPONENT (Visual In-Place Text Editor & Comments)
// =========================================================
function FileViewer({
  activeItem,
  versions,
  onBack,
  onRefresh,
  onSelectVersion,
  onOpenTagModal,
}: {
  activeItem: HtmlLibraryItem;
  versions: HtmlLibraryItem[];
  onBack: () => void;
  onRefresh: () => void;
  onSelectVersion: (pathname: string) => void;
  onOpenTagModal: (item: HtmlLibraryItem) => void;
}) {
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [styleTheme, setStyleTheme] = useState<"clean-light" | "sleek-cyber" | "nordic-forest">("clean-light");
  const [useDirectSrc, setUseDirectSrc] = useState(false);

  // In-Viewer Editing States: 'visual' (default for editing) | 'preview' | 'code' | 'split'
  const [viewMode, setViewMode] = useState<"preview" | "visual" | "code" | "split">("preview");
  const [editorContent, setEditorContent] = useState<string>("");
  const [isEditorContentLoading, setIsEditorContentLoading] = useState(false);
  const [editorSaveMode, setEditorSaveMode] = useState<"new_version" | "overwrite">("new_version");
  const [isSavingContent, setIsSavingContent] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [editorError, setEditorError] = useState<string | null>(null);

  // Comments / Reflections Drawer State
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [comments, setComments] = useState<VaultComment[]>([]);
  const [newCommentText, setNewCommentText] = useState("");
  const [isPostingComment, setIsPostingComment] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const isLoading = text === null && error === null;

  const proxiedUrl = activeItem.url.startsWith("http")
    ? `/api/blob-proxy?url=${encodeURIComponent(activeItem.url)}`
    : activeItem.url;

  // Load document content
  useEffect(() => {
    setText(null);
    setError(null);
    setUseDirectSrc(false);

    let ignore = false;

    fetch(proxiedUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`Fetch failed: ${res.statusText}`);
        return res.text();
      })
      .then((content) => {
        if (!ignore) {
          const cleanContent = content.replace(/^\uFEFF/, "").trim();
          setEditorContent(cleanContent);

          try {
            const parsed = JSON.parse(cleanContent);
            const renderedHtml = generateHtmlFromMokaJson(parsed, styleTheme);
            setText(renderedHtml);
          } catch (e) {
            const nameLower = activeItem.filename.toLowerCase();
            const pathLower = activeItem.pathname.toLowerCase();

            const hasMdExtension =
              nameLower.endsWith(".md") ||
              pathLower.endsWith(".md") ||
              pathLower.includes("/md-") ||
              pathLower.includes(".md");

            const looksLikeMarkdown =
              cleanContent.startsWith("#") ||
              cleanContent.includes("\n#") ||
              cleanContent.includes("\r#") ||
              cleanContent.includes("**") ||
              cleanContent.includes("##") ||
              (!cleanContent.toLowerCase().includes("<!doctype") &&
                !cleanContent.toLowerCase().includes("<html") &&
                !cleanContent.toLowerCase().includes("<div"));

            if (hasMdExtension || looksLikeMarkdown) {
              const renderedHtml = parseMarkdownToHtml(cleanContent, activeItem.filename, styleTheme);
              setText(renderedHtml);
            } else {
              setUseDirectSrc(true);
              setText("HTML");
            }
          }
        }
      })
      .catch((err) => {
        if (!ignore) {
          console.error("Failed to fetch content", err);
          setError(err.message);
        }
      });

    return () => {
      ignore = true;
    };
  }, [activeItem.url, styleTheme]);

  // Load comments for active item
  useEffect(() => {
    fetch(`/api/comments?pathname=${encodeURIComponent(activeItem.pathname)}`)
      .then((res) => (res.ok ? res.json() : { comments: [] }))
      .then((data) => setComments(data.comments || []))
      .catch(() => setComments([]));
  }, [activeItem.pathname]);

  // Activate Visual In-Place Editing on iframe
  const setupVisualEdit = () => {
    try {
      if (iframeRef.current && iframeRef.current.contentDocument) {
        const doc = iframeRef.current.contentDocument;
        doc.designMode = "on";
        if (doc.body) {
          doc.body.contentEditable = "true";
        }
        let style = doc.getElementById("__vault_edit_styles__");
        if (!style) {
          style = doc.createElement("style");
          style.id = "__vault_edit_styles__";
          style.textContent = `
            *:focus {
              outline: 2px dashed #2563eb !important;
              outline-offset: 4px !important;
            }
          `;
          doc.head.appendChild(style);
        }
      }
    } catch (e) {
      console.warn("Visual edit setup warning:", e);
    }
  };

  useEffect(() => {
    if (viewMode === "visual") {
      const timer = setTimeout(() => {
        setupVisualEdit();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [viewMode, text, useDirectSrc]);

  // Execute formatting command in visual edit mode
  const executeIframeCmd = (cmd: string, val: string = "") => {
    try {
      if (iframeRef.current && iframeRef.current.contentDocument) {
        iframeRef.current.contentDocument.execCommand(cmd, false, val);
      }
    } catch (e) {
      console.warn("ExecCommand failed", e);
    }
  };

  // Insert Callout Comment Box into document
  const handleInsertCommentBox = () => {
    try {
      if (iframeRef.current && iframeRef.current.contentDocument) {
        const commentHtml = `<div style="background: #fefce8; border-left: 4px solid #eab308; border-radius: 8px; padding: 0.75rem 1rem; margin: 1rem 0; font-size: 0.9rem; color: #713f12; font-family: -apple-system, sans-serif;"><strong>💬 Note / Comment:</strong> Type your thoughts here...</div><p><br/></p>`;
        iframeRef.current.contentDocument.execCommand("insertHTML", false, commentHtml);
      }
    } catch (e) {
      console.warn("Insert comment box failed", e);
    }
  };

  // Save changes from Visual Edit mode directly from the rendered DOM
  const handleSaveVisualContent = async () => {
    if (!iframeRef.current || !iframeRef.current.contentDocument) return;
    setIsSavingContent(true);
    setEditorError(null);
    setSaveToast(null);

    try {
      const doc = iframeRef.current.contentDocument;
      const tempStyle = doc.getElementById("__vault_edit_styles__");
      if (tempStyle) tempStyle.remove();
      doc.designMode = "off";
      if (doc.body) doc.body.contentEditable = "false";

      const updatedHtml = "<!DOCTYPE html>\n" + doc.documentElement.outerHTML;

      // Re-enable design mode if still in visual mode
      if (viewMode === "visual") {
        doc.designMode = "on";
        if (doc.body) doc.body.contentEditable = "true";
        if (tempStyle) doc.head.appendChild(tempStyle);
      }

      const res = await fetch("/api/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pathname: activeItem.pathname,
          url: activeItem.url,
          filename: activeItem.filename,
          content: updatedHtml,
          saveMode: editorSaveMode,
          tags: activeItem.tags,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save document");
      }

      const result = await res.json();
      setSaveToast(editorSaveMode === "new_version" ? "Saved as new version!" : "Updated text successfully!");
      setTimeout(() => setSaveToast(null), 4000);

      onRefresh();
      if (result.item && result.item.pathname !== activeItem.pathname) {
        onSelectVersion(result.item.pathname);
      }
    } catch (err) {
      setEditorError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSavingContent(false);
    }
  };

  // Switch to Raw Code Editor
  const handleSwitchToCode = async (mode: "code" | "split") => {
    setViewMode(mode);
    if (!editorContent) {
      setIsEditorContentLoading(true);
      try {
        const res = await fetch(
          `/api/edit?pathname=${encodeURIComponent(activeItem.pathname)}&url=${encodeURIComponent(activeItem.url)}`
        );
        if (res.ok) {
          const data = await res.json();
          setEditorContent(data.content);
        }
      } catch (e) {
        console.error("Error loading editor content", e);
      } finally {
        setIsEditorContentLoading(false);
      }
    }
  };

  // Save changes from Code Editor
  const handleSaveEditorContent = async () => {
    setIsSavingContent(true);
    setEditorError(null);
    setSaveToast(null);

    try {
      const res = await fetch("/api/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pathname: activeItem.pathname,
          url: activeItem.url,
          filename: activeItem.filename,
          content: editorContent,
          saveMode: editorSaveMode,
          tags: activeItem.tags,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save document");
      }

      const result = await res.json();
      setSaveToast(editorSaveMode === "new_version" ? "Saved as new version!" : "Updated successfully!");
      setTimeout(() => setSaveToast(null), 4000);

      onRefresh();
      if (result.item && result.item.pathname !== activeItem.pathname) {
        onSelectVersion(result.item.pathname);
      }
    } catch (err) {
      setEditorError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSavingContent(false);
    }
  };

  // Post a new comment
  const handlePostComment = async () => {
    if (!newCommentText.trim()) return;
    setIsPostingComment(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pathname: activeItem.pathname,
          text: newCommentText.trim(),
          action: "add",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
        setNewCommentText("");
      }
    } catch (e) {
      alert("Failed to post comment: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setIsPostingComment(false);
    }
  };

  // Delete a comment
  const handleDeleteComment = async (commentId: string) => {
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pathname: activeItem.pathname,
          action: "delete",
          commentId,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
      }
    } catch (e) {
      alert("Failed to delete comment: " + (e instanceof Error ? e.message : String(e)));
    }
  };

  const handleDeleteVersion = async (versionToDelete: HtmlLibraryItem) => {
    const isDeletingActive = activeItem.pathname === versionToDelete.pathname;

    if (versions.length <= 1) {
      if (!confirm(`This is the last remaining version. Deleting it will remove the document entirely. Proceed?`)) {
        return;
      }
    } else {
      if (!confirm(`Are you sure you want to delete this specific version from ${formatDate(versionToDelete.uploadedAt)}?`)) {
        return;
      }
    }

    setIsActionLoading(true);
    try {
      const res = await fetch("/api/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          urls: [versionToDelete.url],
          pathnames: [versionToDelete.pathname],
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete version");
      }

      const remaining = versions.filter((v) => v.pathname !== versionToDelete.pathname);
      if (remaining.length === 0) {
        onBack();
        onRefresh();
      } else {
        if (isDeletingActive) {
          const sortedRemaining = [...remaining].sort(
            (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
          );
          onSelectVersion(sortedRemaining[0].pathname);
        }
        onRefresh();
      }
    } catch (err) {
      alert("Failed to delete version: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsActionLoading(false);
    }
  };

  const handlePruneOldVersions = async () => {
    const olderVersions = versions.slice(1);
    if (olderVersions.length === 0) return;

    if (
      !confirm(
        `Are you sure you want to delete all ${olderVersions.length} older versions of "${activeItem.filename}"?\nOnly the latest version (${formatDate(versions[0].uploadedAt)}) will be kept.`
      )
    ) {
      return;
    }

    setIsActionLoading(true);
    try {
      const res = await fetch("/api/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          urls: olderVersions.map((v) => v.url),
          pathnames: olderVersions.map((v) => v.pathname),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to prune older versions");
      }

      onSelectVersion(versions[0].pathname);
      onRefresh();
    } catch (err) {
      alert("Failed to prune versions: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsActionLoading(false);
    }
  };

  const isMarkdown = activeItem.filename.toLowerCase().endsWith(".md") || activeItem.pathname.toLowerCase().endsWith(".md");

  return (
    <div className="viewer-layout">
      {/* Top Toolbar */}
      <div className="viewer-toolbar">
        <button className="viewer-back-btn" type="button" onClick={onBack}>
          <ChevronLeftIcon />
          <span>Exit Preview</span>
        </button>

        <div className="viewer-toolbar-center">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <h2>{activeItem.filename}</h2>
            <span className="card-ext-badge">{isMarkdown ? ".md" : ".html"}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.75rem", color: "var(--muted)" }}>
            <span>Vault Preview • {formatDate(activeItem.uploadedAt)}</span>
            {activeItem.tags && activeItem.tags.length > 0 && <span>• {activeItem.tags.join(", ")}</span>}
          </div>
        </div>

        <div className="viewer-toolbar-actions" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {/* Mode Switcher: Preview vs ✍️ Visual Edit Text vs 💻 Code */}
          <div className="viewer-mode-switch">
            <button
              type="button"
              className={`viewer-mode-btn ${viewMode === "preview" ? "active" : ""}`}
              onClick={() => setViewMode("preview")}
              title="Read-only view"
            >
              <EyeIcon />
              <span>Read</span>
            </button>
            <button
              type="button"
              className={`viewer-mode-btn ${viewMode === "visual" ? "active" : ""}`}
              style={viewMode === "visual" ? { background: "#2563eb", color: "#ffffff" } : {}}
              onClick={() => {
                setViewMode("visual");
                setTimeout(setupVisualEdit, 100);
              }}
              title="Click and edit text directly on the page (no HTML code required!)"
            >
              <EditIcon />
              <span>✍️ Edit Text</span>
            </button>
            <button
              type="button"
              className={`viewer-mode-btn ${viewMode === "split" ? "active" : ""}`}
              onClick={() => handleSwitchToCode("split")}
              title="Side-by-Side Split View"
            >
              <ColumnsIcon />
              <span>Split</span>
            </button>
            <button
              type="button"
              className={`viewer-mode-btn ${viewMode === "code" ? "active" : ""}`}
              onClick={() => handleSwitchToCode("code")}
              title="Edit raw HTML or Markdown code"
            >
              <CodeIcon />
              <span>Code</span>
            </button>
          </div>

          {/* Comments & Reflections Drawer Button */}
          <button
            type="button"
            className={`action-pill-btn ${isCommentsOpen ? "active" : ""}`}
            onClick={() => setIsCommentsOpen(!isCommentsOpen)}
            title="Open Document Comments & Reflections"
          >
            <span>💬 Notes ({comments.length})</span>
          </button>

          {/* Tags Manager Button */}
          <button
            type="button"
            className="action-pill-btn"
            onClick={() => onOpenTagModal(activeItem)}
            title="Manage Document Tags"
          >
            <TagIcon />
            <span>Tags ({activeItem.tags?.length || 0})</span>
          </button>

          {/* Style theme switcher for markdown / moka documents */}
          {(viewMode === "preview" || viewMode === "visual") && (
            <div className="theme-selector-container">
              <span className="theme-label">Style:</span>
              <div className="theme-pills">
                <button
                  type="button"
                  className={`theme-pill-btn ${styleTheme === "clean-light" ? "active" : ""}`}
                  onClick={() => setStyleTheme("clean-light")}
                >
                  ☀️ Light
                </button>
                <button
                  type="button"
                  className={`theme-pill-btn ${styleTheme === "sleek-cyber" ? "active" : ""}`}
                  onClick={() => setStyleTheme("sleek-cyber")}
                >
                  👾 Cyber
                </button>
                <button
                  type="button"
                  className={`theme-pill-btn ${styleTheme === "nordic-forest" ? "active" : ""}`}
                  onClick={() => setStyleTheme("nordic-forest")}
                >
                  🌲 Nordic
                </button>
              </div>
            </div>
          )}

          {/* Versions Sidebar Toggle */}
          <button
            type="button"
            className={`viewer-action-btn ${isSidebarOpen ? "active" : ""}`}
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            title="Toggle Version History"
          >
            <ClockIcon />
            <span>Versions ({versions.length})</span>
          </button>
        </div>
      </div>

      {/* Floating Visual Edit Toolbar (When in ✍️ Visual Text Mode) */}
      {viewMode === "visual" && (
        <div className="visual-edit-bar">
          <div className="visual-edit-left">
            <div className="visual-edit-badge">
              <EditIcon />
              <span>Visual Text Editing Active</span>
            </div>
            <span className="visual-edit-tip">Click anywhere on the text below to type, edit, or reword sentences.</span>
          </div>

          <div className="visual-edit-tools">
            <button
              type="button"
              className="visual-tool-btn"
              onClick={() => executeIframeCmd("bold")}
              title="Bold selected text"
            >
              <strong>B</strong>
            </button>
            <button
              type="button"
              className="visual-tool-btn"
              onClick={() => executeIframeCmd("italic")}
              title="Italic selected text"
            >
              <em>I</em>
            </button>
            <button
              type="button"
              className="visual-tool-btn"
              onClick={() => executeIframeCmd("hiliteColor", "#fef08a")}
              title="Highlight selected text"
            >
              🟡 Highlight
            </button>
            <button
              type="button"
              className="visual-tool-btn"
              onClick={handleInsertCommentBox}
              title="Insert a styled comment / callout box into document"
            >
              💬 + Comment Box
            </button>
          </div>

          <div className="visual-edit-actions">
            <select
              className="editor-save-mode-select"
              value={editorSaveMode}
              onChange={(e) => setEditorSaveMode(e.target.value as any)}
            >
              <option value="new_version">Save as New Version</option>
              <option value="overwrite">Overwrite Current Version</option>
            </select>
            <button
              type="button"
              className="visual-save-btn"
              onClick={handleSaveVisualContent}
              disabled={isSavingContent}
            >
              {isSavingContent ? "Saving..." : "✓ Save Changes"}
            </button>
            <button
              type="button"
              className="visual-cancel-btn"
              onClick={() => setViewMode("preview")}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Viewer Main Body */}
      <div className="viewer-body">
        {viewMode === "preview" || viewMode === "visual" ? (
          <div className="viewer-iframe-container">
            {isLoading ? (
              <div className="viewer-loading">
                <div className="spinner"></div>
                <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>Preparing Document...</span>
              </div>
            ) : error ? (
              <div className="viewer-loading" style={{ color: "#ef4444", fontWeight: 600 }}>
                <p>Error: {error}</p>
              </div>
            ) : (
              <iframe
                ref={iframeRef}
                key={activeItem.pathname + (viewMode === "visual" ? "-visual" : "")}
                className="viewer-iframe"
                src={useDirectSrc && viewMode !== "visual" ? proxiedUrl : undefined}
                srcDoc={useDirectSrc && viewMode !== "visual" ? undefined : (viewMode === "visual" ? editorContent : text) || undefined}
                title={activeItem.filename}
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                onLoad={() => {
                  if (viewMode === "visual") {
                    setupVisualEdit();
                  }
                }}
              />
            )}
          </div>
        ) : viewMode === "code" ? (
          <div className="in-viewer-editor-layout">
            <div className="editor-toolbar-top">
              <div className="editor-top-left">
                <span className="editor-doc-name-badge">{activeItem.filename}</span>
                {saveToast && (
                  <span className="toast-badge-success">
                    <CheckIcon /> {saveToast}
                  </span>
                )}
                {editorError && (
                  <span style={{ color: "#ef4444", fontSize: "0.75rem", fontWeight: 700 }}>{editorError}</span>
                )}
              </div>
              <div className="editor-top-right">
                <select
                  className="editor-save-mode-select"
                  value={editorSaveMode}
                  onChange={(e) => setEditorSaveMode(e.target.value as any)}
                >
                  <option value="new_version">Save as New Version</option>
                  <option value="overwrite">Overwrite Current Version</option>
                </select>
                <button
                  type="button"
                  className="editor-btn-save"
                  onClick={handleSaveEditorContent}
                  disabled={isSavingContent}
                >
                  {isSavingContent ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
            <div className="editor-pane-full">
              <textarea
                className="code-editor-textarea"
                value={editorContent}
                onChange={(e) => setEditorContent(e.target.value)}
                spellCheck={false}
              />
              <div className="editor-footer-status">
                <span>
                  {editorContent.split("\n").length} lines • {editorContent.length} chars
                </span>
                <span>{isMarkdown ? "Markdown" : "HTML"}</span>
              </div>
            </div>
          </div>
        ) : (
          /* Split View: Editor on Left, Live Preview on Right */
          <div className="in-viewer-editor-layout">
            <div className="editor-toolbar-top">
              <div className="editor-top-left">
                <span className="editor-doc-name-badge">{activeItem.filename}</span>
                <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>Split Live Preview</span>
                {saveToast && (
                  <span className="toast-badge-success">
                    <CheckIcon /> {saveToast}
                  </span>
                )}
              </div>
              <div className="editor-top-right">
                <select
                  className="editor-save-mode-select"
                  value={editorSaveMode}
                  onChange={(e) => setEditorSaveMode(e.target.value as any)}
                >
                  <option value="new_version">Save as New Version</option>
                  <option value="overwrite">Overwrite Current Version</option>
                </select>
                <button
                  type="button"
                  className="editor-btn-save"
                  onClick={handleSaveEditorContent}
                  disabled={isSavingContent}
                >
                  {isSavingContent ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
            <div className="split-view-container">
              <div className="split-editor-pane">
                <textarea
                  className="code-editor-textarea"
                  value={editorContent}
                  onChange={(e) => setEditorContent(e.target.value)}
                  spellCheck={false}
                />
              </div>
              <div className="split-preview-pane">
                <iframe
                  className="viewer-iframe"
                  srcDoc={
                    isMarkdown
                      ? parseMarkdownToHtml(editorContent, activeItem.filename, styleTheme)
                      : editorContent
                  }
                  title="Live Preview"
                  sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                />
              </div>
            </div>
          </div>
        )}

        {/* Notes & Comments Slide-out Drawer */}
        <aside className={`comments-drawer ${isCommentsOpen ? "open" : ""}`}>
          <div className="comments-header">
            <h3>💬 Notes & Reflections</h3>
            <button type="button" className="comments-close-btn" onClick={() => setIsCommentsOpen(false)}>
              &times;
            </button>
          </div>

          <div className="comments-list">
            {comments.length === 0 ? (
              <div style={{ textAlign: "center", color: "var(--muted)", fontSize: "0.85rem", marginTop: "2rem" }}>
                <p>No notes or comments yet.</p>
                <p style={{ fontSize: "0.75rem", marginTop: "0.5rem" }}>
                  Write takeaways, reflections, or review notes below.
                </p>
              </div>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="comment-card">
                  <div className="comment-card-top">
                    <span>{formatDate(c.createdAt)}</span>
                    <button
                      type="button"
                      className="comment-delete-btn"
                      onClick={() => handleDeleteComment(c.id)}
                      title="Delete note"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                  <div className="comment-text">{c.text}</div>
                </div>
              ))
            )}
          </div>

          <div className="comments-compose">
            <textarea
              placeholder="Write a reflection or comment on this document..."
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
            />
            <button
              type="button"
              className="post-comment-btn"
              onClick={handlePostComment}
              disabled={isPostingComment || !newCommentText.trim()}
            >
              {isPostingComment ? "Saving..." : "Post Note"}
            </button>
          </div>
        </aside>

        {/* Version History Sidebar */}
        <aside className={`version-sidebar ${isSidebarOpen ? "open" : ""}`}>
          <div className="version-sidebar-header">
            <h3>Updates Timeline</h3>
            <span className="version-count-pill">{versions.length} versions</span>
          </div>

          <div className="version-sidebar-list">
            {versions.map((v, index) => {
              const isLatest = index === 0;
              const isActive = v.pathname === activeItem.pathname;
              return (
                <div
                  key={v.pathname}
                  className={`version-item ${isActive ? "active" : ""} ${isLatest ? "latest" : ""}`}
                  onClick={() => onSelectVersion(v.pathname)}
                >
                  <div className="version-item-left">
                    <div className="version-dot" />
                    <div className="version-meta-info">
                      <span className="version-name">
                        Version {versions.length - index}
                        {isLatest && <span className="latest-tag">Latest</span>}
                      </span>
                      <span className="version-time">{formatDate(v.uploadedAt)}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="version-item-delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteVersion(v);
                    }}
                    disabled={isActionLoading}
                    title="Delete this version"
                  >
                    <TrashIcon />
                  </button>
                </div>
              );
            })}
          </div>

          {versions.length > 1 && (
            <div className="version-sidebar-footer">
              <div className="prune-box">
                <h4>Prune Storage</h4>
                <p>Delete all {versions.length - 1} older copies and keep only the latest version to clean up your Vercel Blob.</p>
                <button
                  type="button"
                  className="prune-btn"
                  onClick={handlePruneOldVersions}
                  disabled={isActionLoading}
                >
                  {isActionLoading ? "Pruning..." : `Prune ${versions.length - 1} Old Versions`}
                </button>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

// =========================================================
// INTERACTIVE TAG MANAGER MODAL (Single & Batch)
// =========================================================
function TagManagerModal({
  items,
  allAvailableTags,
  onClose,
  onSave,
}: {
  items: HtmlLibraryItem[];
  allAvailableTags: string[];
  onClose: () => void;
  onSave: (tags: string[]) => Promise<void>;
}) {
  const isBatch = items.length > 1;

  // Initialize tags
  const [currentTags, setCurrentTags] = useState<string[]>(() => {
    if (!isBatch && items[0]?.tags) {
      return [...items[0].tags];
    }
    return [];
  });

  const [inputVal, setInputVal] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const recommendedTags = [
    "IFS",
    "Life OS",
    "AI & Systems",
    "Coaching",
    "Reflection",
    "Health",
    "Engineering",
    "Playbook",
    "Draft",
    "Important",
  ];

  const handleAddTag = (tagToAdd: string) => {
    const trimmed = tagToAdd.trim();
    if (!trimmed) return;
    if (!currentTags.includes(trimmed)) {
      setCurrentTags([...currentTags, trimmed]);
    }
    setInputVal("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setCurrentTags(currentTags.filter((t) => t !== tagToRemove));
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      await onSave(currentTags);
      onClose();
    } catch (e) {
      alert("Error saving tags: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="tag-modal-card" onClick={(e) => e.stopPropagation()}>
        <h3>{isBatch ? `Batch Tag ${items.length} Documents` : `Manage Tags for "${items[0]?.filename}"`}</h3>
        <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
          {isBatch
            ? "Add or remove tags across all selected documents simultaneously."
            : "Organize this document with tags to group, filter, and structure your vault."}
        </p>

        {/* Current Active Tags */}
        <div className="tag-chips-section">
          <label>Active Tags</label>
          <div className="active-tags-grid">
            {currentTags.length === 0 ? (
              <span style={{ fontSize: "0.8rem", color: "var(--muted)", fontStyle: "italic" }}>
                No tags added yet. Choose from below or type a new one.
              </span>
            ) : (
              currentTags.map((tag) => (
                <span key={tag} className="interactive-tag-pill">
                  <span>{tag}</span>
                  <button type="button" className="remove-tag-btn" onClick={() => handleRemoveTag(tag)}>
                    &times;
                  </button>
                </span>
              ))
            )}
          </div>
        </div>

        {/* Quick Suggestions */}
        <div className="tag-chips-section">
          <label>Suggested Tags</label>
          <div className="suggested-tags-row">
            {recommendedTags.map((tag) => {
              const isSelected = currentTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  className={`suggested-tag-btn ${isSelected ? "selected" : ""}`}
                  style={isSelected ? { background: "var(--primary)", color: "#ffffff" } : {}}
                  onClick={() => (isSelected ? handleRemoveTag(tag) : handleAddTag(tag))}
                >
                  {isSelected ? `✓ ${tag}` : `+ ${tag}`}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Tag Input */}
        <div className="tag-input-row">
          <input
            type="text"
            placeholder="Type custom tag (e.g. Sprint-1, Mindset)..."
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddTag(inputVal);
              }
            }}
          />
          <button type="button" className="tag-add-btn" onClick={() => handleAddTag(inputVal)}>
            Add
          </button>
        </div>

        {/* Modal Actions */}
        <div className="modal-actions" style={{ marginTop: "1rem" }}>
          <button type="button" className="modal-btn-cancel" onClick={onClose} disabled={isSaving}>
            Cancel
          </button>
          <button type="button" className="modal-btn-save" onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? "Saving Tags..." : "Save Tags"}
          </button>
        </div>
      </div>
    </div>
  );
}

// =========================================================
// ENHANCED CODE EDITOR VIEW (With Document Picker & Templates)
// =========================================================
function EditorView({
  items,
  initialItem,
  onSaveComplete,
}: {
  items: HtmlLibraryItem[];
  initialItem?: HtmlLibraryItem | null;
  onSaveComplete: () => void;
}) {
  const [selectedPathname, setSelectedPathname] = useState<string>(initialItem ? initialItem.pathname : "");
  const [content, setContent] = useState<string>(
    "<!DOCTYPE html>\n<html>\n<head>\n  <title>My New Component</title>\n</head>\n<body>\n  <h1>Hello from the Vault Editor</h1>\n</body>\n</html>"
  );
  const [filename, setFilename] = useState<string>("new-component.html");
  const [tags, setTags] = useState<string[]>([]);
  const [saveMode, setSaveMode] = useState<"new_version" | "overwrite">("new_version");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [isLoadingDocument, setIsLoadingDocument] = useState(false);

  // Group items by category for the dropdown
  const categoryGroups = useMemo(() => {
    const map = new Map<string, HtmlLibraryItem[]>();
    for (const item of items) {
      const cat = getFileCategory(item.filename);
      const list = map.get(cat) || [];
      list.push(item);
      map.set(cat, list);
    }
    return map;
  }, [items]);

  // Load a document from vault
  const loadVaultDocument = async (pathname: string) => {
    if (!pathname) {
      // Reset to new blank document
      setSelectedPathname("");
      setFilename("new-component.html");
      setContent("<!DOCTYPE html>\n<html>\n<head>\n  <title>My New Component</title>\n</head>\n<body>\n  <h1>Hello from the Vault Editor</h1>\n</body>\n</html>");
      setTags([]);
      return;
    }

    const item = items.find((i) => i.pathname === pathname);
    if (!item) return;

    setSelectedPathname(pathname);
    setFilename(item.filename);
    setTags(item.tags || []);
    setIsLoadingDocument(true);
    setSaveError(null);

    try {
      const res = await fetch(`/api/edit?pathname=${encodeURIComponent(item.pathname)}&url=${encodeURIComponent(item.url)}`);
      if (!res.ok) {
        throw new Error("Failed to load document content");
      }
      const data = await res.json();
      setContent(data.content);
    } catch (e) {
      setSaveError(errMessage(e));
    } finally {
      setIsLoadingDocument(false);
    }
  };

  useEffect(() => {
    if (initialItem) {
      loadVaultDocument(initialItem.pathname);
    }
  }, [initialItem]);

  const handleTemplateSelect = (type: "html" | "markdown" | "ifs" | "dashboard") => {
    setSelectedPathname("");
    setSaveSuccess(null);
    if (type === "html") {
      setFilename("new-landing.html");
      setContent(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Modern Hero Section</title>
  <style>
    body { font-family: -apple-system, sans-serif; background: #0f172a; color: white; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .card { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 24px; padding: 3rem; text-align: center; max-width: 600px; backdrop-filter: blur(12px); }
    h1 { font-size: 2.5rem; margin-bottom: 1rem; }
    p { color: #94a3b8; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Vault Component</h1>
    <p>Build high-fidelity responsive static components instantly.</p>
  </div>
</body>
</html>`);
    } else if (type === "markdown") {
      setFilename("daily-reflection.md");
      setContent(`# Daily Reflection & Life OS Log

## Core Intentions
- [ ] Intentional stillness and nervous system check-in
- [ ] Deep engineering work on Agent loop harness
- [ ] Evening integration notes

## Insights & Thoughts
> Cultivate discernment over speed. Build systems that compound.

### Key Takeaways
1. Align energy before execution.
2. Architecture comes from clarity of constraints.`);
    } else if (type === "ifs") {
      setFilename("ifs-parts-session.md");
      setContent(`# IFS Parts & Session Map

## Target Part Identified
- **Role**: Protector / Manager
- **Core Belief**: "If we pause, something critical falls behind."
- **Somatic Location**: Upper chest tension

## Dialogue & Witnessing
1. What is this part trying to protect us from?
2. How does the Self extend appreciation for its service?

## Unburdening Notes
- Integration plan and Self-energy reaffirmation.`);
    } else if (type === "dashboard") {
      setFilename("report.json");
      setContent(`{
  "title": "Weekly Systems Synthesis",
  "subtitle": "Generated via Vault Engine",
  "navigation": [
    { "id": "focus", "label": "Key Pillars" },
    { "id": "metrics", "label": "Performance" }
  ],
  "content": {
    "focus": {
      "cards": [
        { "title": "Living OS Alignment", "status": "active", "details": ["Reviewed core playbooks", "Synchronized daily journals"] }
      ]
    },
    "metrics": {
      "cards": [
        { "title": "Agent Pipeline", "status": "done", "details": ["24 test suites executed", "Zero regression detected"] }
      ]
    }
  }
}`);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      const res = await fetch("/api/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pathname: selectedPathname || undefined,
          filename,
          content,
          saveMode,
          tags,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save document");
      }

      setSaveSuccess(saveMode === "new_version" ? "Saved as new version in Vault!" : "Document overwritten successfully!");
      setTimeout(() => {
        onSaveComplete();
      }, 1200);
    } catch (err) {
      setSaveError(errMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="editor-view">
      <header className="content-header" style={{ marginBottom: "2rem" }}>
        <div className="badge-wrapper">
          <span className="badge">Vault Code Studio</span>
        </div>
        <h1>Document Editor & Creator</h1>
        <p>Edit any existing vault document in real-time or build fresh HTML, Markdown, and Moka components.</p>
      </header>

      {/* Document Loader Bar */}
      <div className="editor-vault-loader-bar">
        <label style={{ fontSize: "0.8rem", fontWeight: 800, textTransform: "uppercase", color: "var(--muted)" }}>
          Load Existing:
        </label>
        <select
          className="editor-vault-select"
          value={selectedPathname}
          onChange={(e) => loadVaultDocument(e.target.value)}
        >
          <option value="">✨ + Create New Blank Document</option>
          {Array.from(categoryGroups.entries()).map(([cat, catItems]) => (
            <optgroup key={cat} label={cat}>
              {catItems.map((item) => (
                <option key={item.pathname} value={item.pathname}>
                  {item.filename} ({item.filename.toLowerCase().endsWith(".md") ? ".md" : ".html"})
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        {/* Quick starter templates */}
        <div className="template-pills-row">
          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--muted)" }}>Templates:</span>
          <button type="button" className="template-pill-btn" onClick={() => handleTemplateSelect("html")}>
            🌐 HTML5
          </button>
          <button type="button" className="template-pill-btn" onClick={() => handleTemplateSelect("markdown")}>
            📝 Markdown
          </button>
          <button type="button" className="template-pill-btn" onClick={() => handleTemplateSelect("ifs")}>
            🧘 IFS Map
          </button>
          <button type="button" className="template-pill-btn" onClick={() => handleTemplateSelect("dashboard")}>
            📊 Dashboard
          </button>
        </div>
      </div>

      <div className="editor-container">
        <div className="editor-toolbar-local" style={{ flexWrap: "wrap", gap: "0.75rem" }}>
          <div className="filename-input" style={{ flex: "1 1 250px" }}>
            <FileIcon />
            <input
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder="filename.html or note.md"
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            {selectedPathname && (
              <select
                className="editor-save-mode-select"
                value={saveMode}
                onChange={(e) => setSaveMode(e.target.value as any)}
              >
                <option value="new_version">Save as New Version</option>
                <option value="overwrite">Overwrite Current File</option>
              </select>
            )}

            <button
              type="button"
              className="save-btn"
              onClick={handleSave}
              disabled={isSaving || isLoadingDocument}
            >
              {isSaving ? "Saving to Vault..." : "Save to Vault"}
            </button>
          </div>
        </div>

        {saveSuccess && (
          <div className="toast-badge-success" style={{ margin: "1rem 1.5rem 0 1.5rem" }}>
            <CheckIcon /> {saveSuccess}
          </div>
        )}

        {saveError && (
          <div className="error-text" style={{ padding: "1rem 1.5rem 0 1.5rem", margin: 0 }}>
            {saveError}
          </div>
        )}

        {isLoadingDocument ? (
          <div className="viewer-loading" style={{ height: "300px", background: "transparent" }}>
            <div className="spinner"></div>
            <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>Loading document content...</span>
          </div>
        ) : (
          <textarea
            className="editor-textarea"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            spellCheck={false}
          />
        )}
      </div>
    </div>
  );
}

function errMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

// =========================================================
// MAIN LIBRARY VIEWER DASHBOARD
// =========================================================
export default function LibraryViewer({
  items,
  isLoading: initialLoading,
}: {
  items: HtmlLibraryItem[];
  isLoading: boolean;
}) {
  const router = useRouter();
  const [selectedPathname, setSelectedPathname] = useState<string | null>(null);

  const handleSelectPathname = (pathname: string | null) => {
    setSelectedPathname(pathname);
    if (typeof window !== "undefined") {
      if (pathname) {
        const fileUrl = encodeURIComponent(pathname);
        const newUrl = `${window.location.pathname}?file=${fileUrl}`;
        window.history.pushState(null, "", newUrl);
      } else {
        window.history.pushState(null, "", window.location.pathname);
      }
    }
  };

  // Synchronize state with URL query parameter '?file='
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const fileParam = params.get("file");
      if (fileParam) {
        const decoded = decodeURIComponent(fileParam);
        const itemExists = items.some((item) => item.pathname === decoded);
        if (itemExists) {
          setSelectedPathname((prev) => (prev !== decoded ? decoded : prev));
          return;
        }
      }
      setSelectedPathname((prev) => (prev !== null ? null : prev));
    };

    handlePopState();
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [items]);

  const [activeTab, setActiveTab] = useState<"dashboard" | "editor">("dashboard");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  // View Mode: Grid vs Table / List View
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Sorting
  const [sortBy, setSortBy] = useState<"date_desc" | "date_asc" | "name_asc" | "name_desc" | "size_desc" | "versions_desc">("date_desc");

  // Category filter
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  // Tag filter
  const [selectedTag, setSelectedTag] = useState<string>("All");

  // Month filter (e.g. "2026-09")
  const [selectedMonth, setSelectedMonth] = useState<string>("All");

  // Multi-select management features state
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedPathnames, setSelectedPathnames] = useState<Set<string>>(new Set());

  // Modals state
  const [renamingItem, setRenamingItem] = useState<HtmlLibraryItem | null>(null);
  const [newFilenameInput, setNewFilenameInput] = useState("");
  const [tagModalItems, setTagModalItems] = useState<HtmlLibraryItem[] | null>(null);

  // Editor pre-selection
  const [editorTargetItem, setEditorTargetItem] = useState<HtmlLibraryItem | null>(null);

  const [isActionLoading, setIsActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const groupedItems = useMemo(() => {
    return groupLibraryItems(items);
  }, [items]);

  // Dynamic Categories calculation with real counts
  const categoriesList = useMemo(() => {
    const counts: Record<string, number> = { All: groupedItems.length };
    for (const group of groupedItems) {
      const cat = getFileCategory(group.filename);
      counts[cat] = (counts[cat] || 0) + 1;
    }
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [groupedItems]);

  // Available tags calculation
  const availableTags = useMemo(() => {
    const tagsSet = new Set<string>();
    for (const group of groupedItems) {
      if (group.latestItem.tags) {
        group.latestItem.tags.forEach((t) => tagsSet.add(t));
      }
    }
    return Array.from(tagsSet).sort();
  }, [groupedItems]);

  // Available months from uploadedAt metadata (newest first)
  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>();
    for (const group of groupedItems) {
      const d = new Date(group.latestItem.uploadedAt);
      if (!isNaN(d.getTime())) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        monthSet.add(key);
      }
    }
    return Array.from(monthSet).sort((a, b) => b.localeCompare(a)); // newest first
  }, [groupedItems]);

  function formatMonthKey(key: string): string {
    const [y, m] = key.split("-");
    return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }

  // Filtered & Sorted items
  const filteredAndSortedItems = useMemo(() => {
    let result = groupedItems.filter((group) => {
      const item = group.latestItem;
      const cat = getFileCategory(group.filename);

      // Search matches filename, category, or tags
      const matchesSearch =
        deferredQuery === "" ||
        group.filename.toLowerCase().includes(deferredQuery.toLowerCase()) ||
        cat.toLowerCase().includes(deferredQuery.toLowerCase()) ||
        (item.tags && item.tags.some((t) => t.toLowerCase().includes(deferredQuery.toLowerCase())));

      // Category filter
      const matchesCategory = selectedCategory === "All" || cat === selectedCategory;

      // Tag filter
      const matchesTag = selectedTag === "All" || (item.tags && item.tags.includes(selectedTag));

      // Month filter
      let matchesMonth = true;
      if (selectedMonth !== "All") {
        const d = new Date(item.uploadedAt);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        matchesMonth = key === selectedMonth;
      }

      return matchesSearch && matchesCategory && matchesTag && matchesMonth;
    });

    // Sort
    result.sort((a, b) => {
      if (sortBy === "date_desc") {
        return new Date(b.latestItem.uploadedAt).getTime() - new Date(a.latestItem.uploadedAt).getTime();
      }
      if (sortBy === "date_asc") {
        return new Date(a.latestItem.uploadedAt).getTime() - new Date(b.latestItem.uploadedAt).getTime();
      }
      if (sortBy === "name_asc") {
        return a.filename.localeCompare(b.filename);
      }
      if (sortBy === "name_desc") {
        return b.filename.localeCompare(a.filename);
      }
      if (sortBy === "size_desc") {
        return (b.latestItem.size || 0) - (a.latestItem.size || 0);
      }
      if (sortBy === "versions_desc") {
        return b.versions.length - a.versions.length;
      }
      return 0;
    });

    return result;
  }, [groupedItems, deferredQuery, selectedCategory, selectedTag, selectedMonth, sortBy]);

  const handleSaveComplete = () => {
    setActiveTab("dashboard");
    router.refresh();
  };

  const handleEditContentClick = (e: React.MouseEvent, item: HtmlLibraryItem) => {
    e.stopPropagation();
    // Open viewer directly in editor mode for this item
    handleSelectPathname(item.pathname);
  };

  const handleRenameClick = (e: React.MouseEvent, item: HtmlLibraryItem) => {
    e.stopPropagation();
    setRenamingItem(item);
    setNewFilenameInput(item.filename);
    setActionError(null);
  };

  const handleDeleteClick = async (e: React.MouseEvent, group: GroupedHtmlItem) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete "${group.filename}" and all its ${group.versions.length} versions?`)) {
      await performDelete(group.versions);
    }
  };

  const performRename = async () => {
    if (!renamingItem) return;
    setIsActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch("/api/rename", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: renamingItem.url,
          pathname: renamingItem.pathname,
          newFilename: newFilenameInput,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to rename file");
      }

      setRenamingItem(null);
      router.refresh();
    } catch (err) {
      setActionError(errMessage(err));
    } finally {
      setIsActionLoading(false);
    }
  };

  const performDelete = async (itemsToDelete: HtmlLibraryItem[]) => {
    setIsActionLoading(true);
    try {
      const res = await fetch("/api/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          urls: itemsToDelete.map((item) => item.url).filter(Boolean),
          pathnames: itemsToDelete.map((item) => item.pathname),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete files");
      }

      setSelectedPathnames(new Set());
      setIsSelectMode(false);
      router.refresh();
    } catch (err) {
      alert("Delete failed: " + errMessage(err));
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedPathnames.size === filteredAndSortedItems.length) {
      setSelectedPathnames(new Set());
    } else {
      setSelectedPathnames(new Set(filteredAndSortedItems.map((group) => group.latestItem.pathname)));
    }
  };

  const handleDeleteSelected = async () => {
    const itemsToDelete: HtmlLibraryItem[] = [];
    for (const group of groupedItems) {
      if (selectedPathnames.has(group.latestItem.pathname)) {
        itemsToDelete.push(...group.versions);
      }
    }
    if (itemsToDelete.length === 0) return;
    if (confirm(`Are you sure you want to delete all ${itemsToDelete.length} files across the selected documents?`)) {
      await performDelete(itemsToDelete);
    }
  };

  const handleBatchTagSave = async (tags: string[]) => {
    const pathnames = Array.from(selectedPathnames);
    if (pathnames.length === 0) return;

    const res = await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pathnames,
        addTags: tags,
      }),
    });

    if (!res.ok) {
      throw new Error("Failed to save batch tags");
    }

    router.refresh();
  };

  const handleSingleTagSave = async (item: HtmlLibraryItem, tags: string[]) => {
    const res = await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pathname: item.pathname,
        tags,
      }),
    });

    if (!res.ok) {
      throw new Error("Failed to save tags");
    }

    router.refresh();
  };

  const selectedGroup = useMemo(() => {
    return groupedItems.find((group) =>
      group.versions.some((v) => v.pathname === selectedPathname)
    );
  }, [groupedItems, selectedPathname]);

  // If a document is selected, render FileViewer
  if (selectedGroup) {
    const activeVersionItem =
      selectedGroup.versions.find((v) => v.pathname === selectedPathname) || selectedGroup.latestItem;
    return (
      <FileViewer
        activeItem={activeVersionItem}
        versions={selectedGroup.versions}
        onBack={() => handleSelectPathname(null)}
        onRefresh={() => router.refresh()}
        onSelectVersion={handleSelectPathname}
        onOpenTagModal={(item) => setTagModalItems([item])}
      />
    );
  }

  return (
    <div className="app-shell">
      {/* Translucent Glass Header Nav */}
      <header className="top-nav">
        <div className="brand">
          <div className="brand-icon">
            <BeakerIcon />
          </div>
          <div className="brand-text">
            <h2>Vault Studio</h2>
            <p>Living Knowledge Engine</p>
          </div>
        </div>

        <nav className="top-nav-actions">
          <button
            type="button"
            className={`nav-link-btn ${activeTab === "dashboard" ? "active" : ""}`}
            onClick={() => setActiveTab("dashboard")}
          >
            <span>Dashboard</span>
          </button>
          <button
            type="button"
            className={`nav-link-btn ${activeTab === "editor" ? "active" : ""}`}
            onClick={() => {
              setEditorTargetItem(null);
              setActiveTab("editor");
            }}
          >
            <span>Code Editor</span>
          </button>
        </nav>
      </header>

      {/* Main Content */}
      <main className="main-content">
        {activeTab === "dashboard" ? (
          <>
            <header className="content-header">
              <div className="badge-wrapper">
                <span className="badge">Private Encrypted Storage</span>
              </div>
              <h1>Your Knowledge Vault</h1>
              <p>Explore, search, preview, and edit your personal reflection playbooks, IFS systems, and technical architectures.</p>
            </header>

            {/* Vault Statistics Banner */}
            <div className="vault-stats-bar">
              <div className="stat-chip">
                <span className="stat-icon">📚</span>
                <span className="stat-num">{groupedItems.length}</span>
                <span className="stat-label">Documents</span>
              </div>
              <div className="stat-chip">
                <span className="stat-icon">🗂️</span>
                <span className="stat-num">{categoriesList.length - 1}</span>
                <span className="stat-label">Categories</span>
              </div>
              <div className="stat-chip">
                <span className="stat-icon">🏷️</span>
                <span className="stat-num">{availableTags.length}</span>
                <span className="stat-label">Tags</span>
              </div>
              <div className="stat-chip">
                <span className="stat-icon">📦</span>
                <span className="stat-num">{items.length}</span>
                <span className="stat-label">Total Versions</span>
              </div>
            </div>

            {/* Controls Wrapper: Search & Category Tabs */}
            <div className="vault-controls-wrapper">
              <div className="content-search" style={{ marginBottom: "1rem" }}>
                <div className="search-field" style={{ maxWidth: "600px" }}>
                  <span className="icon">
                    <SearchIcon />
                  </span>
                  <input
                    type="text"
                    placeholder="Search by title, tag, or category..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
              </div>

              {/* Category Filter Tabs with Counts */}
              <div className="category-tabs-container">
                {categoriesList.map((cat) => (
                  <button
                    key={cat.name}
                    type="button"
                    className={`category-tab-btn ${selectedCategory === cat.name ? "active" : ""}`}
                    onClick={() => setSelectedCategory(cat.name)}
                  >
                    <span>{cat.name}</span>
                    <span className="category-tab-count">{cat.count}</span>
                  </button>
                ))}
              </div>

              {/* Sub-toolbar: Sort, View Switcher & Action Controls */}
              <div className="vault-subtoolbar">
                <div className="subtoolbar-left">
                  {/* Sort Dropdown */}
                  <div className="sort-select-wrapper">
                    <span>Sort:</span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                    >
                      <option value="date_desc">🕒 Newest First</option>
                      <option value="date_asc">🕒 Oldest First</option>
                      <option value="name_asc">🔤 Name (A → Z)</option>
                      <option value="name_desc">🔤 Name (Z → A)</option>
                      <option value="size_desc">📦 Size (Largest)</option>
                      <option value="versions_desc">🔢 Most Versions</option>
                    </select>
                  </div>

                  {/* Active Tag Filter Indicator */}
                  {selectedTag !== "All" && (
                    <div className="tag-active-filter-strip">
                      <span>Filtered by tag: <strong>#{selectedTag}</strong></span>
                      <button type="button" className="clear-tag-btn" onClick={() => setSelectedTag("All")}>
                        Clear
                      </button>
                    </div>
                  )}

                  {/* Active Month Filter Indicator */}
                  {selectedMonth !== "All" && (
                    <div className="tag-active-filter-strip">
                      <span>Filtered by month: <strong>{formatMonthKey(selectedMonth)}</strong></span>
                      <button type="button" className="clear-tag-btn" onClick={() => setSelectedMonth("All")}>
                        Clear
                      </button>
                    </div>
                  )}
                </div>

                <div className="subtoolbar-right">
                  {/* View Mode Toggle: Grid vs Table */}
                  <div className="view-mode-toggle">
                    <button
                      type="button"
                      className={`view-mode-btn ${viewMode === "grid" ? "active" : ""}`}
                      onClick={() => setViewMode("grid")}
                      title="Grid View"
                    >
                      <GridIcon />
                    </button>
                    <button
                      type="button"
                      className={`view-mode-btn ${viewMode === "table" ? "active" : ""}`}
                      onClick={() => setViewMode("table")}
                      title="Table List View"
                    >
                      <ListIcon />
                    </button>
                  </div>

                  {/* Manage / Multi-Select Button */}
                  {groupedItems.length > 0 && (
                    <button
                      type="button"
                      className={`action-pill-btn ${isSelectMode ? "active" : ""}`}
                      onClick={() => {
                        setIsSelectMode(!isSelectMode);
                        setSelectedPathnames(new Set());
                      }}
                    >
                      {isSelectMode ? "Cancel selection" : "Manage Files"}
                    </button>
                  )}
                </div>
              </div>

              {/* Tag Quick-Filter Bar if tags exist */}
              {availableTags.length > 0 && (
                <div className="category-filters-bar" style={{ marginTop: "0.5rem" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--muted)", alignSelf: "center", marginRight: "0.25rem" }}>
                    Tags:
                  </span>
                  <button
                    type="button"
                    className={`filter-pill ${selectedTag === "All" ? "active" : ""}`}
                    onClick={() => setSelectedTag("All")}
                  >
                    All
                  </button>
                  {availableTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      className={`filter-pill ${selectedTag === tag ? "active" : ""}`}
                      onClick={() => setSelectedTag(tag === selectedTag ? "All" : tag)}
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              )}

              {/* Month Quick-Filter Bar */}
              {availableMonths.length > 1 && (
                <div className="category-filters-bar" style={{ marginTop: "0.35rem" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--muted)", alignSelf: "center", marginRight: "0.25rem" }}>
                    Month:
                  </span>
                  <button
                    type="button"
                    className={`filter-pill ${selectedMonth === "All" ? "active" : ""}`}
                    onClick={() => setSelectedMonth("All")}
                  >
                    All
                  </button>
                  {availableMonths.map((m) => (
                    <button
                      key={m}
                      type="button"
                      className={`filter-pill ${selectedMonth === m ? "active" : ""}`}
                      onClick={() => setSelectedMonth(m === selectedMonth ? "All" : m)}
                    >
                      {formatMonthKey(m)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Results Section Title */}
            <section className="section-title">
              <h2>
                <FileIcon />
                Vault Documents ({filteredAndSortedItems.length})
              </h2>
            </section>

            {initialLoading ? (
              <div className="viewer-loading" style={{ height: "200px", background: "transparent" }}>
                <div className="spinner"></div>
                <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>Scanning vault storage...</span>
              </div>
            ) : filteredAndSortedItems.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <FileIcon />
                </div>
                <h2>No components found</h2>
                <p>Your search returned 0 matches, or your storage is empty.</p>
              </div>
            ) : viewMode === "grid" ? (
              /* GRID VIEW */
              <div className="vault-grid">
                {filteredAndSortedItems.map((group, index) => {
                  const item = group.latestItem;
                  const hasMultipleVersions = group.versions.length > 1;
                  const category = getFileCategory(item.filename);
                  const isMd = item.filename.toLowerCase().endsWith(".md") || item.pathname.toLowerCase().endsWith(".md");

                  return (
                    <div
                      key={item.pathname}
                      className={`vault-card ${isSelectMode ? "in-select-mode" : ""} ${
                        selectedPathnames.has(item.pathname) ? "selected" : ""
                      }`}
                      onClick={() => {
                        if (isSelectMode) {
                          const next = new Set(selectedPathnames);
                          if (next.has(item.pathname)) {
                            next.delete(item.pathname);
                          } else {
                            next.add(item.pathname);
                          }
                          setSelectedPathnames(next);
                        } else {
                          handleSelectPathname(item.pathname);
                        }
                      }}
                    >
                      <div className="card-number-badge">{index + 1}</div>

                      {/* Header metadata row */}
                      <div className="card-header-meta">
                        <span className={`card-category-pill ${getCategoryBadgeClass(category)}`}>
                          {category}
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                          <span className="card-ext-badge">{isMd ? ".md" : ".html"}</span>
                          <span className="card-recency-tag">{getRecencyTag(item.uploadedAt)}</span>
                        </div>
                      </div>

                      {/* Checkbox in select mode */}
                      {isSelectMode && (
                        <div className="card-select-checkbox">
                          <div className={`checkbox-circle ${selectedPathnames.has(item.pathname) ? "checked" : ""}`}>
                            {selectedPathnames.has(item.pathname) && (
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Action buttons on card hover */}
                      {!isSelectMode && (
                        <div className="card-actions">
                          <button
                            type="button"
                            className="card-action-btn"
                            title="Preview document"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectPathname(item.pathname);
                            }}
                          >
                            <EyeIcon />
                          </button>
                          <button
                            type="button"
                            className="card-action-btn"
                            title="Edit document content"
                            onClick={(e) => handleEditContentClick(e, item)}
                          >
                            <CodeIcon />
                          </button>
                          <button
                            type="button"
                            className="card-action-btn"
                            title="Manage tags"
                            onClick={(e) => {
                              e.stopPropagation();
                              setTagModalItems([item]);
                            }}
                          >
                            <TagIcon />
                          </button>
                          <button
                            type="button"
                            className="card-action-btn"
                            title="Rename document title"
                            onClick={(e) => handleRenameClick(e, item)}
                          >
                            <EditIcon />
                          </button>
                          <button
                            type="button"
                            className="card-action-btn delete-btn"
                            title="Delete document"
                            onClick={(e) => handleDeleteClick(e, group)}
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      )}

                      <h3>{item.filename}</h3>
                      <p className="card-description">{getFileDescription(item.filename)}</p>

                      <div className="card-divider" />

                      {/* Card Footer with file metrics & tag chips */}
                      <div className="card-footer">
                        <div className="card-footer-left">
                          <span>{formatFileSize(item.size)}</span>
                          {hasMultipleVersions && (
                            <span style={{ color: "var(--accent)", fontWeight: 700 }}>
                              • v{group.versions.length}
                            </span>
                          )}
                        </div>

                        <div className="card-tags-area">
                          {item.tags &&
                            item.tags.map((tag) => (
                              <span
                                key={tag}
                                className="card-tag"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedTag(tag);
                                }}
                                title={`Filter by #${tag}`}
                              >
                                #{tag}
                              </span>
                            ))}
                          <button
                            type="button"
                            className="add-tag-inline-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setTagModalItems([item]);
                            }}
                            title="Manage tags"
                          >
                            + Tag
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* TABLE / LIST VIEW */
              <div className="vault-table-wrapper">
                <table className="vault-table">
                  <thead>
                    <tr>
                      <th style={{ width: "40px" }}>#</th>
                      <th>Document</th>
                      <th>Category</th>
                      <th>Tags</th>
                      <th>Size</th>
                      <th>Updated</th>
                      <th style={{ textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAndSortedItems.map((group, index) => {
                      const item = group.latestItem;
                      const hasMultipleVersions = group.versions.length > 1;
                      const category = getFileCategory(item.filename);
                      const isMd = item.filename.toLowerCase().endsWith(".md") || item.pathname.toLowerCase().endsWith(".md");

                      return (
                        <tr
                          key={item.pathname}
                          onClick={() => {
                            if (isSelectMode) {
                              const next = new Set(selectedPathnames);
                              if (next.has(item.pathname)) {
                                next.delete(item.pathname);
                              } else {
                                next.add(item.pathname);
                              }
                              setSelectedPathnames(next);
                            } else {
                              handleSelectPathname(item.pathname);
                            }
                          }}
                        >
                          <td style={{ color: "var(--muted)", fontWeight: 700 }}>{index + 1}</td>
                          <td>
                            <div className="table-doc-cell">
                              <div className="table-doc-icon">
                                <FileIcon />
                              </div>
                              <div>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                                  <span className="table-doc-title">{item.filename}</span>
                                  <span className="card-ext-badge">{isMd ? ".md" : ".html"}</span>
                                  {hasMultipleVersions && (
                                    <span className="table-doc-versions">v{group.versions.length}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className={`card-category-pill ${getCategoryBadgeClass(category)}`}>
                              {category}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
                              {item.tags && item.tags.length > 0 ? (
                                item.tags.map((t) => (
                                  <span
                                    key={t}
                                    className="card-tag"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedTag(t);
                                    }}
                                  >
                                    #{t}
                                  </span>
                                ))
                              ) : (
                                <span style={{ color: "var(--muted)", fontSize: "0.75rem" }}>—</span>
                              )}
                            </div>
                          </td>
                          <td style={{ color: "var(--muted)", fontWeight: 600 }}>{formatFileSize(item.size)}</td>
                          <td style={{ color: "var(--muted)", whiteSpace: "nowrap" }}>
                            {formatDate(item.uploadedAt)}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <div className="table-actions-cell" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                className="card-action-icon-btn primary"
                                title="Preview document"
                                onClick={() => handleSelectPathname(item.pathname)}
                              >
                                <EyeIcon />
                              </button>
                              <button
                                type="button"
                                className="card-action-icon-btn"
                                title="Edit document content"
                                onClick={(e) => handleEditContentClick(e, item)}
                              >
                                <CodeIcon />
                              </button>
                              <button
                                type="button"
                                className="card-action-icon-btn"
                                title="Manage tags"
                                onClick={() => setTagModalItems([item])}
                              >
                                <TagIcon />
                              </button>
                              <button
                                type="button"
                                className="card-action-icon-btn"
                                title="Rename document title"
                                onClick={(e) => handleRenameClick(e, item)}
                              >
                                <EditIcon />
                              </button>
                              <button
                                type="button"
                                className="card-action-icon-btn delete-btn"
                                title="Delete document"
                                onClick={(e) => handleDeleteClick(e, group)}
                              >
                                <TrashIcon />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          <EditorView
            items={items}
            initialItem={editorTargetItem}
            onSaveComplete={handleSaveComplete}
          />
        )}
      </main>

      {/* Sticky Bulk Action Control Bar */}
      {isSelectMode && (
        <div className="bulk-action-bar">
          <div className="bulk-action-content">
            <span className="selected-count">
              <strong>{selectedPathnames.size}</strong> of <strong>{filteredAndSortedItems.length}</strong> items selected
            </span>
            <div className="bulk-action-buttons">
              <button
                type="button"
                className="bulk-btn select-all-btn"
                onClick={handleSelectAll}
              >
                {selectedPathnames.size === filteredAndSortedItems.length ? "Deselect All" : "Select All"}
              </button>
              <button
                type="button"
                className="bulk-btn"
                style={{ background: "#2563eb", color: "#ffffff" }}
                disabled={selectedPathnames.size === 0 || isActionLoading}
                onClick={() => {
                  const selectedDocs: HtmlLibraryItem[] = [];
                  for (const group of groupedItems) {
                    if (selectedPathnames.has(group.latestItem.pathname)) {
                      selectedDocs.push(group.latestItem);
                    }
                  }
                  setTagModalItems(selectedDocs);
                }}
              >
                🏷️ Batch Tag
              </button>
              <button
                type="button"
                className="bulk-btn delete-btn"
                disabled={selectedPathnames.size === 0 || isActionLoading}
                onClick={handleDeleteSelected}
              >
                {isActionLoading ? "Deleting..." : "Delete Selected"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tag Manager Modal (Single & Batch) */}
      {tagModalItems && (
        <TagManagerModal
          items={tagModalItems}
          allAvailableTags={availableTags}
          onClose={() => setTagModalItems(null)}
          onSave={async (tags) => {
            if (tagModalItems.length === 1) {
              await handleSingleTagSave(tagModalItems[0], tags);
            } else {
              await handleBatchTagSave(tags);
            }
          }}
        />
      )}

      {/* Rename Dialog Modal */}
      {renamingItem && (
        <div
          className="modal-backdrop"
          onClick={() => {
            if (!isActionLoading) setRenamingItem(null);
          }}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Rename Document Title</h3>
            <p>Specify a clean, recognizable name for this document in your vault storage.</p>

            <div className="input-group">
              <input
                type="text"
                value={newFilenameInput}
                onChange={(e) => setNewFilenameInput(e.target.value)}
                placeholder="Enter new name"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newFilenameInput.trim() && !isActionLoading) {
                    performRename();
                  }
                }}
              />
            </div>

            {actionError && <div className="error-text">{actionError}</div>}

            <div className="modal-actions">
              <button
                type="button"
                className="modal-btn-cancel"
                onClick={() => {
                  setRenamingItem(null);
                  setActionError(null);
                }}
                disabled={isActionLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="modal-btn-save"
                onClick={performRename}
                disabled={isActionLoading || !newFilenameInput.trim()}
              >
                {isActionLoading ? "Renaming..." : "Save Title"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
