import { createLink, linkUrl } from '../accounts.ts';
import { normalizeEmail } from '../auth.ts';
import { loadConfig } from '../config.ts';
import { Db } from '../db.ts';

/**
 * Accounts from the server's shell (the admin page in the app does the same for admins):
 *   npm run account -- invite ada@example.com [days]   link to create an account with that email
 *   npm run account -- reset ada@example.com           link to choose a new password
 *   npm run account -- admin ada@example.com           makes the account an admin (e.g. to recover access)
 */
const [command, email, days] = process.argv.slice(2);
const usage = 'Usage: npm run account -- invite <email> [days] | reset <email> | admin <email>';
if (!email || !['invite', 'reset', 'admin'].includes(command ?? '')) {
  console.error(usage);
  process.exit(1);
}

const config = loadConfig({ ...process.env, SF_CLIENT_ID: process.env.SF_CLIENT_ID || 'unused' });
const db = await Db.open({ path: config.dbPath, databaseUrl: config.databaseUrl });
try {
  const user = await db.getUserByEmail(normalizeEmail(email));
  if (command === 'invite' && user) throw new Error(`${email} already has an account.`);
  if (command !== 'invite' && !user) throw new Error(`No account with email ${email}.`);
  if (command === 'admin') {
    await db.setAdmin(user!.id, true);
    await db.audit({ tenant: user!.tenant_id, actor: 'cli', action: 'admin.admin_granted', detail: user!.email });
    console.log(`${user!.email} is now an admin.`);
  } else {
    const kind = command as 'invite' | 'reset';
    const code = await createLink(db, kind, email, days ? Number(days) : undefined);
    console.log(linkUrl(config.appUrl, kind, code));
  }
} catch (e) {
  console.error((e as Error).message);
  process.exitCode = 1;
} finally {
  await db.close();
}
