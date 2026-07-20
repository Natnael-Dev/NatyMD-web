# NatyMD

A client-side PDF to Markdown converter for LLM workflows.

## The Origin Story

I built NatyMD because I was tired of burning massive amounts of AI tokens on formatting noise. Every time I pasted a raw PDF into an LLM chat, half the context window was wasted on repeated headers, page numbers, footers, and layout artifacts that had nothing to do with what I actually wanted to ask. On top of that, most existing tools wanted me to upload private documents to some random server just to get plain text back.

I wanted one small, single-purpose tool: drop a PDF in, get clean, token-efficient Markdown out, and never leave the browser. That's all NatyMD does.

## Features

- **Client-Side Parsing** — PDFs are parsed entirely in your browser with `pdfjs-dist`. Nothing is uploaded, stored, or logged.
- **Tesseract WASM OCR** — Scanned/image-only pages are transparently OCR'd in a Web Worker, loaded lazily only when needed.
- **Image Extraction** — Optional embedded image extraction with automatic downscaling and positional placement in the Markdown output.
- **Developer-Tool Aesthetic** — Minimal, keyboard-friendly UI inspired by Linear and Raycast. No gradient blobs, no stock illustrations, no fluff.

## Tech Stack

- [TanStack Start](https://tanstack.com/start) (React 19 + Vite 7)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [pdfjs-dist](https://github.com/mozilla/pdf.js)
- [tesseract.js](https://github.com/naptha/tesseract.js)
- Deployed on [Cloudflare Workers](https://workers.cloudflare.com/)

## Getting Started

```bash
git clone <your-repo-url>
cd natymd
bun install
bun run dev
```

Then open the local dev URL printed in your terminal.

## License

MIT — see [LICENSE](./LICENSE).