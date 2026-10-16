import type { ReactNode } from 'react';
import type { Messages } from './en.tsx';

export const fr: Messages = {
  locale: 'fr-FR',
  language: 'Langue',
  common: {
    close: 'Fermer', cancel: 'Annuler', save: 'Enregistrer', open: 'Ouvrir', loading: 'Chargement…',
    sandbox: 'Sandbox', production: 'Production', all: 'tous', none: 'aucune'
  },
  access: {
    short: ['—', 'L', 'L+M'],
    long: ['Aucun accès', 'Lecture', 'Lecture et modification'],
    pending: 'Modification en attente',
    locked: 'Non modifiable'
  },
  status: {
    draft: 'Brouillon', pending_approval: "En attente d'approbation", approved: 'Approuvé', rejected: 'Refusé',
    running: 'En cours', done: 'Terminé', partial: 'Partiel', failed: 'Échec'
  },
  warning: {
    CALCULATED_READ_ONLY: 'Champ calculé : seule la lecture a été appliquée.',
    NO_OBJECT_ACCESS: "Pas d'accès en lecture à l'objet : le champ restera invisible."
  },
  skip: {
    NOT_PERMISSIONABLE: 'Champs sans FLS',
    MANAGED_PERMISSION_SET: 'Ensembles d’autorisations de packages gérés',
    GROUP_PERMISSION_SET: 'Groupes d’ensembles d’autorisations ou masquage',
    UNKNOWN_FIELD: 'Champs introuvables',
    UNKNOWN_PERMISSION_SET: 'Profils ou ensembles d’autorisations introuvables',
    NO_CHANGE: 'Déjà à la valeur demandée'
  },
  tools: { matrix: 'Matrice FLS', apex: 'Classes Apex', layouts: 'Présentations et pages', changeset: 'Change sets' },

  app: {
    guide: 'Guide', news: 'Nouveautés', newsUnread: 'Nouveautés à lire',
    orgs: 'Orgs', history: 'Historique', logout: 'Déconnexion',
    openOrgs: 'Orgs ouvertes', toolsLabel: 'Outils', openObjects: 'Objets ouverts', openChangeSets: 'Change sets ouverts',
    closeX: (name: string) => `Fermer ${name}`,
    openOrg: 'Ouvrir une org',
    allOpen: 'Toutes les orgs connectées sont déjà ouvertes.',
    noOrgs: 'Aucune org connectée.',
    manageOrgs: 'Connecter ou gérer les orgs…',
    newObject: 'Nouvel objet',
    apexTab: 'Classes Apex',
    changeSet: 'Change set',
    noOrgOpen: (orgsButton: ReactNode) => <>Aucune org ouverte. Ouvrez-en une avec <b>+</b> ci-dessus ou depuis la page {orgsButton}</>,
    noChangeSetOpen: "Aucun change set ouvert. Ils s'ouvrent ici quand vous envoyez les modifications de la matrice en aperçu, ou depuis l'Historique.",
    noObjectOpen: 'Aucun objet ouvert.',
    openObject: 'Ouvrir un objet',
    confirmCloseTab: "Cet onglet contient des modifications pas encore envoyées en aperçu. Le fermer et les perdre ?",
    confirmCloseOrg: "Des onglets de cette org contiennent des modifications pas encore envoyées en aperçu. La fermer et les perdre ?"
  },

  guide: {
    title: 'Guide d’Orgsmith',
    intro: 'Tout ce que fait Orgsmith, avec de courtes animations. Les nouveautés sont listées dans Nouveautés et renvoient ici.',
    groups: { start: 'Pour commencer', matrix: 'Matrice FLS', tools: 'Autres outils', apply: 'Change sets et exports', more: 'Plus' },
    sections: {
      orgs: { title: 'Connecter une org', body: <>Sur la page <b>Org</b>, donnez un alias à l’org, choisissez Production, Sandbox ou My Domain et connectez-vous avec Salesforce : Orgsmith ne voit jamais votre mot de passe et agit avec les autorisations de votre utilisateur. Donnez à chaque org une des 10 <b>couleurs</b> ; l’espace de travail prend la couleur de l’org ouverte. <b>Renouveler le jeton</b> vous reconnecte quand la session expire.</> },
      tabs: { title: 'Onglets de travail', body: <>Les onglets sont sur trois niveaux : les <b>orgs</b> ouvertes, l’<b>outil</b> de l’org active (Matrice FLS, Classes Apex, Présentations et pages, Change sets) et les <b>objets</b> ouverts dans cet outil. Chaque onglet d’objet garde ses filtres et ses changements en attente. <b>Faites glisser</b> un onglet pour le déplacer, ou utilisez <kbd>Ctrl</kbd>+<kbd>Maj</kbd>+<kbd>←</kbd>/<kbd>→</kbd>. Le point coloré de l’onglet d’org change sa couleur, ↻ renouvelle la session, le clic du milieu ferme un onglet.</> },
      notices: { title: 'Chargements longs en arrière-plan', body: <>Les chargements continuent quand vous changez d’onglet. Si vous quittez un onglet pendant qu’il charge une matrice, des présentations ou exécute un change set, un panneau en bas à droite le suit et vous prévient quand c’est prêt ; <b>Ouvrir</b> vous y ramène. Revenir sur l’onglet efface l’avis.</> },
      apex: { title: 'Classes Apex', body: <>Quels profils et ensembles d’autorisations peuvent exécuter chaque classe Apex. Cela fonctionne comme la matrice FLS avec deux états, activée ou non : clic, glisser, clic droit et actions en masse, puis aperçu et approbation. Les classes de packages gérés peuvent être masquées par un filtre.</> },
      layouts: { title: 'Présentations et pages', body: <>Choisissez un objet pour voir, pour chaque profil et type d’enregistrement, quelle <b>présentation de page</b> et quelle <b>page Lightning</b> il reçoit (par application, type d’enregistrement et valeur par défaut de l’org), et les champs de la présentation que le profil ne peut pas lire. Cette section est en lecture seule pour l’instant.</> },
      changesets: { title: 'Change sets', body: <>Rien n’est écrit avant votre confirmation. <b>Aller à l’aperçu</b> transforme les changements en attente en change set avec ce qui est ajouté, modifié et retiré, et les avertissements. En production il faut une approbation et saisir le nom de l’org. L’exécution montre la progression et le résultat ligne par ligne.</> },
      export: { title: 'Exporter', body: <>Le bouton <b>Exporter</b> enregistre ce que vous voyez : la matrice en Excel, en CSV ou en métadonnées Salesforce (package.xml et un fichier par profil et ensemble d’autorisations), les change sets en Excel, CSV ou métadonnées avec les valeurs qu’ils définissent, et les présentations en Excel ou CSV. Un panneau en bas à droite montre la progression des gros fichiers.</> },
      history: { title: 'Historique et annulation', body: <>L’<b>Historique</b> liste chaque change set avec qui l’a préparé et approuvé, et quand. Chacun garde les valeurs d’avant, donc <b>Annuler ces modifications</b>, dans le change set, crée un change set qui les restaure.</> },
      settings: { title: 'Langue et session', body: <>Choisissez English, Italiano, Français ou Español dans le menu avec les drapeaux. <b>Se déconnecter</b> ferme la session Orgsmith ; vos orgs restent connectées.</> }
    }
  },

  news: { title: 'Nouveautés', intro: 'Chaque changement d’Orgsmith, du plus récent au plus ancien.', seeGuide: 'Voir dans le guide' },

  login: { password: 'Mot de passe', wrong: 'Mot de passe incorrect.', submit: 'Se connecter' },

  history: {
    title: 'Historique des modifications',
    intro: "Chaque change set enregistre qui l'a préparé et approuvé, quand, et l'état précédent pour pouvoir l'annuler.",
    cols: ['Change set', 'Créé', 'Org', 'Description', 'Modifications', 'Statut'],
    notApplied: (n: number) => `${n} non appliquées`,
    empty: 'Aucun change set pour le moment.'
  },

  token: {
    renewedAt: (at: string) => `Jeton renouvelé à ${at}`,
    renewTitle: "Renouveler le jeton d'accès",
    renewOf: (org: string) => `Renouveler le jeton de ${org}`,
    renewing: 'Renouvellement…',
    renew: 'Renouveler le jeton',
    renewedMsg: (at: string) => `Jeton d'accès renouvelé à ${at}.`,
    refused: (detail: string) => `Salesforce n'a pas renouvelé le jeton (${detail}). Reconnectez l'org.`,
    reconnect: 'Reconnecter',
    reconnectNow: (org: string) => `Reconnecter ${org} maintenant ?`
  },

  orgs: {
    title: 'Orgs Salesforce',
    intro: "L'app utilise OAuth : elle ne voit jamais votre mot de passe et agit avec les autorisations de votre utilisateur Salesforce.",
    connectFailed: (error: string) => `Échec de la connexion : ${error}`,
    connected: 'Orgs connectées',
    none: 'Aucune org connectée. Connectez-en une avec le formulaire à côté.',
    alias: 'Alias',
    readAt: (date: string) => ` · lue le ${date}`,
    rename: 'Renommer', addAlias: 'Ajouter un alias', disconnect: 'Déconnecter',
    confirmDisconnect: (org: string) => `Déconnecter ${org} ? Son jeton enregistré sera supprimé.`,
    connectNew: 'Connecter une nouvelle org',
    aliasPlaceholder: 'ex. Acme UAT',
    aliasHelp: "Le nom sous lequel vous verrez cette org dans l'app. Utile car les sandbox portent le même nom que la production.",
    environment: 'Environnement',
    myDomain: 'My Domain',
    permsNeeded: 'Autorisations requises pour votre utilisateur',
    permManage: 'Manage Profiles and Permission Sets (pour modifier)',
    login: 'Se connecter avec Salesforce'
  },

  changeSet: {
    result: 'Résultat', preview: 'Aperçu des modifications',
    undoes: ' · annule un change set précédent',
    kpiChanges: 'Modifications', kpiNew: 'Nouveaux accès', kpiChanged: 'Accès modifiés', kpiRemoved: 'Accès retirés',
    kpiFailed: 'Erreurs et conflits', kpiWarnings: 'Avec avertissements',
    detail: 'Détail',
    filters: { all: 'Toutes', insert: 'Insert', update: 'Update', delete: 'Delete', warn: 'Avec avertissements', failed: 'Erreurs' },
    cols: ['Profil / ensemble d’autorisations', 'Champ', 'Avant', 'Après', 'Opération', 'Résultat'],
    item: { pending: 'À appliquer', ok: 'Appliquée', error: 'Erreur', conflict: 'Conflit' },
    noRows: 'Aucune ligne.',
    shown: (n: number, total: number) => `${n} affichées sur ${total}.`,
    showMore: 'Afficher plus',
    skipped: 'Exclues automatiquement',
    approval: 'Approbation', confirmation: 'Confirmation', twoStep: '2 étapes',
    nothing: 'Aucune modification à appliquer.',
    prodNeedsApproval: "Org de production : le change set doit être envoyé pour approbation avant d'être exécuté.",
    submit: 'Envoyer pour approbation',
    submittedAt: (date: string) => `Envoyé le ${date}. En approuvant, l'app revérifie l'état actuel de l'org.`,
    reject: 'Refuser', approve: 'Approuver',
    conflicts: (n: number) => `${n} lignes ont changé dans l'org après l'aperçu : elles seront ignorées.`,
    noConflicts: "Approuvé. Aucun conflit avec l'état actuel de l'org.",
    typeToConfirm: (org: string) => <>Saisissez <b>{org}</b> pour confirmer</>,
    reviewed: (n: number) => `J'ai vérifié les ${n} modifications`,
    apply: (n: number) => `Appliquer ${n} modifications`,
    running: "Application en cours… la page se met à jour toute seule.",
    rejected: 'Change set refusé. Revenez à la matrice pour en préparer un nouveau.',
    allDone: "Toutes les modifications ont été appliquées et vérifiées en relisant l'org.",
    partial: (ok: number, failed: number) => `${ok} modifications appliquées, ${failed} non appliquées.`,
    rollback: 'Annuler ces modifications'
  },

  pick: {
    chosen: (n: number) => n === 1 ? '1 choisi' : `${n} choisis`,
    removeFilter: (label: string) => `Retirer le filtre ${label}`,
    search: (label: string) => `Rechercher ${label.toLowerCase()}`,
    tickAll: (untick: boolean, n: number, searching: boolean) =>
      `${untick ? 'Décocher' : 'Cocher'} ${searching ? `les ${n} résultats` : `tout (${n})`}`,
    clear: (n: number) => `Vider (${n})`,
    noResults: 'Aucun résultat.',
    more: (n: number) => `${n} de plus : affinez la recherche.`
  },

  matrix: {
    title: 'Matrice Field Level Security',
    intro: "Choisissez les objets. Cliquez sur une cellule pour la modifier, faites glisser la souris sur plusieurs cellules pour choisir l'accès dans un menu, ou sélectionnez des lignes et des colonnes et appliquez une action groupée. Rien n'est écrit tant que vous ne confirmez pas l'aperçu.",
    guide: '? Guide',
    removeObject: (o: string) => `Retirer ${o}`,
    addObject: 'Ajouter un objet (ex. Account)',
    sent: (n: string) => `Les modifications sont dans le change set ${n}. Après l'avoir appliqué, rechargez la matrice pour voir les valeurs à jour.`,
    reload: 'Recharger',
    hiddenWarning: "Je n'ai pas pu lire les champs que votre utilisateur ne voit pas, il peut donc en manquer. Détail :",
    loading: 'Lecture des champs, profils et FieldPermissions…',
    empty: 'Ajoutez un ou plusieurs objets pour voir la matrice.',
    fields: 'Champs',
    profilesAndPs: 'Profils et ensembles d’autorisations',
    kind: { all: 'Profils et ensembles d’autorisations', profiles: 'Profils uniquement', permsets: 'Ensembles d’autorisations uniquement' },
    quick: { all: 'Tous', none: 'Invisibles pour tous', editall: 'Modifiables par tous', custom: 'Personnalisés uniquement', pending: 'Avec modifications' },
    selected: (rows: number, cols: number) => <><b>{rows}</b> champs · <b>{cols}</b> profils/ensembles d’autorisations sélectionnés</>,
    bulk: { read: 'Lecture', edit: 'Lecture et modification', removeEdit: 'Retirer la modification', none: 'Aucun accès' },
    applyToSelection: 'Appliquer à la sélection',
    deselect: 'Désélectionner',
    pending: (n: number) => <><b>{n}</b> modifications en attente</>,
    discard: 'Abandonner',
    preparing: "Préparation de l'aperçu…",
    toPreview: "Voir l'aperçu",
    size: (f: number, c: number) => `${f} champs × ${c} profils/ensembles d’autorisations`,
    field: 'Champ',
    allColumns: 'Toutes les colonnes',
    profile: 'Profil',
    permSet: 'Ens. d’autor.',
    profileSub: 'profil',
    counts: (r: number, e: number) => `L ${r} · M ${e}`,
    select: 'sélectionner',
    noObjectRead: "Pas de lecture sur l'objet",
    objectWarn: 'objet',
    hiddenTag: 'Masqué pour vous',
    hiddenTagTitle: 'Votre utilisateur ne voit pas ce champ : Salesforce ne le renvoie pas dans le describe',
    noFls: 'Sans FLS', readOnly: 'Lecture seule', encrypted: 'Chiffré',
    alwaysTitle: 'Champ sans FLS : toujours visible',
    always: 'toujours',
    before: (v: string) => ` (avant : ${v})`,
    was: (v: string) => `était ${v}`,
    tooMany: (n: string, max: string) => `Trop de modifications pour un seul change set (${n}, maximum ${max}). Répartissez-les sur plusieurs change sets, par exemple en filtrant les profils.`,
    description: (fields: number, ps: number) => `${fields} champs sur ${ps} profils/ensembles d’autorisations`
  },

  apex: {
    matrix: {
      title: 'Accès aux classes Apex',
      intro: "Quels profils et ensembles d'autorisations peuvent exécuter chaque classe Apex. Cliquez sur une cellule pour l'activer ou la désactiver, faites glisser sur plusieurs cellules, ou cochez des lignes et des colonnes pour agir en bloc. Comme dans la matrice FLS, rien n'est écrit avant de confirmer l'aperçu.",
      loading: 'Lecture des classes Apex, des profils et des accès…',
      fields: 'Classes',
      quick: { all: 'Toutes', none: 'Activées pour personne', editall: 'Activées pour tous', custom: 'Sans les classes des packages', pending: 'Avec modifications' },
      selected: (rows: number, cols: number) => <><b>{rows}</b> classes · <b>{cols}</b> profils/ensembles d’autorisations sélectionnés</>,
      size: (f: number, c: number) => `${f} classes × ${c} profils/ensembles d’autorisations`,
      field: 'Classe',
      counts: (r: number, _e: number) => `${r} activées`,
      description: (fields: number, ps: number) => `Accès à ${fields} classes Apex sur ${ps} profils/ensembles d’autorisations`
    },
    access: { short: ['—', '✓', '✓'], long: ['Désactivée', 'Activée', 'Activée'] },
    bulk: { enable: 'Activer', disable: 'Désactiver' },
    managed: 'Package',
    sheet: 'Classes Apex'
  },

  loads: {
    open: 'Ouvrir',
    load: { running: 'Chargement…', done: 'Chargé, prêt à consulter', error: 'Échec du chargement' },
    run: { running: 'Application des modifications…', done: 'Exécution terminée, voir le résultat', error: "Échec de l'exécution" }
  },
  accent: {
    color: 'Couleur', label: "Couleur de l'org", change: "Changer la couleur de l'org",
    names: { ember: 'Braise', amber: 'Ambre', olive: 'Olive', emerald: 'Émeraude', cyan: 'Cyan', blue: 'Bleu', indigo: 'Indigo', magenta: 'Magenta', sand: 'Sable', slate: 'Ardoise' }
  },

  cellMenu: {
    cells: (n: number) => n === 1 ? '1 cellule' : `${n} cellules`,
    editable: (n: number) => ` · ${n} modifiables`,
    removeEditOnly: 'Retirer seulement la modification',
    revert: "Restaurer les valeurs de l'org",
    clear: 'Annuler la sélection'
  },

  layouts: {
    title: 'Présentations et pages Lightning',
    intro: "Pour chaque objet : quelle présentation de page et quelle page Lightning voit chaque profil, par type d'enregistrement. Dans cette version, la section est en lecture seule.",
    changeObject: "Changer d'objet",
    chooseObject: 'Choisissez un objet (ex. Account)',
    pageLayout: 'Présentation de page',
    lightningPage: 'Page Lightning',
    loadingLayouts: 'Lecture des présentations et des attributions…',
    loadingPages: 'Lecture des pages Lightning et des attributions…',
    empty: 'Choisissez un objet pour voir ses présentations et pages Lightning.',
    profiles: 'Profils', recordType: "Type d'enregistrement", layout: 'Présentation',
    onlyGaps: 'Seulement avec des champs illisibles',
    onlySpecific: 'Seulement avec une attribution spécifique',
    resetFilters: 'Effacer les filtres',
    kpiLayouts: 'Présentations de page', kpiUnassigned: 'Non attribuées', kpiProfiles: 'Profils',
    kpiGaps: 'Profils avec des champs illisibles', kpiNoAccess: "Sans accès à l'objet",
    assignments: "Attributions par profil et type d'enregistrement",
    profile: 'Profil',
    inactive: ' (inactif)',
    noObjectAccess: "Aucun accès à l'objet",
    unreadable: (n: number) => n === 1 ? '1 champ illisible' : `${n} champs illisibles`,
    noProfiles: 'Aucun profil.',
    gapNote: '« Champs illisibles » : champs présents dans la présentation pour lesquels le profil seul n\'a pas la FLS en lecture. Les utilisateurs ne les voient que si un ensemble d’autorisations la leur accorde.',
    objectLayouts: "Présentations de page de l'objet",
    layoutCols: ['Présentation', 'Champs', 'Profils attribués', 'Statut'],
    showLayoutProfiles: 'Afficher les profils qui utilisent cette présentation',
    inUse: 'Utilisée',
    unassignedOne: 'Non attribuée',
    source: { 'app-profile': "App, type d'enregistrement et profil", app: "Par défaut de l'app", org: "Par défaut de l'org", system: 'Page système' },
    kpiPages: 'Pages Lightning', kpiPagesUnassigned: 'Non attribuées', kpiApps: 'Apps Lightning',
    kpiAssignments: "Attributions app, type d'enregistrement et profil", kpiOrgDefault: "Par défaut de l'org",
    systemPage: 'Page système',
    perProfile: 'Page vue par chaque profil (ordinateur)',
    defaults: (app: ReactNode, org: ReactNode) => <>Par défaut de l'app : <b>{app}</b>. Par défaut de l'org : <b>{org}</b>.</>,
    systemPageLower: 'page système',
    orgDefault: "Par défaut de l'org",
    appDefault: (app: string) => `Par défaut de ${app}`,
    assignedIn: (n: number, app: string) => `${n} profils/types d'enregistrement dans ${app}`,
    objectPages: "Pages Lightning de l'objet",
    pageCols: ['Page', 'Composants', 'Champs Dynamic Forms', 'Où elle est attribuée'],
    showPageProfiles: 'Afficher les profils qui voient cette page',
    pageUnassigned: 'Non attribuée',
    noPages: "Aucune page d'enregistrement Lightning pour cet objet."
  },

  export: {
    button: 'Exporter', preparing: 'Génération…',
    generating: (what: string) => `Génération : ${what}`,
    ready: (what: string) => `${what} prêt, le téléchargement a commencé`,
    failed: (what: string) => `Impossible de générer ${what}`,
    stage: { collect: 'Collecte des données', write: 'Écriture du fichier', compress: 'Assemblage du fichier' },
    keepOpen: 'Vous pouvez continuer à travailler, gardez simplement cette page ouverte.',
    excel: 'Excel (.xlsx)', excelHint: 'Matrice et une ligne par champ et profil',
    csvGrid: "CSV, comme à l'écran", csvLong: 'CSV, une ligne par champ et profil',
    metadata: 'Métadonnées Salesforce (.zip)', metadataHint: 'Profils et ensembles d’autorisations à déployer avec sf ou à garder dans Git',
    metadataChangeSetHint: 'package.xml et le XML de chaque profil et ensemble d’autorisations, avec les valeurs définies par ce change set (toutes ses lignes)',
    csv: 'CSV',
    scope: (f: number, c: number) => `${f} champs × ${c} profils/ensembles d’autorisations, avec les filtres actuels.`,
    rowsScope: (n: number) => `${n} lignes, avec les filtres actuels.`,
    pending: (n: number) => n === 1 ? 'Inclut 1 modification en attente.' : `Inclut ${n} modifications en attente.`,
    leftOut: (profiles: number, locked: number) => [
      profiles ? `${profiles} profils exclus : Salesforce n'a pas renvoyé leur nom de métadonnées.` : '',
      locked ? `${locked} ensembles d’autorisations gérés ou de groupe exclus : ils ne peuvent pas être déployés.` : ''
    ].filter(Boolean).join(' '),
    leftOutRows: (n: number) => `${n} lignes exclues : Salesforce n’a pas renvoyé le nom de métadonnées de leur profil ou ensemble d’autorisations.`,
    nothing: 'Rien à exporter avec les filtres actuels.',
    sheetMatrix: 'Matrice', sheetDetails: 'Détail', sheetAssignments: 'Attributions', sheetLayouts: 'Présentations', sheetPages: 'Pages', sheetChanges: 'Modifications',
    object: 'Objet', field: 'Champ', apiName: 'Nom API', type: 'Type', kind: 'Profil ou ensemble d’autorisations', name: 'Nom', read: 'Lecture', edit: 'Modification',
    profile: 'Profil', permSet: 'Ensemble d’autorisations', warnings: 'Avertissements', error: 'Erreur', source: 'Origine'
  },

  help: {
    title: 'Comment fonctionne la matrice FLS',
    menuCells: (n: number) => `${n} cellules`,
    menuCell: '1 cellule',
    flow: ['Matrice', 'Aperçu', 'Approbation', 'Appliqué'],
    flowNote: "L'approbation n'est requise qu'en production",
    pickPill: 'Profils : 2 choisis',
    sections: {
      read: {
        title: 'Lire la matrice',
        body: <>Chaque ligne est un champ, chaque colonne un profil ou un ensemble d’autorisations. En haut de la colonne, <b>L</b> et <b>M</b> comptent les champs lisibles et modifiables. Les cellules hachurées ne peuvent pas être modifiées : champs sans FLS, ensembles d’autorisations de packages gérés, groupes et masquage. « Masqué pour vous » signale un champ que votre utilisateur ne voit pas.</>
      },
      click: {
        title: 'Modifier une cellule',
        body: <>Un clic fait tourner la cellule : aucun accès, lecture, lecture et modification. Les champs formule et en lecture seule alternent seulement entre aucun accès et lecture. La cellule modifiée devient violette et garde la valeur précédente.</>
      },
      drag: {
        title: 'Sélectionner plusieurs cellules en faisant glisser',
        body: <>Maintenez le bouton de la souris sur une cellule et faites glisser : au relâchement, un menu s'ouvre pour choisir l'accès de tout le bloc. Près des bords, le tableau défile tout seul. <kbd>Maj</kbd> + clic étend la sélection jusqu'à une autre cellule, <kbd>Échap</kbd> l'annule. Le menu permet aussi de restaurer les valeurs de l'org.</>
      },
      right: {
        title: 'Menu du clic droit',
        body: <>Le clic droit ouvre le même menu sur la cellule sous la souris, ou sur toute la sélection si la cellule en fait partie.</>
      },
      bulk: {
        title: 'Actions groupées sur les lignes et les colonnes',
        body: <>Cochez des champs à gauche et des profils en haut des colonnes, choisissez l'action dans la barre orange et cliquez sur <b>Appliquer à la sélection</b>. L'action s'applique à tous les croisements, même hors écran. « Toutes les colonnes » sélectionne les colonnes filtrées.</>
      },
      filter: {
        title: 'Rechercher et filtrer',
        body: <>Les filtres <b>Champs</b> et <b>Profils et ensembles d’autorisations</b> s'ouvrent d'un clic : recherchez, puis cochez seulement les résultats utiles. Si vous cherchez « sales » et trouvez trois profils, vous pouvez en garder deux. <b>Cocher les résultats</b> les prend tous, <b>Vider</b> ou le × retire le filtre, et rien de coché veut dire tous. Il y a aussi des filtres rapides : champs invisibles pour tous, modifiables par tous, personnalisés uniquement, ou avec des modifications en attente. Les compteurs en haut des colonnes suivent les filtres.</>
      },
      export: {
        title: 'Exporter',
        body: <><b>Exporter</b> enregistre ce que vous voyez : les champs et profils filtrés, modifications en attente comprises. L'<b>Excel</b> contient deux feuilles, la matrice telle qu'affichée et une ligne par champ et profil ; les deux <b>CSV</b> ont les mêmes formes. Les <b>métadonnées Salesforce</b> sont un zip avec package.xml et un fichier par profil et ensemble d'autorisations, prêt pour <code>sf project deploy</code> ou Git ; les ensembles gérés ou de groupe sont exclus. Pendant la génération, le bouton est bloqué et un panneau en bas à droite montre la progression : vous pouvez continuer à travailler. Les change sets et Présentations et pages ont aussi leur bouton Exporter.</>
      },
      flow: {
        title: "De l'aperçu à Salesforce",
        body: <>Rien n'est écrit tant que vous ne confirmez pas. <b>Voir l'aperçu</b> crée un change set avec les modifications en attente et l'ouvre dans un onglet. En production, il faut une approbation et vous devez saisir le nom de l'org. Chaque change set peut être annulé depuis l'Historique.</>
      }
    }
  }
};
