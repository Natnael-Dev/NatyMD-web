import { useRef, useState, type ChangeEvent, type DragEvent, type KeyboardEvent } from "react";
import { IncludeImagesToggle } from "./IncludeImagesToggle";

type Props = {
  onFile: (file: File) => void;
  disabled?: boolean;
  onIncludeImagesChange?: (value: boolean) => void;
};

export function Dropzone({ onFile, disabled = false, onIncludeImagesChange }: Props) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [isHover, setIsHover] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.preventDefault();
    setIsDragActive(true);
  };
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.preventDefault();
  };
  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(false);
  };
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.preventDefault();
    setIsDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFile(file);
  };
  const handleClick = () => {
    if (disabled) return;
    inputRef.current?.click();
  };
  const handleKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  };
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFile(file);
    // Allow re-selecting the same file.
    e.target.value = "";
  };

  const active = isDragActive;

  return (
    <section
      className="natymd-stagger mx-auto w-full max-w-2xl"
      style={{ animationDelay: "620ms" }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.txt,text/plain,.md,text/markdown,.csv,text/csv"
        onChange={handleInputChange}
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
      />
      <div
        role="button"
        tabIndex={0}
        aria-label="Drop a file, or click to browse"
        onMouseEnter={() => setIsHover(true)}
        onMouseLeave={() => setIsHover(false)}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        onKeyDown={handleKey}
        className={[
          "group relative isolate cursor-pointer overflow-hidden rounded-lg px-8 py-20 text-center outline-none transition-all duration-300",
          "border bg-card/30 backdrop-blur-sm",
          active
            ? "natymd-glow border-brand bg-brand/[0.05]"
            : isHover
              ? "border-brand/70 bg-brand/[0.025]"
              : "border-dashed border-border",
        ].join(" ")}
      >
        {/* Corner crosshairs — 4 L-brackets */}
        {[
          "left-2 top-2 border-l border-t",
          "right-2 top-2 border-r border-t",
          "left-2 bottom-2 border-l border-b",
          "right-2 bottom-2 border-r border-b",
        ].map((pos) => (
          <span
            key={pos}
            aria-hidden="true"
            className={[
              "pointer-events-none absolute h-4 w-4 transition-all duration-300",
              pos,
              active || isHover ? "border-brand" : "border-border",
              active ? "h-6 w-6" : "",
            ].join(" ")}
          />
        ))}

        {/* Inner nested frame */}
        <span
          aria-hidden="true"
          className={[
            "pointer-events-none absolute inset-4 rounded-md border transition-colors duration-300",
            active ? "border-brand/40" : isHover ? "border-brand/20" : "border-border/40",
          ].join(" ")}
        />

        {/* Center crosshair */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-px w-24 -translate-x-1/2 -translate-y-1/2 bg-border/60"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-24 w-px -translate-x-1/2 -translate-y-1/2 bg-border/60"
        />

        {/* Particle field */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        >
          {[
            { l: "12%", t: "22%", d: "0s" },
            { l: "78%", t: "18%", d: "1.2s" },
            { l: "34%", t: "72%", d: "0.6s" },
            { l: "62%", t: "58%", d: "2.1s" },
            { l: "22%", t: "48%", d: "1.6s" },
            { l: "88%", t: "72%", d: "0.4s" },
            { l: "50%", t: "28%", d: "2.4s" },
          ].map((p, i) => (
            <span
              key={i}
              className={[
                "absolute h-1 w-1 rounded-full bg-brand/40",
                i % 2 === 0 ? "natymd-drift-slow" : "natymd-drift-slow-alt",
              ].join(" ")}
              style={{
                left: p.l,
                top: p.t,
                animationDelay: p.d,
                animationDuration: active ? "4s" : undefined,
              }}
            />
          ))}
        </div>

        {/* Scanner sweep — thin teal line moves vertically forever */}
        <span
          aria-hidden="true"
          className="natymd-scan-bar pointer-events-none absolute left-0 top-0 -z-10 h-px w-full bg-gradient-to-r from-transparent via-brand/60 to-transparent"
        />

        {/* Content */}
        <div className="relative">
          {/* file icon */}
          <svg
            aria-hidden="true"
            width="28"
            height="28"
            viewBox="0 0 28 28"
            fill="none"
            className={[
              "mx-auto mb-4 transition-colors duration-300",
              active || isHover ? "text-brand" : "text-muted-foreground",
            ].join(" ")}
          >
            <path
              d="M6 3h11l5 5v17H6z"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinejoin="round"
              fill="none"
            />
            <path d="M17 3v5h5" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
            <path
              d="M10 15h8M10 19h5"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              opacity="0.6"
            />
          </svg>

          <p
            className={[
              "text-sm transition-colors md:text-base",
              active ? "text-brand" : "text-foreground/90",
            ].join(" ")}
          >
            Drop a PDF, DOCX, TXT, MD, or CSV here, or{" "}
            <span className="font-medium text-brand underline decoration-brand/40 decoration-dotted underline-offset-4">
              click to browse
            </span>
          </p>

          {/* status line — swaps text based on state */}
          <p
            className={[
              "mt-3 font-mono text-[10px] uppercase tracking-[0.22em] transition-colors",
              active
                ? "natymd-flicker text-brand"
                : isHover
                  ? "text-brand/70"
                  : "text-muted-foreground/60",
            ].join(" ")}
          >
            {active
              ? "// signal locked · awaiting drop"
              : isHover
                ? "// calibrated · ready"
                : "// idle · listening"}
          </p>
        </div>
      </div>

      {/* File constraint line */}
      <div className="mt-4 flex items-center justify-center gap-3 font-mono text-xs text-muted-foreground">
        <span className="h-px w-8 bg-border" />
        <span>PDF, DOCX, TXT, MD, CSV · up to 20MB</span>
        <span className="h-px w-8 bg-border" />
      </div>

      <div data-slot="conversion-options" className="mt-4 flex min-h-9 items-center justify-center">
        <IncludeImagesToggle onChange={onIncludeImagesChange} />
      </div>
    </section>
  );
}
