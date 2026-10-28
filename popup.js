// ==========================================================================
// LVD Compiler - Popup Controller (Modernized v3.0)
// Complete logic for Playground, Dictionary Explorer, Settings, and Activity
// Atomic Compiler • High-Contrast UI • Accessible Roving Focus
// ==========================================================================

(function () {
  // Storage helper
  const storage = {
    get: (keys, cb) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(keys, cb);
      } else {
        const res = {};
        const list = Array.isArray(keys) ? keys : (typeof keys === 'string' ? [keys] : Object.keys(keys || {}));
        list.forEach(k => {
          try {
            const val = localStorage.getItem('lvd_' + k);
            if (val !== null) res[k] = JSON.parse(val);
            else if (typeof keys === 'object' && keys[k] !== undefined) res[k] = keys[k];
          } catch(e) {}
        });
        cb(res);
      }
    },
    set: (items, cb) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set(items, cb);
      } else {
        Object.keys(items).forEach(k => {
          try { localStorage.setItem('lvd_' + k, JSON.stringify(items[k])); } catch(e) {}
        });
        if (cb) cb();
      }
    }
  };

  // State
  let config = {
    enabled: true,
    maxPills: 6,
    platforms: {
      chatgpt: true,
      claude: true,
      gemini: true,
      meta: true
    }
  };
  let customTerms = {};
  let stats = { totalReplaced: 0, recent: [] };
  let currentCategory = 'all';

  // Categorization heuristics
  function categorizeTerm(term, rephrase) {
    const t = term.toLowerCase();
    const r = (rephrase || '').toLowerCase();
    if (customTerms[t]) return 'custom';
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

  function getCombinedDict() {
    const base = (typeof LVD_DICTIONARY !== 'undefined') ? LVD_DICTIONARY : {};
    return { ...base, ...customTerms };
  }

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

  // Atomic non-destructive compiler
  function compilePromptAtomic(text, matchesToApply) {
    if (!text || !matchesToApply || matchesToApply.length === 0) return text;

    const sorted = [...matchesToApply].sort((a, b) => (b.term.length - a.term.length));
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
      const overlaps = accepted.some(acc => (start < acc.end && end > acc.start));
      if (!overlaps) {
        accepted.push({ start, end, rephrase: item.rephrase, term: item.term });
      }
    }

    accepted.sort((a, b) => a.start - b.start);

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

  // DOM Elements
  const masterToggle = document.getElementById('masterToggle');
  const statusBadge = document.getElementById('statusBadge');
  const statusText = document.getElementById('statusText');
  const metricDictSize = document.getElementById('metricDictSize');
  const metricReplaced = document.getElementById('metricReplaced');

  const testPromptInput = document.getElementById('testPromptInput');
  const suggestionBar = document.getElementById('lvd-suggestion-bar');
  const diffCard = document.getElementById('diffCard');
  const diffOutput = document.getElementById('diffOutput');
  const btnCopyEnhanced = document.getElementById('btnCopyEnhanced');
  const btnUndoPrompt = document.getElementById('btnUndoPrompt');
  const btnClearPrompt = document.getElementById('btnClearPrompt');
  const clarityBar = document.getElementById('clarityBar');
  const clarityScoreText = document.getElementById('clarityScoreText');
  const undoStack = [];

  const dictSearchInput = document.getElementById('dictSearchInput');
  const btnSearchClear = document.getElementById('btnSearchClear');
  const dictList = document.getElementById('dictList');
  const categoryFilterBar = document.getElementById('categoryFilterBar');
  const btnToggleCustomForm = document.getElementById('btnToggleCustomForm');
  const customTermForm = document.getElementById('customTermForm');
  const customTermKey = document.getElementById('customTermKey');
  const customTermVal = document.getElementById('customTermVal');
  const btnSaveCustomTerm = document.getElementById('btnSaveCustomTerm');
  const btnCancelCustomTerm = document.getElementById('btnCancelCustomTerm');

  const platformChatGPT = document.getElementById('platformChatGPT');
  const platformClaude = document.getElementById('platformClaude');
  const platformGemini = document.getElementById('platformGemini');
  const platformMeta = document.getElementById('platformMeta');
  const sliderMaxPills = document.getElementById('sliderMaxPills');
  const valMaxPills = document.getElementById('valMaxPills');

  const activityList = document.getElementById('activityList');
  const btnClearHistory = document.getElementById('btnClearHistory');

  // Initialize UI
  function init() {
    storage.get(['settings', 'custom_terms', 'stats'], (res) => {
      if (res.settings) config = { ...config, ...res.settings };
      if (res.custom_terms) customTerms = res.custom_terms;
      if (res.stats) stats = res.stats;

      updateStatusUI();
      updateMetricCounts();
      renderSettings();
      renderDictionaryList();
      renderActivityList();
    });

    setupTabs();
    setupPlayground();
    setupDictionary();
    setupSettingsEvents();
    setupActivityEvents();
  }

  let vaultPlatformFilter = 'all';
  let vaultSearchQuery = '';

  function setupActivityEvents() {
    const vaultFilterBar = document.getElementById('vaultFilterBar');
    if (vaultFilterBar) {
      vaultFilterBar.querySelectorAll('.cat-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          vaultFilterBar.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          vaultPlatformFilter = btn.dataset.platform;
          renderActivityList();
        });
      });
    }

    const vaultSearchInput = document.getElementById('vaultSearchInput');
    if (vaultSearchInput) {
      vaultSearchInput.addEventListener('input', () => {
        vaultSearchQuery = vaultSearchInput.value.trim();
        renderActivityList();
      });
    }

    const btnExportVaultSql = document.getElementById('btnExportVaultSql');
    if (btnExportVaultSql) {
      btnExportVaultSql.addEventListener('click', async () => {
        const store = (typeof SQLitePromptStore !== 'undefined') ? SQLitePromptStore : null;
        if (!store) return;
        const sqlDump = await store.exportSQL();
        const blob = new Blob([sqlDump], { type: 'text/sql' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lvd-prompt-vault-${Date.now()}.sql`;
        a.click();
        URL.revokeObjectURL(url);
      });
    }

    if (btnClearHistory) {
      btnClearHistory.addEventListener('click', async () => {
        const store = (typeof SQLitePromptStore !== 'undefined') ? SQLitePromptStore : null;
        if (store) await store.clearVault();
        stats.recent = [];
        storage.set({ stats });
        renderActivityList();
      });
    }
  }

  function updateStatusUI() {
    masterToggle.checked = config.enabled;
    if (config.enabled) {
      statusBadge.classList.remove('disabled');
      statusText.textContent = 'Active';
    } else {
      statusBadge.classList.add('disabled');
      statusText.textContent = 'Paused';
    }
  }

  function updateMetricCounts() {
    const dict = getCombinedDict();
    const entries = Object.entries(dict);
    const totalTerms = entries.length;
    metricDictSize.textContent = totalTerms;
    metricReplaced.textContent = stats.totalReplaced || 0;

    const counts = { all: totalTerms, cognition: 0, verification: 0, directive: 0, analysis: 0, custom: 0 };
    entries.forEach(([term, rephrase]) => {
      const cat = categorizeTerm(term, rephrase);
      if (counts[cat] !== undefined) counts[cat]++;
    });

    Object.keys(counts).forEach(cat => {
      const btn = document.querySelector(`[data-cat="${cat}"]`);
      if (btn) {
        const title = cat === 'all' ? 'All' : (cat.charAt(0).toUpperCase() + cat.slice(1));
        btn.textContent = `${title} (${counts[cat]})`;
      }
    });
  }

  // Tab switching with ARIA keyboard navigation
  function setupTabs() {
    const tabs = Array.from(document.querySelectorAll('.nav-tab-btn'));
    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => {
        activateTab(tab);
      });

      tab.addEventListener('keydown', (e) => {
        let targetIndex = -1;
        if (e.key === 'ArrowRight') targetIndex = (index + 1) % tabs.length;
        if (e.key === 'ArrowLeft') targetIndex = (index - 1 + tabs.length) % tabs.length;
        if (targetIndex !== -1) {
          e.preventDefault();
          tabs[targetIndex].focus();
          activateTab(tabs[targetIndex]);
        }
      });
    });
  }

  function activateTab(tab) {
    const tabs = document.querySelectorAll('.nav-tab-btn');
    tabs.forEach(t => {
      t.classList.remove('active');
      t.setAttribute('aria-selected', 'false');
    });
    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');

    const targetId = tab.dataset.tab;
    document.querySelectorAll('.tab-panel').forEach(panel => {
      panel.classList.remove('active');
      if (panel.id === targetId) panel.classList.add('active');
    });

    if (targetId === 'tabPlayground') scanPlaygroundPrompt();
    if (targetId === 'tabDict') renderDictionaryList();
    if (targetId === 'tabActivity') renderActivityList();
  }

  // PLAYGROUND LOGIC
  function setupPlayground() {
    testPromptInput.addEventListener('input', () => {
      scanPlaygroundPrompt();
    });

    // Preset chip clicks
    document.querySelectorAll('.preset-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        testPromptInput.value = chip.dataset.text;
        testPromptInput.focus();
        scanPlaygroundPrompt();
      });
    });

    btnClearPrompt.addEventListener('click', () => {
      const prev = testPromptInput.value;
      if (prev) pushUndoState(prev);
      testPromptInput.value = '';
      suggestionBar.innerHTML = '';
      suggestionBar.style.display = 'none';
      diffCard.style.display = 'none';
      testPromptInput.focus();
    });

    if (btnUndoPrompt) {
      btnUndoPrompt.addEventListener('click', () => {
        revertPlaygroundReplacement();
      });
    }

    testPromptInput.addEventListener('keydown', (e) => {
      if (e.altKey && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        revertPlaygroundReplacement();
      }
    });

    btnCopyEnhanced.addEventListener('click', () => {
      const textToCopy = testPromptInput.value;
      if (!textToCopy) return;
      navigator.clipboard.writeText(textToCopy).then(() => {
        const originalText = btnCopyEnhanced.innerHTML;
        btnCopyEnhanced.innerHTML = '<span>✓ Copied to Clipboard!</span>';
        setTimeout(() => {
          btnCopyEnhanced.innerHTML = originalText;
        }, 1600);
      });
    });

    // Default sample prompt
    testPromptInput.value = "I want the AI to learn from the errors and think step by step to adapt the plan.";
    setTimeout(scanPlaygroundPrompt, 100);
  }

  function scanPlaygroundPrompt() {
    const text = testPromptInput.value;
    if (!text || text.trim().length < 2) {
      suggestionBar.innerHTML = '';
      suggestionBar.style.display = 'none';
      diffCard.style.display = 'none';
      return;
    }

    const dict = getCombinedDict();
    const terms = Object.keys(dict).sort((a, b) => b.length - a.length);
    const regex = getRegexForTerms(terms);
    if (!regex) return;

    const matches = [];
    const seenKeys = new Set();
    let m;
    const maxPills = config.maxPills || 6;

    while ((m = regex.exec(text)) !== null) {
      const raw = m[0];
      const key = raw.toLowerCase();
      if (seenKeys.has(key)) continue;

      let rephrase = dict[key];
      if (!rephrase) {
        const found = Object.keys(dict).find(k => k.toLowerCase() === key);
        if (found) rephrase = dict[found];
      }

      if (rephrase) {
        const cat = categorizeTerm(raw, rephrase);
        matches.push({
          term: raw,
          rephrase,
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

    renderPlaygroundPills(matches, text);
    renderDiffPreview(matches, text);
    updateClarityScore(matches, text);
  }

  function updateClarityScore(matches, text) {
    if (!clarityBar || !clarityScoreText) return;
    if (!text || text.trim().length === 0) {
      clarityBar.style.width = '100%';
      clarityScoreText.textContent = '100% READY';
      clarityScoreText.style.color = 'var(--lvd-emerald-light)';
      return;
    }
    const count = matches ? matches.length : 0;
    if (count === 0) {
      clarityBar.style.width = '100%';
      clarityScoreText.textContent = '98% OPTIMAL';
      clarityScoreText.style.color = 'var(--lvd-emerald-light)';
    } else {
      const score = Math.max(65, 100 - (count * 8));
      clarityBar.style.width = score + '%';
      clarityScoreText.textContent = `${score}% • ${count} SUGGESTION${count > 1 ? 'S' : ''}`;
      clarityScoreText.style.color = score > 80 ? 'var(--lvd-amber-light)' : 'var(--lvd-cyan-light)';
    }
  }

  function renderPlaygroundPills(matches, originalText) {
    suggestionBar.innerHTML = '';
    if (matches.length === 0) {
      suggestionBar.style.display = 'none';
      return;
    }

    // Bar Header
    const header = document.createElement('div');
    header.className = 'lvd-bar-header';

    const titleGroup = document.createElement('div');
    titleGroup.className = 'lvd-bar-title-group';
    titleGroup.innerHTML = `
      <div class="lvd-bar-logo-badge">L</div>
      <span class="lvd-bar-title">LVD Compiler</span>
      <span class="lvd-badge-count">${matches.length} detected</span>
    `;

    const actionsGroup = document.createElement('div');
    actionsGroup.className = 'lvd-bar-actions';

    const replaceAllBtn = document.createElement('button');
    replaceAllBtn.className = 'lvd-btn-replace-all';
    replaceAllBtn.type = 'button';
    replaceAllBtn.innerHTML = `<span>Replace All</span>`;
    replaceAllBtn.addEventListener('click', (e) => {
      e.preventDefault();
      applyPlaygroundReplaceAll(matches);
    });

    actionsGroup.appendChild(replaceAllBtn);
    header.appendChild(titleGroup);
    header.appendChild(actionsGroup);
    suggestionBar.appendChild(header);

    // Pills list
    const pillsList = document.createElement('div');
    pillsList.className = 'lvd-pills-list';

    matches.forEach(m => {
      const pill = document.createElement('button');
      pill.className = 'lvd-pill';
      pill.type = 'button';
      pill.innerHTML = `
        <span class="lvd-cat-dot" data-cat="${m.category}"></span>
        <span class="lvd-term-chip">${escapeHtml(m.term)}</span>
        <span class="lvd-arrow">→</span>
        <span class="lvd-rephrase">${escapeHtml(m.rephrase)}</span>
      `;

      pill.addEventListener('click', (e) => {
        e.preventDefault();
        pill.classList.add('lvd-replaced');
        applyPlaygroundReplace(m);
      });

      pillsList.appendChild(pill);
    });

    suggestionBar.appendChild(pillsList);
    suggestionBar.style.display = 'flex';
  }

  function pushUndoState(text) {
    if (text) {
      undoStack.push(text);
      if (undoStack.length > 15) undoStack.shift();
      updateUndoButton();
    }
  }

  function updateUndoButton() {
    if (btnUndoPrompt) {
      btnUndoPrompt.style.display = undoStack.length > 0 ? 'inline-flex' : 'none';
    }
  }

  function revertPlaygroundReplacement() {
    if (undoStack.length === 0) return;
    const prevText = undoStack.pop();
    testPromptInput.value = prevText;
    updateUndoButton();
    scanPlaygroundPrompt();
  }

  function applyPlaygroundReplace(match) {
    const text = testPromptInput.value;
    pushUndoState(text);
    const compiled = compilePromptAtomic(text, [match]);
    testPromptInput.value = compiled;
    recordReplacement(match.term, match.rephrase);
    scanPlaygroundPrompt();
  }

  function applyPlaygroundReplaceAll(matches) {
    const text = testPromptInput.value;
    pushUndoState(text);
    const compiled = compilePromptAtomic(text, matches);
    testPromptInput.value = compiled;
    matches.forEach(m => recordReplacement(m.term, m.rephrase));
    scanPlaygroundPrompt();
  }

  function renderDiffPreview(matches, originalText) {
    if (matches.length === 0) {
      diffCard.style.display = 'none';
      return;
    }

    diffCard.style.display = 'block';

    // Build non-destructive marked preview
    const sorted = [...matches].sort((a, b) => b.term.length - a.term.length);
    const accepted = [];
    for (const item of sorted) {
      let start = item.start;
      let end = item.end;
      if (typeof start !== 'number' || typeof end !== 'number') {
        const r = getRegexForTerms([item.term]);
        if (!r) continue;
        r.lastIndex = 0;
        const m = r.exec(originalText);
        if (!m) continue;
        start = m.index;
        end = m.index + m[0].length;
      }
      const overlaps = accepted.some(acc => (start < acc.end && end > acc.start));
      if (!overlaps) {
        accepted.push({ start, end, rephrase: item.rephrase, term: item.term });
      }
    }

    accepted.sort((a, b) => a.start - b.start);

    let output = '';
    let cursor = 0;
    for (const acc of accepted) {
      output += escapeHtml(originalText.slice(cursor, acc.start));
      output += `<mark title="Replaced '${escapeHtml(acc.term)}'">${escapeHtml(acc.rephrase)}</mark>`;
      cursor = acc.end;
    }
    output += escapeHtml(originalText.slice(cursor));

    diffOutput.innerHTML = output;
  }

  function recordReplacement(term, rephrase) {
    stats.totalReplaced = (stats.totalReplaced || 0) + 1;
    stats.recent = [{ term, rephrase, timestamp: Date.now() }, ...(stats.recent || [])].slice(0, 30);
    storage.set({ stats });
    updateMetricCounts();
  }

  // DICTIONARY LOGIC
  function setupDictionary() {
    dictSearchInput.addEventListener('input', () => {
      btnSearchClear.style.display = dictSearchInput.value ? 'inline-block' : 'none';
      renderDictionaryList();
    });

    btnSearchClear.addEventListener('click', () => {
      dictSearchInput.value = '';
      btnSearchClear.style.display = 'none';
      renderDictionaryList();
      dictSearchInput.focus();
    });

    categoryFilterBar.querySelectorAll('.cat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        categoryFilterBar.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentCategory = btn.dataset.cat;
        renderDictionaryList();
      });
    });

    btnToggleCustomForm.addEventListener('click', () => {
      customTermForm.classList.toggle('active');
      if (customTermForm.classList.contains('active')) {
        customTermKey.focus();
      }
    });

    btnCancelCustomTerm.addEventListener('click', () => {
      customTermForm.classList.remove('active');
      customTermKey.value = '';
      customTermVal.value = '';
    });

    btnSaveCustomTerm.addEventListener('click', () => {
      const key = customTermKey.value.trim().toLowerCase();
      const val = customTermVal.value.trim();
      if (!key || !val) return;

      customTerms[key] = val;
      storage.set({ custom_terms: customTerms }, () => {
        customTermKey.value = '';
        customTermVal.value = '';
        customTermForm.classList.remove('active');
        updateMetricCounts();
        renderDictionaryList();
      });
    });
  }

  function renderDictionaryList() {
    const dict = getCombinedDict();
    const query = (dictSearchInput.value || '').trim().toLowerCase();
    const entries = Object.entries(dict);

    const filtered = entries.filter(([term, rephrase]) => {
      const cat = categorizeTerm(term, rephrase);
      if (currentCategory !== 'all' && cat !== currentCategory) return false;
      if (!query) return true;
      return term.toLowerCase().includes(query) || rephrase.toLowerCase().includes(query);
    });

    dictList.innerHTML = '';

    if (filtered.length === 0) {
      dictList.innerHTML = `
        <div style="padding:24px; text-align:center; color:var(--lvd-text-muted); font-size:12px;">
          No matching dictionary terms found.
        </div>
      `;
      return;
    }

    filtered.slice(0, 100).forEach(([term, rephrase]) => {
      const cat = categorizeTerm(term, rephrase);
      const isCustom = !!customTerms[term.toLowerCase()];

      const card = document.createElement('div');
      card.className = 'dict-term-card';
      card.innerHTML = `
        <div class="dict-card-header">
          <span class="dict-term-name">${escapeHtml(term)}</span>
          <div style="display:flex; align-items:center; gap:6px;">
            <span class="dict-cat-tag" data-cat="${cat}">${cat}</span>
            ${isCustom ? `<button class="btn-delete-custom" data-term="${escapeHtml(term.toLowerCase())}" title="Delete rule" style="background:transparent;border:none;color:var(--lvd-rose);cursor:pointer;font-size:11px;">✕</button>` : ''}
          </div>
        </div>
        <div class="dict-rephrase-text">→ ${escapeHtml(rephrase)}</div>
      `;

      card.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-delete-custom')) {
          e.stopPropagation();
          delete customTerms[term.toLowerCase()];
          storage.set({ custom_terms: customTerms }, () => {
            updateMetricCounts();
            renderDictionaryList();
          });
          return;
        }

        // Quick test in playground
        testPromptInput.value = `I want to ${term} and make sure it works as expected.`;
        document.querySelector('[data-tab="tabPlayground"]').click();
      });

      dictList.appendChild(card);
    });
  }

  // SETTINGS LOGIC
  function renderSettings() {
    masterToggle.checked = config.enabled;
    platformChatGPT.checked = config.platforms?.chatgpt ?? true;
    platformClaude.checked = config.platforms?.claude ?? true;
    platformGemini.checked = config.platforms?.gemini ?? true;
    platformMeta.checked = config.platforms?.meta ?? true;
    sliderMaxPills.value = config.maxPills || 6;
    valMaxPills.textContent = config.maxPills || 6;
  }

  function setupSettingsEvents() {
    masterToggle.addEventListener('change', () => {
      config.enabled = masterToggle.checked;
      updateStatusUI();
      saveSettings();
    });

    platformChatGPT.addEventListener('change', () => {
      config.platforms.chatgpt = platformChatGPT.checked;
      saveSettings();
    });

    platformClaude.addEventListener('change', () => {
      config.platforms.claude = platformClaude.checked;
      saveSettings();
    });

    platformGemini.addEventListener('change', () => {
      config.platforms.gemini = platformGemini.checked;
      saveSettings();
    });

    platformMeta.addEventListener('change', () => {
      config.platforms.meta = platformMeta.checked;
      saveSettings();
    });

    sliderMaxPills.addEventListener('input', () => {
      const val = parseInt(sliderMaxPills.value, 10);
      valMaxPills.textContent = val;
      config.maxPills = val;
      saveSettings();
      scanPlaygroundPrompt();
    });
  }

  function saveSettings() {
    storage.set({ settings: config });
  }

  // PROMPT VAULT (SQLite) LOGIC
  function formatRelativeTime(timestamp) {
    if (!timestamp) return '';
    const diffSec = Math.floor((Date.now() - timestamp) / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  async function renderActivityList() {
    activityList.innerHTML = '';
    const store = (typeof SQLitePromptStore !== 'undefined') ? SQLitePromptStore : null;

    if (!store) {
      activityList.innerHTML = `
        <div style="padding:28px 16px; text-align:center; color:var(--lvd-text-muted); font-size:11.5px;">
          SQLite Prompt Store loading...
        </div>
      `;
      return;
    }

    await store.init();
    const { rows, total } = await store.query({
      platform: vaultPlatformFilter,
      search: vaultSearchQuery,
      limit: 60
    });

    if (rows.length === 0) {
      activityList.innerHTML = `
        <div style="padding:28px 16px; text-align:center; color:var(--lvd-text-muted); font-size:11.5px; line-height:1.5;">
          No prompts in SQLite Vault yet.<br>
          <span style="font-size:10.5px; color:var(--lvd-text-dim);">Inputs in ChatGPT, Claude, Gemini, or Meta AI auto-save here.</span>
        </div>
      `;
      return;
    }

    rows.forEach(item => {
      const card = document.createElement('div');
      card.className = 'vault-prompt-card';
      const timeStr = formatRelativeTime(item.timestamp);
      const plat = (item.platform || 'general').toLowerCase();
      const platLabel = plat.toUpperCase();

      card.innerHTML = `
        <div class="vault-card-header">
          <div style="display:flex; align-items:center; gap:6px;">
            <span class="lvd-badge platform-badge-${plat}">${platLabel}</span>
            <span class="vault-time">${timeStr}</span>
            <span class="vault-meta">${item.word_count}w</span>
          </div>
          <div class="vault-actions">
            <button class="btn-vault-action btn-vault-copy" title="Quick Copy">Copy</button>
            <button class="btn-vault-action btn-vault-studio" title="Open in Playground">Use</button>
            <button class="btn-vault-action btn-vault-delete" title="Delete record">✕</button>
          </div>
        </div>
        <div class="vault-prompt-text">${escapeHtml(item.prompt_text)}</div>
        ${item.compiled_text ? `<div class="vault-compiled-preview"><span style="color:var(--lvd-text-dim);">Enhanced:</span> ${escapeHtml(item.compiled_text)}</div>` : ''}
      `;

      // Quick Copy action
      const copyBtn = card.querySelector('.btn-vault-copy');
      copyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(item.prompt_text).then(() => {
          copyBtn.textContent = '✓ Copied';
          setTimeout(() => copyBtn.textContent = 'Copy', 1500);
        });
      });

      // Use in Playground
      const useBtn = card.querySelector('.btn-vault-studio');
      useBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        testPromptInput.value = item.prompt_text;
        document.querySelector('[data-tab="tabPlayground"]').click();
        scanPlaygroundPrompt();
      });

      // Delete from SQLite
      const delBtn = card.querySelector('.btn-vault-delete');
      delBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await store.deletePrompt(item.id);
        renderActivityList();
      });

      activityList.appendChild(card);
    });
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s || '';
    return div.innerHTML;
  }

  init();
})();
