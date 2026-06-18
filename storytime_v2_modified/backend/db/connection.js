/**
 * db/connection.js
 * sql.js wrapper that mimics mysql2's pool.query([rows], [fields]) interface.
 * sql.js = pure-JS WebAssembly SQLite — no compilation, no MySQL server needed.
 */
const initSqlJs = require('sql.js');
const fs   = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'storytime.db');

let _db   = null;   // sql.js Database instance
let _SQL  = null;   // sql.js constructor

// ── Bootstrap ──────────────────────────────────────────────────────────────
async function boot() {
  if (_db) return _db;
  _SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    _db = new _SQL.Database(fs.readFileSync(DB_PATH));
  } else {
    _db = new _SQL.Database();
  }
  return _db;
}

// Persist in-memory DB to disk after every write
function persist() {
  const buf = _db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(buf));
}

// Convert sql.js [{columns, values}] → array of plain objects
function toRows(result) {
  if (!result || !result.length) return [];
  const { columns, values } = result[0];
  return values.map(row => {
    const obj = {};
    columns.forEach((c, i) => { obj[c] = row[i]; });
    return obj;
  });
}

// ── Public API ─────────────────────────────────────────────────────────────
const db = {
  /**
   * Async, matches mysql2:  const [rows, fields] = await db.query(sql, params)
   * For INSERT returns:      [{ insertId, affectedRows }, []]
   * For SELECT returns:      [rowArray, []]
   * For UPDATE/DELETE:       [{ affectedRows }, []]
   */
  async query(sql, params = []) {
    await boot();

    // Translate MySQL-isms → SQLite
    const s = sql
      .replace(/NOW\(\)/gi, "datetime('now')")
      .trim();

    const upper = s.replace(/\s+/g, ' ').trimStart().toUpperCase();

    try {
      // ── SELECT / PRAGMA ──────────────────────────────────────────────
      if (upper.startsWith('SELECT') || upper.startsWith('PRAGMA') || upper.startsWith('WITH')) {
        if (params.length === 0) {
          return [toRows(_db.exec(s)), []];
        }
        // Parameterised SELECT — use prepare/step
        const stmt = _db.prepare(s);
        stmt.bind(params);
        const rows = [];
        while (stmt.step()) rows.push(stmt.getAsObject());
        stmt.free();
        return [rows, []];
      }

      // ── INSERT ───────────────────────────────────────────────────────
      if (upper.startsWith('INSERT')) {
        _db.run(s, params);
        const insertId = toRows(_db.exec('SELECT last_insert_rowid() AS id'))[0]?.id ?? 0;
        persist();
        return [{ insertId, affectedRows: _db.getRowsModified() }, []];
      }

      // ── UPDATE / DELETE / CREATE / DROP / etc. ───────────────────────
      _db.run(s, params);
      const affectedRows = _db.getRowsModified();
      persist();
      return [{ affectedRows }, []];

    } catch (err) {
      console.error('[DB Error]', err.message, '\nSQL:', s, '\nParams:', params);
      throw err;
    }
  },

  /** Expose raw instance for the init script */
  async raw() { return boot(); }
};

module.exports = db;
