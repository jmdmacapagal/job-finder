import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { parseInline, renderCvPdf } from "./pdf";

describe("parseInline", () => {
  it("marks words inside ** as bold", () => {
    expect(parseInline("**Frontend:** Vue 3, Nuxt")).toEqual([
      { text: "Frontend:", bold: true },
      { text: "Vue", bold: false },
      { text: "3,", bold: false },
      { text: "Nuxt", bold: false },
    ]);
  });
});

describe("renderCvPdf", () => {
  it("renders headings, bullets and characters the PDF fonts lack", async () => {
    const bullets = Array.from({ length: 80 }, (_, i) => `- Shipped feature ${i} → faster pages ✓ 日本`).join("\n");
    const bytes = await renderCvPdf(`# Juan Miguel Macapagal\nDasmariñas – Doha\n\n## Experience\n### Engineer, Acme\n${bullets}`, "JM CV");
    const doc = await PDFDocument.load(bytes);
    expect(doc.getTitle()).toBe("JM CV");
    // 80 bullets don't fit on one A4 page, so it must have wrapped onto a second.
    expect(doc.getPageCount()).toBeGreaterThan(1);
  });
});
