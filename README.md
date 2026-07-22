# 📄 NatyMD — The 100% Client-Side AI Document Compiler

[![License: MIT](https://img.shields.io/badge/License-MIT-teal.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg?logo=react&logoColor=black)](https://react.dev/)
[![Status: Live](https://img.shields.io/badge/Status-Live-emerald.svg)](#)

> **Transform PDFs, DOCX files, and raw documents into clean, LLM-optimized Markdown & Claude XML directly inside your browser — with zero server uploads, 100% privacy, and real-time GPT-4 token count analytics.**

🔗 **[Try NatyMD Live](https://naty-md-web.vercel.app/)**

---

## 💡 Why NatyMD?

When feeding documents to Large Language Models (LLMs) like GPT-4, Claude 3.5 Sonnet, or Gemini, **raw PDFs and Word files waste vast portions of your context window** on repeated headers, footers, visual layout noise, and page numbers. Existing converters often upload private documents to remote cloud servers for extraction.

**NatyMD** solves this with a **privacy-first, client-side document compiler**:
1. **Parses & Cleans Documents Locally**: Strips layout clutter, converting PDFs, Word (`.docx`), plain text, Markdown, and CSV files into minimal Markdown.
2. **Real-Time GPT Token Savings**: Live calculation of original vs. cleaned token counts using OpenAI `tiktoken` / `cl100k_base` BPE tokenizer.
3. **100% Zero-Server Storage**: All computation runs in browser memory using WebAssembly and Web Workers. Your data never touches a server.

---

## ✨ Features

- 📑 **Multi-Format Support**:
  - **PDF Documents**: Direct vector text extraction via Mozilla PDF.js.
  - **Microsoft Word (`.docx`)**: XML DOM parser converting paragraphs, headings, tables, bullet points, and formatting to Markdown.
  - **Plain Text / Data**: Native handling of `.txt`, `.md`, and `.csv` files.
- ⚡ **Live Editable Output Pane**:
  - Tweak, edit, or clean up generated Markdown in a full-height, dark-themed monospace editor.
  - Instant live recalculation of token counts and context optimization as you type or delete text.
- 📊 **Real-Time Token Counting & Impact Banner**:
  - Live OpenAI Tiktoken BPE (`cl100k_base`) calculation.
  - Context Optimization metric displaying exact tokens saved and percentage reduction.
- 🏷️ **Output Format Presets**:
  - **Standard Markdown**: Clean, minimal Markdown ready to paste into LLM prompts.
  - **Claude XML**: One-click formatting wrapping output in `<documents><document>...</document></documents>` for optimal Claude prompt structure.
- 👁️ **Client-Side WASM OCR**:
  - Automatic detection of scanned image-only PDF pages.
  - Transparent optical character recognition using Tesseract WebAssembly in a Web Worker, loaded dynamically on demand.
- 🎯 **Developer UX & Keyboard Shortcuts**:
  - Full-viewport drag-and-drop file target.
  - Automatic `Ctrl+C` / `Cmd+C` clipboard copy shortcut in the result view.

---

## 🏗️ Architecture & Technology Stack

NatyMD is designed as a zero-latency, serverless web application that performs heavy document processing directly on the client.

```
                  ┌───────────────────────────────────────────┐
                  │              Browser Window               │
                  └─────────────────────┬─────────────────────┘
                                        │
                         Drag & Drop / File Input
                                        │
           ┌────────────────────────────┼────────────────────────────┐
           ▼                            ▼                            ▼
   ┌───────────────┐           ┌─────────────────┐          ┌────────────────┐
   │ PDF Parser    │           │ DOCX XML Parser │          │ Text Engine    │
   │ (pdfjs-dist)  │           │ (JSZip + DOM)   │          │ (.txt/md/csv)  │
   └───────┬───────┘           └────────┬────────┘          └───────┬────────┘
           │                            │                           │
           └────────────────────────────┼─────────────────────────► │
                                        ▼                           ▼
                           ┌─────────────────────────┐     ┌─────────────────┐
                           │ Tesseract.js (WASM)     │     │ Markdown Engine │
                           │ Worker (Lazy-loaded OCR)│     │ & Format Filter │
                           └────────────┬────────────┘     └────────┬────────┘
                                        │                           │
                                        └─────────────────────────► │
                                                                    ▼
                                                       ┌─────────────────────────┐
                                                       │ Live Editor & Tiktoken  │
                                                       │ Token Counter (cl100k)  │
                                                       └─────────────────────────┘
```

| Layer | Technologies & Libraries |
| :--- | :--- |
| **Framework & Router** | React 19, [TanStack Start](https://tanstack.com/start), Vite |
| **Parsing Engines** | `pdfjs-dist` (Mozilla PDF.js), `jszip` (DOCX unzipping & XML traversal) |
| **OCR System** | `tesseract.js` (WebAssembly OCR inside isolated Web Worker) |
| **Tokenization** | `gpt-tokenizer` (OpenAI `cl100k_base` BPE tokenizer) |
| **Design & Aesthetic** | Tailwind CSS v4, Lucide React, JetBrains Mono & Inter typography |

---

## 🔒 Security & Privacy Standard

- 🛡️ **Zero Server Storage**: No file bytes, text fragments, or metadata leave your machine.
- 🌐 **Offline Execution**: Once loaded, all parsers and tokenization logic run entirely offline in browser memory.
- 🧹 **Immediate Memory Cleanup**: File blob URLs and worker memory are explicitly released (`URL.revokeObjectURL`) when restarting or closing sessions.

---

## 🛠️ Local Development

### Prerequisites
- [Node.js](https://nodejs.org/) v18+ or [Bun](https://bun.sh/)

### Quickstart

```bash
# 1. Clone repository
git clone https://github.com/Natnael-Dev/NatyMD-web.git
cd NatyMD-web

# 2. Install dependencies
npm install

# 3. Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application in your browser.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
