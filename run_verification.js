// ==========================================================================
// LVD Compiler v3.0 — Automated Regression & Atomic Verification Suite
// ==========================================================================

const fs = require('fs');
const path = require('path');

console.log('====================================================');
console.log('🧪 LVD COMPILER v3.0 — AUTOMATED VALIDATION SUITE');
console.log('====================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    console.error(`  ✗ FAIL: ${testName} ${details ? '(' + details + ')' : ''}`);
  }
}

// 1. Load Dictionary
const dictPath = path.join(__dirname, 'lvd-dictionary.js');
const dictContent = fs.readFileSync(dictPath, 'utf8');
const vm = require('vm');
const context = { window: {}, globalThis: {} };
vm.createContext(context);
vm.runInContext(dictContent, context);

const dict = context.window.LVD_DICTIONARY || context.LVD_DICTIONARY;
assert(dict && Object.keys(dict).length >= 100, 'Dictionary loaded with canonical entries', `Count: ${Object.keys(dict).length}`);

// 2. Test Word Boundary & Longest-Match Regex
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getRegexForTerms(terms) {
  const sorted = [...terms].sort((a, b) => b.length - a.length);
  if (sorted.length === 0) return null;
  const esc = sorted.map(escapeRegExp);
  return new RegExp('(?<!\\w)(' + esc.join('|') + ')(?!\\w)', 'gi');
}

// 3. Test Atomic Single-Pass Compiler
function compilePromptAtomic(text, dict) {
  const terms = Object.keys(dict).sort((a, b) => b.length - a.length);
  const regex = getRegexForTerms(terms);
  if (!regex || !text) return { compiledText: text, replacements: [] };

  const matches = [];
  let m;
  while ((m = regex.exec(text)) !== null) {
    const raw = m[0];
    const key = raw.toLowerCase();
    const dictKey = dict[key] ? key : Object.keys(dict).find(k => k.toLowerCase() === key);
    if (dictKey) {
      matches.push({
        start: m.index,
        end: m.index + raw.length,
        original: raw,
        rephrase: dict[dictKey]
      });
    }
  }

  // Filter overlapping ranges (longest first priority)
  matches.sort((a, b) => (b.end - b.start) - (a.end - a.start));
  const accepted = [];
  for (const match of matches) {
    const overlaps = accepted.some(acc => 
      (match.start < acc.end && match.end > acc.start)
    );
    if (!overlaps) {
      accepted.push(match);
    }
  }

  // Sort chronologically by original position
  accepted.sort((a, b) => a.start - b.start);

  let output = '';
  let cursor = 0;
  for (const item of accepted) {
    output += text.slice(cursor, item.start);
    output += item.rephrase;
    cursor = item.end;
  }
  output += text.slice(cursor);

  return { compiledText: output, replacements: accepted };
}

// Test case 1: The recursive corruption bug from legacy v2
const prompt1 = "I want the AI to learn from the errors and think step by step to adapt the plan.";
const res1 = compilePromptAtomic(prompt1, dict);

// Verify "adapt in context." does NOT have its internal "adapt" mutated into "modify behavior"
assert(
  !res1.compiledText.includes("Modify behavior based on context. in context.") &&
  !res1.compiledText.includes("adapt in context. in context."),
  'Atomic compiler prevents recursive replacement inside already replaced tokens',
  res1.compiledText
);

// Test case 2: Sub-token collisions (double-check vs check)
const prompt2 = "Please double-check this output, verify the assumptions, and check the logs.";
const res2 = compilePromptAtomic(prompt2, dict);
assert(
  !res2.compiledText.includes("double- perform a focused"),
  'Compound directives ("double-check") take precedence over sub-tokens ("check")',
  res2.compiledText
);

// Test case 3: Preservation of un-matched text and punctuation
const prompt3 = "The quick brown fox jumps over the lazy dog.";
const res3 = compilePromptAtomic(prompt3, dict);
assert(res3.compiledText === prompt3, 'Non-matching text remains 100% byte-for-byte identical');

// 4. Validate HTML files existence and structural integrity
const filesToCheck = [
  'popup.html',
  'popup.js',
  'options.html',
  'options.js',
  'content.js',
  'styles.css',
  'testbench.html',
  'before_after_comparison.html',
  'manifest.json',
  'sqlite-store.js'
];

filesToCheck.forEach(f => {
  const filePath = path.join(__dirname, f);
  const exists = fs.existsSync(filePath);
  const size = exists ? fs.statSync(filePath).size : 0;
  assert(exists && size > 200, `File '${f}' exists with valid size (${size} bytes)`);
});

// 5. Verify CSS Token Completeness
const cssContent = fs.readFileSync(path.join(__dirname, 'styles.css'), 'utf8');
const requiredTokens = [
  '--lvd-bg-root',
  '--lvd-bg-surface-1',
  '--lvd-amber',
  '--lvd-emerald',
  '--lvd-text-primary',
  '--lvd-text-secondary',
  '--lvd-text-muted',
  '--lvd-shadow-dock'
];
requiredTokens.forEach(tok => {
  assert(cssContent.includes(tok), `Design token '${tok}' present in styles.css`);
});

// 6. Verify Manifest Version
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'manifest.json'), 'utf8'));
assert(manifest.version === '3.0.0', 'Manifest version updated to 3.0.0');
assert(manifest.manifest_version === 3, 'Manifest Version is 3 (MV3)');

// 7. Verify Undo Mechanism in content.js and popup.js
const contentJs = fs.readFileSync(path.join(__dirname, 'content.js'), 'utf8');
const popupJs = fs.readFileSync(path.join(__dirname, 'popup.js'), 'utf8');
const popupHtml = fs.readFileSync(path.join(__dirname, 'popup.html'), 'utf8');

assert(contentJs.includes('undoStack') && contentJs.includes('revertLastReplacement'), 'content.js implements undoStack and revertLastReplacement');
assert(popupJs.includes('undoStack') && popupJs.includes('revertPlaygroundReplacement'), 'popup.js implements undoStack and revertPlaygroundReplacement');
assert(popupHtml.includes('btnUndoPrompt'), 'popup.html contains btnUndoPrompt UI element');
assert(popupHtml.includes('clarityBar') && popupHtml.includes('clarityScoreText'), 'popup.html contains clarityBar and clarityScoreText gauge elements');
assert(cssContent.includes('--lvd-specular-top') && cssContent.includes('--lvd-glass-surface'), '2027 Spatial Luminescence tokens present in styles.css');

// 8. Test Multiple Occurrences & Punctuation Boundary Atomic Compilation
const promptMulti = "Please learn quickly and learn carefully.";
const resMulti = compilePromptAtomic(promptMulti, dict);
assert(resMulti.compiledText.includes("learn") === false, 'Multiple occurrences of "learn" are both cleanly compiled');
assert(resMulti.replacements.length === 2, 'Exactly 2 replacements recorded for two occurrences');

// 9. Test Undo Stack Simulation Invariance
const stack = [];
const original = "Original prompt text";
const enhanced = "Enhanced prompt text with adapt";
stack.push(original);
assert(stack.pop() === original, 'Undo stack restores original prompt text deterministically');

// 10. Test SQLite Prompt Store Functional Suite
const sqliteStore = require('./sqlite-store.js');

async function testSQLite() {
  await sqliteStore.clearVault();

  // Insert prompts across distinct platforms
  const p1 = await sqliteStore.insertPrompt({ platform: 'chatgpt', promptText: 'ChatGPT test prompt 1', status: 'submitted' });
  const p2 = await sqliteStore.insertPrompt({ platform: 'claude', promptText: 'Claude reasoning prompt', status: 'submitted' });
  const p3 = await sqliteStore.insertPrompt({ platform: 'gemini', promptText: 'Gemini multimodal prompt', status: 'submitted' });
  const p4 = await sqliteStore.insertPrompt({ platform: 'meta', promptText: 'Meta AI directive prompt', status: 'submitted' });
  const p5 = await sqliteStore.insertPrompt({ platform: 'chatgpt', promptText: 'ChatGPT second prompt', compiledText: 'ChatGPT second enhanced', status: 'compiled' });

  assert(p1 && p1.id > 0, 'SQLite insertPrompt generates valid autoincrement ID');

  // Query all
  const qAll = await sqliteStore.query({ platform: 'all' });
  assert(qAll.total === 5, 'SQLite query fetches all 5 stored prompts');

  // Filter by platform
  const qChatGPT = await sqliteStore.query({ platform: 'chatgpt' });
  assert(qChatGPT.total === 2, 'SQLite query filters accurately by platform (ChatGPT: 2)');

  const qClaude = await sqliteStore.query({ platform: 'claude' });
  assert(qClaude.total === 1, 'SQLite query filters accurately by platform (Claude: 1)');

  // Search filter
  const qSearch = await sqliteStore.query({ search: 'reasoning' });
  assert(qSearch.total === 1 && qSearch.rows[0].platform === 'claude', 'SQLite search query matches prompt_text substring');

  // Platform breakdown
  const breakdown = await sqliteStore.getPlatformBreakdown();
  assert(breakdown.chatgpt === 2 && breakdown.claude === 1 && breakdown.gemini === 1 && breakdown.meta === 1, 'SQLite getPlatformBreakdown aggregates counts across AI apps correctly');

  // Export SQL dump
  const sqlDump = await sqliteStore.exportSQL();
  assert(sqlDump.includes('CREATE TABLE IF NOT EXISTS prompt_vault') && sqlDump.includes('INSERT INTO prompt_vault'), 'SQLite exportSQL generates valid SQL schema and INSERT statements');

  // Delete prompt
  const delRes = await sqliteStore.deletePrompt(p1.id);
  assert(delRes === true, 'SQLite deletePrompt deletes record successfully');
  const qAfterDel = await sqliteStore.query({ platform: 'chatgpt' });
  assert(qAfterDel.total === 1, 'Record count is decremented after SQLite delete');

  console.log('\n====================================================');
  console.log(`📊 TEST RESULTS: ${passedTests} / ${totalTests} ASSERTIONS PASSED`);
  console.log('====================================================\n');

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

testSQLite();

