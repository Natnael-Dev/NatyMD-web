import { useEffect, useState } from "react";

/**
 * Lazily calculates the approximate GPT-4 token count (cl100k_base BPE) for
 * a given Markdown string. gpt-tokenizer is loaded via a variable-specifier
 * dynamic import so Rollup/Nitro cannot statically analyze and inline the
 * 2.4 MB vocabulary file into the SSR bundle. It only loads in the browser
 * after the component mounts via useEffect.
 *
 * Returns 0 while the async encode is resolving, then updates via setState.
 * Falls back to a rough char-based estimate (~4 chars/token) on error.
 */

// Stored in a variable so Rollup's static import analysis cannot follow it.
const GPT_TOKENIZER_MODULE = "gpt-tokenizer";

type TokenizerModule = { encode: (s: string) => number[] };

export function useTokenCount(text: string): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!text) {
      setCount(0);
      return;
    }
    let cancelled = false;
    import(/* @vite-ignore */ GPT_TOKENIZER_MODULE as string)
      .then((mod) => {
        const { encode } = mod as TokenizerModule;
        if (!cancelled) setCount(encode(text).length);
      })
      .catch(() => {
        if (!cancelled) setCount(Math.ceil(text.length / 4));
      });
    return () => {
      cancelled = true;
    };
  }, [text]);

  return count;
}
