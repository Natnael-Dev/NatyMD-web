import type { ExtractedImage, TextItem, ConvertResult } from "./types";

type Line = {
  page: number;
  y: number;
  x: number;
  fontSize: number;
  height: number;
  items: TextItem[];
  text: string;
};

type BlockCommon = { page: number; y: number };
type Block = BlockCommon &
  (
    | { kind: "heading"; level: 1 | 2 | 3 | 4; text: string; lines: Line[] }
    | { kind: "paragraph"; text: string; lines: Line[] }
    | { kind: "list"; items: { text: string; indent: number; ordered: boolean }[] }
    | { kind: "table"; rows: string[][] }
    | { kind: "codeblock"; text: string }
    | { kind: "image"; md: string }
  );

function mode(nums: number[]): number {
  if (nums.length === 0) return 0;
  const counts = new Map<number, number>();
  for (const n of nums) {
    const k = Math.round(n * 2) / 2;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  let best = 0;
  let bestCount = -1;
  for (const [k, c] of counts) {
    if (c > bestCount) {
      best = k;
      bestCount = c;
    }
  }
  return best;
}

function escapeInline(text: string): string {
  return text.replace(/([\\`*_{}\[\]()#+!|])/g, "\\$1");
}

function normalizeForRepeat(s: string): string {
  return s.trim().toLowerCase().replace(/\d+/g, "#").replace(/\s+/g, " ");
}

function stripRepeatedHeadersFooters(items: TextItem[]): TextItem[] {
  const pages = new Map<number, TextItem[]>();
  for (const it of items) {
    let arr = pages.get(it.page);
    if (!arr) {
      arr = [];
      pages.set(it.page, arr);
    }
    arr.push(it);
  }
  if (pages.size < 3) return items;

  const pageHeights = new Map<number, number>();
  for (const [p, arr] of pages) {
    pageHeights.set(p, Math.max(...arr.map((i) => i.y)));
  }

  // Bucket top/bottom 12% by (rounded y, normalized text) across pages.
  const buckets = new Map<string, Set<number>>();
  for (const [p, arr] of pages) {
    const h = pageHeights.get(p) ?? 0;
    for (const it of arr) {
      const rel = it.y / (h || 1);
      if (rel > 0.12 && rel < 0.88) continue;
      const key = `${Math.round(it.y)}|${normalizeForRepeat(it.text)}`;
      let s = buckets.get(key);
      if (!s) {
        s = new Set();
        buckets.set(key, s);
      }
      s.add(p);
    }
  }

  const threshold = Math.max(2, Math.floor(pages.size * 0.6));
  const dropKeys = new Set<string>();
  for (const [key, seenPages] of buckets) {
    if (seenPages.size >= threshold) dropKeys.add(key);
  }

  if (dropKeys.size === 0) return items;

  return items.filter((it) => {
    const h = pageHeights.get(it.page) ?? 0;
    const rel = it.y / (h || 1);
    if (rel > 0.12 && rel < 0.88) return true;
    const key = `${Math.round(it.y)}|${normalizeForRepeat(it.text)}`;
    return !dropKeys.has(key);
  });
}

function groupIntoLines(items: TextItem[]): Line[] {
  const byPage = new Map<number, TextItem[]>();
  for (const it of items) {
    let arr = byPage.get(it.page);
    if (!arr) {
      arr = [];
      byPage.set(it.page, arr);
    }
    arr.push(it);
  }

  const lines: Line[] = [];
  const sortedPages = Array.from(byPage.keys()).sort((a, b) => a - b);

  for (const p of sortedPages) {
    const pageItems = byPage.get(p)!;
    if (pageItems.length === 0) continue;
    const medianH =
      mode(pageItems.map((i) => i.height || i.fontSize)) ||
      pageItems[0].fontSize;
    const tolerance = Math.max(1.5, medianH * 0.4);

    const sorted = [...pageItems].sort((a, b) => a.y - b.y || a.x - b.x);

    let bucket: TextItem[] = [];
    let bucketY = sorted[0].y;

    const flush = () => {
      if (bucket.length === 0) return;
      bucket.sort((a, b) => a.x - b.x);
      const text = joinLineText(bucket);
      const line: Line = {
        page: p,
        y: bucket.reduce((s, i) => s + i.y, 0) / bucket.length,
        x: bucket[0].x,
        fontSize: mode(bucket.map((i) => i.fontSize)) || bucket[0].fontSize,
        height: mode(bucket.map((i) => i.height)) || bucket[0].height,
        items: bucket,
        text,
      };
      if (line.text.trim().length > 0) lines.push(line);
      bucket = [];
    };

    for (const it of sorted) {
      if (Math.abs(it.y - bucketY) <= tolerance) {
        bucket.push(it);
        bucketY = (bucketY + it.y) / 2;
      } else {
        flush();
        bucket.push(it);
        bucketY = it.y;
      }
    }
    flush();
  }

  return lines;
}

function joinLineText(items: TextItem[]): string {
  let out = "";
  for (let i = 0; i < items.length; i++) {
    const cur = items[i];
    if (i === 0) {
      out += cur.text;
      continue;
    }
    const prev = items[i - 1];
    const prevEnd = prev.x + prev.width;
    const gap = cur.x - prevEnd;
    const avgChar = Math.max(2, (prev.width / Math.max(1, prev.text.length)) || cur.fontSize * 0.4);
    const needsSpace = gap > avgChar * 0.35 && !out.endsWith(" ") && !cur.text.startsWith(" ");
    out += (needsSpace ? " " : "") + cur.text;
  }
  return out.replace(/\s+/g, " ").trim();
}

function rejoinHyphenation(paragraphLines: Line[]): string {
  let out = "";
  for (let i = 0; i < paragraphLines.length; i++) {
    const cur = paragraphLines[i].text;
    const next = paragraphLines[i + 1]?.text;
    if (i === 0) {
      out = cur;
      continue;
    }
    if (/\w-$/.test(out) && /^[a-zà-ÿ]/.test(cur)) {
      out = out.replace(/-$/, "") + cur;
    } else {
      out += " " + cur;
    }
    void next;
  }
  return out.replace(/\s+/g, " ").trim();
}

const BULLET_RE = /^\s*[•·◦▪▫●■\-*–]\s+/;
const NUM_RE = /^\s*(\d+)[.)]\s+/;

function classifyList(text: string): { ordered: boolean; content: string } | null {
  if (BULLET_RE.test(text)) return { ordered: false, content: text.replace(BULLET_RE, "") };
  const m = text.match(NUM_RE);
  if (m) return { ordered: true, content: text.replace(NUM_RE, "") };
  return null;
}

function detectTable(lines: Line[], start: number): { end: number; rows: string[][] } | null {
  if (start >= lines.length) return null;
  const first = lines[start];
  if (first.items.length < 3) return null;

  const cols = first.items.map((i) => i.x + i.width / 2);
  const rows: string[][] = [firstRowFrom(first, cols)];
  let end = start;

  for (let i = start + 1; i < lines.length; i++) {
    const ln = lines[i];
    if (ln.page !== first.page) break;
    if (ln.items.length < cols.length - 1 || ln.items.length > cols.length + 1) break;
    const centers = ln.items.map((it) => it.x + it.width / 2);
    const aligned = centers.every((c) =>
      cols.some((col) => Math.abs(col - c) <= 6),
    );
    if (!aligned) break;
    rows.push(rowFromLine(ln, cols));
    end = i;
  }

  if (rows.length < 2) return null;
  return { end, rows };
}

function firstRowFrom(line: Line, cols: number[]): string[] {
  return rowFromLine(line, cols);
}

function rowFromLine(line: Line, cols: number[]): string[] {
  const cells = cols.map(() => "");
  for (const it of line.items) {
    const c = it.x + it.width / 2;
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < cols.length; i++) {
      const d = Math.abs(cols[i] - c);
      if (d < bestDist) {
        best = i;
        bestDist = d;
      }
    }
    cells[best] = (cells[best] ? cells[best] + " " : "") + it.text;
  }
  return cells.map((c) => c.trim());
}

function renderInline(line: Line): string {
  type Run = { text: string; bold: boolean; italic: boolean };
  const runs: Run[] = [];
  for (let i = 0; i < line.items.length; i++) {
    const it = line.items[i];
    const last = runs[runs.length - 1];
    if (last && last.bold === it.bold && last.italic === it.italic) {
      const prev = line.items[i - 1];
      const prevEnd = prev.x + prev.width;
      const gap = it.x - prevEnd;
      const avgChar = Math.max(2, prev.width / Math.max(1, prev.text.length) || it.fontSize * 0.4);
      const sep = gap > avgChar * 0.35 && !last.text.endsWith(" ") && !it.text.startsWith(" ") ? " " : "";
      last.text += sep + it.text;
    } else {
      runs.push({ text: it.text, bold: it.bold, italic: it.italic });
    }
  }

  return runs
    .map((r) => {
      const escaped = escapeInline(r.text);
      if (r.bold && r.italic) return `***${escaped}***`;
      if (r.bold) return `**${escaped}**`;
      if (r.italic) return `*${escaped}*`;
      return escaped;
    })
    .join("");
}

function buildBlocks(lines: Line[], warnings: string[]): Block[] {
  if (lines.length === 0) return [];

  const bodySize = mode(lines.map((l) => l.fontSize)) || lines[0].fontSize;
  const distinctLarger = Array.from(
    new Set(
      lines
        .map((l) => Math.round(l.fontSize * 2) / 2)
        .filter((s) => s > bodySize + 0.5),
    ),
  ).sort((a, b) => b - a);
  const sizeToLevel = new Map<number, 1 | 2 | 3 | 4>();
  distinctLarger.slice(0, 4).forEach((size, i) => {
    sizeToLevel.set(size, (i + 1) as 1 | 2 | 3 | 4);
  });

  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const ln = lines[i];

    const table = detectTable(lines, i);
    if (table) {
      blocks.push({ kind: "table", rows: table.rows, page: lines[i].page, y: lines[i].y });
      i = table.end + 1;
      continue;
    }

    const rounded = Math.round(ln.fontSize * 2) / 2;
    const headingLevel = sizeToLevel.get(rounded);
    const looksLikeHeading =
      headingLevel &&
      ln.text.length < 120 &&
      !/[.,;:]$/.test(ln.text.trim());
    if (looksLikeHeading) {
      blocks.push({
        kind: "heading",
        level: headingLevel,
        text: renderInline(ln),
        lines: [ln],
        page: ln.page,
        y: ln.y,
      });
      i++;
      continue;
    }

    const listStart = classifyList(ln.text);
    if (listStart) {
      const items: { text: string; indent: number; ordered: boolean }[] = [];
      const baseX = ln.x;
      const listPage = ln.page;
      const listY = ln.y;
      while (i < lines.length) {
        const l2 = lines[i];
        const c = classifyList(l2.text);
        if (!c || l2.page !== ln.page) break;
        const indent = Math.max(0, Math.round((l2.x - baseX) / 12));
        items.push({ text: c.content.trim(), indent, ordered: c.ordered });
        i++;
      }
      blocks.push({ kind: "list", items, page: listPage, y: listY });
      continue;
    }

    // Paragraph — accumulate lines that share a left edge and a small gap.
    const paraLines: Line[] = [ln];
    let j = i + 1;
    while (j < lines.length) {
      const prev = paraLines[paraLines.length - 1];
      const cand = lines[j];
      if (cand.page !== prev.page) break;
      const vGap = cand.y - prev.y;
      const maxGap = (prev.height || prev.fontSize) * 1.6;
      const sameCol = Math.abs(cand.x - prev.x) <= 6;
      if (vGap <= 0 || vGap > maxGap || !sameCol) break;
      if (classifyList(cand.text)) break;
      const candRounded = Math.round(cand.fontSize * 2) / 2;
      if (sizeToLevel.has(candRounded)) break;
      paraLines.push(cand);
      j++;
    }

    const merged = rejoinHyphenation(paraLines);
    const inline = paraLines.map((l) => renderInline(l)).join(" ");
    const text = Math.abs(inline.length - merged.length) < 8 ? inline : merged;
    blocks.push({
      kind: "paragraph",
      text,
      lines: paraLines,
      page: paraLines[0].page,
      y: paraLines[0].y,
    });
    i = j;
  }

  if (blocks.length === 0) warnings.push("No text blocks detected.");
  return blocks;
}

function assembleMarkdown(blocks: Block[]): string {
  const parts: string[] = [];
  for (const b of blocks) {
    switch (b.kind) {
      case "heading":
        parts.push(`${"#".repeat(b.level)} ${b.text.trim()}`);
        break;
      case "paragraph":
        parts.push(b.text.trim());
        break;
      case "list": {
        const lines: string[] = [];
        for (const it of b.items) {
          const marker = it.ordered ? "1." : "-";
          const indent = "  ".repeat(it.indent);
          lines.push(`${indent}${marker} ${it.text}`);
        }
        parts.push(lines.join("\n"));
        break;
      }
      case "table": {
        const [header, ...rest] = b.rows;
        const head = `| ${header.map((c) => c || " ").join(" | ")} |`;
        const sep = `| ${header.map(() => "---").join(" | ")} |`;
        const body = rest.map((r) => `| ${r.map((c) => c || " ").join(" | ")} |`);
        parts.push([head, sep, ...body].join("\n"));
        break;
      }
      case "codeblock":
        parts.push("```\n" + b.text + "\n```");
        break;
      case "image":
        parts.push(b.md);
        break;
    }
  }
  return parts
    .join("\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((l) => l.replace(/[ \t]+$/g, ""))
    .join("\n")
    .trim();
}

export function itemsToMarkdown(
  rawItems: TextItem[],
  pageCount: number,
  images: ExtractedImage[] = [],
  includeImages = false,
): ConvertResult {
  const warnings: string[] = [];
  const stripped = stripRepeatedHeadersFooters(rawItems);
  const lines = groupIntoLines(stripped);
  const blocks = buildBlocks(lines, warnings);

  // Stable Figure N across the doc; drop "too-small" records (icon spam).
  const orderedImages = [...images].sort((a, b) =>
    a.page - b.page || a.y - b.y || a.index - b.index,
  );
  let figureCount = 0;
  let embeddedCount = 0;
  for (const img of orderedImages) {
    if (img.error === "too-small") continue;
    figureCount += 1;
    const alt = `Figure ${figureCount}`;
    let md: string | null = null;
    if (!includeImages) {
      md = `![${alt}](image omitted — enable "Include images" to embed)`;
    } else if (img.error === "unsupported") {
      md = `![${alt}](image omitted — unsupported encoding)`;
    } else if (img.dataUrl) {
      md = `![${alt}](${img.dataUrl})`;
      embeddedCount += 1;
    } else {
      md = `![${alt}](image omitted — unsupported encoding)`;
    }
    blocks.push({ kind: "image", md, page: img.page, y: img.y });
  }

  blocks.sort((a, b) => a.page - b.page || a.y - b.y);

  const markdown = assembleMarkdown(blocks);
  return { markdown, pageCount, warnings, imageCount: embeddedCount };
}