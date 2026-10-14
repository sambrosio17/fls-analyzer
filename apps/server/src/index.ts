import { buildApp } from './app.ts';
import { loadConfig } from './config.ts';
import { Db } from './db.ts';

const config = loadConfig();
const app = buildApp({ config, db: new Db(config.dbPath) });
await app.listen({ port: config.port, host: '127.0.0.1' });
