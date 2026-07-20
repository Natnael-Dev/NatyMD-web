# 📄 NatyMD

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Status: Live](https://img.shields.io/badge/Status-Live-success.svg)](#)

> **A blazing fast, purely client-side PDF to Markdown converter engineered for LLM workflows.**

🔗 **[Try it live here: naty-md-web.vercel.app](https://naty-md-web.vercel.app/)** 

---

## 📖 The Origin Story

I built NatyMD because I was tired of burning massive amounts of AI tokens on formatting noise. Every time I pasted a raw PDF into an LLM chat, half the context window was wasted on repeated headers, page numbers, footers, and layout artifacts that had nothing to do with what I actually wanted to ask. On top of that, most existing tools wanted me to upload private documents to some random server just to get plain text back.

I wanted one small, single-purpose tool: drop a PDF in, get clean, token-efficient Markdown out, and never leave the browser. That's all NatyMD does.

## ✨ Features

- 🔒 **Client-Side Parsing** — PDFs are parsed entirely in your browser with `pdfjs-dist`. Nothing is uploaded, stored, or logged. Your data stays yours.
- 👁️ **Tesseract WASM OCR** — Scanned/image-only pages are transparently OCR'd in a Web Worker, loaded lazily only when needed.
- 🖼️ **Image Extraction** — Optional embedded image extraction with automatic downscaling and positional placement in the Markdown output.
- 💻 **Developer-Tool Aesthetic** — Minimal, keyboard-friendly UI inspired by Linear and Raycast. No gradient blobs, no stock illustrations, no fluff.

## 🛠️ Tech Stack

- **Framework**: [TanStack Start](https://tanstack.com/start) (React 19 + Vite)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Parsing**: [pdfjs-dist](https://github.com/mozilla/pdf.js)
- **OCR Engine**: [tesseract.js](https://github.com/naptha/tesseract.js) (WebAssembly)
- **Hosting**: [Vercel](https://vercel.com)

---

## 🚀 Local Development

NatyMD uses [Bun](https://bun.sh/) for lightning-fast package management.

**1. Clone the repository**
```bash
git clone [https://github.com/Natnael-Dev/NatyMD-web.git](https://github.com/Natnael-Dev/NatyMD-web.git)
cd NatyMD-web
