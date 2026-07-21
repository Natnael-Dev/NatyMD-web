import mammoth from "mammoth";
import type { ConvertResult } from "../pdf/types";

export async function convertDocxToMarkdown(file: File): Promise<ConvertResult> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });

  const text = result.value ?? "";
  const markdown = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n\n");

  const warnings = (result.messages ?? []).map((m) => m.message);

  return {
    markdown,
    pageCount: 1,
    warnings,
    rawText: text,
  };
}
