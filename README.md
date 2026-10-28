# LVD Compiler v3.0 — LLM Cognitive Prompt Intelligence Suite

A modernized Chrome Extension (Manifest V3) that provides real-time, LLM-native cognitive prompt optimization inside **ChatGPT**, **Claude**, **Google Gemini**, and **Meta AI**.

---

## ⚡ What's New in v3.0 (Autonomous UI/UX Reinvention)

### 1. Atomic Non-Destructive Prompt Compiler (`content.js`, `popup.js`, `options.js`)
- **Mathematical Non-Recursion:** Single-pass range-based token compiler completely resolves the legacy recursive text corruption bug (e.g. replacing *"learn"* with *"adapt in context."* no longer causes the nested *"adapt"* to recursively mutate into broken text).
- **Longest-Match Word-Boundary Precedence:** Prioritizes multi-word directives over sub-tokens (e.g. *"double-check"* over *"check"*).
- **Non-Destructive Diff Generation:** Highlighted `<mark>` tags wrap replacement tokens without corrupting surrounding sentence syntax or punctuation.

### 2. Tactile Cognitive Suggestion Dock (`styles.css` & `content.js`)
- **Voxel Geist Obsidian Design System:** Frosted glassmorphism (`backdrop-filter: blur(18px)`) styled with high-contrast, WCAG 2.2 AAA/AA compliant color tokens.
- **Category-Coded Semantic Dots:** Amber (*Cognition*), Emerald (*Verification*), Indigo (*Directives*), Cyan (*Analysis*), and Rose (*Custom*).
- **Keyboard Accelerators & Roving Navigation:**
  - `Tab`: Immediately applies the active suggestion pill.
  - `Alt + Right / Down`: Cycles roving focus to the next pill.
  - `Alt + Left / Up`: Cycles roving focus to the previous pill.
  - `Alt + Enter`: Triggers atomic `⚡ Replace All`.
  - `Esc`: Dismisses suggestions for the current typing session.
- **Integrated Tooltips:** Hovering or focusing pills displays full rephrases without horizontal layout jitter.

### 3. Redesigned Extension Popup (`popup.html` & `popup.js`)
- **Non-Overlapping Viewport:** Elimination of sticky footers colliding with preview cards; all interactive buttons and previews are fully visible in the natural document flow.
- **Ambient Metric Strip:** Live indicators for 738+ dictionary terms, 4 active platforms, and optimization counter.
- **Accessible Tabs:** Full ARIA tab semantics (`role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`) with Arrow key navigation.
- **Enhanced Dictionary Explorer:** Instant search with one-click clear (✕), horizontal category filter pills, card deletion for custom rules, and inline rule builder.

### 4. Prompt Engineering Studio (`options.html` & `options.js`)
- **Full-Height Responsive Workbench:** Expands dynamically across large screens, replacing the legacy 220px height restriction.
- **Synchronized Split-Pane Scroll:** Scrolling raw input simultaneously scrolls the compiled preview for easy side-by-side prompt diffing.
- **Live Cognitive Analytics:** Word count, character count, token estimation, and cognitive clarity index.
- **Custom Rule Modal:** Modern in-page dialog replacing browser `prompt()` alerts, with JSON export.

### 5. Interactive Testbench & Verification Suite (`testbench.html`)
- Live simulated chat interfaces for ChatGPT and Claude to test real-time typing, contenteditable elements, batch replacement, and popup features in developer preview.
- Dynamic QA checklist with live automated assertions.

---

## 📦 File Architecture

```
lvd-chrome-extension/
├── manifest.json              # MV3 configuration with options_ui and permissions
├── lvd-dictionary.js          # Canonical knowledge base of 738+ LVD terms
├── content.js                 # Atomic compiler, roving keyboard navigation, host injection
├── styles.css                 # Voxel Geist Obsidian design system tokens & components
├── popup.html                 # 4-tab accessible popup interface (Playground, Dict, Settings, Activity)
├── popup.js                   # Popup state, playground logic, diffing, and search
├── options.html               # Full Prompt Engineering Studio & Dictionary Manager
├── options.js                 # Studio controller, synchronized scroll, and custom modal
├── testbench.html             # Live simulator and interactive validation suite
├── before_after_comparison.html # Side-by-side legacy vs modernized audit dashboard
└── icons/                     # Extension branding icons (16px, 48px, 128px)
```

---

## 🚀 Installation (Developer Mode)

1. Open Google Chrome and navigate to `chrome://extensions`.
2. Toggle on **Developer mode** in the top-right corner.
3. Click **Load unpacked**.
4. Select the `lvd-chrome-extension` directory.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Context | Action |
| :--- | :--- | :--- |
| `Tab` | Input box with active pills | Accept and apply the active recommendation |
| `Alt + → / ↓` | Input box with active pills | Cycle active focus to next suggestion pill |
| `Alt + ← / ↑` | Input box with active pills | Cycle active focus to previous suggestion pill |
| `Alt + Enter` | Input box with active pills | Atomically replace all detected prompt terms |
| `Esc` | Input box with active pills | Dismiss suggestion dock for current session |
| `Click` on Pill | In-page dock or playground | Replace specific term with LLM-native rephrase |
| `Click` ⚡ Replace All | Suggestion dock header | Atomically compile all detected prompt terms |
