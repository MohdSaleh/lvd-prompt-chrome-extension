# LVD Compiler

> **Transform colloquial prompt habits into precise, operationalized LLM directives — live inside ChatGPT, Claude, Gemini, and Meta AI.**

[![Manifest V3](https://img.shields.io/badge/Manifest-V3-10b981.svg?style=flat-square)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Tests Passing](https://img.shields.io/badge/Tests-41%20Passed-0ea5e9.svg?style=flat-square)](run_verification.js)
[![Zero Telemetry](https://img.shields.io/badge/Telemetry-0%25%20(Purely%20Local)-14b8a6.svg?style=flat-square)](#privacy--data-governance)
[![Engine](https://img.shields.io/badge/Storage-In--Browser%20SQLite-f59e0b.svg?style=flat-square)](sqlite-store.js)
[![Design System](https://img.shields.io/badge/Design-Radical%20Minimalism%20(2027)-8b5cf6.svg?style=flat-square)](styles.css)
[![License](https://img.shields.io/badge/License-MIT-64748b.svg?style=flat-square)](LICENSE)

---

## Why LVD Compiler?

When humans speak to Large Language Models, we naturally reach for anthropomorphic verbs:
- *"Think about this..."*
- *"Learn from these errors..."*
- *"Understand what I mean..."*
- *"Remember this pattern..."*
- *"Double-check your answer..."*

Modern transformer architectures don't "think" or "feel". They evaluate attention matrices, execute multi-step inference chains, traverse context windows, and sample token distributions against specified constraints. When given ambiguous psychological tokens, models often produce superficial reasoning or drift off-target.

**LVD (Language-to-Vector Directive) Compiler** bridges this cognitive translation gap. Operating as a lightweight, quiet in-situ companion inside your favorite AI web interfaces, it identifies colloquial cognitive verbs in real time as you type and surfaces mathematically sound, operationalized directives:

| Colloquial Input | LVD Operationalized Directive | What the Model Actually Does |
| :--- | :--- | :--- |
| `think` | `perform multi-step inference` | Forces chained reasoning passes rather than superficial pattern completion |
| `learn` | `adapt in context` | Constrains adaptation strictly to current context window state |
| `understand` | `build a working interpretation` | Generates an explicit internal schema before solving |
| `remember` | `retrieve from context or memory` | Triggers targeted attention retrieval over prior turns |
| `double-check` | `verify against criteria and edge cases` | Executes a secondary evaluation pass with explicit falsification checks |

Everything happens locally in your browser. No third-party servers, no analytics beacons, no tracking.

---

## Key Features

### 1. In-Situ Floating Suggestion Dock
- **Non-intrusive companion**: Appears subtly directly above or below active chat input areas across **ChatGPT**, **Claude**, **Gemini**, and **Meta AI**.
- **Tactile suggestion pills**: Instant visual badges categorized by cognitive function (Cognition, Verification, Directives, Analysis, Custom).
- **Smooth keyboard roving**: Navigate suggestions with `Alt + Arrow Keys`, accept with `Tab`, or compile the whole prompt with `Alt + Enter`.
- **Zero layout jitter**: Absolute positioning calculations adapt automatically to dynamically resizing multiline textareas and `contenteditable` inputs.

### 2. Single-Pass Atomic Compiler Engine
- **Non-recursive token safety**: Conventional regex replacement scripts suffer from recursive substring corruption (e.g. replacing *"learn"* with *"adapt in context"* can cause a subsequent rule for *"adapt"* to mutate the replaced phrase into nonsense). LVD uses a single-pass interval-based compiler that locks replaced spans and prevents nested collisions.
- **Longest-match word boundary logic**: Compound directives always take priority over sub-tokens (e.g. *"double-check"* is matched before *"check"*).
- **Non-destructive diff previewing**: Highlighted visual marks show exactly what will change without altering your original punctuation, casing, or sentence structure.

### 3. Local SQLite Relational Prompt Vault
- **Automatic submission capture**: Every prompt you submit into any supported AI platform is automatically cataloged in an embedded SQLite database engine (`sqlite-store.js`).
- **Platform separation**: Filter and review your prompt history specifically across ChatGPT, Claude, Gemini, or Meta AI.
- **Relational schema**: Stores primary key, platform origin, raw input, compiled text, timestamp, word count, character count, and status flags.
- **One-click export**: Export your complete historical vault as standard SQL (`.sql` dump with table schemas and INSERT statements) or structured JSON at any time.

### 4. Radical Minimalist System Design (2027)
- **Dieter Rams-inspired restraint**: Built on an architectural palette of warm obsidian (`#0d0e12`), whisper-thin hairlines (`rgba(255,255,255,0.05)`), and crisp monospace metrics.
- **Accessible & compliant**: High-contrast ratios that comfortably exceed WCAG 2.2 AAA/AA requirements.
- **Hardware-feel segmented navigation**: Seamlessly switch between Studio, Dictionary, Settings, and Vault without distracting animations or layout shifts.

### 5. Dual-Pane Prompt Engineering Studio
- **Full-bleed workbench (`options.html`)**: Complete desktop environment for drafting and stress-testing complex prompt workflows.
- **Synchronized scrolling**: Input pane and compiled diff output scroll in lockstep for immediate visual verification.
- **Live telemetry strip**: Word count, character count, estimated token density, and a cognitive clarity gauge.
- **Custom directive builder**: Add custom terminology and custom replacements on the fly with in-app validation and instant local storage persistence.

---

## Supported Platforms

LVD Compiler actively detects and adapts to the DOM structures of the leading LLM interfaces:

| Platform | Host URL Pattern | Input Strategy |
| :--- | :--- | :--- |
| **OpenAI ChatGPT** | `chatgpt.com`, `chat.openai.com` | ProseMirror / `contenteditable` & textarea hooks |
| **Anthropic Claude** | `claude.ai` | Lexical `contenteditable` DOM tree reconciliation |
| **Google Gemini** | `gemini.google.com`, `bard.google.com` | Rich contenteditable input container observation |
| **Meta AI** | `meta.ai` | React synthetic input and controlled textarea binding |

---

## Keyboard Shortcuts

Work at the speed of thought without lifting your hands from the keyboard:

| Shortcut | Scope | Function |
| :--- | :--- | :--- |
| <kbd>Tab</kbd> | Active prompt input | Accept and insert the currently focused suggestion pill |
| <kbd>Alt</kbd> + <kbd>→</kbd> / <kbd>↓</kbd> | Active prompt input | Move roving focus forward to the next suggestion pill |
| <kbd>Alt</kbd> + <kbd>←</kbd> / <kbd>↑</kbd> | Active prompt input | Move roving focus backward to the previous suggestion pill |
| <kbd>Alt</kbd> + <kbd>Enter</kbd> | Active prompt input | Atomically compile all detected colloquial terms at once |
| <kbd>Alt</kbd> + <kbd>Z</kbd> | Active prompt input | Revert the last applied replacement (undo stack) |
| <kbd>Esc</kbd> | Active prompt input | Dismiss the suggestion dock for the current typing session |
| <kbd>Click</kbd> on Pill | Suggestion dock | Apply that specific operationalized rephrase |

---

## Installation & Setup

### Install in Google Chrome, Brave, Arc, or Edge

LVD Compiler is built to standard Chrome Manifest V3 specifications and runs on any modern Chromium-based browser:

1. Clone or download this repository to your local machine:
   ```bash
   git clone https://github.com/MohdSaleh/lvd-chrome-extension.git
   ```
2. Open your browser and navigate to the extensions management page:
   - **Chrome**: `chrome://extensions`
   - **Brave**: `brave://extensions`
   - **Edge**: `edge://extensions`
   - **Arc**: Open Settings &rarr; Extensions
3. Enable **Developer mode** (toggle located in the upper-right corner on Chrome/Brave).
4. Click the **Load unpacked** button.
5. In the file picker, select the root `lvd-chrome-extension` directory.
6. The LVD Compiler icon will appear in your browser toolbar. Pin it for quick access to the popup and Studio.

---

## Architecture & Codebase Map

```
lvd-chrome-extension/
├── manifest.json              # Chrome Manifest V3 configuration & permission boundaries
├── lvd-dictionary.js          # Curated knowledge base of 165+ canonical cognitive directives
├── sqlite-store.js            # In-browser SQLite relational engine & persistence bridge
├── content.js                 # In-situ DOM observers, atomic compiler, and keyboard HUD
├── styles.css                 # 2027 Minimalist design tokens, components, and layout rules
├── popup.html                 # 4-tab compact extension switchboard (Studio, Dict, Settings, Vault)
├── popup.js                   # Popup state controller, live playground, and SQLite telemetry
├── options.html               # Full-screen Prompt Engineering Studio & database manager
├── options.js                 # Studio controller, split-pane sync, and modal handlers
├── testbench.html             # Offline multi-platform simulator and QA playground
├── run_verification.js        # Node.js automated regression and assertion suite (41 tests)
├── before_after_comparison.html# Architectural evolution audit & design documentation
└── icons/                     # Standard extension assets (16px, 48px, 128px)
```

### Component Flow

```
User Types in AI Input (ChatGPT, Claude, Gemini, Meta AI)
                     │
                     ▼
             [ content.js ] ──────────────► [ lvd-dictionary.js ]
                     │                      (165+ Canonical Directives)
                     ├────────────────────────┐
                     ▼                        ▼
        [ In-Situ Suggestion Dock ]     [ Atomic Non-Recursive Compiler ]
        (Tab / Alt+Arrows / Esc)        (Range-locked token substitution)
                     │                        │
                     └────────────────────────┘
                                  │
                  User submits prompt or presses Enter
                                  │
                                  ▼
                        [ sqlite-store.js ]
                  (Local Relational Database Vault)
                                  │
                  ┌───────────────┴───────────────┐
                  ▼                               ▼
          [ popup.html / js ]            [ options.html / js ]
     (Quick Copy, Vault Filter,       (Full-Screen Studio, Split-Pane,
        Dictionary Explorer)              SQL / JSON Data Export)
```

---

## Testing & Verification

The repository includes a comprehensive, dual-layer verification system to guarantee deterministic compilation and DOM stability:

### 1. Headless Assertion Suite (Node.js)
Runs 41 automated assertions covering token collision handling, multi-pass safety, SQLite relational query accuracy, and CSS design token integrity:

```bash
node run_verification.js
```

Expected output:
```text
====================================================
🧪 LVD COMPILER v3.0 — AUTOMATED VALIDATION SUITE
====================================================
  ✓ PASS: Dictionary loaded with canonical entries
  ✓ PASS: Atomic compiler prevents recursive replacement inside already replaced tokens
  ✓ PASS: Compound directives ("double-check") take precedence over sub-tokens ("check")
  ✓ PASS: Non-matching text remains 100% byte-for-byte identical
  ...
  ✓ PASS: SQLite getPlatformBreakdown aggregates counts across AI apps correctly
  ✓ PASS: SQLite exportSQL generates valid SQL schema and INSERT statements
====================================================
📊 TEST RESULTS: 41 / 41 ASSERTIONS PASSED
====================================================
```

### 2. Interactive Browser Testbench
Open [`testbench.html`](testbench.html) directly in any browser:
- Simulates ChatGPT, Claude, and generic textarea/contenteditable inputs.
- Validates keyboard focus trapping, roving selection, and replacement rendering without needing an active internet connection or paid AI subscription.
- Contains an interactive checklist that validates runtime DOM attributes.

---

## Privacy & Data Governance

Your prompts contain proprietary ideas, confidential code, and private thoughts. LVD Compiler is engineered with a strict **zero-telemetry, zero-network** architecture:

- **100% On-Device Processing**: Token matching, atomic replacements, and SQLite queries execute entirely inside your local browser runtime.
- **No Remote Calls**: The extension initiates zero outbound network requests. No analytics, no telemetry, no tracking pixels, and no remote CDNs.
- **Local Storage Isolation**: The SQLite Prompt Vault persists data solely in your browser's private `chrome.storage.local` sandbox.
- **Full Data Sovereignty**: You can wipe the local database or export your data to `.sql` or `.json` at any time with a single click.

---

## Customizing Directives

Need domain-specific replacements for your team or workflow (e.g. legal analysis, medical research, systems architecture)?

1. Open the extension popup and click **Dictionary**, or open the full **Studio Workbench** (`options.html`).
2. Click **+ Add Rule**.
3. Define your trigger term (e.g., `audit code`) and the operationalized directive (e.g., `execute static security analysis checking for buffer overflows, memory leaks, and input sanitization`).
4. Select a cognitive category.
5. Click **Save Rule**. Your rule is instantly active across all supported chat interfaces.

---

## License

This project is open-source and released under the [MIT License](LICENSE). Feel free to inspect, adapt, and build upon it.
