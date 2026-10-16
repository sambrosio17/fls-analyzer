import type { ReactNode } from 'react';
import type { Messages } from './en.tsx';

export const it: Messages = {
  locale: 'it-IT',
  language: 'Lingua',
  common: {
    close: 'Chiudi', cancel: 'Annulla', save: 'Salva', open: 'Apri', loading: 'Caricamento…',
    sandbox: 'Sandbox', production: 'Produzione', all: 'tutti', none: 'nessuno'
  },
  access: {
    short: ['—', 'L', 'L+M'],
    long: ['Nessun accesso', 'Lettura', 'Lettura e modifica'],
    pending: 'Modifica in sospeso',
    locked: 'Non modificabile'
  },
  status: {
    draft: 'Bozza', pending_approval: 'In attesa di approvazione', approved: 'Approvato', rejected: 'Rifiutato',
    running: 'In esecuzione', done: 'Completato', partial: 'Parziale', failed: 'Fallito'
  },
  warning: {
    CALCULATED_READ_ONLY: 'Campo calcolato: applicata solo la lettura.',
    NO_OBJECT_ACCESS: "Manca la lettura sull'oggetto: il campo resterà invisibile."
  },
  skip: {
    NOT_PERMISSIONABLE: 'Campi senza FLS',
    MANAGED_PERMISSION_SET: 'Permission set di pacchetti gestiti',
    GROUP_PERMISSION_SET: 'Permission set group o muting',
    UNKNOWN_FIELD: 'Campi non trovati',
    UNKNOWN_PERMISSION_SET: 'Profili o permission set non trovati',
    NO_CHANGE: 'Già con il valore richiesto'
  },
  tools: { matrix: 'Matrice FLS', apex: 'Classi Apex', layouts: 'Layout e pagine', changeset: 'Change set' },

  app: {
    guide: 'Guida', news: 'Novità', newsUnread: 'Ci sono novità da leggere',
    orgs: 'Org', history: 'Storico', logout: 'Esci',
    openOrgs: 'Org aperte', toolsLabel: 'Strumenti', openObjects: 'Oggetti aperti', openChangeSets: 'Change set aperti',
    closeX: (name: string) => `Chiudi ${name}`,
    openOrg: "Apri un'org",
    allOpen: 'Tutte le org collegate sono già aperte.',
    noOrgs: 'Nessuna org collegata.',
    manageOrgs: 'Collega o gestisci org…',
    newObject: 'Nuovo oggetto',
    apexTab: 'Classi Apex',
    changeSet: 'Change set',
    noOrgOpen: (orgsButton: ReactNode) => <>Nessuna org aperta. Aprine una con <b>+</b> qui sopra o dalla pagina {orgsButton}</>,
    noChangeSetOpen: 'Nessun change set aperto. Si aprono qui quando mandi in anteprima le modifiche della matrice, o dallo Storico.',
    noObjectOpen: 'Nessun oggetto aperto.',
    openObject: 'Apri un oggetto',
    confirmCloseTab: 'Questa scheda ha modifiche non ancora mandate in anteprima. Chiuderla e perderle?',
    confirmCloseOrg: 'In questa org ci sono schede con modifiche non ancora mandate in anteprima. Chiuderla e perderle?'
  },

  guide: {
    title: 'Guida di Orgsmith',
    intro: "Tutto quello che fa Orgsmith, con brevi animazioni. Le novità sono elencate in Novità e rimandano qui.",
    groups: { start: 'Per iniziare', matrix: 'Matrice FLS', tools: 'Altri strumenti', apply: 'Change set ed esportazioni', more: 'Altro' },
    sections: {
      orgs: { title: "Collegare un'org", body: <>Nella pagina <b>Org</b> dai un alias all'org, scegli Produzione, Sandbox o My Domain e accedi con Salesforce: Orgsmith non vede la tua password e agisce con i permessi del tuo utente. Dai a ogni org uno dei 10 <b>colori</b>; l'area di lavoro prende il colore dell'org aperta. <b>Rinnova token</b> rifà l'accesso quando la sessione scade.</> },
      tabs: { title: 'Schede di lavoro', body: <>Le schede sono su tre livelli: le <b>org</b> aperte, lo <b>strumento</b> dell'org attiva (Matrice FLS, Classi Apex, Layout e pagine, Change set) e gli <b>oggetti</b> aperti in quello strumento. Ogni scheda oggetto tiene i suoi filtri e le modifiche in sospeso. <b>Trascina</b> una scheda per spostarla, oppure usa <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>←</kbd>/<kbd>→</kbd>. Il pallino colorato sulla scheda dell'org ne cambia il colore, ↻ rinnova la sessione, il clic centrale chiude una scheda.</> },
      notices: { title: 'Caricamenti lunghi in sottofondo', body: <>I caricamenti continuano anche se cambi scheda. Se lasci una scheda mentre carica una matrice, i layout o esegue un change set, un pannello in basso a destra lo segue e ti dice quando è pronto; <b>Apri</b> ti riporta lì. Quando torni sulla scheda l'avviso sparisce.</> },
      apex: { title: 'Classi Apex', body: <>Quali profili e permission set possono eseguire ogni classe Apex. Funziona come la matrice FLS con due stati, abilitata o no: clic, trascinamento, tasto destro e azioni in blocco, poi anteprima e approvazione. Le classi dei pacchetti gestiti si possono nascondere con un filtro.</> },
      layouts: { title: 'Layout e pagine', body: <>Scegli un oggetto per vedere, per ogni profilo e record type, quale <b>page layout</b> e quale <b>Lightning page</b> riceve (per app, record type e default dell'org), e i campi del layout che il profilo non può leggere. Con <b>Modifica assegnazioni</b> le cambi cella per cella, o tutta una colonna con <b>Tutta la colonna…</b>; le celle cambiate diventano viola. <b>Vai all'anteprima</b> crea un change set, che si applica come quelli FLS. Per le Lightning page la modifica vale per l'app scelta, e togliendo un'assegnazione specifica il profilo torna al default dell'app o dell'org. <b>Desktop</b> e <b>Telefono</b> hanno assegnazioni separate: si passa dall'uno all'altro accanto all'app, e in modifica “Applica ogni modifica a desktop e telefono” cambia entrambi. Se Salesforce rifiuta alcune modifiche, le altre passano comunque e il risultato mostra quanto ha richiesto ogni passo.</> },
      changesets: { title: 'Change set', body: <>Nulla viene scritto finché non confermi. <b>Vai all'anteprima</b> trasforma le modifiche in sospeso in un change set con cosa viene aggiunto, cambiato e tolto, e gli avvisi. In produzione serve un'approvazione e devi scrivere il nome dell'org. L'esecuzione mostra l'avanzamento e il risultato riga per riga.</> },
      export: { title: 'Esportare', body: <>Il pulsante <b>Esporta</b> salva quello che vedi: la matrice in Excel o CSV o come metadata Salesforce (package.xml e un file per profilo e permission set), i change set in Excel, CSV o metadata con i valori che impostano, e i layout in Excel o CSV. Un pannello in basso a destra mostra l'avanzamento dei file grandi.</> },
      history: { title: 'Storico e annullamento', body: <>Lo <b>Storico</b> elenca ogni change set con chi l'ha preparato e approvato, e quando. Ognuno conserva i valori di prima, quindi <b>Annulla queste modifiche</b>, nel change set, crea un change set che li ripristina.</> },
      settings: { title: 'Lingua e sessione', body: <>Scegli English, Italiano, Français o Español dal menu con le bandiere. <b>Esci</b> chiude la sessione di Orgsmith; le org restano collegate.</> }
    }
  },

  news: { title: 'Novità', intro: 'Ogni modifica a Orgsmith, dalla più recente.', seeGuide: 'Vedi nella guida' },

  login: { password: 'Password', wrong: 'Password errata.', submit: 'Entra' },

  history: {
    title: 'Storico modifiche',
    intro: "Ogni change set registra chi l'ha preparato e approvato, quando, e lo stato di prima per poterlo annullare.",
    cols: ['Change set', 'Creato', 'Org', 'Descrizione', 'Modifiche', 'Stato'],
    notApplied: (n: number) => `${n} non applicate`,
    empty: 'Nessun change set ancora.'
  },

  token: {
    renewedAt: (at: string) => `Token rinnovato alle ${at}`,
    renewTitle: 'Rinnova il token di accesso',
    renewOf: (org: string) => `Rinnova il token di ${org}`,
    renewing: 'Rinnovo…',
    renew: 'Rinnova token',
    renewedMsg: (at: string) => `Token di accesso rinnovato alle ${at}.`,
    refused: (detail: string) => `Salesforce non ha rinnovato il token (${detail}). Ricollega l'org con il login.`,
    reconnect: 'Ricollega',
    reconnectNow: (org: string) => `Ricollegare ${org} adesso?`
  },

  orgs: {
    title: 'Org Salesforce',
    intro: "L'app usa OAuth: non vede la tua password e agisce con i permessi del tuo utente Salesforce.",
    connectFailed: (error: string) => `Collegamento non riuscito: ${error}`,
    connected: 'Org collegate',
    none: 'Nessuna org collegata. Collegane una con il modulo qui accanto.',
    alias: 'Alias',
    readAt: (date: string) => ` · letta il ${date}`,
    rename: 'Rinomina', addAlias: 'Aggiungi alias', disconnect: 'Scollega',
    confirmDisconnect: (org: string) => `Scollegare ${org}? Il token salvato verrà eliminato.`,
    connectNew: 'Collega una nuova org',
    aliasPlaceholder: 'es. Acme UAT',
    aliasHelp: "Il nome con cui vedrai questa org nell'app. Utile perché le sandbox hanno lo stesso nome della produzione.",
    environment: 'Ambiente',
    myDomain: 'My Domain',
    permsNeeded: 'Permessi richiesti al tuo utente',
    permManage: 'Manage Profiles and Permission Sets (per modificare)',
    login: 'Accedi con Salesforce'
  },

  changeSet: {
    result: 'Risultato', preview: 'Anteprima modifiche',
    undoes: ' · annulla un change set precedente',
    kpiChanges: 'Modifiche', kpiNew: 'Nuovi accessi', kpiChanged: 'Accessi cambiati', kpiRemoved: 'Accessi rimossi',
    kpiFailed: 'Errori e conflitti', kpiWarnings: 'Con avvisi',
    detail: 'Dettaglio',
    filters: { all: 'Tutte', insert: 'Insert', update: 'Update', delete: 'Delete', warn: 'Con avvisi', failed: 'Errori' },
    cols: ['Profilo / permission set', 'Campo', 'Prima', 'Dopo', 'Operazione', 'Esito'],
    item: { pending: 'Da applicare', ok: 'Applicata', error: 'Errore', conflict: 'Conflitto' },
    noRows: 'Nessuna riga.',
    shown: (n: number, total: number) => `Mostrate ${n} di ${total}.`,
    showMore: 'Mostra altre',
    skipped: 'Escluse automaticamente',
    approval: 'Approvazione', confirmation: 'Conferma', twoStep: '2 step',
    nothing: 'Nessuna modifica da applicare.',
    prodNeedsApproval: 'Org di produzione: il change set va inviato per approvazione prima di essere eseguito.',
    submit: 'Invia per approvazione',
    submittedAt: (date: string) => `Inviato il ${date}. Approvando, l'app ricontrolla lo stato attuale dell'org.`,
    reject: 'Rifiuta', approve: 'Approva',
    conflicts: (n: number) => `${n} righe sono cambiate nell'org dopo l'anteprima: verranno saltate.`,
    noConflicts: "Approvato. Nessun conflitto con lo stato attuale dell'org.",
    typeToConfirm: (org: string) => <>Digita <b>{org}</b> per confermare</>,
    reviewed: (n: number) => `Ho rivisto le ${n} modifiche`,
    apply: (n: number) => `Applica ${n} modifiche`,
    running: 'Applicazione in corso… la pagina si aggiorna da sola.',
    rejected: 'Change set rifiutato. Torna alla matrice per prepararne uno nuovo.',
    allDone: "Tutte le modifiche sono state applicate e verificate rileggendo l'org.",
    partial: (ok: number, failed: number) => `${ok} modifiche applicate, ${failed} non applicate.`,
    rollback: 'Annulla queste modifiche',
    assign: {
      kind: { layout: 'Page layout', page: 'Lightning page' },
      cols: ['Tipo', 'Oggetto', 'App', 'Profilo', 'Record type', 'Prima', 'Dopo', 'Esito'],
      kpiCleared: 'Assegnazioni di pagina rimosse',
      defaultPage: "Default (app o org)",
      master: 'Master'
    },
    timing: {
      title: 'Tempi per passo',
      steps: { 'check org': "Controllo sull'org", check: 'Controllo di profili, pagine e record type', 'read app': "Lettura dell'app", 'save app': "Salvataggio dell'app", 'save profiles': 'Salvataggio dei profili', verify: 'Rilettura per verifica' } as Record<string, string>,
      times: (n: number) => n > 1 ? ` (${n} volte)` : '',
      note: "Salvare un'app vuol dire che Salesforce ridistribuisce tutta l'app: con molte assegnazioni ci mette un po'. Se Salesforce rifiuta alcune modifiche, l'app viene salvata di nuovo per isolarle."
    }
  },

  pick: {
    chosen: (n: number) => n === 1 ? '1 scelto' : `${n} scelti`,
    removeFilter: (label: string) => `Togli il filtro ${label}`,
    search: (label: string) => `Cerca ${label.toLowerCase()}`,
    tickAll: (untick: boolean, n: number, searching: boolean) =>
      `${untick ? 'Togli' : 'Spunta'} ${searching ? `i ${n} risultati` : `tutti (${n})`}`,
    clear: (n: number) => `Svuota (${n})`,
    noResults: 'Nessun risultato.',
    more: (n: number) => `Altri ${n}: affina la ricerca.`
  },

  matrix: {
    title: 'Matrice Field Level Security',
    intro: "Scegli gli oggetti. Clicca una cella per cambiarla, trascina il mouse su più celle per scegliere l'accesso da un menu, oppure seleziona righe e colonne e applica un'azione in blocco. Niente viene scritto finché non confermi l'anteprima.",
    guide: '? Guida',
    removeObject: (o: string) => `Togli ${o}`,
    addObject: 'Aggiungi oggetto (es. Account)',
    sent: (n: string) => `Le modifiche sono nel change set ${n}. Dopo averlo applicato, ricarica la matrice per vedere i valori aggiornati.`,
    reload: 'Ricarica',
    hiddenWarning: 'Non sono riuscito a leggere i campi che il tuo utente non vede, quindi potrebbero mancare. Dettaglio:',
    loading: 'Lettura di campi, profili e FieldPermissions…',
    empty: 'Aggiungi uno o più oggetti per vedere la matrice.',
    fields: 'Campi',
    profilesAndPs: 'Profili e permission set',
    kind: { all: 'Profili e permission set', profiles: 'Solo profili', permsets: 'Solo permission set' },
    quick: { all: 'Tutti', none: 'Non visibili a nessuno', editall: 'Modificabili da tutti', custom: 'Solo custom', pending: 'Con modifiche' },
    selected: (rows: number, cols: number) => <><b>{rows}</b> campi · <b>{cols}</b> profili/permission set selezionati</>,
    bulk: { read: 'Lettura', edit: 'Lettura e modifica', removeEdit: 'Togli la modifica', none: 'Nessun accesso' },
    applyToSelection: 'Applica alla selezione',
    deselect: 'Deseleziona',
    pending: (n: number) => <><b>{n}</b> modifiche in sospeso</>,
    discard: 'Scarta',
    preparing: "Preparo l'anteprima…",
    toPreview: "Vai all'anteprima",
    size: (f: number, c: number) => `${f} campi × ${c} profili/permission set`,
    field: 'Campo',
    allColumns: 'Tutte le colonne',
    profile: 'Profilo',
    permSet: 'Perm. set',
    profileSub: 'profilo',
    counts: (r: number, e: number) => `L ${r} · M ${e}`,
    select: 'seleziona',
    noObjectRead: "Nessuna lettura sull'oggetto",
    objectWarn: 'oggetto',
    hiddenTag: 'Nascosto a te',
    hiddenTagTitle: 'Il tuo utente non vede questo campo: Salesforce non lo restituisce nel describe',
    noFls: 'Senza FLS', readOnly: 'Solo lettura', encrypted: 'Crittografato',
    alwaysTitle: 'Campo senza FLS: sempre visibile',
    always: 'sempre',
    before: (v: string) => ` (prima: ${v})`,
    was: (v: string) => `da ${v}`,
    tooMany: (n: string, max: string) => `Troppe modifiche per un solo change set (${n}, massimo ${max}). Dividile in più change set, per esempio filtrando i profili.`,
    description: (fields: number, ps: number) => `${fields} campi su ${ps} profili/permission set`
  },

  apex: {
    matrix: {
      title: 'Accesso alle classi Apex',
      intro: "Quali profili e permission set possono eseguire ogni classe Apex. Clicca una cella per abilitarla o disabilitarla, trascina su più celle o seleziona righe e colonne per farlo in blocco. Come nella matrice FLS, niente viene scritto finché non confermi l'anteprima.",
      loading: 'Lettura di classi Apex, profili e accessi…',
      fields: 'Classi',
      quick: { all: 'Tutte', none: 'Abilitate per nessuno', editall: 'Abilitate per tutti', custom: 'Senza le classi dei pacchetti', pending: 'Con modifiche' },
      selected: (rows: number, cols: number) => <><b>{rows}</b> classi · <b>{cols}</b> profili/permission set selezionati</>,
      size: (f: number, c: number) => `${f} classi × ${c} profili/permission set`,
      field: 'Classe',
      counts: (r: number, _e: number) => `${r} abilitate`,
      description: (fields: number, ps: number) => `Accesso a ${fields} classi Apex su ${ps} profili/permission set`
    },
    access: { short: ['—', '✓', '✓'], long: ['Disabilitata', 'Abilitata', 'Abilitata'] },
    bulk: { enable: 'Abilita', disable: 'Disabilita' },
    managed: 'Pacchetto',
    sheet: 'Classi Apex'
  },

  loads: {
    open: 'Apri',
    load: { running: 'Caricamento in corso…', done: 'Caricato, pronto da vedere', error: 'Caricamento non riuscito' },
    run: { running: 'Applicazione delle modifiche…', done: 'Esecuzione terminata, vedi il risultato', error: 'Esecuzione non riuscita' }
  },
  accent: {
    color: 'Colore', label: "Colore dell'org", change: "Cambia il colore dell'org",
    names: { ember: 'Brace', amber: 'Ambra', olive: 'Oliva', emerald: 'Smeraldo', cyan: 'Ciano', blue: 'Blu', indigo: 'Indaco', magenta: 'Magenta', sand: 'Sabbia', slate: 'Ardesia' }
  },

  cellMenu: {
    cells: (n: number) => n === 1 ? '1 cella' : `${n} celle`,
    editable: (n: number) => ` · ${n} modificabili`,
    removeEditOnly: 'Togli solo la modifica',
    revert: "Ripristina i valori dell'org",
    clear: 'Annulla selezione'
  },

  layouts: {
    title: 'Layout e Lightning page',
    intro: 'Per ogni oggetto: quale page layout e quale Lightning page vede ogni profilo, per record type. Con Modifica assegnazioni puoi cambiarle: le modifiche passano da anteprima e approvazione, come quelle FLS.',
    changeObject: 'Cambia oggetto',
    chooseObject: 'Scegli un oggetto (es. Account)',
    pageLayout: 'Page layout',
    lightningPage: 'Lightning page',
    loadingLayouts: 'Lettura di layout e assegnazioni…',
    loadingPages: 'Lettura di Lightning page e assegnazioni…',
    empty: 'Scegli un oggetto per vedere layout e Lightning page.',
    profiles: 'Profili', recordType: 'Record type', layout: 'Layout',
    onlyGaps: 'Solo con campi non leggibili',
    onlySpecific: 'Solo con assegnazione specifica',
    resetFilters: 'Azzera filtri',
    kpiLayouts: 'Page layout', kpiUnassigned: 'Non assegnati', kpiProfiles: 'Profili',
    kpiGaps: 'Profili con campi non leggibili', kpiNoAccess: "Senza accesso all'oggetto",
    assignments: 'Assegnazioni per profilo e record type',
    profile: 'Profilo',
    inactive: ' (inattivo)',
    noObjectAccess: "Nessun accesso all'oggetto",
    unreadable: (n: number) => n === 1 ? '1 campo non leggibile' : `${n} campi non leggibili`,
    noProfiles: 'Nessun profilo.',
    gapNote: '"Campi non leggibili": campi presenti nel layout su cui il profilo, da solo, non ha la FLS di lettura. Gli utenti li vedono solo se un permission set glieli concede.',
    objectLayouts: "Page layout dell'oggetto",
    layoutCols: ['Layout', 'Campi', 'Profili assegnati', 'Stato'],
    showLayoutProfiles: 'Mostra i profili che usano questo layout',
    inUse: 'In uso',
    unassignedOne: 'Non assegnato',
    source: { 'app-profile': 'App, record type e profilo', app: "Default dell'app", org: "Default dell'org", system: 'Pagina di sistema' },
    kpiPages: 'Lightning page', kpiPagesUnassigned: 'Non assegnate', kpiApps: 'App Lightning',
    kpiAssignments: 'Assegnazioni app, record type e profilo', kpiOrgDefault: "Default dell'org",
    systemPage: 'Pagina di sistema',
    perProfile: 'Pagina vista da ogni profilo',
    defaults: (app: ReactNode, org: ReactNode) => <>Default dell'app: <b>{app}</b>. Default dell'org: <b>{org}</b>.</>,
    systemPageLower: 'pagina di sistema',
    orgDefault: "Default dell'org",
    appDefault: (app: string) => `Default di ${app}`,
    assignedIn: (n: number, app: string) => `${n} profili/record type in ${app}`,
    objectPages: "Lightning page dell'oggetto",
    pageCols: ['Pagina', 'Componenti', 'Campi Dynamic Forms', 'Dove è assegnata'],
    showPageProfiles: 'Mostra i profili che vedono questa pagina',
    pageUnassigned: 'Non assegnata',
    noPages: 'Nessuna Lightning record page per questo oggetto.',
    edit: 'Modifica assegnazioni', editDone: 'Fine modifica',
    finishFirst: "Prima scarta le modifiche o vai all'anteprima.",
    setColumn: 'Tutta la colonna…',
    noSpecific: "(nessuna: default dell'app o dell'org)",
    device: 'Dispositivo',
    formFactor: { Large: 'Desktop', Small: 'Telefono' },
    appNotOn: (app: string, device: string) => `${app} non è abilitata su ${device}: queste assegnazioni lì non hanno effetto.`,
    mirror: 'Applica ogni modifica a desktop e telefono',
    noFullName: 'Salesforce non ha restituito il nome metadata di questo profilo: non si può modificare.',
    layoutEditHint: "Le celle cambiate sono evidenziate. Niente viene scritto finché non confermi l'anteprima.",
    pageEditHint: "Le modifiche valgono per l'app scelta. Togliendo un'assegnazione specifica il profilo torna al default dell'app o dell'org.",
    pending: (n: number) => n === 1 ? '1 assegnazione in sospeso' : `${n} assegnazioni in sospeso`,
    discard: 'Scarta', toPreview: "Vai all'anteprima", preparing: 'Preparo…',
    description: (n: number, object: string) => n === 1 ? `1 assegnazione su ${object}` : `${n} assegnazioni su ${object}`,
    sent: (n: string) => `Le modifiche sono nel change set ${n}. Dopo averlo applicato, ricarica per vedere le nuove assegnazioni.`,
    reload: 'Ricarica'
  },

  export: {
    button: 'Esporta', preparing: 'Genero…',
    generating: (what: string) => `Genero ${what}`,
    ready: (what: string) => `${what} pronto, il download è partito`,
    failed: (what: string) => `Non sono riuscito a generare ${what}`,
    stage: { collect: 'Raccolgo i dati', write: 'Scrivo il file', compress: 'Impacchetto il file' },
    keepOpen: 'Puoi continuare a lavorare, basta non chiudere la pagina.',
    excel: 'Excel (.xlsx)', excelHint: 'Matrice e una riga per campo e profilo',
    csvGrid: 'CSV, come a schermo', csvLong: 'CSV, una riga per campo e profilo',
    metadata: 'Metadata Salesforce (.zip)', metadataHint: 'Profili e permission set da distribuire con sf o da tenere in Git',
    metadataChangeSetHint: 'package.xml e gli XML di ogni profilo e permission set, con i valori impostati da questo change set (tutte le righe)',
    csv: 'CSV',
    scope: (f: number, c: number) => `${f} campi × ${c} profili/permission set, con i filtri attuali.`,
    rowsScope: (n: number) => `${n} righe, con i filtri attuali.`,
    pending: (n: number) => n === 1 ? 'Include 1 modifica in sospeso.' : `Include ${n} modifiche in sospeso.`,
    leftOut: (profiles: number, locked: number) => [
      profiles ? `${profiles} profili esclusi: Salesforce non ha restituito il loro nome metadata.` : '',
      locked ? `${locked} permission set gestiti o di gruppo esclusi: non si possono distribuire.` : ''
    ].filter(Boolean).join(' '),
    leftOutRows: (n: number) => `${n} righe escluse: Salesforce non ha restituito il nome metadata del loro profilo o permission set.`,
    nothing: 'Niente da esportare con i filtri attuali.',
    sheetMatrix: 'Matrice', sheetDetails: 'Dettaglio', sheetAssignments: 'Assegnazioni', sheetLayouts: 'Layout', sheetPages: 'Pagine', sheetChanges: 'Modifiche',
    object: 'Oggetto', field: 'Campo', apiName: 'Nome API', type: 'Tipo', kind: 'Profilo o permission set', name: 'Nome', read: 'Lettura', edit: 'Modifica',
    profile: 'Profilo', permSet: 'Permission set', warnings: 'Avvisi', error: 'Errore', source: 'Origine'
  },

  help: {
    title: 'Come funziona la matrice FLS',
    menuCells: (n: number) => `${n} celle`,
    menuCell: '1 cella',
    flow: ['Matrice', 'Anteprima', 'Approvazione', 'Applicato'],
    flowNote: "L'approvazione serve solo in produzione",
    pickPill: 'Profili: 2 scelti',
    sections: {
      read: {
        title: 'Leggere la matrice',
        body: <>Ogni riga è un campo, ogni colonna un profilo o permission set. In testa alla colonna, <b>L</b> e <b>M</b> contano i campi leggibili e modificabili. Le celle tratteggiate non si possono cambiare: campi senza FLS, permission set di pacchetti gestiti, gruppi e muting. "Nascosto a te" indica un campo che il tuo utente non vede.</>
      },
      click: {
        title: 'Cambiare una cella',
        body: <>Un clic fa girare la cella: nessun accesso, lettura, lettura e modifica. I campi formula e di sola lettura passano solo tra nessun accesso e lettura. La cella cambiata diventa viola e ricorda il valore di prima.</>
      },
      drag: {
        title: 'Selezionare più celle trascinando',
        body: <>Tieni premuto il mouse su una cella e trascina: quando lo rilasci si apre un menu per scegliere l'accesso di tutto il blocco. Vicino ai bordi la tabella scorre da sola. Con <kbd>Shift</kbd> + clic allarghi la selezione fino a un'altra cella, con <kbd>Esc</kbd> la annulli. Dal menu puoi anche ripristinare i valori dell'org.</>
      },
      right: {
        title: 'Menu con il tasto destro',
        body: <>Il tasto destro apre lo stesso menu sulla cella sotto il mouse, o su tutta la selezione se la cella ne fa parte.</>
      },
      bulk: {
        title: 'Azioni in blocco su righe e colonne',
        body: <>Spunta i campi a sinistra e i profili in testa alle colonne, scegli l'azione nella barra arancione e premi <b>Applica alla selezione</b>. L'azione vale per tutti gli incroci, anche fuori dallo schermo. "Tutte le colonne" seleziona le colonne filtrate.</>
      },
      filter: {
        title: 'Cercare e filtrare',
        body: <>I filtri <b>Campi</b> e <b>Profili e permission set</b> si aprono con un clic: cerca, poi spunta solo i risultati che ti servono. Se cerchi "sales" e trovi tre profili, puoi tenerne due. <b>Spunta i risultati</b> li prende tutti, <b>Svuota</b> o la × tolgono il filtro, e nessuna spunta vuol dire tutti. Ci sono anche i filtri rapidi: campi non visibili a nessuno, modificabili da tutti, solo custom, o con modifiche in sospeso. I conteggi in testa alle colonne seguono i filtri.</>
      },
      export: {
        title: 'Esportare',
        body: <><b>Esporta</b> salva quello che vedi: i campi e i profili filtrati, comprese le modifiche in sospeso. L'<b>Excel</b> ha due fogli, la matrice come a schermo e una riga per campo e profilo; i due <b>CSV</b> hanno le stesse forme. I <b>Metadata Salesforce</b> sono uno zip con package.xml e un file per profilo e permission set, pronto per <code>sf project deploy</code> o per Git; i permission set gestiti o di gruppo restano fuori. Mentre il file viene generato il pulsante è bloccato e un pannello in basso a destra mostra l'avanzamento, così puoi continuare a lavorare. Anche i change set e Layout e pagine hanno il loro pulsante Esporta.</>
      },
      flow: {
        title: "Dall'anteprima a Salesforce",
        body: <>Nulla viene scritto finché non confermi. <b>Vai all'anteprima</b> crea un change set con le modifiche in sospeso e lo apre in una scheda. In produzione serve un'approvazione e devi scrivere il nome dell'org. Ogni change set si può annullare dallo Storico.</>
      }
    }
  }
};
