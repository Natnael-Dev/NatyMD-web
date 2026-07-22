import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { Dropzone } from "@/components/landing/Dropzone";
import { FeatureCards } from "@/components/landing/FeatureCards";
import { ComingSoon } from "@/components/landing/ComingSoon";
import { Footer } from "@/components/landing/Footer";
import { ConvertingPanel } from "@/components/convert/ConvertingPanel";
import { ResultView } from "@/components/convert/ResultView";
import { ErrorBanner, type ConvError } from "@/components/convert/ErrorBanner";
import type { Stage } from "@/lib/pdf/progress";
import type { ConvertResult } from "@/lib/pdf/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NatyMD — PDF to Markdown, entirely in your browser" },
      {
        name: "description",
        content:
          "Drop a PDF, get clean Markdown back. Runs entirely in your browser — no uploads, no accounts, no history.",
      },
    ],
  }),
  component: Index,
});

const MAX_BYTES = 20 * 1024 * 1024;

type ConversionState =
  | { status: "idle"; error: ConvError | null }
  | {
      status: "converting";
      file: File;
      stage: Stage;
      progress: number;
      startedAt: number;
      controller: AbortController;
      scannedPages?: number[];
      ocrPage?: number;
      ocrTotal?: number;
    }
  | { status: "success"; file: File; fileUrl: string; result: ConvertResult };

function Index() {
  const [state, setState] = useState<ConversionState>({ status: "idle", error: null });
  const [elapsedMs, setElapsedMs] = useState(0);
  const [includeImages, setIncludeImages] = useState(false);
  const fileUrlRef = useRef<string | null>(null);
  const includeImagesRef = useRef(false);
  includeImagesRef.current = includeImages;

  useEffect(() => {
    if (state.status !== "converting") return;
    const started = state.startedAt;
    const id = window.setInterval(() => setElapsedMs(performance.now() - started), 100);
    return () => window.clearInterval(id);
  }, [state.status, state.status === "converting" ? state.startedAt : 0]);

  useEffect(() => {
    return () => {
      if (fileUrlRef.current) {
        URL.revokeObjectURL(fileUrlRef.current);
        fileUrlRef.current = null;
      }
    };
  }, []);

  const handleFile = useCallback(async (file: File) => {
    const nameLower = file.name.toLowerCase();
    const isPdf =
      file.type === "application/pdf" || nameLower.endsWith(".pdf");
    const isDocx =
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      nameLower.endsWith(".docx");
    const isText =
      file.type === "text/plain" ||
      file.type === "text/markdown" ||
      file.type === "text/csv" ||
      nameLower.endsWith(".txt") ||
      nameLower.endsWith(".md") ||
      nameLower.endsWith(".csv");

    if (!isPdf && !isDocx && !isText) {
      setState({
        status: "idle",
        error: { code: "not_pdf", message: "That's not a supported format. Drop a .pdf, .docx, .txt, .md, or .csv file." },
      });
      return;
    }
    if (file.size > MAX_BYTES) {
      setState({
        status: "idle",
        error: { code: "oversize", message: "File exceeds 20 MB. Try a smaller file." },
      });
      return;
    }

    const startedAt = performance.now();
    setElapsedMs(0);
    const controller = new AbortController();
    setState({
      status: "converting",
      file,
      stage: "reading",
      progress: 0,
      startedAt,
      controller,
    });

    try {
      let result: ConvertResult;
      if (isText) {
        setState((prev) =>
          prev.status === "converting" ? { ...prev, stage: "extracting", progress: 0.5 } : prev,
        );
        const { convertTextToMarkdown } = await import("@/lib/text/parser");
        result = await convertTextToMarkdown(file);
        setState((prev) =>
          prev.status === "converting" ? { ...prev, stage: "assembling", progress: 1 } : prev,
        );
      } else if (isDocx) {
        setState((prev) =>
          prev.status === "converting" ? { ...prev, stage: "extracting", progress: 0.5 } : prev,
        );
        const { convertDocxToMarkdown } = await import("@/lib/docx/parser");
        result = await convertDocxToMarkdown(file);
        setState((prev) =>
          prev.status === "converting" ? { ...prev, stage: "assembling", progress: 1 } : prev,
        );
      } else {
        const { convertWithProgress } = await import("@/lib/pdf/progress");
        result = await convertWithProgress(
          file,
          (stage, progress, meta) => {
            setState((prev) =>
              prev.status === "converting"
                ? {
                    ...prev,
                    stage,
                    progress,
                    scannedPages: meta?.scannedPages ?? prev.scannedPages,
                    ocrPage: meta?.ocrPage ?? prev.ocrPage,
                    ocrTotal: meta?.ocrTotal ?? prev.ocrTotal,
                  }
                : prev,
            );
          },
          { signal: controller.signal, includeImages: includeImagesRef.current },
        );
      }
      if (fileUrlRef.current) URL.revokeObjectURL(fileUrlRef.current);
      const fileUrl = URL.createObjectURL(file);
      fileUrlRef.current = fileUrl;
      setState({ status: "success", file, fileUrl, result });
    } catch (err) {
      const name = (err as { name?: string })?.name ?? "";
      if (name === "AbortError") {
        setState({ status: "idle", error: null });
        return;
      }
      const isPassword =
        name === "PasswordException" || /password/i.test(String((err as Error)?.message ?? ""));
      setState({
        status: "idle",
        error: isPassword
          ? {
              code: "encrypted",
              message: "This file is password-protected. NatyMD can't open it.",
            }
          : {
              code: "parse_failed",
              message: `Couldn't parse this ${isDocx ? "DOCX" : "PDF"}. It may be corrupted or malformed.`,
            },
      });
    }
  }, []);

  const handleCancel = useCallback(() => {
    setState((prev) => {
      if (prev.status !== "converting") return prev;
      prev.controller.abort();
      // Free the OCR worker + WASM heap immediately; no-op if never loaded.
      void import("@/lib/pdf/ocr")
        .then((m) => m.terminateOcrWorker())
        .catch(() => {});
      return { status: "idle", error: null };
    });
  }, []);

  const handleStartOver = useCallback(() => {
    if (fileUrlRef.current) {
      URL.revokeObjectURL(fileUrlRef.current);
      fileUrlRef.current = null;
    }
    setState({ status: "idle", error: null });
    setElapsedMs(0);
  }, []);

  const dismissError = useCallback(() => setState({ status: "idle", error: null }), []);

  const isConverting = state.status === "converting";
  const isSuccess = state.status === "success";

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background text-foreground">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-30 opacity-[0.35] [background-image:linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(ellipse_at_top,black,transparent_75%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-30 opacity-[0.18] [background-image:linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] [background-size:224px_224px] [mask-image:radial-gradient(ellipse_at_top,black,transparent_80%)]"
      />
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-20 h-[720px] w-full opacity-[0.22] [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]"
        preserveAspectRatio="none"
      >
        <defs>
          <pattern id="natymd-boxes" x="0" y="0" width="224" height="224" patternUnits="userSpaceOnUse">
            <rect x="0.5" y="0.5" width="223" height="223" fill="none" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1" />
            <rect x="56" y="56" width="112" height="112" fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1" />
            <circle cx="112" cy="112" r="2" fill="currentColor" opacity="0.35" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#natymd-boxes)" className="text-border" />
      </svg>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[-120px] -z-20 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-brand/[0.06] blur-3xl"
      />

      <Header />
      <main className="relative flex flex-1 flex-col items-center gap-20 px-6 py-16 md:py-24">
        <Hero />
        {isConverting ? (
          <ConvertingPanel
            file={state.file}
            stage={state.stage}
            progress={state.progress}
            elapsedMs={elapsedMs}
            ocrPage={state.ocrPage}
            ocrTotal={state.ocrTotal}
            scannedPages={state.scannedPages}
            includeImages={includeImages}
            onCancel={handleCancel}
          />
        ) : (
          <div className="flex w-full flex-col items-center">
            {state.status === "idle" && state.error && (
              <ErrorBanner error={state.error} onDismiss={dismissError} />
            )}
            <Dropzone onFile={handleFile} onIncludeImagesChange={setIncludeImages} />
          </div>
        )}
        {!isConverting && (
          <>
            <FeatureCards />
            <ComingSoon />
          </>
        )}
      </main>
      <Footer />

      {isSuccess && (
        <ResultView
          file={state.file}
          fileUrl={state.fileUrl}
          result={state.result}
          onStartOver={handleStartOver}
        />
      )}
    </div>
  );
}
