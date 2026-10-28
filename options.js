// ==========================================================================
// LVD Compiler - Options Studio Controller (Modernized v3.0)
// Atomic Compiler • Responsive Split Workbench • Accessible Custom Modal
// ==========================================================================

(function () {
  const navItems = document.querySelectorAll('.nav-item');
  const panels = document.querySelectorAll('.workspace-panel');
  const pageTitle = document.getElementById('pageTitle');
  const pageSubtitle = document.getElementById('pageSubtitle');

  const studioRawInput = document.getElementById('studioRawInput');
  const studioPreviewOutput = document.getElementById('studioPreviewOutput');
  const rawWordCount = document.getElementById('rawWordCount');
  const enhancedWordCount = document.getElementById('enhancedWordCount');
  const detectedCount = document.getElementById('detectedCount');
  const statTokens = document.getElementById('statTokens');
  const statTermsDetected = document.getElementById('statTermsDetected');
  const statTotalTerms = document.getElementById('statTotalTerms');
  const statClarityScore = document.getElementById('statClarityScore');
  const suggestionBar = document.getElementById('lvd-suggestion-bar');
  const btnApplyAllStudio = document.getElementById('btnApplyAllStudio');
  const btnCopyResult = document.getElementById('btnCopyResult');

  const dictMgmtSearch = document.getElementById('dictMgmtSearch');
  const dictTableBody = document.getElementById('dictTableBody');
  const btnExportDict = document.getElementById('btnExportDict');
  const btnAddRuleModal = document.getElementById('btnAddRuleModal');

  // Modal elements
  const ruleModal = document.getElementById('ruleModal');
  const btnModalClose = document.getElementById('btnModalClose');
  const btnModalCancel = document.getElementById('btnModalCancel');
  const btnModalSave = document.getElementById('btnModalSave');
  const ruleTriggerInput = document.getElementById('ruleTriggerInput');
  const ruleRephraseInput = document.getElementById('ruleRephraseInput');

  let customTerms = {};
  function loadCustomTerms() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['lvd_custom_terms'], (res) => {
        if (res.lvd_custom_terms) customTerms = res.lvd_custom_terms;
        renderDictionaryTable();
        updateStudio();
      });
    } else {
      try {
        const saved = localStorage.getItem('lvd_custom_terms');
        if (saved) customTerms = JSON.parse(saved);
      } catch (e) { }
      renderDictionaryTable();
      updateStudio();
    }
  }

  function saveCustomTerms() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ lvd_custom_terms: customTerms });
    }
    try {
      localStorage.setItem('lvd_custom_terms', JSON.stringify(customTerms));
    } catch(e) {}
  }

  function getDict() {
    const base = (typeof LVD_DICTIONARY !== 'undefined') ? LVD_DICTIONARY : {};
    return { ...base, ...customTerms };
  }

  function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s || '';
    return div.innerHTML;
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

  // Atomic Single-Pass Compiler
  function compilePromptAtomic(text, matchesToApply) {
    if (!text || !matchesToApply || matchesToApply.length === 0) return text;

    const sorted = [...matchesToApply].sort((a, b) => b.term.length - a.term.length);
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

  // Navigation
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      navItems.forEach(n => {
        n.classList.remove('active');
        n.setAttribute('aria-selected', 'false');
      });
      panels.forEach(p => p.classList.remove('active'));

      item.classList.add('active');
      item.setAttribute('aria-selected', 'true');
      const target = item.dataset.target;
      document.getElementById(target).classList.add('active');

      if (target === 'panelStudio') {
        pageTitle.textContent = 'Prompt Engineering Studio';
        pageSubtitle.textContent = 'Test, optimize, and inspect cognitive prompt compilation in real time.';
      } else if (target === 'panelVault') {
        pageTitle.textContent = 'Prompt Vault (SQLite)';
        pageSubtitle.textContent = 'Historical prompt repository indexed across AI platforms with relational SQLite storage.';
        renderVaultTable();
      } else if (target === 'panelDict') {
        pageTitle.textContent = 'Dictionary Manager';
        pageSubtitle.textContent = 'Explore, audit, and configure canonical cognitive and directive prompt definitions.';
        renderDictionaryTable();
      } else {
        pageTitle.textContent = 'Platforms & Telemetry';
        pageSubtitle.textContent = 'Inspect injection parameters, platform health, and supported environments.';
      }
    });
  });

  // Preset chips in studio
  document.querySelectorAll('.preset-chip-large').forEach(chip => {
    chip.addEventListener('click', () => {
      studioRawInput.value = chip.dataset.text;
      updateStudio();
      studioRawInput.focus();
    });
  });

  // Synchronized scrolling between raw input and preview
  let isSyncingInputScroll = false;
  let isSyncingPreviewScroll = false;

  studioRawInput.addEventListener('scroll', () => {
    if (!isSyncingInputScroll) {
      isSyncingPreviewScroll = true;
      const percentage = studioRawInput.scrollTop / (studioRawInput.scrollHeight - studioRawInput.clientHeight || 1);
      studioPreviewOutput.scrollTop = percentage * (studioPreviewOutput.scrollHeight - studioPreviewOutput.clientHeight);
    }
    isSyncingInputScroll = false;
  });

  studioPreviewOutput.addEventListener('scroll', () => {
    if (!isSyncingPreviewScroll) {
      isSyncingInputScroll = true;
      const percentage = studioPreviewOutput.scrollTop / (studioPreviewOutput.scrollHeight - studioPreviewOutput.clientHeight || 1);
      studioRawInput.scrollTop = percentage * (studioRawInput.scrollHeight - studioRawInput.clientHeight);
    }
    isSyncingPreviewScroll = false;
  });

  // STUDIO LOGIC
  function updateStudio() {
    const text = studioRawInput.value || '';
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    rawWordCount.textContent = `${words} words • ${chars} chars`;

    const dict = getDict();
    const terms = Object.keys(dict).sort((a, b) => b.length - a.length);
    const regex = getRegexForTerms(terms);

    if (statTotalTerms) statTotalTerms.textContent = terms.length;

    if (!regex || !text.trim()) {
      studioPreviewOutput.innerHTML = '<span style="color:var(--lvd-text-muted);">Enter a prompt to see atomic LVD compilation...</span>';
      detectedCount.textContent = '0 LVD terms detected';
      statTermsDetected.textContent = '0';
      statTokens.textContent = '~0';
      enhancedWordCount.textContent = '0 words';
      suggestionBar.innerHTML = '';
      suggestionBar.style.display = 'none';
      return;
    }

    const matches = [];
    const seen = new Set();
    let m;
    while ((m = regex.exec(text)) !== null) {
      const raw = m[0];
      const key = raw.toLowerCase();
      if (seen.has(key)) continue;
      let rephrase = dict[key] || dict[Object.keys(dict).find(k => k.toLowerCase() === key)];
      if (rephrase) {
        matches.push({
          term: raw,
          rephrase,
          start: m.index,
          end: m.index + raw.length,
          pos: m.index
        });
        seen.add(key);
      }
      if (matches.length >= 10) break;
      if (m[0].length === 0) regex.lastIndex++;
    }

    detectedCount.textContent = `${matches.length} LVD terms detected`;
    statTermsDetected.textContent = matches.length;
    statTokens.textContent = `~${Math.round(chars / 3.7)}`;
    if (statClarityScore) {
      const score = matches.length > 0 ? Math.min(99, 85 + matches.length * 2) : 92;
      statClarityScore.textContent = `${score}%`;
    }

    // Render non-destructive preview output with marked diffs
    const sorted = [...matches].sort((a, b) => b.term.length - a.term.length);
    const accepted = [];
    for (const item of sorted) {
      const overlaps = accepted.some(acc => (item.start < acc.end && item.end > acc.start));
      if (!overlaps) accepted.push(item);
    }
    accepted.sort((a, b) => a.start - b.start);

    let compiledHtml = '';
    let cursor = 0;
    for (const item of accepted) {
      compiledHtml += escapeHtml(text.slice(cursor, item.start));
      compiledHtml += `<mark title="Replaced '${escapeHtml(item.term)}'">${escapeHtml(item.rephrase)}</mark>`;
      cursor = item.end;
    }
    compiledHtml += escapeHtml(text.slice(cursor));
    studioPreviewOutput.innerHTML = compiledHtml;

    const enhWords = studioPreviewOutput.innerText.trim().split(/\s+/).length;
    enhancedWordCount.textContent = `${enhWords} words`;

    // Render suggestion bar
    renderSuggestionBar(matches);
  }

  function renderSuggestionBar(matches) {
    if (matches.length === 0) {
      suggestionBar.innerHTML = '';
      suggestionBar.style.display = 'none';
      return;
    }

    suggestionBar.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'lvd-bar-header';
    header.innerHTML = `
      <div class="lvd-bar-title-group">
        <div class="lvd-bar-logo-badge">L</div>
        <span class="lvd-bar-title">Recommended Optimizations</span>
        <span class="lvd-badge-count">${matches.length} terms</span>
      </div>
      <div class="lvd-bar-actions">
        <button class="lvd-btn-replace-all" id="btnReplaceAllInBar" type="button">
          <span>Replace All</span>
        </button>
      </div>
    `;
    suggestionBar.appendChild(header);

    const btnInBar = header.querySelector('#btnReplaceAllInBar');
    btnInBar.addEventListener('click', applyAll);

    const pillsList = document.createElement('div');
    pillsList.className = 'lvd-pills-list';

    matches.forEach(m => {
      const cat = categorizeTerm(m.term, m.rephrase);
      const pill = document.createElement('button');
      pill.className = 'lvd-pill';
      pill.type = 'button';
      pill.innerHTML = `
        <span class="lvd-cat-dot" data-cat="${cat}"></span>
        <span class="lvd-term-chip">${escapeHtml(m.term)}</span>
        <span class="lvd-arrow">→</span>
        <span class="lvd-rephrase">${escapeHtml(m.rephrase)}</span>
      `;
      pill.addEventListener('click', () => {
        const text = studioRawInput.value;
        const compiled = compilePromptAtomic(text, [m]);
        studioRawInput.value = compiled;
        updateStudio();
      });
      pillsList.appendChild(pill);
    });

    suggestionBar.appendChild(pillsList);
    suggestionBar.style.display = 'flex';
  }

  function applyAll() {
    let text = studioRawInput.value;
    const dict = getDict();
    const terms = Object.keys(dict).sort((a, b) => b.length - a.length);
    const regex = getRegexForTerms(terms);
    if (!regex) return;

    let m;
    const toReplace = [];
    while ((m = regex.exec(text)) !== null) {
      const raw = m[0];
      const rephrase = dict[raw.toLowerCase()] || dict[Object.keys(dict).find(k => k.toLowerCase() === raw.toLowerCase())];
      if (rephrase) {
        toReplace.push({
          term: raw,
          rephrase,
          start: m.index,
          end: m.index + raw.length
        });
      }
      if (m[0].length === 0) regex.lastIndex++;
    }

    const compiled = compilePromptAtomic(text, toReplace);
    studioRawInput.value = compiled;
    updateStudio();
  }

  studioRawInput.addEventListener('input', updateStudio);
  btnApplyAllStudio.addEventListener('click', applyAll);

  btnCopyResult.addEventListener('click', () => {
    const text = studioPreviewOutput.innerText;
    if (text) {
      navigator.clipboard.writeText(text).then(() => {
        const orig = btnCopyResult.innerHTML;
        btnCopyResult.innerHTML = '<span>✓ Copied Output!</span>';
        setTimeout(() => btnCopyResult.innerHTML = orig, 1500);
      });
    }
  });

  let dictCategory = 'all';
  const dictMgmtCategoryBar = document.getElementById('dictMgmtCategoryBar');
  if (dictMgmtCategoryBar) {
    dictMgmtCategoryBar.querySelectorAll('.cat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        dictMgmtCategoryBar.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        dictCategory = btn.dataset.cat;
        renderDictionaryTable();
      });
    });
  }

  // DICTIONARY TABLE
  function renderDictionaryTable() {
    const dict = getDict();
    const query = (dictMgmtSearch.value || '').trim().toLowerCase();
    dictTableBody.innerHTML = '';

    const entries = Object.entries(dict).filter(([k, v]) => {
      const cat = categorizeTerm(k, v);
      if (dictCategory !== 'all' && cat !== dictCategory) return false;
      if (!query) return true;
      return k.toLowerCase().includes(query) || v.toLowerCase().includes(query);
    });

    entries.slice(0, 200).forEach(([term, rephrase]) => {
      const cat = categorizeTerm(term, rephrase);
      const isCustom = !!customTerms[term.toLowerCase()];
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight:700; color:var(--lvd-amber-light);">${escapeHtml(term)}</td>
        <td>${escapeHtml(rephrase)}</td>
        <td>
          <div style="display:flex; align-items:center; justify-content:space-between;">
            <span class="lvd-badge lvd-badge-${cat === 'verification' ? 'emerald' : (cat === 'directive' ? 'indigo' : (cat === 'analysis' ? 'cyan' : (cat === 'custom' ? 'rose' : 'amber')))}">${cat.toUpperCase()}</span>
            ${isCustom ? `<button class="btn-delete-rule" data-key="${escapeHtml(term.toLowerCase())}" title="Delete rule" style="background:transparent;border:none;color:var(--lvd-rose);cursor:pointer;font-size:12px;font-weight:700;">✕</button>` : ''}
          </div>
        </td>
      `;
      dictTableBody.appendChild(tr);
    });

    dictTableBody.querySelectorAll('.btn-delete-rule').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.key;
        delete customTerms[key];
        saveCustomTerms();
        renderDictionaryTable();
        updateStudio();
      });
    });
  }

  dictMgmtSearch.addEventListener('input', renderDictionaryTable);

  btnExportDict.addEventListener('click', () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(getDict(), null, 2));
    const dl = document.createElement('a');
    dl.setAttribute("href", dataStr);
    dl.setAttribute("download", "lvd-dictionary-v3.json");
    dl.click();
  });

  // Modal Dialog Handlers
  btnAddRuleModal.addEventListener('click', () => {
    ruleTriggerInput.value = '';
    ruleRephraseInput.value = '';
    ruleModal.classList.add('active');
    ruleTriggerInput.focus();
  });

  function closeModal() {
    ruleModal.classList.remove('active');
  }

  btnModalClose.addEventListener('click', closeModal);
  btnModalCancel.addEventListener('click', closeModal);

  btnModalSave.addEventListener('click', () => {
    const term = ruleTriggerInput.value.trim().toLowerCase();
    const rephrase = ruleRephraseInput.value.trim();
    if (!term || !rephrase) return;

    customTerms[term] = rephrase;
    saveCustomTerms();
    closeModal();
    renderDictionaryTable();
    updateStudio();
  });

  // PROMPT VAULT (SQLite) WORKSPACE LOGIC
  let vaultStudioPlatform = 'all';
  let vaultStudioSearchQuery = '';

  const vaultStudioSearch = document.getElementById('vaultStudioSearch');
  const vaultStudioFilterBar = document.getElementById('vaultStudioFilterBar');
  const vaultTableBody = document.getElementById('vaultTableBody');
  const vaultTotalCount = document.getElementById('vaultTotalCount');
  const vaultChatgptCount = document.getElementById('vaultChatgptCount');
  const vaultClaudeCount = document.getElementById('vaultClaudeCount');
  const vaultGeminiCount = document.getElementById('vaultGeminiCount');
  const vaultMetaCount = document.getElementById('vaultMetaCount');
  const btnExportVaultSqlStudio = document.getElementById('btnExportVaultSqlStudio');
  const btnExportVaultJsonStudio = document.getElementById('btnExportVaultJsonStudio');
  const btnClearVaultStudio = document.getElementById('btnClearVaultStudio');

  async function renderVaultTable() {
    if (!vaultTableBody) return;
    const store = (typeof SQLitePromptStore !== 'undefined') ? SQLitePromptStore : null;
    if (!store) {
      vaultTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:30px; color:var(--lvd-text-muted);">Loading SQLite Store...</td></tr>';
      return;
    }

    await store.init();

    // Update telemetry counts
    const breakdown = await store.getPlatformBreakdown();
    if (vaultTotalCount) vaultTotalCount.textContent = breakdown.all;
    if (vaultChatgptCount) vaultChatgptCount.textContent = breakdown.chatgpt;
    if (vaultClaudeCount) vaultClaudeCount.textContent = breakdown.claude;
    if (vaultGeminiCount) vaultGeminiCount.textContent = breakdown.gemini;
    if (vaultMetaCount) vaultMetaCount.textContent = breakdown.meta;

    const { rows, total } = await store.query({
      platform: vaultStudioPlatform,
      search: vaultStudioSearchQuery,
      limit: 150
    });

    vaultTableBody.innerHTML = '';

    if (rows.length === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td colspan="5" style="text-align:center; padding:48px 16px; color:var(--lvd-text-muted); font-size:13px;">
          No prompts stored in SQLite DB yet.<br>
          <span style="font-size:11.5px; color:var(--lvd-text-dim);">Prompts typed and submitted in ChatGPT, Claude, Gemini, or Meta AI are automatically recorded here.</span>
        </td>
      `;
      vaultTableBody.appendChild(tr);
      return;
    }

    rows.forEach(item => {
      const tr = document.createElement('tr');
      const timeStr = new Date(item.timestamp).toLocaleString([], {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
      const plat = (item.platform || 'general').toLowerCase();
      const platLabel = plat.toUpperCase();

      tr.innerHTML = `
        <td>
          <span class="lvd-badge platform-badge-${plat}">${platLabel}</span>
        </td>
        <td style="font-family:var(--lvd-font-mono); font-size:11px; color:var(--lvd-text-muted); white-space:nowrap;">
          ${timeStr}
        </td>
        <td>
          <div style="font-size:12.5px; line-height:1.5; color:var(--lvd-text-primary); margin-bottom:${item.compiled_text ? '6px' : '0'};">
            ${escapeHtml(item.prompt_text)}
          </div>
          ${item.compiled_text ? `
            <div style="font-size:11.5px; color:var(--lvd-text-secondary); background:var(--lvd-bg-subtle); padding:6px 8px; border-radius:3px; border-left:2px solid rgba(255,255,255,0.2);">
              <span style="color:var(--lvd-text-dim);">Compiled:</span> ${escapeHtml(item.compiled_text)}
            </div>
          ` : ''}
        </td>
        <td style="font-family:var(--lvd-font-mono); font-size:11px; color:var(--lvd-text-dim); white-space:nowrap;">
          ${item.word_count}w · ${item.char_count}c
        </td>
        <td style="text-align: right; white-space:nowrap;">
          <button class="btn-vault-action btn-row-copy" title="Quick Copy">Copy</button>
          <button class="btn-vault-action btn-row-studio" title="Open in Studio Workbench">Studio</button>
          <button class="btn-vault-action btn-row-del" title="Delete record" style="color:var(--lvd-rose-light);">✕</button>
        </td>
      `;

      // Copy Action
      const btnCopy = tr.querySelector('.btn-row-copy');
      btnCopy.addEventListener('click', () => {
        navigator.clipboard.writeText(item.prompt_text).then(() => {
          btnCopy.textContent = '✓ Copied';
          setTimeout(() => btnCopy.textContent = 'Copy', 1500);
        });
      });

      // Studio Action
      const btnStudio = tr.querySelector('.btn-row-studio');
      btnStudio.addEventListener('click', () => {
        studioRawInput.value = item.prompt_text;
        document.querySelector('[data-target="panelStudio"]').click();
        updateStudio();
        studioRawInput.focus();
      });

      // Delete Action
      const btnDel = tr.querySelector('.btn-row-del');
      btnDel.addEventListener('click', async () => {
        await store.deletePrompt(item.id);
        renderVaultTable();
      });

      vaultTableBody.appendChild(tr);
    });
  }

  // Vault Filter & Search Events
  if (vaultStudioFilterBar) {
    vaultStudioFilterBar.querySelectorAll('.cat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        vaultStudioFilterBar.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        vaultStudioPlatform = btn.dataset.platform;
        renderVaultTable();
      });
    });
  }

  if (vaultStudioSearch) {
    vaultStudioSearch.addEventListener('input', () => {
      vaultStudioSearchQuery = vaultStudioSearch.value.trim();
      renderVaultTable();
    });
  }

  if (btnExportVaultSqlStudio) {
    btnExportVaultSqlStudio.addEventListener('click', async () => {
      const store = (typeof SQLitePromptStore !== 'undefined') ? SQLitePromptStore : null;
      if (!store) return;
      const sql = await store.exportSQL();
      const blob = new Blob([sql], { type: 'text/sql' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lvd-prompt-vault-${Date.now()}.sql`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  if (btnExportVaultJsonStudio) {
    btnExportVaultJsonStudio.addEventListener('click', async () => {
      const store = (typeof SQLitePromptStore !== 'undefined') ? SQLitePromptStore : null;
      if (!store) return;
      const { rows } = await store.query({ limit: 10000 });
      const jsonStr = JSON.stringify(rows, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lvd-prompt-vault-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  if (btnClearVaultStudio) {
    btnClearVaultStudio.addEventListener('click', async () => {
      const confirmClear = confirm('Are you sure you want to clear all stored prompt history in SQLite?');
      if (confirmClear) {
        const store = (typeof SQLitePromptStore !== 'undefined') ? SQLitePromptStore : null;
        if (store) await store.clearVault();
        renderVaultTable();
      }
    });
  }

  // Initialize with sample
  loadCustomTerms();
  studioRawInput.value = "I want the AI to learn from the errors and think step by step to adapt the plan, double-check every step, and verify the outcome.";
  updateStudio();
  renderVaultTable();
})();
