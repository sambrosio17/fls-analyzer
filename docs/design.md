# FLS Analyzer: documento di progetto

Versione 0.2, 14 ottobre 2026. Stato: decisioni principali prese (vedi sezione 12).

## 1. Obiettivo

Una web app che si collega a una o più org Salesforce e permette di:

1. **Analizzare** la Field Level Security (FLS) come matrice *campi × profili/permission set*, con filtri e ricerca.
2. **Modificare in blocco** lettura/modifica su più campi e più profili/permission set in un'unica operazione.
3. **Vedere un'anteprima** delle modifiche (diff prima/dopo, avvisi, chiamate API previste) prima di applicarle.
4. **Applicare, verificare e annullare**: esecuzione a lotti, esito per singolo record, rollback dallo snapshot.
5. **Tenere traccia** di chi ha cambiato cosa, quando e su quale org.

Fuori ambito per l'MVP: permessi di oggetto (solo segnalati), record type, layout, sharing.

## 2. Concetti Salesforce su cui si basa

- Ogni **profilo** ha un permission set "nascosto" (`PermissionSet.IsOwnedByProfile = true`, `ProfileId` valorizzato). Quindi profili e permission set si gestiscono con lo **stesso oggetto** e la stessa API.
- La FLS è salvata nell'oggetto **`FieldPermissions`**: un record per coppia *(permission set, campo)* con `PermissionsRead` e `PermissionsEdit`. **Nessun record = nessun accesso.**
- Regole da rispettare:
  - `PermissionsEdit = true` richiede `PermissionsRead = true`.
  - Campi calcolati (formula, roll-up, auto number) accettano solo lettura.
  - Campi non "permissionable" (obbligatori a livello di sistema, es. `Account.Name`, `Opportunity.StageName`) non hanno FLS: sono sempre visibili e la UI li mostra bloccati.
  - Permission set di pacchetti gestiti (`NamespacePrefix` valorizzato) non sono modificabili.
  - I permission set group (`Type = 'Group'`) non si modificano direttamente: si ricalcolano dai permission set che contengono.
  - La FLS è efficace solo se c'è almeno la lettura sull'oggetto (`ObjectPermissions`): l'app lo segnala.

## 3. Architettura

```
Browser (SPA React)  ──HTTPS──▶  Backend BFF (Node.js)  ──REST/OAuth──▶  Salesforce org(s)
                                   │   ├─ Postgres (connessioni, snapshot, change set, audit)
                                   │   └─ Redis + coda job (esecuzioni lunghe)
```

**Scelta consigliata: web app esterna con backend (BFF).**

| Opzione | Pro | Contro |
|---|---|---|
| **Web app esterna + BFF** (consigliata) | Multi-org, confronto tra org, nessuna installazione nell'org, token mai esposti al browser | Va ospitata e messa in sicurezza |
| App nativa (LWC + Apex) | Niente OAuth né hosting | Un'installazione per org, limiti governor di Apex, niente confronto tra org |
| SPA pura senza backend | Semplicissima | Token nel browser, CORS da configurare in ogni org, niente audit centralizzato |

**Stack proposto**
- Frontend (confermato): React + TypeScript + Vite, TanStack Table con virtualizzazione (matrici da migliaia di righe × centinaia di colonne).
- Backend: Node.js (Fastify o NestJS) con `jsforce` per le chiamate Salesforce.
- Persistenza: Postgres; Redis + BullMQ per i job di esecuzione e la cache dei metadati.
- Deploy: container (es. Cloud Run, ECS, Azure Container Apps).

## 4. Autenticazione

- **OAuth 2.0 Web Server Flow con PKCE** tramite una *External Client App* (o Connected App) Salesforce.
- Host di login: `login.salesforce.com` (produzione), `test.salesforce.com` (sandbox) oppure My Domain.
- Scope: `api`, `refresh_token`, `id`.
- Il refresh token è salvato **cifrato** lato server (KMS / envelope encryption); il browser riceve solo un cookie di sessione `HttpOnly`.
- L'app agisce **con i permessi dell'utente** collegato. All'avvio verifica che abbia `Manage Profiles and Permission Sets`, `View Setup and Configuration` e `API Enabled` (query su `UserPermissionAccess`); se mancano mostra un messaggio chiaro e apre l'app in sola lettura.

## 5. Lettura dei dati (analisi)

Caricamento **per oggetto, su richiesta**, con cache per org e data di ultima sincronizzazione.

1. **Oggetti**: `GET /services/data/vXX.X/sobjects` (describeGlobal).
2. **Campi** di un oggetto: `GET /sobjects/{Object}/describe` e si tengono `name`, `label`, `type`, `permissionable`, `calculated`, `autoNumber`, `encrypted`, `custom`.
3. **Profili e permission set**:
   ```sql
   SELECT Id, Name, Label, Type, IsOwnedByProfile, Profile.Name, NamespacePrefix, License.Name
   FROM PermissionSet
   WHERE Type IN ('Regular', 'Profile')
   ```
4. **FLS esistente** (paginata con `queryMore`):
   ```sql
   SELECT Id, ParentId, SobjectType, Field, PermissionsRead, PermissionsEdit
   FROM FieldPermissions
   WHERE SobjectType IN ('Account', 'Opportunity') AND ParentId IN (:permissionSetIds)
   ```
5. **Accesso agli oggetti** (per gli avvisi):
   ```sql
   SELECT ParentId, SobjectType, PermissionsRead, PermissionsEdit
   FROM ObjectPermissions WHERE SobjectType IN (...)
   ```

La matrice si costruisce in memoria: chiave `ParentId|Object.Field` → `{ id, read, edit }`. Le celle senza record valgono "nessun accesso".

**Analisi offerte nella UI**
- Filtri: campi senza accesso per nessuno, campi modificabili da tutti, solo campi custom, ricerca per label o API name.
- Contatori per colonna (quanti campi vede/modifica ogni profilo) e per riga.
- Confronto tra due permission set o tra due org (v2).
- "Chi vede questo campo?": utenti effettivi tramite `PermissionSetAssignment` (v2).

## 6. Scrittura (modifica massiva)

### 6.1 Dal "desiderato" al piano

L'utente sceglie *campi × permission set × azione* (Lettura, Lettura e modifica, Nessun accesso, Togli solo la modifica). Il backend confronta lo stato desiderato con lo snapshot e produce un **change set**:

| Prima | Dopo | Operazione |
|---|---|---|
| nessun record | Lettura / Lettura e modifica | **insert** `FieldPermissions` |
| record esistente | valore diverso, almeno lettura | **update** `PermissionsRead/Edit` |
| record esistente | Nessun accesso | **delete** del record |
| uguale | uguale | nessuna operazione |

Durante la generazione si applicano le regole della sezione 2: modifica ridotta a lettura sui campi calcolati, permission set gestiti esclusi, campi non permissionable esclusi, avviso se manca la lettura sull'oggetto.

### 6.2 Esecuzione

- **sObject Collections API**, fino a 200 record per chiamata, con `allOrNone: false` per avere l'esito record per record:
  - `POST /composite/sobjects` per gli insert
  - `PATCH /composite/sobjects` per gli update
  - `DELETE /composite/sobjects?ids=...&allOrNone=false` per le eliminazioni
- Volumi molto grandi (decine di migliaia di righe): Bulk API 2.0 come alternativa.
- **Controllo di concorrenza**: subito prima di scrivere si rileggono i `FieldPermissions` coinvolti; se qualcuno li ha cambiati dopo l'anteprima, quelle righe vanno in "conflitto" e non si toccano.
- Esecuzione in un job in coda, con avanzamento in tempo reale (SSE o WebSocket).
- Dopo la scrittura: nuova lettura delle righe coinvolte e confronto con il desiderato (verifica).

Esempio di payload per l'insert:

```json
{
  "allOrNone": false,
  "records": [
    {
      "attributes": { "type": "FieldPermissions" },
      "ParentId": "0PS5g000001AbCdGAK",
      "SobjectType": "Account",
      "Field": "Account.Tax_Code__c",
      "PermissionsRead": true,
      "PermissionsEdit": false
    }
  ]
}
```

### 6.3 Rollback

Ogni change set salva lo snapshot "prima". Annullare significa generare il change set inverso (con nuova anteprima) e rieseguirlo con lo stesso motore.

### 6.4 Perché non la Metadata API

La Metadata API (deploy di `Profile`/`PermissionSet`) funziona ma è lenta, richiede di gestire file XML completi e un deploy di profilo può sovrascrivere altre impostazioni. La usiamo solo per l'**export** in formato metadata (v2), utile a chi versiona i permessi in Git o con SFDX.

## 7. Modello dati dell'app

```
OrgConnection   id, sf_org_id, instance_url, username, is_sandbox, refresh_token_enc, created_by, last_sync_at
MetadataCache   org_id, object_api_name, describe_json, fetched_at
ChangeSet       id, tenant_id, org_id, author, status (draft|pending_approval|approved|rejected|running|done|partial|failed|rolled_back),
                created_at, approved_by, approved_at, executed_at, rollback_of
ChangeItem      id, change_set_id, permission_set_id, permission_set_label, sobject, field,
                before_read, before_edit, before_record_id,
                after_read, after_edit, operation (insert|update|delete),
                warning, status (pending|ok|error|conflict|skipped), error_code, error_message
AuditEvent      id, org_id, user, action, change_set_id, ip, at
```

## 8. Sicurezza e governance

- Token cifrati, mai inviati al browser; sessioni brevi; protezione CSRF.
- **Le org di produzione chiedono una conferma esplicita** (digitare il nome dell'org); opzione per obbligare a provare prima in sandbox.
- Ruoli interni all'app: *Viewer* (solo analisi), *Editor* (prepara change set), *Approver* (esegue in produzione), opzionale.
- Audit completo nell'app, in aggiunta al Setup Audit Trail di Salesforce.
- Limite di sicurezza configurabile sul numero di modifiche per change set.

## 9. Limiti e casi particolari

- Limiti API giornalieri dell'org: l'app mostra le chiamate previste in anteprima e le chiamate residue (`/limits`).
- Licenze: alcune licenze (es. community, platform) non ammettono certi campi o oggetti; l'errore emerge solo in esecuzione ed è riportato per riga.
- Campi composti (indirizzi, nome): la FLS si gestisce sui singoli componenti.
- Dopo modifiche ai permission set inclusi in un group, Salesforce ricalcola il group in modo asincrono.
- Profili standard: la FLS è modificabile, ma conviene segnalare l'impatto (es. "Read Only" assegnato a molti utenti).

## 10. Flussi end-to-end (vedi mockup)

1. **Connetti org**: scelta ambiente → login Salesforce → consenso → verifica permessi → lettura metadati.
2. **Analizza**: scelta oggetti e profili/permission set → matrice con filtri e contatori.
3. **Modifica**: click sulle singole celle oppure "Modifica massiva" su righe e colonne selezionate.
4. **Anteprima**: diff prima/dopo, avvisi, chiamate API previste, conferma.
5. **Esecuzione e risultato**: avanzamento per lotto, esito per riga, errori, rollback.
6. **Storico**: elenco dei change set con autore, esito e possibilità di annullare.

## 11. Roadmap

- **MVP**: connessione OAuth a più org, matrice per oggetto, modifica a celle e massiva, anteprima con regole, esecuzione con Collections API, rollback, storico, export CSV.
- **v2**: confronto tra permission set e tra org, "chi vede questo campo", import da CSV, export metadata/package.xml, approvazione a due step, template di modifiche riutilizzabili.
- **v3**: permessi di oggetto e permission set group (inclusi i muting permission set), report pianificati di anomalie (es. campi sensibili visibili a troppi profili).

## 12. Decisioni prese

1. **Si parte con un MVP personale, poi si passa a un prodotto per più clienti** (14/10/2026).
   - MVP: un solo utente (tu), gira in locale o su un piccolo host; login all'app semplice, più org Salesforce collegabili. Postgres (o SQLite in locale) e niente Redis: i job girano nel processo.
   - Pronto per il multi-cliente da subito: ogni tabella ha `tenant_id`, i token sono cifrati con chiave per tenant, la logica Salesforce sta in un modulo separato dalla UI.
   - Fase multi-cliente: login con SSO, ruoli (Viewer/Editor/Approver), coda job con Redis, External Client App distribuibile (packaging) e hosting gestito.

2. **Approvazione a due step in produzione già nell'MVP** (14/10/2026).
   - Su un'org di produzione il change set passa per tre stati: *bozza* → *in attesa di approvazione* → *approvato ed eseguito* (oppure *rifiutato*).
   - L'approvazione rifà l'anteprima sullo stato attuale dell'org: se qualcosa è cambiato nel frattempo, le righe in conflitto sono evidenziate prima di approvare.
   - Nell'MVP personale chi approva può essere lo stesso utente (un secondo passaggio deliberato, registrato nell'audit); nella fase multi-cliente si può imporre che l'approvatore sia una persona diversa.
   - Le sandbox restano a conferma singola, configurabile per org.
3. **Stack: React + TypeScript (Vite) e Node.js** (14/10/2026).
