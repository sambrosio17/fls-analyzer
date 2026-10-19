import { createLink, linkUrl } from '../accounts.ts';
import { normalizeEmail } from '../auth.ts';
import { loadConfig } from '../config.ts';
import { Db } from '../db.ts';

/**
 * Account links from the server's shell, until there is an admin page:
 *   npm run account -- invite ada@example.com [days]   link to create an account with that email
 *   npm run account -- reset ada@example.com           link to choose a new password
 */
const [command, email, days] = process.argv.slice(2);
const usage = 'Usage: npm run account -- invite <email> [days] | reset <email>';
if (!email || !['invite', 'reset'].includes(command ?? '')) {
  console.error(usage);
  process.exit(1);
}

const config = loadConfig({ ...process.env, SF_CLIENT_ID: process.env.SF_CLIENT_ID || 'unused' });
const db = await Db.open({ path: config.dbPath, databaseUrl: config.databaseUrl });
try {
  const user = await db.getUserByEmail(normalizeEmail(email));
  if (command === 'invite' && user) throw new Error(`${email} already has an account.`);
  if (command === 'reset' && !user) throw new Error(`No account with email ${email}.`);
  const kind = command as 'invite' | 'reset';
  const code = await createLink(db, kind, email, days ? Number(days) : undefined);
  console.log(linkUrl(config.appUrl, kind, code));
} catch (e) {
  console.error((e as Error).message);
  process.exitCode = 1;
} finally {
  await db.close();
}
