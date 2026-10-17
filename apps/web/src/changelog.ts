import type { Lang } from './i18n.tsx';

/**
 * What changed in OrgFox, newest first. Every change users can see (above all UI and UX) gets an entry here
 * and an update to the guide, in all four languages. `guide` links to a guide section, `demo` shows its animation.
 */
export type ChangeDemo = 'orgs' | 'layouts' | 'tabs' | 'load' | 'apex' | 'drag' | 'filter' | 'export' | 'flow' | 'views' | 'paint';
export interface ChangeEntry {
  date: string;
  prs: number[];
  guide?: string;
  demo?: ChangeDemo;
  text: Record<Lang, { title: string; body: string }>;
}

export const CHANGELOG: ChangeEntry[] = [
  {
    date: '2026-10-17', prs: [31], guide: 'changesets',
    text: {
      en: { title: 'Runs survive a server restart', body: 'If the server restarts while a change set is being applied, OrgFox picks it up again as soon as it starts. It reads the org to recognise the rows already written, applies only the others, and the change set says it was resumed.' },
      it: { title: 'Le esecuzioni sopravvivono a un riavvio del server', body: 'Se il server si riavvia mentre un change set viene applicato, OrgFox lo riprende appena riparte. Rilegge l’org per riconoscere le righe già scritte, applica solo le altre e il change set indica che è stato ripreso.' },
      fr: { title: 'Les exécutions survivent à un redémarrage du serveur', body: 'Si le serveur redémarre pendant l’application d’un change set, OrgFox le reprend dès son démarrage. Il relit l’org pour reconnaître les lignes déjà écrites, n’applique que les autres, et le change set indique qu’il a été repris.' },
      es: { title: 'Las ejecuciones sobreviven a un reinicio del servidor', body: 'Si el servidor se reinicia mientras se aplica un change set, OrgFox lo retoma en cuanto arranca. Relee la org para reconocer las filas ya escritas, aplica solo las demás y el change set indica que se retomó.' }
    }
  },
  {
    date: '2026-10-17', prs: [30],
    text: {
      en: { title: 'OrgFox', body: 'Orgsmith is now OrgFox: same app, same features, a new name that is easier to remember and a fox mascot. Exported files now start with orgfox-.' },
      it: { title: 'OrgFox', body: 'Orgsmith ora si chiama OrgFox: stessa app, stesse funzioni, un nome più facile da ricordare e una volpe come mascotte. I file esportati ora iniziano con orgfox-.' },
      fr: { title: 'OrgFox', body: 'Orgsmith s’appelle maintenant OrgFox : même application, mêmes fonctions, un nom plus facile à retenir et un renard pour mascotte. Les fichiers exportés commencent maintenant par orgfox-.' },
      es: { title: 'OrgFox', body: 'Orgsmith ahora se llama OrgFox: la misma app, las mismas funciones, un nombre más fácil de recordar y un zorro como mascota. Los archivos exportados ahora empiezan por orgfox-.' }
    }
  },
  {
    date: '2026-10-16', prs: [29], guide: 'layoutViews', demo: 'paint',
    text: {
      en: { title: 'Brush and board for layout assignments', body: 'Layouts and pages has two new views. Brush gives each layout or Lightning page a colour: pick one and paint cells, whole rows or columns. Board shows one column per layout and one card per profile, to drag from one to another. Choose them from View or Settings.' },
      it: { title: 'Pennello e bacheca per le assegnazioni dei layout', body: 'Layout e pagine ha due nuove viste. Pennello dà a ogni layout o Lightning page un colore: scegline uno e colora celle, righe o colonne intere. Bacheca mostra una colonna per layout e una scheda per profilo, da trascinare da una all’altra. Le scegli da Vista o da Impostazioni.' },
      fr: { title: 'Pinceau et colonnes pour les attributions de présentations', body: 'Présentations et pages a deux nouvelles vues. Pinceau donne une couleur à chaque présentation ou page Lightning : choisissez-en une et peignez des cellules, des lignes ou des colonnes entières. Colonnes affiche une colonne par présentation et une carte par profil, à faire glisser de l’une à l’autre. Choisissez-les dans Vue ou Paramètres.' },
      es: { title: 'Pincel y tablero para las asignaciones de formatos', body: 'Formatos y páginas tiene dos vistas nuevas. Pincel da a cada formato o página Lightning un color: elige uno y pinta celdas, filas o columnas enteras. Tablero muestra una columna por formato y una tarjeta por perfil, para arrastrarlas de una a otra. Elígelas en Vista o en Ajustes.' }
    }
  },
  {
    date: '2026-10-16', prs: [29], guide: 'views', demo: 'views',
    text: {
      en: { title: 'Four views of the permission matrix, and Settings', body: 'The FLS matrix and Apex classes can now be shown four ways: Grid, Focus (one profile or field at a time with None, Read and Edit buttons, and compare), Map (small coloured squares, many more columns on screen, keyboard shortcuts) and Rules (write the change as a sentence and see how many cells change). Switch from the View menu or the new Settings page.' },
      it: { title: 'Quattro viste della matrice dei permessi, e Impostazioni', body: 'La matrice FLS e le classi Apex ora si vedono in quattro modi: Griglia, Focus (un profilo o un campo alla volta con i pulsanti Nessuno, Lettura e Modifica, e il confronto), Mappa (quadratini colorati, molte più colonne a schermo, scorciatoie da tastiera) e Regole (scrivi la modifica come una frase e vedi quante celle cambiano). Cambi vista dal menu Vista o dalla nuova pagina Impostazioni.' },
      fr: { title: 'Quatre vues de la matrice des autorisations, et Paramètres', body: 'La matrice FLS et les classes Apex s’affichent maintenant de quatre façons : Grille, Focus (un profil ou un champ à la fois avec les boutons Aucun, Lecture et Modification, et la comparaison), Carte (petits carrés colorés, bien plus de colonnes à l’écran, raccourcis clavier) et Règles (écrivez la modification comme une phrase et voyez combien de cellules changent). Changez de vue avec le menu Vue ou la nouvelle page Paramètres.' },
      es: { title: 'Cuatro vistas de la matriz de permisos, y Ajustes', body: 'La matriz FLS y las clases Apex ahora se ven de cuatro formas: Cuadrícula, Foco (un perfil o un campo a la vez con los botones Ninguno, Lectura y Edición, y comparación), Mapa (cuadraditos de color, muchas más columnas en pantalla, atajos de teclado) y Reglas (escribe el cambio como una frase y ve cuántas celdas cambian). Cambia de vista en el menú Vista o en la nueva página Ajustes.' }
    }
  },
  {
    date: '2026-10-16', prs: [28], guide: 'layouts',
    text: {
      en: { title: 'Lightning pages on desktop and phone', body: 'Lightning page assignments now show and change desktop and phone separately, or both at once. If Salesforce refuses an assignment, only that row fails and the others are saved; the result shows how long each step took.' },
      it: { title: 'Lightning page su desktop e telefono', body: 'Le assegnazioni delle Lightning page ora si vedono e si cambiano separatamente per desktop e telefono, o per entrambi insieme. Se Salesforce rifiuta un’assegnazione, fallisce solo quella riga e le altre vengono salvate; il risultato mostra quanto ha richiesto ogni passo.' },
      fr: { title: 'Pages Lightning sur ordinateur et téléphone', body: 'Les attributions de pages Lightning s’affichent et se modifient séparément pour l’ordinateur et le téléphone, ou les deux à la fois. Si Salesforce refuse une attribution, seule cette ligne échoue et les autres sont enregistrées ; le résultat indique la durée de chaque étape.' },
      es: { title: 'Páginas Lightning en escritorio y teléfono', body: 'Las asignaciones de páginas Lightning ahora se ven y se cambian por separado para escritorio y teléfono, o para ambos a la vez. Si Salesforce rechaza una asignación, solo falla esa fila y las demás se guardan; el resultado muestra cuánto tardó cada paso.' }
    }
  },
  {
    date: '2026-10-16', prs: [27], guide: 'layouts', demo: 'layouts',
    text: {
      en: { title: 'Edit page layout and Lightning page assignments', body: 'In Layouts and pages, Edit assignments lets you pick the layout or Lightning page of each profile and record type, one cell or a whole column at a time. The changes become a change set with preview, approval in production, a check against the org before writing, and Undo.' },
      it: { title: 'Modifica delle assegnazioni di page layout e Lightning page', body: 'In Layout e pagine, Modifica assegnazioni ti fa scegliere il layout o la Lightning page di ogni profilo e record type, una cella o tutta una colonna alla volta. Le modifiche diventano un change set con anteprima, approvazione in produzione, controllo sull’org prima di scrivere e annullamento.' },
      fr: { title: 'Modifier les attributions de présentations et de pages Lightning', body: 'Dans Présentations et pages, Modifier les attributions permet de choisir la présentation ou la page Lightning de chaque profil et type d’enregistrement, une cellule ou toute une colonne à la fois. Les modifications deviennent un change set avec aperçu, approbation en production, vérification de l’org avant l’écriture et annulation.' },
      es: { title: 'Editar asignaciones de formatos y páginas Lightning', body: 'En Formatos y páginas, Editar asignaciones te deja elegir el formato o la página Lightning de cada perfil y tipo de registro, una celda o toda una columna a la vez. Los cambios se convierten en un change set con vista previa, aprobación en producción, comprobación de la org antes de escribir y opción de deshacer.' }
    }
  },
  {
    date: '2026-10-16', prs: [26], guide: 'orgs',
    text: {
      en: { title: 'Guide and What’s new', body: 'A guide to the whole app and this page with every change, linked to the guide. A dot on What’s new tells you when something new arrives.' },
      it: { title: 'Guida e Novità', body: 'Una guida a tutta l’app e questa pagina con ogni modifica, collegata alla guida. Un pallino su Novità ti avvisa quando arriva qualcosa di nuovo.' },
      fr: { title: 'Guide et Nouveautés', body: 'Un guide de toute l’application et cette page avec chaque changement, reliée au guide. Un point sur Nouveautés vous prévient quand il y a du nouveau.' },
      es: { title: 'Guía y Novedades', body: 'Una guía de toda la app y esta página con cada cambio, enlazada a la guía. Un punto en Novedades te avisa cuando llega algo nuevo.' }
    }
  },
  {
    date: '2026-10-16', prs: [25], guide: 'tabs', demo: 'tabs',
    text: {
      en: { title: 'Reorder tabs', body: 'Drag org tabs and object tabs to change their order; a bar shows where they will land. Ctrl+Shift+←/→ moves the focused tab. The order is kept after a reload.' },
      it: { title: 'Riordinare le schede', body: 'Trascina le schede delle org e degli oggetti per cambiarne l’ordine; una barra mostra dove finiranno. Ctrl+Shift+←/→ sposta la scheda selezionata. L’ordine resta dopo un ricaricamento.' },
      fr: { title: 'Réorganiser les onglets', body: 'Faites glisser les onglets d’org et d’objet pour changer leur ordre ; une barre montre où ils arriveront. Ctrl+Maj+←/→ déplace l’onglet sélectionné. L’ordre est conservé après un rechargement.' },
      es: { title: 'Reordenar las pestañas', body: 'Arrastra las pestañas de org y de objeto para cambiar su orden; una barra muestra dónde quedarán. Ctrl+Mayús+←/→ mueve la pestaña seleccionada. El orden se mantiene al recargar.' }
    }
  },
  {
    date: '2026-10-16', prs: [24], guide: 'export',
    text: {
      en: { title: 'Change set as Salesforce metadata', body: 'Every change set can be exported as a zip with package.xml and one XML per profile and permission set it touches, ready for sf or Git.' },
      it: { title: 'Change set come metadata Salesforce', body: 'Ogni change set si può esportare come zip con il package.xml e un XML per ogni profilo e permission set che tocca, pronto per sf o per Git.' },
      fr: { title: 'Change set en métadonnées Salesforce', body: 'Chaque change set peut être exporté en zip avec package.xml et un XML par profil et ensemble d’autorisations concerné, prêt pour sf ou Git.' },
      es: { title: 'Change set como metadatos de Salesforce', body: 'Cada change set se puede exportar como zip con package.xml y un XML por cada perfil y conjunto de permisos que toca, listo para sf o Git.' }
    }
  },
  {
    date: '2026-10-16', prs: [23], guide: 'notices', demo: 'load',
    text: {
      en: { title: 'Notices for slow loads', body: 'Start loading a matrix, layouts or a change set run, then switch tab: a panel at the bottom right follows it and tells you when it is ready, with a button to go back.' },
      it: { title: 'Avvisi per i caricamenti lunghi', body: 'Avvia il caricamento di una matrice, dei layout o l’esecuzione di un change set, poi cambia scheda: un pannello in basso a destra lo segue e ti dice quando è pronto, con un pulsante per tornarci.' },
      fr: { title: 'Avis pour les chargements longs', body: 'Lancez le chargement d’une matrice, des présentations ou l’exécution d’un change set, puis changez d’onglet : un panneau en bas à droite le suit et vous prévient quand c’est prêt, avec un bouton pour y revenir.' },
      es: { title: 'Avisos para las cargas largas', body: 'Inicia la carga de una matriz, de los formatos o la ejecución de un change set y cambia de pestaña: un panel abajo a la derecha la sigue y te avisa cuando está lista, con un botón para volver.' }
    }
  },
  {
    date: '2026-10-16', prs: [22, 23], guide: 'orgs', demo: 'orgs',
    text: {
      en: { title: 'A colour for each org', body: 'Pick one of 10 colours for each org, on the Orgs page or from the dot on its tab. The work area takes that colour, so production and sandboxes are hard to mix up.' },
      it: { title: 'Un colore per ogni org', body: 'Scegli uno di 10 colori per ogni org, nella pagina Org o dal pallino sulla sua scheda. L’area di lavoro prende quel colore, così produzione e sandbox non si confondono.' },
      fr: { title: 'Une couleur par org', body: 'Choisissez une des 10 couleurs pour chaque org, sur la page Org ou depuis le point de son onglet. L’espace de travail prend cette couleur, pour ne pas confondre production et sandbox.' },
      es: { title: 'Un color para cada org', body: 'Elige uno de 10 colores para cada org, en la página Org o desde el punto de su pestaña. El área de trabajo toma ese color, así producción y sandbox no se confunden.' }
    }
  },
  {
    date: '2026-10-16', prs: [21, 22], guide: 'apex', demo: 'apex',
    text: {
      en: { title: 'Apex class access', body: 'A new Apex classes tool shows which profiles and permission sets can run each class, and lets you enable or disable them in bulk, with the same preview and approval as fields.' },
      it: { title: 'Accesso alle classi Apex', body: 'Il nuovo strumento Classi Apex mostra quali profili e permission set possono eseguire ogni classe e permette di abilitarle o disabilitarle in blocco, con la stessa anteprima e approvazione dei campi.' },
      fr: { title: 'Accès aux classes Apex', body: 'Le nouvel outil Classes Apex montre quels profils et ensembles d’autorisations peuvent exécuter chaque classe, et permet de les activer ou désactiver en masse, avec le même aperçu et la même approbation que les champs.' },
      es: { title: 'Acceso a las clases Apex', body: 'La nueva herramienta Clases Apex muestra qué perfiles y conjuntos de permisos pueden ejecutar cada clase y permite activarlas o desactivarlas en bloque, con la misma vista previa y aprobación que los campos.' }
    }
  },
  {
    date: '2026-10-16', prs: [18, 19, 20], guide: 'export', demo: 'export',
    text: {
      en: { title: 'Export to Excel, CSV and metadata', body: 'Export the matrix, change sets and layouts to Excel or CSV, and the matrix as Salesforce metadata. Big files are built with a progress panel and the button stays locked meanwhile.' },
      it: { title: 'Esportare in Excel, CSV e metadata', body: 'Esporta la matrice, i change set e i layout in Excel o CSV, e la matrice come metadata Salesforce. I file grandi mostrano un pannello di avanzamento e il pulsante resta bloccato nel frattempo.' },
      fr: { title: 'Export Excel, CSV et métadonnées', body: 'Exportez la matrice, les change sets et les présentations en Excel ou CSV, et la matrice en métadonnées Salesforce. Les gros fichiers affichent un panneau de progression et le bouton reste bloqué pendant ce temps.' },
      es: { title: 'Exportar a Excel, CSV y metadatos', body: 'Exporta la matriz, los change sets y los formatos a Excel o CSV, y la matriz como metadatos de Salesforce. Los archivos grandes muestran un panel de progreso y el botón queda bloqueado mientras tanto.' }
    }
  },
  {
    date: '2026-10-16', prs: [15, 16, 17], guide: 'settings',
    text: {
      en: { title: 'Four languages', body: 'The app speaks English, Italian, French and Spanish. Pick the language from the menu with the flags at the top right.' },
      it: { title: 'Quattro lingue', body: 'L’app parla inglese, italiano, francese e spagnolo. Scegli la lingua dal menu con le bandiere in alto a destra.' },
      fr: { title: 'Quatre langues', body: 'L’application parle anglais, italien, français et espagnol. Choisissez la langue dans le menu avec les drapeaux en haut à droite.' },
      es: { title: 'Cuatro idiomas', body: 'La app habla inglés, italiano, francés y español. Elige el idioma en el menú con las banderas arriba a la derecha.' }
    }
  },
  {
    date: '2026-10-16', prs: [14], guide: 'filter', demo: 'filter',
    text: {
      en: { title: 'Filters you tick', body: 'Field and profile filters open a list: search, then tick only the results you want.' },
      it: { title: 'Filtri da spuntare', body: 'I filtri di campi e profili aprono una lista: cerca, poi spunta solo i risultati che ti servono.' },
      fr: { title: 'Filtres à cocher', body: 'Les filtres de champs et de profils ouvrent une liste : cherchez, puis cochez seulement les résultats voulus.' },
      es: { title: 'Filtros para marcar', body: 'Los filtros de campos y perfiles abren una lista: busca y marca solo los resultados que necesitas.' }
    }
  },
  {
    date: '2026-10-16', prs: [13], guide: 'drag', demo: 'drag',
    text: {
      en: { title: 'Select cells by dragging', body: 'Drag over the matrix to pick a block of cells and choose the access from a menu, or right-click a cell. An animated guide explains the matrix.' },
      it: { title: 'Selezionare celle trascinando', body: 'Trascina sulla matrice per prendere un blocco di celle e scegliere l’accesso da un menu, oppure usa il tasto destro su una cella. Una guida animata spiega la matrice.' },
      fr: { title: 'Sélectionner des cellules en glissant', body: 'Glissez sur la matrice pour prendre un bloc de cellules et choisir l’accès dans un menu, ou faites un clic droit sur une cellule. Un guide animé explique la matrice.' },
      es: { title: 'Seleccionar celdas arrastrando', body: 'Arrastra sobre la matriz para tomar un bloque de celdas y elegir el acceso en un menú, o haz clic derecho en una celda. Una guía animada explica la matriz.' }
    }
  },
  {
    date: '2026-10-16', prs: [11, 12], guide: 'tabs',
    text: {
      en: { title: 'Tabs on three levels and token refresh', body: 'Tabs go org, then tool, then object, each keeping its own filters and pending changes. The ↻ button on the org tab renews its Salesforce session.' },
      it: { title: 'Schede su tre livelli e rinnovo del token', body: 'Le schede vanno per org, poi strumento, poi oggetto, e ognuna tiene i suoi filtri e le modifiche in sospeso. Il pulsante ↻ sulla scheda dell’org rinnova la sessione Salesforce.' },
      fr: { title: 'Onglets sur trois niveaux et renouvellement du jeton', body: 'Les onglets vont par org, puis outil, puis objet, chacun avec ses filtres et ses changements en attente. Le bouton ↻ de l’onglet d’org renouvelle la session Salesforce.' },
      es: { title: 'Pestañas en tres niveles y renovación del token', body: 'Las pestañas van por org, luego herramienta, luego objeto, y cada una guarda sus filtros y cambios pendientes. El botón ↻ de la pestaña de la org renueva la sesión de Salesforce.' }
    }
  },
  {
    date: '2026-10-15', prs: [9, 10],
    text: {
      en: { title: 'Orgsmith', body: 'New name and look, and work tabs to keep several orgs and objects open at once.' },
      it: { title: 'Orgsmith', body: 'Nuovo nome e nuovo aspetto, e schede di lavoro per tenere aperte più org e più oggetti insieme.' },
      fr: { title: 'Orgsmith', body: 'Nouveau nom et nouvelle apparence, et des onglets de travail pour garder plusieurs orgs et objets ouverts.' },
      es: { title: 'Orgsmith', body: 'Nuevo nombre y nuevo aspecto, y pestañas de trabajo para tener abiertas varias orgs y objetos a la vez.' }
    }
  },
  {
    date: '2026-10-15', prs: [6, 8], guide: 'layouts',
    text: {
      en: { title: 'Layouts and pages', body: 'For each object, see which page layout and Lightning page each profile gets, per record type, and the fields on a layout the profile cannot read. Read only for now.' },
      it: { title: 'Layout e pagine', body: 'Per ogni oggetto vedi quale page layout e quale Lightning page ha ogni profilo, per record type, e i campi del layout che il profilo non può leggere. Per ora in sola lettura.' },
      fr: { title: 'Présentations et pages', body: 'Pour chaque objet, voyez quelle présentation et quelle page Lightning a chaque profil, par type d’enregistrement, et les champs de la présentation que le profil ne peut pas lire. En lecture seule pour l’instant.' },
      es: { title: 'Formatos y páginas', body: 'Para cada objeto, ve qué formato de página y qué página Lightning tiene cada perfil, por tipo de registro, y los campos del formato que el perfil no puede leer. Solo lectura por ahora.' }
    }
  },
  {
    date: '2026-10-15', prs: [5, 7], guide: 'read',
    text: {
      en: { title: 'Fields hidden from you', body: 'Fields your own user cannot see are listed too, marked "hidden from you", so nothing goes missing from the matrix.' },
      it: { title: 'Campi nascosti a te', body: 'Anche i campi che il tuo utente non vede sono in elenco, segnati come "nascosto a te", così dalla matrice non manca nulla.' },
      fr: { title: 'Champs masqués pour vous', body: 'Les champs que votre utilisateur ne voit pas sont aussi listés, marqués « masqué pour vous », pour que rien ne manque dans la matrice.' },
      es: { title: 'Campos ocultos para ti', body: 'Los campos que tu usuario no ve también aparecen, marcados como "oculto para ti", para que no falte nada en la matriz.' }
    }
  },
  {
    date: '2026-10-14', prs: [1, 2, 3, 4], guide: 'changesets', demo: 'flow',
    text: {
      en: { title: 'First version', body: 'Connect Salesforce orgs with OAuth and an alias, read field level security as a matrix of fields by profiles and permission sets, change it in bulk, check the preview, get approval in production, apply it and undo it from History. Large orgs scroll smoothly.' },
      it: { title: 'Prima versione', body: 'Collega le org Salesforce con OAuth e un alias, leggi la field level security come matrice di campi per profili e permission set, cambiala in blocco, controlla l’anteprima, fai approvare in produzione, applica e annulla dallo Storico. Anche le org grandi scorrono fluide.' },
      fr: { title: 'Première version', body: 'Connectez les orgs Salesforce via OAuth avec un alias, lisez la sécurité au niveau du champ comme une matrice champs × profils et ensembles d’autorisations, modifiez-la en masse, vérifiez l’aperçu, faites approuver en production, appliquez et annulez depuis l’Historique. Les grandes orgs défilent sans à-coups.' },
      es: { title: 'Primera versión', body: 'Conecta orgs de Salesforce con OAuth y un alias, lee la seguridad a nivel de campo como matriz de campos por perfiles y conjuntos de permisos, cámbiala en bloque, revisa la vista previa, pide aprobación en producción, aplica y deshaz desde el Historial. Las orgs grandes se desplazan con fluidez.' }
    }
  }
];

/** Entries count as new until the user opens the page; the newest date seen is kept in the browser. */
export const LATEST = CHANGELOG[0]!.date + ':' + CHANGELOG.length;
