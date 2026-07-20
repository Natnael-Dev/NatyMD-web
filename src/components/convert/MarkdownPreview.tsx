import { useMemo } from "react";

type Props = {
  markdown: string;
};

type Token = { type: string; text: string };

/**
 * Hand-rolled, deliberately tiny highlighter. Each line is tokenized into
 * spans with semantic classes; colors come from design tokens.
 */
function tokenizeLine(line: string): Token[] {
  // Fenced code fence marker
  if (/^```/.test(line)) return [{ type: "fence", text: line }];

  // Heading
  const heading = /^(#{1,6})\s+(.*)$/.exec(line);
  if (heading) {
    return [
      { type: "heading-marker", text: heading[1] + " " },
      { type: "heading", text: heading[2] },
    ];
  }

  // List marker
  const list = /^(\s*)([-*+]|\d+\.)\s+(.*)$/.exec(line);
  if (list) {
    const rest = tokenizeInline(list[3]);
    return [
      { type: "indent", text: list[1] },
      { type: "list-marker", text: list[2] + " " },
      ...rest,
    ];
  }

  // Blockquote
  const bq = /^(\s*>+\s?)(.*)$/.exec(line);
  if (bq) {
    return [{ type: "quote-marker", text: bq[1] }, ...tokenizeInline(bq[2])];
  }

  return tokenizeInline(line);
}

function tokenizeInline(input: string): Token[] {
  const tokens: Token[] = [];
  const re =
    /(\*\*[^*]+\*\*)|(__[^_]+__)|(\*[^*\n]+\*)|(_[^_\n]+_)|(`[^`]+`)|(\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(input)) !== null) {
    if (m.index > last) tokens.push({ type: "text", text: input.slice(last, m.index) });
    const [match] = m;
    if (match.startsWith("**") || match.startsWith("__")) tokens.push({ type: "bold", text: match });
    else if (match.startsWith("*") || match.startsWith("_")) tokens.push({ type: "italic", text: match });
    else if (match.startsWith("`")) tokens.push({ type: "code", text: match });
    else tokens.push({ type: "link", text: match });
    last = m.index + match.length;
  }
  if (last < input.length) tokens.push({ type: "text", text: input.slice(last) });
  return tokens.length ? tokens : [{ type: "text", text: input }];
}

function classFor(type: string): string {
  switch (type) {
    case "heading-marker":
      return "text-brand";
    case "heading":
      return "text-foreground font-semibold";
    case "list-marker":
      return "text-brand";
    case "quote-marker":
      return "text-brand/70";
    case "fence":
      return "text-brand/80";
    case "bold":
      return "text-foreground font-semibold";
    case "italic":
      return "text-foreground/85 italic";
    case "code":
      return "text-brand bg-brand/[0.08] px-1 rounded-sm";
    case "link":
      return "text-brand underline decoration-brand/40 decoration-dotted underline-offset-2";
    case "indent":
      return "";
    case "text":
    default:
      return "text-foreground/85";
  }
}

export function MarkdownPreview({ markdown }: Props) {
  const lines = useMemo(() => markdown.split("\n"), [markdown]);
  const gutterWidth = String(lines.length).length;

  return (
    <div className="relative h-full overflow-auto bg-card/40">
      <pre className="min-h-full font-mono text-[12.5px] leading-[1.65]">
        <code className="block">
          {lines.map((line, i) => {
            const tokens = tokenizeLine(line);
            return (
              <div key={i} className="flex px-0 hover:bg-brand/[0.03]">
                <span
                  className="sticky left-0 shrink-0 select-none border-r border-border/50 bg-card/60 px-3 py-0 text-right text-muted-foreground/40"
                  style={{ minWidth: `${gutterWidth + 2}ch` }}
                  aria-hidden="true"
                >
                  {i + 1}
                </span>
                <span className="whitespace-pre-wrap break-words px-4">
                  {line.length === 0 ? (
                    <span>&nbsp;</span>
                  ) : (
                    tokens.map((t, j) => (
                      <span key={j} className={classFor(t.type)}>
                        {t.text}
                      </span>
                    ))
                  )}
                </span>
              </div>
            );
          })}
        </code>
      </pre>
    </div>
  );
}