# Piano di test su org reale

English: [real-org-test-plan.en.md](real-org-test-plan.en.md)

Gran parte dei percorsi di scrittura di OrgFox ha girato solo sull'org demo e su API simulate. Questo piano li verifica su Salesforce vero prima della beta. Va eseguito su **due sandbox**:

- **A, pulita:** una Developer sandbox nuova o una Developer Edition.
- **B, "sporca":** una sandbox copiata da una produzione reale, con pacchetti gestiti, diversi record type, app Lightning con page override e almeno un profilo con parentesi o altri caratteri speciali nel nome (es. `guests (old) Profile`).

Mai in produzione.

## Come riportare

Per ogni passo scrivi **OK**, oppure **KO** con: il testo dell'errore mostrato da OrgFox, il numero del change set (CS-…) e uno screenshot. Se un passo fallisce, esporta il change set in Excel (Esporta → Excel) e allegalo. Indica la sandbox (A o B) e il commit di OrgFox (`git log -1 --oneline`).

## 0. Preparazione

| # | Passo | Atteso |
|---|---|---|
| 0.1 | `git pull && npm install && npm run build`, avvio con `DEMO_MODE=false` | L'app si apre sulla pagina di login |
| 0.2 | Org → collega la sandbox (login Sandbox), dalle un alias | L'org compare con il tag SANDBOX e l'alias nella barra in alto |
| 0.3 | Utente collegato: verifica API Enabled, View Setup and Configuration, Manage Profiles and Permission Sets | Nessun avviso di permessi sulla scheda dell'org |
| 0.4 | Annota in Setup la FLS attuale di 3 campi di Account per 2 profili e 1 permission set (screenshot) | Situazione di partenza da confrontare |

## 1. Matrice FLS

| # | Passo | Atteso |
|---|---|---|
| 1.1 | Apri la matrice FLS su Account | Campi × profili/PS caricati; i valori coincidono con Setup per i 3 campi di 0.4 |
| 1.2 | Cerca un campo nascosto all'utente collegato (senza FLS sul suo profilo) | Compare con "Nascosto a te" |
| 1.3 | Dai Lettura su 2 campi a 1 profilo + 1 PS, Lettura e modifica su 1 campo all'altro profilo; Vai all'anteprima | L'anteprima elenca esattamente quelle righe con insert/update; avvisi se un profilo non legge l'oggetto |
| 1.4 | Applica | Stato Completato, ogni riga Applicata |
| 1.5 | Controlla in Setup (Field Accessibility o il profilo) | Stessi valori dell'anteprima |
| 1.6 | Annulla queste modifiche → applica il change set di annullamento | Setup torna alla situazione di 0.4 |
| 1.7 | Prepara una modifica su 1 campo, vai all'anteprima, **cambia lo stesso campo in Setup**, poi applica | Quella riga è un Conflitto e viene saltata; le altre sono Applicate |
| 1.8 | In blocco: seleziona trascinando 20+ campi × 5+ PS, Lettura e modifica, applica | Completato; verifica 3 celle a campione in Setup |
| 1.9 | Ripeti 1.3–1.5 in ogni vista della matrice (Griglia, Focus, Mappa, Regole) | Stesso risultato in tutte e quattro |

## 2. Accesso alle classi Apex

| # | Passo | Atteso |
|---|---|---|
| 2.1 | Apri Classi Apex | Le classi si caricano, quelle dei pacchetti gestiti sono segnate |
| 2.2 | Abilita 2 classi per 1 PS, disabilita 1 classe su 1 profilo, applica | Completato; Setup → PS/profilo → Apex Class Access coincide |
| 2.3 | Annulla | Torna allo stato di partenza |

## 3. Assegnazioni dei page layout

| # | Passo | Atteso |
|---|---|---|
| 3.1 | Layout e pagine → Account | La matrice profilo × record type coincide con Setup → Page Layout Assignment |
| 3.2 | Modifica assegnazioni: cambia 2 celle, usa una volta Tutta la colonna…, applica | Completato; Setup mostra le nuove assegnazioni |
| 3.3 | Ripeti su un profilo con caratteri speciali nel nome (sandbox B) | Completato, oppure la riga rifiutata mostra il motivo di Salesforce e le altre vengono salvate |
| 3.4 | Annulla | Tornano le assegnazioni di partenza |
| 3.5 | Ripeti 3.2 con le viste Pennello e Bacheca | Stesso risultato |

## 4. Assegnazioni delle Lightning page

| # | Passo | Atteso |
|---|---|---|
| 4.1 | Lightning page di un'app con page override | La pagina effettiva per profilo × record type coincide con Lightning App Builder → Activation |
| 4.2 | Cambia un'assegnazione solo su **Desktop**, applica | Completato; Activation mostra la modifica solo per desktop |
| 4.3 | Cambiane una solo su **Telefono**, poi una con "Applica ogni modifica a desktop e telefono" | Completato; entrambi i form factor come richiesto |
| 4.4 | Togli un page override | Il profilo torna al default dell'app o dell'org, come indicato in anteprima |
| 4.5 | Riprova l'app che falliva con `INVALID_CROSS_REFERENCE_KEY` (`Sales_Pilot_n`) | Completato, oppure le righe rifiutate indicano quale profilo/pagina Salesforce rifiuta |
| 4.6 | Annulla | Torna lo stato di partenza |

## 5. Riavvio durante un'esecuzione

| # | Passo | Atteso |
|---|---|---|
| 5.1 | Prepara una modifica FLS grande (500+ righe), applica e **ferma il server (Ctrl+C) mentre è in esecuzione** | — |
| 5.2 | Riavvia il server e apri il change set | Finisce da solo; il banner dice che è stato ripreso; nessuna riga è in conflitto a causa del riavvio |
| 5.3 | Controlla 5 righe in Setup | Coincidono con i valori richiesti |
| 5.4 | Stessa prova con un change set di assegnazioni dei layout | Stesso risultato |

## 6. Token e collegamento

| # | Passo | Atteso |
|---|---|---|
| 6.1 | Pulsante di aggiornamento del token sull'org | Messaggio di successo |
| 6.2 | In Salesforce revoca l'accesso dell'app (Setup → Connected Apps OAuth Usage o le connessioni OAuth dell'utente) e ricarica la matrice | OrgFox chiede di ricollegare; Ricollega funziona e mantiene l'alias |

## 7. Export

| # | Passo | Atteso |
|---|---|---|
| 7.1 | Matrice → Esporta → Metadata Salesforce (.zip) per 2 PS; deploy sulla sandbox A con `sf project deploy start --metadata-dir` | Deploy riuscito; la FLS coincide |
| 7.2 | Export Excel e CSV della matrice e di un change set | I file si aprono in Excel; i valori coincidono con lo schermo |

## 8. Tempi (annota i numeri)

| # | Cosa | Annota |
|---|---|---|
| 8.1 | Caricamento della matrice FLS sull'oggetto più grande della sandbox B | secondi |
| 8.2 | Applicazione di 500 righe FLS | secondi |
| 8.3 | Applicazione di 20 assegnazioni di pagina (i tempi sono nel risultato) | secondi per passo |
