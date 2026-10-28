// ==========================================================================
// LVD Compiler - Content Script (Modernized v3.0)
// Supports ChatGPT, Claude, Gemini, Meta AI
// Real-time LVD prompt intelligence with atomic batch compiler & accessibility
// ==========================================================================

(function () {
  const DEBUG = false;
  let currentInput = null;
  let suggestionBar = null;
  let lastText = '';
  let debounceTimer = null;
  let isDismissedForCurrentText = false;
  let activeMatches = [];
  let activePillIndex = 0;
  let undoStack = [];

  // Configuration state with local sync
  let userConfig = {
    enabled: true,
    maxPills: 6,
    autoSuggest: true,
    customTerms: {},
    platforms: {
      chatgpt: true,
      claude: true,
      gemini: true,
      meta: true
    }
  };

  function log(...args) { if (DEBUG) console.log('[LVD v3]', ...args); }

  // Sync settings from chrome.storage or localStorage
  function loadConfig() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['lvd_settings', 'lvd_custom_terms'], (res) => {
        if (res.lvd_settings) {
          userConfig = { ...userConfig, ...res.lvd_settings };
        }
        if (res.lvd_custom_terms) {
          userConfig.customTerms = res.lvd_custom_terms;
        }
        buildRegex();
      });
    } else {
      try {
        const saved = localStorage.getItem('lvd_settings');
        if (saved) userConfig = { ...userConfig, ...JSON.parse(saved) };
        const savedCustom = localStorage.getItem('lvd_custom_terms');
        if (savedCustom) userConfig.customTerms = JSON.parse(savedCustom);
        buildRegex();
      } catch (e) { }
    }
  }

  // Detect current platform
  function detectPlatform() {
    const host = window.location.hostname;
    if (host.includes('openai.com') || host.includes('chatgpt.com')) return 'chatgpt';
    if (host.includes('claude.ai')) return 'claude';
    if (host.includes('gemini.google') || host.includes('bard.google')) return 'gemini';
    if (host.includes('meta.ai')) return 'meta';
    return 'general';
  }

  const currentPlatform = detectPlatform();

  function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function getRegexForTerms(terms) {
    const sorted = [...terms].sort((a, b) => b.length - a.length);
    if (sorted.length === 0) return null;
    const esc = sorted.map(escapeRegExp);
    try {
      return new RegExp('(?<!\\w)(' + esc.join('|') + ')(?!\\w)', 'gi');
    } catch (e) {
      return new RegExp('\\b(' + esc.join('|') + ')\\b', 'gi');
    }
  }

  function getDict() {
    const base = (typeof LVD_DICTIONARY !== 'undefined')
      ? LVD_DICTIONARY
      : (typeof window !== 'undefined' && window.LVD_DICTIONARY ? window.LVD_DICTIONARY : {});
    return { ...base, ...userConfig.customTerms };
  }

  function getTerms() {
    const dict = getDict();
    return Object.keys(dict).sort((a, b) => b.length - a.length);
  }

  // Categorization heuristics
  function categorizeTerm(term, rephrase) {
    const t = term.toLowerCase();
    const r = (rephrase || '').toLowerCase();
    if (userConfig.customTerms && userConfig.customTerms[t]) return 'custom';
    if (term.toUpperCase() === term && term.length > 2) return 'directive';
    if (t.includes('think') || t.includes('learn') || t.includes('reason') || t.includes('know') || t.includes('understand') || t.includes('remember') || t.includes('cognit') || t.includes('idea') || t.includes('visual') || t.includes('curious') || t.includes('confus') || t.includes('uncertain') || t.includes('believe') || t.includes('doubt') || t.includes('assume') || t.includes('guess') || t.includes('expect') || t.includes('want') || t.includes('need') || t.includes('intend') || t.includes('try') || t.includes('create') || t.includes('invent') || t.includes('sense') || t.includes('realize') || t.includes('recognize') || t.includes('mind')) {
      return 'cognition';
    }
    if (t.includes('check') || t.includes('verify') || t.includes('confirm') || t.includes('prove') || t.includes('sure') || t.includes('test') || t.includes('careful') || t.includes('miss') || t.includes('sanity') || t.includes('pressure') || t.includes('honest') || t.includes('agree') || t.includes('correct') || t.includes('validate') || r.includes('evidence') || r.includes('validation')) {
      return 'verification';
    }
    if (t.includes('investigate') || t.includes('explore') || t.includes('analy') || t.includes('evaluat') || t.includes('critique') || t.includes('diagnos') || t.includes('inspect') || t.includes('assess') || t.includes('compare') || t.includes('deep') || t.includes('break') || t.includes('look') || t.includes('what') || t.includes('which') || t.includes('does') || t.includes('why')) {
      return 'analysis';
    }
    return 'directive';
  }

  let globalRegex = null;
  function buildRegex() {
    const terms = getTerms();
    globalRegex = getRegexForTerms(terms);
  }
  buildRegex();

  function getTextFromInput(el) {
    if (!el) return '';
    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
      return el.value || '';
    }
    return el.innerText || el.textContent || '';
  }

  function setNativeValue(el, value) {
    const proto = el.tagName === 'TEXTAREA'
      ? (window.HTMLTextAreaElement && window.HTMLTextAreaElement.prototype)
      : el.tagName === 'INPUT'
        ? (window.HTMLInputElement && window.HTMLInputElement.prototype)
        : null;
    const desc = proto && Object.getOwnPropertyDescriptor(proto, 'value');
    if (desc && desc.set) desc.set.call(el, value);
    else el.value = value;
  }

  function placeCaretAtEnd(el) {
    try {
      const sel = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    } catch (e) { }
  }

  // ==========================================================================
  // ATOMIC NON-DESTRUCTIVE REPLACEMENT ENGINE
  // Solves the recursive substring corruption bug
  // ==========================================================================

  function compileTextAtomic(text, replacementsToApply) {
    if (!text || !replacementsToApply || replacementsToApply.length === 0) return text;

    // Filter overlapping replacement ranges, preserving longest match first
    const sorted = [...replacementsToApply].sort((a, b) => {
      const lenA = (a.end !== undefined) ? (a.end - a.start) : a.term.length;
      const lenB = (b.end !== undefined) ? (b.end - b.start) : b.term.length;
      return lenB - lenA;
    });

    const accepted = [];
    for (const item of sorted) {
      let start = item.start;
      let end = item.end;
      if (typeof start !== 'number' || typeof end !== 'number') {
        const r = getRegexForTerms([item.term]);
        if (!r) continue;
        r.lastIndex = 0;
        const m = r.exec(text);
        if (!m) continue;
        start = m.index;
        end = m.index + m[0].length;
      }

      const collides = accepted.some(acc => (start < acc.end && end > acc.start));
      if (!collides) {
        accepted.push({ start, end, rephrase: item.rephrase, term: item.term });
      }
    }

    // Sort chronologically ascending
    accepted.sort((a, b) => a.start - b.start);

    // Single-pass reconstruction
    let output = '';
    let cursor = 0;
    for (const acc of accepted) {
      output += text.slice(cursor, acc.start);
      output += acc.rephrase;
      cursor = acc.end;
    }
    output += text.slice(cursor);

    return output;
  }

  function replaceInNativeInput(el, term, rephrase, pos) {
    try { el.focus(); } catch (e) { }
    const val = el.value || '';
    let start = -1;
    let end = -1;

    if (typeof pos === 'number' && pos >= 0 && pos + term.length <= val.length) {
      if (val.slice(pos, pos + term.length).toLowerCase() === term.toLowerCase()) {
        start = pos;
        end = pos + term.length;
      }
    }

    if (start === -1) {
      const regex = getRegexForTerms([term]);
      if (!regex) return false;
      regex.lastIndex = 0;
      const match = regex.exec(val);
      if (!match) return false;
      start = match.index;
      end = match.index + match[0].length;
    }

    const newVal = val.slice(0, start) + rephrase + val.slice(end);
    setNativeValue(el, newVal);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    try {
      el.selectionStart = el.selectionEnd = start + rephrase.length;
    } catch (e) { }
    return true;
  }

  function replaceInContentEditable(el, term, rephrase, pos) {
    try { el.focus(); } catch (e) { }
    const before = getTextFromInput(el);

    let cleanBefore = before;
    if (cleanBefore.endsWith('\n') && !cleanBefore.slice(0, -1).includes('\n')) {
      cleanBefore = cleanBefore.slice(0, -1);
    }

    let start = -1;
    let end = -1;
    if (typeof pos === 'number' && pos >= 0 && pos + term.length <= cleanBefore.length) {
      if (cleanBefore.slice(pos, pos + term.length).toLowerCase() === term.toLowerCase()) {
        start = pos;
        end = pos + term.length;
      }
    }

    let newText = '';
    if (start !== -1) {
      newText = cleanBefore.slice(0, start) + rephrase + cleanBefore.slice(end);
    } else {
      const termRegex = getRegexForTerms([term]);
      if (!termRegex) return false;
      termRegex.lastIndex = 0;
      newText = cleanBefore.replace(termRegex, rephrase);
    }

    if (newText === cleanBefore) return false;

    return setTextInInput(el, newText);
  }

  function setTextInInput(el, newText) {
    if (!el) return false;
    try { el.focus(); } catch (e) { }

    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
      setNativeValue(el, newText);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      try { el.selectionStart = el.selectionEnd = newText.length; } catch (e) { }
      return true;
    }

    const before = getTextFromInput(el);
    try {
      const sel = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(el);
      sel.removeAllRanges();
      sel.addRange(range);
    } catch (e) { }

    // Strategy 1: insertText command
    try {
      const ok = document.execCommand('insertText', false, newText);
      if (ok && getTextFromInput(el) !== before) {
        placeCaretAtEnd(el);
        return true;
      }
    } catch (e) { }

    // Strategy 2: Clipboard paste event
    try {
      const dt = new DataTransfer();
      dt.setData('text/plain', newText);
      const pasteEv = new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData: dt
      });
      el.dispatchEvent(pasteEv);
      if (getTextFromInput(el) !== before) {
        placeCaretAtEnd(el);
        return true;
      }
    } catch (e) { }

    // Strategy 3: direct fallback assignment
    try {
      el.innerText = newText;
      el.dispatchEvent(new InputEvent('input', { bubbles: true, data: newText, inputType: 'insertText' }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      placeCaretAtEnd(el);
      return true;
    } catch (e) { return false; }
  }

  function findPromptInputs() {
    const selectors = [
      '#prompt-textarea',
      'div#prompt-textarea[contenteditable="true"]',
      'div[data-lexical-editor="true"]',
      'div.ProseMirror[contenteditable="true"]',
      'div[contenteditable="true"][data-placeholder]',
      'div[contenteditable="true"][role="textbox"]',
      'div[contenteditable="true"]',
      'textarea[data-id="root"]',
      'textarea[placeholder*="Message"]',
      'textarea[placeholder*="Ask"]',
      'textarea',
      'div[aria-label*="Message"]',
      '[data-testid="chat-input"]'
    ];

    const candidates = [];
    for (const sel of selectors) {
      try {
        document.querySelectorAll(sel).forEach(el => {
          const rect = el.getBoundingClientRect();
          if (rect.width > 100 && rect.height > 20 && rect.height < 600) {
            if (rect.bottom > window.innerHeight * 0.25 || document.activeElement === el) {
              candidates.push(el);
            }
          }
        });
      } catch (e) { }
    }

    const active = document.activeElement;
    if (active && (active.tagName === 'TEXTAREA' || active.getAttribute('contenteditable') === 'true' || active.tagName === 'INPUT')) {
      return [active, ...candidates.filter(c => c !== active)];
    }

    const unique = [...new Set(candidates)];
    unique.sort((a, b) => b.getBoundingClientRect().bottom - a.getBoundingClientRect().bottom);
    return unique;
  }

  function createSuggestionBar() {
    let bar = document.getElementById('lvd-suggestion-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'lvd-suggestion-bar';
      bar.setAttribute('role', 'region');
      bar.setAttribute('aria-label', 'LVD Prompt Suggestions');
      if (currentPlatform) bar.setAttribute('data-lvd-platform', currentPlatform);
    }
    return bar;
  }

  function placeSuggestionBar(inputEl, bar) {
    if (!inputEl) return;
    if (bar.parentElement && bar.nextElementSibling === inputEl) return;

    try {
      if (inputEl.parentElement) {
        inputEl.parentElement.insertBefore(bar, inputEl);
        return;
      }
    } catch (e) { }

    try {
      if (inputEl.parentNode) {
        inputEl.parentNode.insertBefore(bar, inputEl);
        return;
      }
    } catch (e) { }

    try {
      document.body.appendChild(bar);
      const rect = inputEl.getBoundingClientRect();
      bar.style.position = 'fixed';
      bar.style.left = rect.left + 'px';
      bar.style.top = Math.max(0, rect.top - 58) + 'px';
      bar.style.width = rect.width + 'px';
      bar.style.zIndex = '99999';
    } catch (e) { }
  }

  function scanAndShow(inputEl) {
    if (!userConfig.enabled) {
      hideBar();
      return;
    }
    if (userConfig.platforms && userConfig.platforms[currentPlatform] === false) {
      hideBar();
      return;
    }

    const text = getTextFromInput(inputEl);
    if (!text || text.trim().length < 2) {
      hideBar();
      isDismissedForCurrentText = false;
      return;
    }

    if (text !== lastText) {
      isDismissedForCurrentText = false;
    } else if (isDismissedForCurrentText) {
      return;
    }
    lastText = text;

    const dict = getDict();
    const terms = getTerms();
    const matches = [];
    const seenKeys = new Set();
    const regex = getRegexForTerms(terms);
    if (!regex) {
      hideBar();
      return;
    }
    regex.lastIndex = 0;

    let m;
    const maxPills = userConfig.maxPills || 6;
    while ((m = regex.exec(text)) !== null) {
      const raw = m[0];
      const key = raw.toLowerCase();
      if (seenKeys.has(key)) continue;

      let dictKey = key;
      let rephrase = dict[key];
      if (!rephrase) {
        const found = Object.keys(dict).find(k => k.toLowerCase() === key);
        if (found) {
          dictKey = found;
          rephrase = dict[found];
        }
      }

      if (rephrase) {
        const cat = categorizeTerm(raw, rephrase);
        matches.push({
          term: raw,
          key: dictKey,
          rephrase: rephrase,
          category: cat,
          start: m.index,
          end: m.index + raw.length,
          pos: m.index
        });
        seenKeys.add(key);
      }
      if (matches.length >= maxPills) break;
      if (m[0].length === 0) regex.lastIndex++;
    }

    if (matches.length === 0) {
      hideBar();
      activeMatches = [];
      activePillIndex = 0;
      return;
    }

    activeMatches = matches;
    if (activePillIndex >= activeMatches.length) activePillIndex = 0;
    showBar(inputEl, matches, text);
  }

  function showBar(inputEl, matches, originalText) {
    if (!suggestionBar) suggestionBar = createSuggestionBar();
    placeSuggestionBar(inputEl, suggestionBar);

    suggestionBar.innerHTML = '';

    // Modern Header
    const header = document.createElement('div');
    header.className = 'lvd-bar-header';

    const titleGroup = document.createElement('div');
    titleGroup.className = 'lvd-bar-title-group';
    titleGroup.innerHTML = `
      <div class="lvd-bar-logo-badge">L</div>
      <span class="lvd-bar-title">LVD Compiler</span>
      <span class="lvd-badge-count">${matches.length} ${matches.length === 1 ? 'term' : 'terms'}</span>
    `;

    const actionsGroup = document.createElement('div');
    actionsGroup.className = 'lvd-bar-actions';

    // Replace All button
    const replaceAllBtn = document.createElement('button');
    replaceAllBtn.className = 'lvd-btn-replace-all';
    replaceAllBtn.type = 'button';
    replaceAllBtn.innerHTML = `<span>Replace All</span>`;
    replaceAllBtn.title = 'Enhance all detected terms at once (Alt+Enter)';
    replaceAllBtn.setAttribute('aria-label', 'Replace all detected terms');
    replaceAllBtn.addEventListener('mousedown', (e) => e.preventDefault());
    replaceAllBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      replaceAllTerms(inputEl, matches);
    });

    // Keyboard navigation hints
    const keyHint = document.createElement('span');
    keyHint.className = 'lvd-key-hint';
    keyHint.innerHTML = `<span class="lvd-kbd">Tab</span> to apply • <span class="lvd-kbd">Esc</span>`;

    // Dismiss button
    const dismissBtn = document.createElement('button');
    dismissBtn.className = 'lvd-btn-dismiss';
    dismissBtn.type = 'button';
    dismissBtn.innerHTML = '✕';
    dismissBtn.title = 'Dismiss suggestions (Esc)';
    dismissBtn.setAttribute('aria-label', 'Dismiss suggestions');
    dismissBtn.addEventListener('mousedown', (e) => e.preventDefault());
    dismissBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      isDismissedForCurrentText = true;
      hideBar();
    });

    // Undo button (if previous replacement exists)
    if (undoStack.length > 0) {
      const undoBtn = document.createElement('button');
      undoBtn.className = 'lvd-btn-undo';
      undoBtn.type = 'button';
      undoBtn.innerHTML = `<span>↶ Undo</span>`;
      undoBtn.title = 'Revert previous replacement (Alt+Z)';
      undoBtn.setAttribute('aria-label', 'Undo last replacement');
      undoBtn.addEventListener('mousedown', (e) => e.preventDefault());
      undoBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        revertLastReplacement(inputEl);
      });
      actionsGroup.appendChild(undoBtn);
    }

    actionsGroup.appendChild(replaceAllBtn);
    actionsGroup.appendChild(keyHint);
    actionsGroup.appendChild(dismissBtn);

    header.appendChild(titleGroup);
    header.appendChild(actionsGroup);
    suggestionBar.appendChild(header);

    // Pills List
    const pillsList = document.createElement('div');
    pillsList.className = 'lvd-pills-list';
    pillsList.setAttribute('role', 'listbox');

    matches.forEach((match, idx) => {
      const pill = document.createElement('button');
      pill.className = 'lvd-pill' + (idx === activePillIndex ? ' lvd-pill-active' : '');
      pill.type = 'button';
      pill.setAttribute('role', 'option');
      pill.setAttribute('aria-selected', idx === activePillIndex ? 'true' : 'false');
      pill.setAttribute('tabindex', '0');
      pill.setAttribute('data-index', idx);
      pill.setAttribute('data-lvd-tooltip', `Click to replace: ${match.rephrase}`);
      pill.setAttribute('aria-label', `Replace ${match.term} with ${match.rephrase}`);
      
      pill.innerHTML = `
        <span class="lvd-cat-dot" data-cat="${match.category}"></span>
        <span class="lvd-term-chip">${escapeHtml(match.term)}</span>
        <span class="lvd-arrow">→</span>
        <span class="lvd-rephrase">${escapeHtml(match.rephrase)}</span>
      `;

      pill.addEventListener('mousedown', (e) => e.preventDefault());
      pill.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        pill.classList.add('lvd-replaced');
        replaceTermInInput(inputEl, match.term, match.rephrase, match.pos);
        recordActivity(match.term, match.rephrase);
      });

      pillsList.appendChild(pill);
    });

    suggestionBar.appendChild(pillsList);
    suggestionBar.style.display = 'flex';
  }

  function hideBar() {
    if (suggestionBar) {
      suggestionBar.style.display = 'none';
      suggestionBar.innerHTML = '';
    }
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s || '';
    return div.innerHTML;
  }

  function revertLastReplacement(inputEl) {
    if (!inputEl) inputEl = currentInput || document.activeElement;
    if (!inputEl || undoStack.length === 0) return;
    const prevText = undoStack.pop();
    setTextInInput(inputEl, prevText);
    setTimeout(() => {
      lastText = '';
      scanAndShow(inputEl);
    }, 120);
  }

  function replaceTermInInput(inputEl, term, rephrase, pos) {
    if (!inputEl) inputEl = currentInput || document.activeElement;
    if (!inputEl) return;

    const currentText = getTextFromInput(inputEl);
    if (currentText) {
      undoStack.push(currentText);
      if (undoStack.length > 10) undoStack.shift();
    }

    try {
      let changed = false;
      if (inputEl.tagName === 'TEXTAREA' || inputEl.tagName === 'INPUT') {
        changed = replaceInNativeInput(inputEl, term, rephrase, pos);
      } else {
        changed = replaceInContentEditable(inputEl, term, rephrase, pos);
      }

      if (changed) {
        log('Replaced', term, '->', rephrase);
      } else {
        const text = getTextFromInput(inputEl);
        const newText = compileTextAtomic(text, [{ term, rephrase, start: pos, end: (typeof pos === 'number' ? pos + term.length : undefined) }]);
        if (newText !== text) {
          changed = setTextInInput(inputEl, newText);
        }
      }

      setTimeout(() => {
        lastText = '';
        scanAndShow(inputEl);
      }, 120);
    } catch (e) {
      log('replace error', e);
    }
  }

  // Record prompt directly into local SQLite Database
  function recordPromptToSQLite(rawText, compiledText = '', status = 'captured') {
    if (!rawText || rawText.trim().length < 2) return;
    try {
      const store = (typeof SQLitePromptStore !== 'undefined')
        ? SQLitePromptStore
        : (typeof window !== 'undefined' && window.SQLitePromptStore ? window.SQLitePromptStore : null);
      if (store) {
        store.insertPrompt({
          platform: currentPlatform || 'general',
          promptText: rawText.trim(),
          compiledText: compiledText ? compiledText.trim() : '',
          status: status
        });
      }
    } catch (e) {
      log('SQLite prompt record error', e);
    }
  }

  // ATOMIC Batch Replace All functionality
  function replaceAllTerms(inputEl, matches) {
    if (!inputEl) inputEl = currentInput || document.activeElement;
    if (!inputEl || !matches || matches.length === 0) return;

    const text = getTextFromInput(inputEl);
    if (!text) return;

    undoStack.push(text);
    if (undoStack.length > 10) undoStack.shift();

    // Use atomic single-pass compiler to prevent recursive substring corruption
    const updatedText = compileTextAtomic(text, matches);

    matches.forEach(m => recordActivity(m.term, m.rephrase));

    if (updatedText !== text) {
      recordPromptToSQLite(text, updatedText, 'compiled');
      setTextInInput(inputEl, updatedText);
      setTimeout(() => {
        lastText = '';
        scanAndShow(inputEl);
      }, 120);
    }
  }

  // Record usage metrics into storage
  function recordActivity(term, rephrase) {
    const item = { term, rephrase, timestamp: Date.now() };
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['lvd_stats'], (res) => {
        const stats = res.lvd_stats || { totalReplaced: 0, recent: [] };
        stats.totalReplaced = (stats.totalReplaced || 0) + 1;
        stats.recent = [item, ...(stats.recent || [])].slice(0, 30);
        chrome.storage.local.set({ lvd_stats: stats });
      });
    } else {
      try {
        const stats = JSON.parse(localStorage.getItem('lvd_stats') || '{"totalReplaced":0,"recent":[]}');
        stats.totalReplaced = (stats.totalReplaced || 0) + 1;
        stats.recent = [item, ...(stats.recent || [])].slice(0, 30);
        localStorage.setItem('lvd_stats', JSON.stringify(stats));
      } catch (e) { }
    }
  }

  function updateActivePillUI() {
    if (!suggestionBar) return;
    const pills = suggestionBar.querySelectorAll('.lvd-pill');
    pills.forEach((p, idx) => {
      if (idx === activePillIndex) {
        p.classList.add('lvd-pill-active');
        p.setAttribute('aria-selected', 'true');
        p.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
      } else {
        p.classList.remove('lvd-pill-active');
        p.setAttribute('aria-selected', 'false');
      }
    });
  }

  function attachToInput(inputEl) {
    if (!inputEl || inputEl.dataset.lvdAttached) return;
    inputEl.dataset.lvdAttached = 'true';
    currentInput = inputEl;

    const handler = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => scanAndShow(inputEl), 150);
    };

    inputEl.addEventListener('input', handler);
    inputEl.addEventListener('keyup', (e) => {
      if (e.key === 'Escape') {
        isDismissedForCurrentText = true;
        hideBar();
      } else {
        handler();
      }
    });

    inputEl.addEventListener('keydown', (e) => {
      // Auto-capture submitted prompt into SQLite DB on Enter (without Shift)
      if (e.key === 'Enter' && !e.shiftKey && !e.altKey && !e.metaKey && !e.ctrlKey) {
        const submittedText = getTextFromInput(inputEl);
        if (submittedText && submittedText.trim().length > 2) {
          recordPromptToSQLite(submittedText, '', 'submitted');
        }
      }

      const isBarVisible = suggestionBar && suggestionBar.style.display !== 'none' && activeMatches.length > 0;
      if (!isBarVisible) return;

      // Tab: Apply active suggestion
      if (e.key === 'Tab' && !e.shiftKey && !e.altKey && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        const targetMatch = activeMatches[activePillIndex] || activeMatches[0];
        if (targetMatch) {
          replaceTermInInput(inputEl, targetMatch.term, targetMatch.rephrase, targetMatch.pos);
          recordActivity(targetMatch.term, targetMatch.rephrase);
        }
        return;
      }

      // Alt+Z: Undo last replacement
      if (e.altKey && (e.key === 'z' || e.key === 'Z' || e.code === 'KeyZ') && undoStack.length > 0) {
        e.preventDefault();
        revertLastReplacement(inputEl);
        return;
      }

      // Alt+Enter: Replace All
      if (e.key === 'Enter' && e.altKey) {
        e.preventDefault();
        replaceAllTerms(inputEl, activeMatches);
        return;
      }

      // Alt+ArrowRight / Alt+ArrowDown: Roving focus next pill
      if (e.altKey && (e.key === 'ArrowRight' || e.key === 'ArrowDown')) {
        e.preventDefault();
        activePillIndex = (activePillIndex + 1) % activeMatches.length;
        updateActivePillUI();
        return;
      }

      // Alt+ArrowLeft / Alt+ArrowUp: Roving focus previous pill
      if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowUp')) {
        e.preventDefault();
        activePillIndex = (activePillIndex - 1 + activeMatches.length) % activeMatches.length;
        updateActivePillUI();
        return;
      }
    });

    inputEl.addEventListener('paste', () => setTimeout(handler, 60));
    inputEl.addEventListener('focus', handler);

    setTimeout(handler, 250);
  }

  function init() {
    loadConfig();

    const inputs = findPromptInputs();
    inputs.slice(0, 3).forEach(attachToInput);

    const observer = new MutationObserver(() => {
      const currentInputs = findPromptInputs();
      currentInputs.slice(0, 3).forEach(attachToInput);
    });

    observer.observe(document.body, { childList: true, subtree: true });

    document.addEventListener('focusin', (e) => {
      const target = e.target;
      if (target && (target.tagName === 'TEXTAREA' || target.getAttribute('contenteditable') === 'true' || target.tagName === 'INPUT')) {
        attachToInput(target);
        currentInput = target;
      }
    });

    document.addEventListener('click', (e) => {
      const btn = e.target.closest('button, [role="button"]');
      if (btn && currentInput) {
        const aria = (btn.getAttribute('aria-label') || btn.getAttribute('data-testid') || btn.className || '').toLowerCase();
        if (aria.includes('send') || aria.includes('submit')) {
          const text = getTextFromInput(currentInput);
          if (text && text.trim().length > 2) {
            recordPromptToSQLite(text, '', 'submitted');
          }
        }
      }
    }, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  setTimeout(init, 1000);
  setTimeout(init, 2500);
})();
