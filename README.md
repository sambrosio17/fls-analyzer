# OrgFox

OrgFox (prima Orgsmith, nome di lavoro: FLS Analyzer) è il multitool per gli admin Salesforce. Oggi è una web app per analizzare la Field Level Security (FLS) di Salesforce e modificarla in blocco su più campi e più profili/permission set, con anteprima, approvazione in produzione, esecuzione a lotti, verifica e rollback.

- Documento di progetto: [docs/design.md](docs/design.md)
- Mockup interattivo (aprilo nel browser): [docs/mockup.html](docs/mockup.html)

## Struttura

| Cartella | Contenuto |
|---|---|
| `packages/core` | Logica pura: piano delle modifiche `FieldPermissions` (insert/update/delete) con le regole Salesforce, lotti per la sObject Collections API, rollback, stati di approvazione. |
| `apps/server` | Backend Node.js (Fastify): account e sessioni, OAuth con Salesforce, token cifrati, SQLite in locale o Postgres in hosting, API per matrice e change set, esecuzione in background con controllo dei conflitti e verifica. |
| `apps/web` | Frontend React + TypeScript (Vite): org collegate, matrice FLS, anteprima/approvazione/risultato, storico. |

## Provarlo subito senza Salesforce (modalità demo)

Serve Node.js 22.13 o successivo.

```bash
npm install
npm run build
cp .env.example .env    # imposta APP_SECRET (32+ caratteri) e DEMO_MODE=true
npm start               # apri http://localhost:3000 e crea il tuo account
```

La modalità demo aggiunge a ogni account un'org "Demo (sample data)" in memoria, separata da quella degli altri account: puoi usare matrice, modifica massiva, anteprima, esecuzione e rollback senza collegare un'org vera. Le modifiche demo si perdono al riavvio. Con `DEMO_LARGE=true` l'org demo ha oltre 400 campi su Account e 1500 profili/permission set, utile per provare la matrice su volumi grandi.

## Account

Ogni persona entra con email e password e vede solo le sue org, i suoi change set e il suo storico.

- **Installazione locale** (`APP_URL` su `localhost` o `127.0.0.1`): il primo account si crea dalla pagina di accesso, senza invito. Se il database viene da una versione precedente agli account, le org e i change set già presenti passano a questo primo account.
- **Hosting**: si entra solo con un invito, legato a un indirizzo email e valido 14 giorni. Dal server: `npm run account -- invite ada@example.com` stampa il link da mandare. `npm run account -- reset ada@example.com` stampa un link per scegliere una nuova password (valido 24 ore). Con `SIGNUP=open` chiunque può registrarsi.
- **Amministrazione**: il primo account è admin e ha la pagina Amministrazione, dove crea e revoca inviti, vede tutti gli account, crea link di reset, chiude le sessioni, dà o toglie il ruolo admin e disattiva gli account. Un admin non può modificare il proprio account da lì. Dal server, `npm run account -- admin ada@example.com` rende admin un account (per recuperare l'accesso).
- Password di almeno 12 caratteri, salvate con scrypt. Dopo 10 tentativi sbagliati in 15 minuti l'accesso si blocca per quell'email e quell'IP.
- La sessione scade dopo 12 ore di inattività e comunque dopo 7 giorni. Il database conserva solo un hash del token, quindi una copia del database non apre sessioni. Cambiare la password chiude le sessioni sugli altri dispositivi.
- `APP_PASSWORD` e `APP_USER` non servono più: change set e approvazioni registrano l'email dell'account.

## Hosting

| Variabile | A cosa serve |
|---|---|
| `DATABASE_URL` | Postgres (es. `postgres://user:pass@host:5432/orgfox?sslmode=require`). Senza, l'app usa SQLite in `DB_PATH`. Le tabelle si creano all'avvio. |
| `APP_URL` | URL pubblico in `https://`: attiva cookie `Secure` e HSTS. |
| `HOST` | `0.0.0.0` per ascoltare dietro il proxy dell'hosting (default `127.0.0.1`). |
| `TRUST_PROXY` | `true` dietro un reverse proxy, per leggere IP e protocollo da `X-Forwarded-*`. |
| `SIGNUP` | `invite` (default) oppure `open`. |

Ogni risposta porta gli header di sicurezza (Content-Security-Policy, X-Frame-Options, nosniff, Referrer-Policy, HSTS su https), le risposte API non vanno in cache e le richieste che modificano dati da un altro sito vengono rifiutate.

## Collegare un'org Salesforce

1. In Salesforce (Setup) crea una **External Client App** (o una Connected App) con OAuth abilitato:
   - Callback URL: `http://localhost:3000/oauth/callback` (oppure `${APP_URL}/oauth/callback`)
   - Scope: `api`, `refresh_token, offline_access`, `id`
   - PKCE richiesto; secret facoltativo per il web server flow
2. Copia Consumer Key (e Secret, se lo usi) in `.env` come `SF_CLIENT_ID` e `SF_CLIENT_SECRET`.
3. Avvia l'app, vai su **Org** e scegli Produzione, Sandbox o My Domain.

L'utente Salesforce che si collega deve avere **API Enabled**, **View Setup and Configuration** e, per modificare, **Manage Profiles and Permission Sets**.

## Sviluppo

```bash
npm run dev        # server su :3000 con riavvio automatico + Vite su :5173 (proxy verso il server)
npm test           # test di core e server (Vitest), su SQLite
TEST_DATABASE_URL=postgres://localhost/orgfox_test npm test   # gli stessi test del server su Postgres
npm run typecheck
```

Per l'OAuth in sviluppo usa l'app servita dal server (`npm run build` e poi `http://localhost:3000`), perché il callback torna su `APP_URL`.

## Regole applicate

- Modifica implica lettura; i campi calcolati (formula, roll-up, auto number) ricevono solo la lettura.
- Esclusi in automatico: campi senza FLS, permission set di pacchetti gestiti, permission set group e muting.
- Avviso se il profilo non ha la lettura sull'oggetto.
- Org di produzione: il change set va inviato per approvazione, approvato e confermato digitando il nome dell'org. Chi approva può essere lo stesso utente (`REQUIRE_DIFFERENT_APPROVER=true` lo impedisce).
- Prima di scrivere l'app rilegge i record: le righe cambiate dopo l'anteprima vanno in conflitto e non vengono toccate. Dopo la scrittura rilegge di nuovo e verifica.
