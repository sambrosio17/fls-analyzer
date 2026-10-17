# OrgFox

OrgFox (prima Orgsmith, nome di lavoro: FLS Analyzer) è il multitool per gli admin Salesforce. Oggi è una web app per analizzare la Field Level Security (FLS) di Salesforce e modificarla in blocco su più campi e più profili/permission set, con anteprima, approvazione in produzione, esecuzione a lotti, verifica e rollback.

- Documento di progetto: [docs/design.md](docs/design.md)
- Mockup interattivo (aprilo nel browser): [docs/mockup.html](docs/mockup.html)

## Struttura

| Cartella | Contenuto |
|---|---|
| `packages/core` | Logica pura: piano delle modifiche `FieldPermissions` (insert/update/delete) con le regole Salesforce, lotti per la sObject Collections API, rollback, stati di approvazione. |
| `apps/server` | Backend Node.js (Fastify): OAuth con Salesforce, token cifrati, SQLite, API per matrice e change set, esecuzione in background con controllo dei conflitti e verifica. |
| `apps/web` | Frontend React + TypeScript (Vite): org collegate, matrice FLS, anteprima/approvazione/risultato, storico. |

## Provarlo subito senza Salesforce (modalità demo)

Serve Node.js 22.13 o successivo.

```bash
npm install
npm run build
cp .env.example .env    # imposta APP_PASSWORD, APP_SECRET (32+ caratteri) e DEMO_MODE=true
npm start               # apri http://localhost:3000
```

La modalità demo aggiunge un'org "Demo (sample data)" in memoria: puoi usare matrice, modifica massiva, anteprima, esecuzione e rollback senza collegare un'org vera. Le modifiche demo si perdono al riavvio. Con `DEMO_LARGE=true` l'org demo ha oltre 400 campi su Account e 1500 profili/permission set, utile per provare la matrice su volumi grandi.

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
npm test           # test di core e server (Vitest)
npm run typecheck
```

Per l'OAuth in sviluppo usa l'app servita dal server (`npm run build` e poi `http://localhost:3000`), perché il callback torna su `APP_URL`.

## Regole applicate

- Modifica implica lettura; i campi calcolati (formula, roll-up, auto number) ricevono solo la lettura.
- Esclusi in automatico: campi senza FLS, permission set di pacchetti gestiti, permission set group e muting.
- Avviso se il profilo non ha la lettura sull'oggetto.
- Org di produzione: il change set va inviato per approvazione, approvato e confermato digitando il nome dell'org. Nell'MVP chi approva può essere lo stesso utente (`REQUIRE_DIFFERENT_APPROVER=true` lo impedisce).
- Prima di scrivere l'app rilegge i record: le righe cambiate dopo l'anteprima vanno in conflitto e non vengono toccate. Dopo la scrittura rilegge di nuovo e verifica.
