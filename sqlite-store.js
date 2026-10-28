// ==========================================================================
// LVD Compiler - SQLite Prompt Vault Store (v3.2)
// In-browser SQLite Relational Engine with Persistent Storage
// Compliant with Chrome MV3 Content Scripts, Popup & Options Pages
// ==========================================================================

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SQLitePromptStore = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const STORAGE_KEY = 'lvd_sqlite_prompt_vault';
  const SCHEMA_VERSION = 1;

  // In-memory relational table simulation adhering to SQLite specification:
  // CREATE TABLE prompt_vault (
  //   id INTEGER PRIMARY KEY AUTOINCREMENT,
  //   platform TEXT NOT NULL,
  //   prompt_text TEXT NOT NULL,
  //   compiled_text TEXT,
  //   timestamp INTEGER NOT NULL,
  //   word_count INTEGER,
  //   char_count INTEGER,
  //   status TEXT DEFAULT 'active'
  // );

  class SQLiteStore {
    constructor() {
      this.records = [];
      this.nextId = 1;
      this.isLoaded = false;
      this._loadPromise = null;
    }

    /**
     * Initializes and hydrates SQLite DB from persistent storage
     */
    async init() {
      if (this.isLoaded) return this;
      if (this._loadPromise) return this._loadPromise;

      this._loadPromise = new Promise((resolve) => {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.get([STORAGE_KEY], (res) => {
            if (res && res[STORAGE_KEY] && Array.isArray(res[STORAGE_KEY])) {
              this._hydrate(res[STORAGE_KEY]);
            }
            if (this.records.length === 0) {
              this._seedIfEmpty();
            }
            this.isLoaded = true;
            resolve(this);
          });
        } else {
          try {
            if (typeof localStorage !== 'undefined' && localStorage && typeof localStorage.getItem === 'function') {
              const raw = localStorage.getItem(STORAGE_KEY);
              if (raw) {
                const data = JSON.parse(raw);
                if (Array.isArray(data)) this._hydrate(data);
              }
            }
          } catch (e) {
            // graceful fallback in environments without localStorage
          }
          if (this.records.length === 0) {
            this._seedIfEmpty();
          }
          this.isLoaded = true;
          resolve(this);
        }
      });

      return this._loadPromise;
    }

    _seedIfEmpty() {
      if (this.records.length > 0) return;
      this.records = [
        {
          id: 1,
          platform: 'chatgpt',
          prompt_text: 'Analyze the performance bottlenecks in this microservices architecture and suggest three optimization strategies.',
          compiled_text: 'Perform a comprehensive bottleneck inspection in this microservices architecture and provide three concrete optimization strategies.',
          timestamp: Date.now() - 3600000 * 2,
          word_count: 14,
          char_count: 104,
          status: 'compiled'
        },
        {
          id: 2,
          platform: 'claude',
          prompt_text: 'Refactor this async data processing pipeline to handle backpressure and network retries gracefully.',
          compiled_text: '',
          timestamp: Date.now() - 3600000 * 4,
          word_count: 14,
          char_count: 98,
          status: 'submitted'
        },
        {
          id: 3,
          platform: 'gemini',
          prompt_text: 'Double-check the mathematical proof for lemma 4.2 and verify all base cases.',
          compiled_text: 'Perform a focused correctness inspection on lemma 4.2 and independently check whether all base cases are valid.',
          timestamp: Date.now() - 3600000 * 8,
          word_count: 12,
          char_count: 79,
          status: 'compiled'
        },
        {
          id: 4,
          platform: 'meta',
          prompt_text: 'Draft an executive briefing summarizing our Q3 machine learning inference latency improvements.',
          compiled_text: '',
          timestamp: Date.now() - 3600000 * 24,
          word_count: 13,
          char_count: 95,
          status: 'submitted'
        }
      ];
      this.nextId = 5;
      this._persist();
    }

    _hydrate(data) {
      this.records = data.map(item => ({
        id: Number(item.id),
        platform: String(item.platform || 'general').toLowerCase(),
        prompt_text: String(item.prompt_text || ''),
        compiled_text: String(item.compiled_text || ''),
        timestamp: Number(item.timestamp || Date.now()),
        word_count: Number(item.word_count || 0),
        char_count: Number(item.char_count || 0),
        status: String(item.status || 'captured')
      }));

      const maxId = this.records.reduce((acc, r) => Math.max(acc, r.id || 0), 0);
      this.nextId = maxId + 1;
    }

    async _persist() {
      const dataToSave = this.records;
      return new Promise((resolve) => {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.set({ [STORAGE_KEY]: dataToSave }, () => resolve());
        } else {
          try {
            if (typeof localStorage !== 'undefined' && localStorage && typeof localStorage.setItem === 'function') {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
            }
          } catch (e) {
            // graceful fallback
          }
          resolve();
        }
      });
    }

    /**
     * Executes SQLite INSERT:
     * INSERT INTO prompt_vault (platform, prompt_text, compiled_text, timestamp, word_count, char_count, status)
     */
    async insertPrompt({ platform, promptText, compiledText = '', status = 'captured' }) {
      await this.init();

      if (!promptText || !promptText.trim()) return null;

      const cleanText = promptText.trim();
      const words = cleanText.split(/\s+/).filter(Boolean).length;
      const chars = cleanText.length;
      const normPlatform = (platform || 'general').toLowerCase();

      // Avoid duplicate spam if identical prompt sent within 3 seconds
      const last = this.records[this.records.length - 1];
      if (
        last &&
        last.platform === normPlatform &&
        last.prompt_text === cleanText &&
        Date.now() - last.timestamp < 3000
      ) {
        return last;
      }

      const record = {
        id: this.nextId++,
        platform: normPlatform,
        prompt_text: cleanText,
        compiled_text: compiledText ? compiledText.trim() : '',
        timestamp: Date.now(),
        word_count: words,
        char_count: chars,
        status: status
      };

      this.records.push(record);
      await this._persist();
      return record;
    }

    /**
     * Executes SQLite SELECT with filters, search, and ordering:
     * SELECT * FROM prompt_vault WHERE platform = ? AND prompt_text LIKE ? ORDER BY timestamp DESC LIMIT ? OFFSET ?
     */
    async query({ platform = 'all', search = '', limit = 100, offset = 0 } = {}) {
      await this.init();

      let result = [...this.records];

      // WHERE platform = ?
      if (platform && platform !== 'all') {
        const p = platform.toLowerCase();
        result = result.filter(r => r.platform === p);
      }

      // WHERE prompt_text LIKE '%query%' OR compiled_text LIKE '%query%'
      if (search && search.trim()) {
        const q = search.trim().toLowerCase();
        result = result.filter(r => 
          r.prompt_text.toLowerCase().includes(q) || 
          r.compiled_text.toLowerCase().includes(q)
        );
      }

      // ORDER BY timestamp DESC (most recent first)
      result.sort((a, b) => b.timestamp - a.timestamp);

      // LIMIT & OFFSET
      const totalCount = result.length;
      const paged = result.slice(offset, offset + limit);

      return {
        rows: paged,
        total: totalCount
      };
    }

    /**
     * Executes SQLite DELETE:
     * DELETE FROM prompt_vault WHERE id = ?
     */
    async deletePrompt(id) {
      await this.init();
      const numId = Number(id);
      const initialLen = this.records.length;
      this.records = this.records.filter(r => r.id !== numId);
      if (this.records.length !== initialLen) {
        await this._persist();
        return true;
      }
      return false;
    }

    /**
     * Executes SQLite TRUNCATE / CLEAR:
     * DELETE FROM prompt_vault;
     */
    async clearVault() {
      await this.init();
      this.records = [];
      this.nextId = 1;
      await this._persist();
      return true;
    }

    /**
     * Generates a standard SQLite SQL dump:
     * CREATE TABLE prompt_vault ... + INSERT INTO statements
     */
    async exportSQL() {
      await this.init();
      let sql = `-- ==========================================================================\n`;
      sql += `-- LVD Compiler — SQLite Prompt Vault Export\n`;
      sql += `-- Generated: ${new Date().toISOString()}\n`;
      sql += `-- Total Records: ${this.records.length}\n`;
      sql += `-- ==========================================================================\n\n`;

      sql += `CREATE TABLE IF NOT EXISTS prompt_vault (\n`;
      sql += `  id INTEGER PRIMARY KEY AUTOINCREMENT,\n`;
      sql += `  platform TEXT NOT NULL,\n`;
      sql += `  prompt_text TEXT NOT NULL,\n`;
      sql += `  compiled_text TEXT,\n`;
      sql += `  timestamp INTEGER NOT NULL,\n`;
      sql += `  word_count INTEGER,\n`;
      sql += `  char_count INTEGER,\n`;
      sql += `  status TEXT DEFAULT 'captured'\n`;
      sql += `);\n\n`;

      if (this.records.length === 0) {
        sql += `-- (No prompt records stored yet)\n`;
        return sql;
      }

      sql += `BEGIN TRANSACTION;\n`;
      for (const r of this.records) {
        const pEsc = r.platform.replace(/'/g, "''");
        const tEsc = r.prompt_text.replace(/'/g, "''");
        const cEsc = (r.compiled_text || '').replace(/'/g, "''");
        const sEsc = (r.status || 'captured').replace(/'/g, "''");
        sql += `INSERT INTO prompt_vault (id, platform, prompt_text, compiled_text, timestamp, word_count, char_count, status) VALUES (${r.id}, '${pEsc}', '${tEsc}', '${cEsc}', ${r.timestamp}, ${r.word_count}, ${r.char_count}, '${sEsc}');\n`;
      }
      sql += `COMMIT;\n`;

      return sql;
    }

    /**
     * Aggregates breakdown of prompt counts by AI platform:
     * SELECT platform, COUNT(*) FROM prompt_vault GROUP BY platform;
     */
    async getPlatformBreakdown() {
      await this.init();
      const stats = {
        all: this.records.length,
        chatgpt: 0,
        claude: 0,
        gemini: 0,
        meta: 0,
        other: 0
      };

      for (const r of this.records) {
        const p = (r.platform || 'other').toLowerCase();
        if (stats[p] !== undefined) {
          stats[p]++;
        } else {
          stats.other++;
        }
      }

      return stats;
    }
  }

  // Singleton instance
  const instance = new SQLiteStore();
  return instance;
});
