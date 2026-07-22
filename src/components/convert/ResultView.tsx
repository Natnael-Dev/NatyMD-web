import { useEffect, useRef, useState } from "react";
import type { ConvertResult } from "@/lib/pdf/types";
import { ActionBar } from "./ActionBar";
import {
  FileText,
  CheckCircle2,
  ShieldCheck,
  Download,
  Copy,
  Check,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { copyToClipboard } from "@/lib/clipboard";
import { useTokenCount } from "@/hooks/useTokenCount";

type Props = {
  file: File;
  fileUrl: string;
  result: ConvertResult;
  onStartOver: () => void;
};

// Smooth React count-up hook for metric animations with delay support
function useCountUp(target: number, duration: number = 800, delay: number = 0) {
  const [count, setCount] = useState(0);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (target === 0) {
      setCount(0);
      return;
    }

    let startTimestamp: number | null = null;
    const startValue = count;
    let animationFrameId: number;
    const actualDelay = isFirstRender.current ? delay : 0;
    const actualDuration = isFirstRender.current ? duration : 200;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / actualDuration, 1);
      const ease = progress * (2 - progress); // easeOutQuad
      setCount(Math.floor(ease * (target - startValue) + startValue));

      if (progress < 1) {
        animationFrameId = window.requestAnimationFrame(step);
      } else {
        isFirstRender.current = false;
      }
    };

    const timerId = setTimeout(() => {
      animationFrameId = window.requestAnimationFrame(step);
    }, actualDelay);

    return () => {
      clearTimeout(timerId);
      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId);
      }
    };
  }, [target, duration, delay]);

  return count;
}

export function ResultView({ file, fileUrl, result, onStartOver }: Props) {
  const [markdown, setMarkdown] = useState(result.markdown);
  const [formatPreset, setFormatPreset] = useState<"markdown" | "claude-xml">("markdown");
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showGlow, setShowGlow] = useState(false);

  useEffect(() => {
    setMarkdown(result.markdown);
    setFormatPreset("markdown");
  }, [result.markdown]);

  const handleFormatChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPreset = e.target.value as "markdown" | "claude-xml";
    setFormatPreset(newPreset);
    setMarkdown((prev) => {
      const xmlPattern = /^<documents>\s*<document>([\s\S]*?)<\/document>\s*<\/documents>$/;
      const match = prev.match(xmlPattern);
      if (newPreset === "claude-xml") {
        if (match) return prev;
        return `<documents>\n  <document>\n${prev}\n  </document>\n</documents>`;
      } else {
        if (match) return match[1].trim();
        return prev;
      }
    });
  };

  const rawTokens = useTokenCount(result.rawText || "");
  const cleanTokens = useTokenCount(markdown || "");

  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  const isDocx =
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    file.name.toLowerCase().endsWith(".docx");
  const isTextFile = !isPdf && !isDocx;
  const ext = isPdf ? "PDF" : isDocx ? "DOCX" : file.name.split(".").pop()?.toUpperCase() || "TEXT";

  // For plain text files (.txt, .md, .csv), raw and clean token counts match unless formatting was stripped
  const estimatedRawTokens = isTextFile
    ? Math.max(rawTokens, cleanTokens)
    : Math.max(rawTokens, Math.ceil(cleanTokens * 1.25));
  const savedTokens = Math.max(0, estimatedRawTokens - cleanTokens);
  const percentSaved =
    estimatedRawTokens > 0 ? Math.round((savedTokens / estimatedRawTokens) * 100) : 0;

  // Staggered animated metric values: Card 1: 0ms delay, Card 2: 120ms delay, Card 3: 240ms delay
  const animatedRawTokens = useCountUp(estimatedRawTokens, 800, 0);
  const animatedCleanTokens = useCountUp(cleanTokens, 800, 120);
  const animatedSavedTokens = useCountUp(savedTokens, 800, 240);

  // Trigger compiler glow accent after Card 3 finishes counting up (240ms delay + 800ms duration = 1040ms)
  useEffect(() => {
    if (estimatedRawTokens > 0) {
      setShowGlow(false);
      const timer = setTimeout(() => {
        setShowGlow(true);
      }, 1100);
      return () => clearTimeout(timer);
    }
  }, [estimatedRawTokens]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  // Global keyboard shortcut: Ctrl+C or Cmd+C copies markdown text automatically while ResultView is open
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
        const selection = window.getSelection()?.toString();
        if (!selection || selection.length === 0) {
          e.preventDefault();
          void handleCopy();
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [markdown]);

  async function handleCopy() {
    const success = await copyToClipboard(markdown);
    if (success) {
      setCopyStatus("copied");
      toast.success("Copied Markdown to clipboard!");
    } else {
      setCopyStatus("failed");
      toast.error("Failed to copy Markdown.");
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopyStatus("idle"), 2000);
  }

  function handleDownload() {
    try {
      const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const base = file.name.replace(/\.(pdf|docx|txt|md|csv)$/i, "") || "document";
      const a = document.createElement("a");
      a.href = url;
      a.download = `${base}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 0);
      toast.success(`Downloaded ${base}.md`);
    } catch {
      toast.error("Failed to download Markdown file.");
    }
  }

  const copyLabel =
    copyStatus === "copied"
      ? "Copied!"
      : copyStatus === "failed"
        ? "Copy Failed"
        : "Copy to Clipboard";

  const copyClass =
    copyStatus === "copied"
      ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-400"
      : copyStatus === "failed"
        ? "border-destructive/60 bg-destructive/10 text-destructive"
        : "border-border text-foreground hover:border-brand hover:text-brand bg-background/50";

  return (
    <div
      className="fixed inset-0 z-40 flex flex-col bg-background/85 backdrop-blur-md animate-in fade-in duration-300"
      role="dialog"
      aria-label="Conversion result"
    >
      <ActionBar filename={file.name} onStartOver={onStartOver} />

      {/* Prominent Tokens Saved Impact Banner with slide-down entrance */}
      <section className="border-b border-border/80 bg-card/30 px-4 py-4 backdrop-blur-sm sm:px-6 natymd-slide-down-fade">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            {/* 3 Metrics Box */}
            <div className="flex flex-wrap items-center gap-4 sm:gap-8">
              {/* Original Size Card (0ms delay) */}
              <div
                style={{ animationDelay: "0ms" }}
                className="opacity-0 natymd-slide-down-fade flex flex-col rounded-lg border border-border/50 bg-background/30 px-4 py-2 min-w-[120px]"
              >
                <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground/80">
                  // Original {ext} Size
                </span>
                <span className="mt-1 font-mono text-base font-semibold text-foreground/90 sm:text-lg">
                  ≈ {animatedRawTokens.toLocaleString()}{" "}
                  <span className="text-xs font-normal text-muted-foreground">Tokens</span>
                </span>
              </div>

              <span
                aria-hidden="true"
                className="hidden font-light text-muted-foreground/20 sm:inline text-lg"
              >
                →
              </span>

              {/* Cleaned Markdown Card (120ms delay) */}
              <div
                style={{ animationDelay: "120ms" }}
                className="opacity-0 natymd-slide-down-fade flex flex-col rounded-lg border border-border/50 bg-background/30 px-4 py-2 min-w-[120px]"
              >
                <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground/80">
                  // Cleaned Markdown
                </span>
                <span className="mt-1 font-mono text-base font-semibold text-brand sm:text-lg">
                  {animatedCleanTokens.toLocaleString()}{" "}
                  <span className="text-xs font-normal text-brand/80">Tokens</span>
                </span>
              </div>

              <span
                aria-hidden="true"
                className="hidden font-light text-muted-foreground/20 sm:inline text-lg"
              >
                →
              </span>

              {/* Context Optimization Card with pulsing border glow (240ms delay) */}
              <div
                style={{ animationDelay: "240ms" }}
                className={`opacity-0 natymd-slide-down-fade flex flex-col rounded-lg border px-4 py-2 min-w-[150px] transition-all duration-500 ${
                  showGlow
                    ? "border-brand/70 bg-brand/[0.02] shadow-[0_0_15px_color-mix(in_oklab,var(--brand)_35%,transparent)] scale-[1.02]"
                    : "border-border/50 bg-background/30"
                }`}
              >
                <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground/80">
                  // Context Optimization
                </span>
                <span className="mt-1 flex items-baseline gap-2 font-mono text-base font-semibold text-emerald-400 sm:text-lg">
                  {animatedSavedTokens.toLocaleString()}
                  <span
                    className={`font-sans text-[10px] font-semibold tracking-wide uppercase px-1.5 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 flex items-center gap-1 transition-all duration-300 ${
                      showGlow
                        ? "animate-bounce shadow-[0_0_8px_rgba(34,197,94,0.4)] border-emerald-500/50"
                        : ""
                    }`}
                  >
                    <span>⚡</span>
                    <span>{percentSaved}% Saved</span>
                  </span>
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 font-mono text-xs sm:w-auto w-full">
              <select
                value={formatPreset}
                onChange={handleFormatChange}
                aria-label="Output Format Preset"
                className="flex-1 sm:flex-initial rounded-md border border-border/80 bg-background/60 px-3 py-2 font-mono text-xs uppercase tracking-wider text-foreground hover:border-brand/60 focus:border-brand focus:outline-none focus:ring-0 cursor-pointer transition-all duration-200"
              >
                <option value="markdown" className="bg-background text-foreground">
                  Standard Markdown
                </option>
                <option value="claude-xml" className="bg-background text-foreground">
                  Claude XML
                </option>
              </select>

              <button
                type="button"
                onClick={handleCopy}
                aria-live="polite"
                className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2 font-medium uppercase tracking-[0.15em] transition-all duration-200 ${copyClass}`}
              >
                {copyStatus === "copied" ? (
                  <Check className="h-4 w-4 text-emerald-400" />
                ) : copyStatus === "failed" ? (
                  <AlertCircle className="h-4 w-4 text-destructive" />
                ) : (
                  <Copy className="h-4 w-4 opacity-70" />
                )}
                <span>{copyLabel}</span>
              </button>

              <button
                type="button"
                onClick={handleDownload}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 rounded-md border border-brand/60 bg-brand/10 px-4 py-2 font-medium uppercase tracking-[0.15em] text-brand shadow-sm transition-all duration-200 hover:border-brand hover:bg-brand/20"
              >
                <Download className="h-4 w-4" />
                <span>Download .md</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5 border-t border-border/40 pt-2 font-mono text-[10px] text-muted-foreground/60">
            <Sparkles className="h-3 w-3 text-brand/60" />
            <span>
              Calculated using OpenAI Tiktoken (cl100k_base standard for GPT-4 / GPT-4o). Savings
              represent stripped page headers, footers, whitespace, and layout noise.
            </span>
          </div>
        </div>
      </section>

      <div className="flex flex-1 flex-col divide-y divide-border overflow-y-auto md:grid md:grid-cols-2 md:divide-y-0 md:divide-x md:overflow-hidden">
        {/* Left Side: Original Document Panel */}
        <section className="flex h-[50vh] min-h-0 flex-col md:h-auto">
          <div className="flex items-center justify-between border-b border-border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            <span className="truncate">
              <span className="text-brand">▸</span> {file.name}
            </span>
            <span className="shrink-0 rounded bg-brand/10 px-1.5 py-0.5 font-semibold text-brand">
              {ext}
            </span>
          </div>

          {isPdf ? (
            <div className="relative min-h-0 flex-1 bg-card/20">
              <iframe
                src={`${fileUrl}#toolbar=0`}
                title="Original PDF Document"
                className="absolute inset-0 h-full w-full border-0"
              />
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center bg-card/20 p-6 text-center">
              <div className="relative mb-4 flex h-20 w-20 items-center justify-center rounded-2xl border border-brand/30 bg-brand/10 text-brand shadow-lg shadow-brand/5">
                <FileText className="h-10 w-10" />
                <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-background">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
              </div>

              <h3 className="font-mono text-sm font-semibold text-foreground">{file.name}</h3>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                {(file.size / 1024).toFixed(1)} KB ·{" "}
                {isDocx ? "Microsoft Word Document" : `${ext} Document`}
              </p>

              <div className="mt-6 flex w-full max-w-sm flex-col gap-2 rounded-lg border border-border/60 bg-background/50 p-4 font-mono text-xs text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>Status:</span>
                  <span className="flex items-center gap-1 font-medium text-emerald-400">
                    <ShieldCheck className="h-3.5 w-3.5" /> Client-Side Converted
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Document Type:</span>
                  <span className="text-foreground">{ext}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Extracted Length:</span>
                  <span className="text-foreground">
                    {result.markdown.length.toLocaleString()} chars
                  </span>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Right Side: Converted Markdown Live Editor */}
        <section className="flex h-[50vh] min-h-0 flex-col md:h-auto">
          <div className="flex items-center justify-between border-b border-border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            <span>
              <span className="text-brand">▸</span> output.md
            </span>
            <span className="shrink-0">{markdown.length.toLocaleString()} chars</span>
          </div>
          <div className="relative min-h-0 flex-1 bg-card/20 p-2">
            <textarea
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              placeholder="Edit your Markdown here..."
              spellCheck={false}
              className="h-full w-full resize-none bg-transparent p-3 font-mono text-xs sm:text-sm leading-relaxed text-foreground/90 placeholder:text-muted-foreground/40 focus:outline-none focus:ring-0 border-0 selection:bg-brand/20"
            />
          </div>
        </section>
      </div>
    </div>
  );
}
