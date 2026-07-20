import type { ConvertResult } from "@/lib/pdf/types";
import { ActionBar } from "./ActionBar";
import { MarkdownPreview } from "./MarkdownPreview";

type Props = {
  file: File;
  fileUrl: string;
  result: ConvertResult;
  onStartOver: () => void;
};

export function ResultView({ file, fileUrl, result, onStartOver }: Props) {
  return (
    <div
      className="fixed inset-0 z-40 flex flex-col bg-background/85 backdrop-blur-md animate-in fade-in duration-300"
      role="dialog"
      aria-label="Conversion result"
    >
      <ActionBar markdown={result.markdown} filename={file.name} onStartOver={onStartOver} />

      <div className="flex flex-1 flex-col divide-y divide-border overflow-y-auto md:grid md:grid-cols-2 md:divide-y-0 md:divide-x md:overflow-hidden">
        <section className="flex h-[50vh] min-h-0 flex-col md:h-auto">
          <div className="flex items-center justify-between border-b border-border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            <span className="truncate">
              <span className="text-brand">▸</span> {file.name}
            </span>
            <span className="shrink-0">
              {result.pageCount} page{result.pageCount === 1 ? "" : "s"}
            </span>
          </div>
          <div className="relative min-h-0 flex-1 bg-white">
            <iframe
              src={fileUrl}
              title="Original PDF"
              className="absolute inset-0 h-full w-full border-0"
            />
            <noscript>
              <a href={fileUrl} className="text-brand underline">
                Open PDF
              </a>
            </noscript>
          </div>
        </section>

        <section className="flex h-[50vh] min-h-0 flex-col md:h-auto">
          <div className="flex items-center justify-between border-b border-border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            <span>
              <span className="text-brand">▸</span> output.md
            </span>
            <span className="shrink-0">
              {result.markdown.length.toLocaleString()} chars
            </span>
          </div>
          <div className="min-h-0 flex-1">
            <MarkdownPreview markdown={result.markdown} />
          </div>
        </section>
      </div>
    </div>
  );
}