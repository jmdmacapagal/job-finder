import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";

// A4 in points.
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 48;
const TEXT = rgb(0.1, 0.1, 0.12);
const MUTED = rgb(0.4, 0.4, 0.45);

type Word = { text: string; bold: boolean };

/** Splits "**Label:** rest" style text into words that remember whether they're bold. */
export function parseInline(text: string): Word[] {
  const words: Word[] = [];
  text.split("**").forEach((part, i) => {
    for (const w of part.split(/\s+/)) if (w) words.push({ text: w, bold: i % 2 === 1 });
  });
  return words;
}

/**
 * Renders the CV's Markdown (headings, bullets, paragraphs, **bold**) to a
 * one-column PDF. The standard PDF fonts only cover Latin text, so other
 * characters are swapped for close matches or dropped.
 */
export async function renderCvPdf(markdown: string, title: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(title);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const safe = makeSanitizer(regular);

  let page: PDFPage = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;
  const ensureRoom = (height: number) => {
    if (y - height < MARGIN) {
      page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }
  };

  const writeWords = (words: Word[], size: number, opts: { indent?: number; color?: typeof TEXT; allBold?: boolean } = {}) => {
    const indent = opts.indent ?? 0;
    const maxWidth = PAGE_WIDTH - MARGIN * 2 - indent;
    const lineHeight = size * 1.35;
    const space = regular.widthOfTextAtSize(" ", size);
    let line: { word: Word; width: number }[] = [];
    let lineWidth = 0;

    const flush = () => {
      if (line.length === 0) return;
      ensureRoom(lineHeight);
      let x = MARGIN + indent;
      for (const { word, width } of line) {
        page.drawText(word.text, {
          x,
          y: y - size,
          size,
          font: opts.allBold || word.bold ? bold : regular,
          color: opts.color ?? TEXT,
        });
        x += width + space;
      }
      y -= lineHeight;
      line = [];
      lineWidth = 0;
    };

    for (const raw of words) {
      const word = { ...raw, text: safe(raw.text) };
      if (!word.text) continue;
      const width = (opts.allBold || word.bold ? bold : regular).widthOfTextAtSize(word.text, size);
      if (line.length > 0 && lineWidth + space + width > maxWidth) flush();
      lineWidth += (line.length > 0 ? space : 0) + width;
      line.push({ word, width });
    }
    flush();
  };

  for (const rawLine of markdown.split("\n")) {
    const line = rawLine.trimEnd();
    if (!line.trim() || /^-{3,}$/.test(line.trim())) {
      y -= 4;
      continue;
    }
    if (line.startsWith("# ")) {
      writeWords(parseInline(line.slice(2)), 20, { allBold: true });
      y -= 2;
    } else if (line.startsWith("## ")) {
      y -= 8;
      ensureRoom(30);
      writeWords(parseInline(line.slice(3)), 12.5, { allBold: true });
      page.drawLine({
        start: { x: MARGIN, y: y + 2 },
        end: { x: PAGE_WIDTH - MARGIN, y: y + 2 },
        thickness: 0.6,
        color: MUTED,
      });
      y -= 4;
    } else if (line.startsWith("### ")) {
      y -= 4;
      ensureRoom(30);
      writeWords(parseInline(line.slice(4)), 11, { allBold: true });
    } else if (/^\s*[-*] /.test(line)) {
      const indent = 12;
      ensureRoom(14);
      page.drawText("•", { x: MARGIN + 3, y: y - 10, size: 10, font: regular, color: TEXT });
      writeWords(parseInline(line.replace(/^\s*[-*] /, "")), 10, { indent });
    } else {
      writeWords(parseInline(line), 10);
    }
  }

  return doc.save();
}

const REPLACEMENTS: Record<string, string> = {
  "→": "->",
  "←": "<-",
  "≈": "~",
  "≥": ">=",
  "≤": "<=",
  "✓": "",
  " ": " ",
};

function makeSanitizer(font: PDFFont) {
  const cache = new Map<string, string>();
  const fix = (ch: string): string => {
    const cached = cache.get(ch);
    if (cached !== undefined) return cached;
    let out = REPLACEMENTS[ch];
    if (out === undefined) {
      try {
        font.encodeText(ch);
        out = ch;
      } catch {
        // Try the accent-free letter (e.g. "ș" → "s") before giving up on it.
        const base = ch.normalize("NFD").replace(/\p{M}/gu, "");
        out = base !== ch && base ? fix(base) : "";
      }
    }
    cache.set(ch, out);
    return out;
  };
  return (text: string) => Array.from(text, fix).join("");
}
