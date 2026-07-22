import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";
import type { ExtractedImage, PageAnalysis, TextItem } from "./types";

type PdfTextItem = {
  str: string;
  transform: number[];
  width: number;
  height: number;
  fontName: string;
  hasEOL?: boolean;
};

type FontDescriptor = {
  name?: string;
  fallbackName?: string;
  bold?: boolean;
  italic?: boolean;
};

function resolveFontMeta(page: PDFPageProxy, fontName: string): { bold: boolean; italic: boolean } {
  try {
    // `commonObjs.get` is sync only after `has`.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const commonObjs = (page as any).commonObjs;
    if (!commonObjs?.has?.(fontName)) return heuristicFromName(fontName);
    const font: FontDescriptor = commonObjs.get(fontName);
    const nameCandidates = [font?.name, font?.fallbackName, fontName]
      .filter(Boolean)
      .map((n) => String(n).toLowerCase());
    const named = nameCandidates.join("|");
    const bold = Boolean(font?.bold) || /bold|black|heavy|semibold|demibold/.test(named);
    const italic = Boolean(font?.italic) || /italic|oblique/.test(named);
    return { bold, italic };
  } catch {
    return heuristicFromName(fontName);
  }
}

function heuristicFromName(fontName: string) {
  const n = fontName.toLowerCase();
  return {
    bold: /bold|black|heavy/.test(n),
    italic: /italic|oblique/.test(n),
  };
}

export async function extractTextItems(
  pdfDoc: PDFDocumentProxy,
  signal?: AbortSignal,
): Promise<TextItem[]> {
  const all: TextItem[] = [];
  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1 });
    const pageHeight = viewport.height;
    const content = await page.getTextContent({
      includeMarkedContent: false,
      disableNormalization: false,
    } as Parameters<typeof page.getTextContent>[0]);

    for (const raw of content.items as PdfTextItem[]) {
      if (!("str" in raw) || raw.str == null) continue;
      const text = raw.str;
      if (text.length === 0) continue;
      const [a, b, , d, e, f] = raw.transform;
      const fontSize = Math.hypot(b, d) || Math.abs(a) || raw.height || 10;
      const y = pageHeight - f; // flip to top-left origin
      const { bold, italic } = resolveFontMeta(page, raw.fontName);
      all.push({
        page: pageNum,
        text,
        x: e,
        y,
        width: raw.width,
        height: raw.height || fontSize,
        fontSize,
        fontName: raw.fontName,
        bold,
        italic,
      });
    }

    // Release page resources — big PDFs otherwise balloon memory.
    page.cleanup();
  }
  return all;
}

/**
 * Cheap first-pass analysis. For each page, computes total text character
 * count and checks the operator list for any image-painting op. A page with
 * near-zero text AND at least one image op is flagged as scanned so the
 * parser can route it through OCR.
 */
export async function analyzePages(pdfDoc: PDFDocumentProxy): Promise<PageAnalysis[]> {
  // pdfjs OPS ids for image painting ops — resolved at runtime from the
  // running pdfjs module to avoid duplicating the enum here.
  const pdfjs = await import("pdfjs-dist");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const OPS: Record<string, number> = (pdfjs as any).OPS ?? {};
  const IMAGE_OPS = new Set(
    [OPS.paintImageXObject, OPS.paintImageMaskXObject, OPS.paintInlineImageXObject].filter(
      (v) => typeof v === "number",
    ),
  );

  const analyses: PageAnalysis[] = [];
  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    let textCharCount = 0;
    try {
      const content = await page.getTextContent({
        includeMarkedContent: false,
        disableNormalization: false,
      } as Parameters<typeof page.getTextContent>[0]);
      for (const raw of content.items as PdfTextItem[]) {
        if ("str" in raw && raw.str) textCharCount += raw.str.trim().length;
      }
    } catch {
      /* if text extraction fails on a page, treat as zero-text */
    }

    let hasImages = false;
    try {
      const opList = await page.getOperatorList();
      for (const fnId of opList.fnArray) {
        if (IMAGE_OPS.has(fnId)) {
          hasImages = true;
          break;
        }
      }
    } catch {
      /* ignore — assume no images if op list fails */
    }

    analyses.push({
      page: pageNum,
      textCharCount,
      hasImages,
      scanned: textCharCount < 75,
    });

    page.cleanup();
  }
  return analyses;
}

/* -------------------------------------------------------------------- */
/* Image extraction                                                     */
/* -------------------------------------------------------------------- */

type PdfImageObj = {
  bitmap?: ImageBitmap;
  width: number;
  height: number;
  data?: Uint8Array | Uint8ClampedArray;
  kind?: number; // 1=GRAY_1BPP, 2=RGB_24BPP, 3=RGBA_32BPP
};

/** Standard PDF 3×3 affine concat: result = m1 · m2. */
function concatMatrix(m1: number[], m2: number[]): number[] {
  return [
    m1[0] * m2[0] + m1[1] * m2[2],
    m1[0] * m2[1] + m1[1] * m2[3],
    m1[2] * m2[0] + m1[3] * m2[2],
    m1[2] * m2[1] + m1[3] * m2[3],
    m1[4] * m2[0] + m1[5] * m2[2] + m2[4],
    m1[4] * m2[1] + m1[5] * m2[3] + m2[5],
  ];
}

async function resolveImageObject(page: PDFPageProxy, arg: unknown): Promise<PdfImageObj | null> {
  // Inline images pass the object directly.
  if (arg && typeof arg === "object" && "width" in (arg as object)) {
    return arg as PdfImageObj;
  }
  if (typeof arg !== "string") return null;
  const name = arg;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const objs: any = (page as any).objs;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const commonObjs: any = (page as any).commonObjs;
  try {
    if (objs?.has?.(name)) return objs.get(name) as PdfImageObj;
  } catch {
    /* fallthrough */
  }
  try {
    if (commonObjs?.has?.(name)) return commonObjs.get(name) as PdfImageObj;
  } catch {
    /* fallthrough */
  }
  return null;
}

async function buildBitmap(img: PdfImageObj): Promise<ImageBitmap> {
  if (img.bitmap) return img.bitmap;
  const { width, height, data, kind } = img;
  if (!data || !width || !height) throw new Error("no image data");
  let rgba: Uint8ClampedArray;
  if (kind === 3 && data.length >= width * height * 4) {
    rgba =
      data instanceof Uint8ClampedArray
        ? data
        : new Uint8ClampedArray(data.buffer, data.byteOffset, width * height * 4);
  } else if (kind === 2 && data.length >= width * height * 3) {
    rgba = new Uint8ClampedArray(width * height * 4);
    for (let i = 0, j = 0; j < rgba.length; i += 3, j += 4) {
      rgba[j] = data[i];
      rgba[j + 1] = data[i + 1];
      rgba[j + 2] = data[i + 2];
      rgba[j + 3] = 255;
    }
  } else {
    throw new Error("unsupported image kind");
  }
  // Force a fresh ArrayBuffer-backed clamped array so TS's ImageData ctor
  // (which rejects SharedArrayBuffer-backed views) is happy.
  const buf = new Uint8ClampedArray(rgba);
  const imageData = new ImageData(buf, width, height);
  return await createImageBitmap(imageData);
}

async function downscaleAndEncode(img: PdfImageObj): Promise<string> {
  const bitmap = await buildBitmap(img);
  try {
    const srcW = bitmap.width;
    const srcH = bitmap.height;
    const scale = Math.min(1, 800 / Math.max(srcW, srcH));
    const dstW = Math.max(1, Math.round(srcW * scale));
    const dstH = Math.max(1, Math.round(srcH * scale));

    const hasOffscreen = typeof OffscreenCanvas !== "undefined";
    if (hasOffscreen) {
      const canvas = new OffscreenCanvas(dstW, dstH);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no 2d context");
      ctx.drawImage(bitmap, 0, 0, dstW, dstH);
      const blob = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.7 });
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error ?? new Error("read failed"));
        reader.readAsDataURL(blob);
      });
    }
    const canvas = document.createElement("canvas");
    canvas.width = dstW;
    canvas.height = dstH;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no 2d context");
    ctx.drawImage(bitmap, 0, 0, dstW, dstH);
    return canvas.toDataURL("image/jpeg", 0.7);
  } finally {
    bitmap.close();
  }
}

/**
 * Walks the operator list, tracking the current transform matrix through
 * save/restore/transform ops, and emits one record per paint*Image* call.
 * When `enabled` is false, no pixels are decoded — records still get
 * emitted (with no dataUrl) so the markdown layer can insert placeholders.
 */
export async function extractPageImages(
  pdfDoc: PDFDocumentProxy,
  pageNum: number,
  opts: { enabled: boolean; signal?: AbortSignal },
): Promise<ExtractedImage[]> {
  if (opts.signal?.aborted) throw new DOMException("Aborted", "AbortError");
  const pdfjs = await import("pdfjs-dist");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const OPS: Record<string, number> = (pdfjs as any).OPS ?? {};
  const OP_SAVE = OPS.save;
  const OP_RESTORE = OPS.restore;
  const OP_TRANSFORM = OPS.transform;
  const OP_PAINT = OPS.paintImageXObject;
  const OP_MASK = OPS.paintImageMaskXObject;
  const OP_INLINE = OPS.paintInlineImageXObject;

  const page = await pdfDoc.getPage(pageNum);
  const viewport = page.getViewport({ scale: 1 });
  const pageHeight = viewport.height;

  let opList;
  try {
    opList = await page.getOperatorList();
  } catch {
    page.cleanup();
    return [];
  }

  const stack: number[][] = [];
  let ctm: number[] = [1, 0, 0, 1, 0, 0];
  const out: ExtractedImage[] = [];
  let paintIndex = 0;

  for (let i = 0; i < opList.fnArray.length; i++) {
    const fn = opList.fnArray[i];
    const args = opList.argsArray[i];
    if (fn === OP_SAVE) {
      stack.push(ctm.slice());
    } else if (fn === OP_RESTORE) {
      const prev = stack.pop();
      if (prev) ctm = prev;
    } else if (fn === OP_TRANSFORM) {
      // args = [a,b,c,d,e,f]; new CTM = args · ctm
      ctm = concatMatrix(args as number[], ctm);
    } else if (fn === OP_PAINT || fn === OP_MASK || fn === OP_INLINE) {
      // Image occupies the unit square [0,1]×[0,1] in image space, painted
      // through CTM. Bottom-left of the image in PDF space is (ctm[4], ctm[5]);
      // top edge (in top-down coords) sits at pageHeight - (ctm[5] + ctm[3]).
      const topY = pageHeight - (ctm[5] + (ctm[3] || 0));
      const record: ExtractedImage = {
        page: pageNum,
        y: topY,
        index: paintIndex++,
      };
      if (!opts.enabled) {
        out.push(record);
        continue;
      }
      try {
        const imgObj = await resolveImageObject(page, (args as unknown[])[0]);
        if (!imgObj) {
          record.error = "unsupported";
          out.push(record);
          continue;
        }
        if ((imgObj.width ?? 0) < 50 || (imgObj.height ?? 0) < 50) {
          record.error = "too-small";
          out.push(record);
          continue;
        }
        const dataUrl = await downscaleAndEncode(imgObj);
        // Base64 payload ≈ (length - "data:image/jpeg;base64,".length) * 0.75
        const b64 = dataUrl.split(",", 2)[1] ?? "";
        if (b64.length * 0.75 < 5 * 1024) {
          record.error = "too-small";
        } else {
          record.dataUrl = dataUrl;
        }
      } catch {
        record.error = "unsupported";
      }
      out.push(record);
    }
  }

  page.cleanup();
  return out;
}
