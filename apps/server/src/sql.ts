import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import pg from 'pg';

export type Param = string | number | null;

/**
 * The few calls the app makes on its database, the same for SQLite (local install, tests) and Postgres
 * (hosted). Statements use `?` placeholders; the Postgres driver numbers them.
 */
export interface Sql {
  readonly dialect: 'sqlite' | 'postgres';
  all<T>(text: string, params?: Param[]): Promise<T[]>;
  get<T>(text: string, params?: Param[]): Promise<T | undefined>;
  /** Returns the number of rows changed. */
  run(text: string, params?: Param[]): Promise<number>;
  /** Runs a script of statements without parameters. */
  exec(script: string): Promise<void>;
  /** Runs `fn` in a transaction: committed when it resolves, rolled back when it throws. */
  tx<T>(fn: (sql: Sql) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

export function sqlite(path: string): Sql {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  // One connection: transactions take turns, so statements of two of them never mix.
  let queue: Promise<unknown> = Promise.resolve();
  const base = {
    dialect: 'sqlite' as const,
    async all<T>(text: string, params: Param[] = []) { return db.prepare(text).all(...params) as T[]; },
    async get<T>(text: string, params: Param[] = []) { return db.prepare(text).get(...params) as T | undefined; },
    async run(text: string, params: Param[] = []) { return Number(db.prepare(text).run(...params).changes); },
    async exec(script: string) { db.exec(script); },
    async close() { db.close(); }
  };
  const inTx: Sql = { ...base, tx: fn => fn(inTx) };
  return {
    ...base,
    tx<T>(fn: (sql: Sql) => Promise<T>) {
      const run = queue.then(async () => {
        db.exec('BEGIN');
        try {
          const out = await fn(inTx);
          db.exec('COMMIT');
          return out;
        } catch (e) {
          db.exec('ROLLBACK');
          throw e;
        }
      });
      queue = run.catch(() => undefined);
      return run;
    }
  };
}

const numbered = (text: string) => { let i = 0; return text.replace(/\?/g, () => `$${++i}`); };

/** `searchPath` puts the tables in their own schema (tests run each case in a fresh one). */
export function postgres(url: string, searchPath?: string): Sql {
  const pool = new pg.Pool({ connectionString: url, max: 10, ...(searchPath ? { options: `-c search_path=${searchPath}` } : {}) });
  const on = (q: pg.Pool | pg.PoolClient): Omit<Sql, 'tx' | 'close'> => ({
    dialect: 'postgres',
    async all<T>(text: string, params: Param[] = []) { return (await q.query(numbered(text), params)).rows as T[]; },
    async get<T>(text: string, params: Param[] = []) { return (await q.query(numbered(text), params)).rows[0] as T | undefined; },
    async run(text: string, params: Param[] = []) { return (await q.query(numbered(text), params)).rowCount ?? 0; },
    async exec(script: string) { await q.query(script); }
  });
  return {
    ...on(pool),
    async tx<T>(fn: (sql: Sql) => Promise<T>) {
      const client = await pool.connect();
      const inTx: Sql = { ...on(client), tx: f => f(inTx), close: async () => undefined };
      try {
        await client.query('BEGIN');
        const out = await fn(inTx);
        await client.query('COMMIT');
        return out;
      } catch (e) {
        await client.query('ROLLBACK').catch(() => undefined);
        throw e;
      } finally {
        client.release();
      }
    },
    async close() { await pool.end(); }
  };
}
