import type { ConvertResult } from "../pdf/types";

export async function convertTextToMarkdown(file: File): Promise<ConvertResult> {
  const content = await file.text();

  return {
    markdown: content,
    pageCount: 1,
    warnings: [],
    rawText: content,
  };
}
