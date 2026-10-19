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
    orgs: 'Orgs', history: 'Historique', logout: 'Déconnexion', settings: 'Paramètres', admin: 'Administration',
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
    title: 'Guide d’OrgFox',
    intro: 'Tout ce que fait OrgFox, avec de courtes animations. Les nouveautés sont listées dans Nouveautés et renvoient ici.',
    groups: { start: 'Pour commencer', matrix: 'Matrice FLS', tools: 'Autres outils', apply: 'Change sets et exports', more: 'Plus' },
    sections: {
      orgs: { title: 'Connecter une org', body: <>Sur la page <b>Org</b>, donnez un alias à l’org, choisissez Production, Sandbox ou My Domain et connectez-vous avec Salesforce : OrgFox ne voit jamais votre mot de passe et agit avec les autorisations de votre utilisateur. Donnez à chaque org une des 10 <b>couleurs</b> ; l’espace de travail prend la couleur de l’org ouverte. <b>Renouveler le jeton</b> vous reconnecte quand la session expire.</> },
      tabs: { title: 'Onglets de travail', body: <>Les onglets sont sur trois niveaux : les <b>orgs</b> ouvertes, l’<b>outil</b> de l’org active (Matrice FLS, Classes Apex, Présentations et pages, Change sets) et les <b>objets</b> ouverts dans cet outil. Chaque onglet d’objet garde ses filtres et ses changements en attente. <b>Faites glisser</b> un onglet pour le déplacer, ou utilisez <kbd>Ctrl</kbd>+<kbd>Maj</kbd>+<kbd>←</kbd>/<kbd>→</kbd>. Le point coloré de l’onglet d’org change sa couleur, ↻ renouvelle la session, le clic du milieu ferme un onglet.</> },
      notices: { title: 'Chargements longs en arrière-plan', body: <>Les chargements continuent quand vous changez d’onglet. Si vous quittez un onglet pendant qu’il charge une matrice, des présentations ou exécute un change set, un panneau en bas à droite le suit et vous prévient quand c’est prêt ; <b>Ouvrir</b> vous y ramène. Revenir sur l’onglet efface l’avis.</> },
      apex: { title: 'Classes Apex', body: <>Quels profils et ensembles d’autorisations peuvent exécuter chaque classe Apex. Cela fonctionne comme la matrice FLS avec deux états, activée ou non : clic, glisser, clic droit et actions en masse, puis aperçu et approbation. Les classes de packages gérés peuvent être masquées par un filtre.</> },
      views: { title: 'Quatre façons de voir la matrice', body: <>Le menu <b>Vue</b> en haut de la matrice FLS et des classes Apex, ou la page <b>Paramètres</b>, passe d’une vue à l’autre des mêmes données et des mêmes modifications en attente. <b>Grille</b> est le tableau classique. <b>Focus</b> ouvre un profil ou ensemble d’autorisations (ou un champ) avec les boutons <b>Aucun</b>, <b>Lecture</b> et <b>Modification</b> sur chaque ligne ; avec <b>comparer</b>, affichez jusqu’à trois autres à côté pour copier leurs valeurs. <b>Carte</b> dessine chaque cellule comme un petit carré, ce qui affiche bien plus de profils : survolez pour lire une cellule, faites glisser pour sélectionner un bloc, puis choisissez l’accès ou appuyez sur <kbd>N</kbd>, <kbd>L</kbd>, <kbd>M</kbd>. <b>Règles</b> écrit la modification comme une phrase, par exemple « Accorder la modification sur ces champs à ces ensembles d’autorisations », et montre combien de cellules changent avant de l’ajouter.</> },
      layoutViews: { title: 'Pinceau et tableau pour les attributions', body: <>Présentations et pages a aussi trois vues, depuis <b>Vue</b> ou <b>Paramètres</b>. <b>Tableau</b> est la liste avec un menu par cellule. <b>Pinceau</b> donne une couleur à chaque présentation ou page Lightning : avec <b>Modifier les attributions</b> actif, choisissez-en une dans la palette et cliquez ou faites glisser sur les cellules, ou cliquez un profil ou un type d’enregistrement pour peindre toute la ligne ou la colonne ; <kbd>Alt</kbd> + clic reprend la présentation d’une cellule. <b>Colonnes</b> affiche une colonne par présentation ou page et une carte par profil, un type d’enregistrement à la fois : faites glisser les cartes, ou cliquez-en plusieurs et utilisez <b>Déplacer vers…</b>. Une colonne vide est une présentation que personne n’utilise.</> },
      layouts: { title: 'Présentations et pages', body: <>Choisissez un objet pour voir, pour chaque profil et type d’enregistrement, quelle <b>présentation de page</b> et quelle <b>page Lightning</b> il reçoit (par application, type d’enregistrement et valeur par défaut de l’org), et les champs de la présentation que le profil ne peut pas lire. Avec <b>Modifier les attributions</b>, vous les changez cellule par cellule, ou toute une colonne avec <b>Toute la colonne…</b> ; les cellules modifiées passent en violet. <b>Voir l’aperçu</b> crée un change set, appliqué comme ceux de FLS. Pour les pages Lightning, la modification vaut pour l’app choisie, et supprimer une attribution spécifique renvoie le profil au défaut de l’app ou de l’org. <b>Ordinateur</b> et <b>Téléphone</b> ont des attributions séparées : on passe de l’un à l’autre à côté de l’app, et en modification « Appliquer chaque modification à l’ordinateur et au téléphone » change les deux. Si Salesforce refuse certaines modifications, les autres passent quand même et le résultat indique le temps de chaque étape.</> },
      changesets: { title: 'Change sets', body: <>Rien n’est écrit avant votre confirmation. <b>Voir l’aperçu</b> transforme les changements en attente en change set avec ce qui est ajouté, modifié et retiré, et les avertissements. En production il faut une approbation et saisir le nom de l’org. L’exécution montre la progression et le résultat ligne par ligne. Si le serveur redémarre pendant une exécution, OrgFox la reprend au démarrage : il relit l’org pour reconnaître les lignes déjà écrites et n’applique que les autres.</> },
      export: { title: 'Exporter', body: <>Le bouton <b>Exporter</b> enregistre ce que vous voyez : la matrice en Excel, en CSV ou en métadonnées Salesforce (package.xml et un fichier par profil et ensemble d’autorisations), les change sets en Excel, CSV ou métadonnées avec les valeurs qu’ils définissent, et les présentations en Excel ou CSV. Un panneau en bas à droite montre la progression des gros fichiers.</> },
      history: { title: 'Historique et annulation', body: <>L’<b>Historique</b> liste chaque change set avec qui l’a préparé et approuvé, et quand. Chacun garde les valeurs d’avant, donc <b>Annuler ces modifications</b>, dans le change set, crée un change set qui les restaure.</> },
      settings: { title: 'Compte, langue et session', body: <>Vous vous connectez avec votre <b>e-mail et mot de passe</b>, et chaque compte ne voit que ses propres orgs, change sets et historique. Pendant la bêta fermée, on entre avec un lien d’invitation. Cliquez sur votre nom en haut pour ouvrir <b>Paramètres</b>, où vous changez votre nom et votre mot de passe : un nouveau mot de passe déconnecte vos autres appareils. Choisissez English, Italiano, Français ou Español dans le menu avec les drapeaux. <b>Se déconnecter</b> ferme la session OrgFox ; vos orgs restent connectées. La session se ferme aussi après 12 heures sans utilisation.</> },
      admin: { title: 'Administration', body: <>Le premier compte d’une installation est <b>admin</b> et voit la page <b>Administration</b>. Vous y <b>invitez</b> des personnes : saisissez leur e-mail, choisissez la durée de validité du lien, copiez-le et envoyez-le vous-même (OrgFox n’envoie pas encore d’e-mails). Le lien ne sert qu’une fois et seulement pour cet e-mail ; tant qu’il n’est pas utilisé, vous pouvez le <b>révoquer</b>. La liste des comptes montre l’inscription et la dernière connexion de chacun, ses orgs et change sets et s’il est connecté. Pour chaque compte, vous pouvez créer un <b>lien de réinitialisation du mot de passe</b>, le <b>déconnecter</b> partout, le rendre admin et le <b>désactiver</b> : ses sessions se ferment et il ne peut plus se connecter jusqu’à sa réactivation. Cette page ne modifie jamais votre propre compte.</> }
    }
  },

  admin: {
    title: 'Administration',
    intro: 'Invitez des personnes dans OrgFox et gérez leurs comptes. Seuls les admins voient cette page.',
    inviteTitle: 'Inviter quelqu’un', email: 'E-mail', placeholder: 'nom@entreprise.fr', validFor: 'Lien valable', days: (n: number) => `${n} jours`, createInvite: 'Créer l’invitation',
    signupInvite: 'Les nouveaux comptes demandent une invitation', signupOpen: 'Tout le monde peut créer un compte (SIGNUP=open)',
    inviteReady: (email: string, days: number) => `Invitation pour ${email}, valable ${days} jours et une seule fois. Copiez-la et envoyez-la vous-même : OrgFox n’envoie pas encore d’e-mails.`,
    resetReady: (email: string) => `Lien de réinitialisation du mot de passe pour ${email}, valable 24 heures. Copiez-le et envoyez-le vous-même.`,
    link: 'Lien', copy: 'Copier', copied: 'Copié',
    usersTitle: 'Comptes', count: (n: number) => `${n} comptes`, you: 'vous',
    userCols: ['Compte', 'État', 'Inscription', 'Dernière connexion', 'Orgs · change sets', 'Sessions'],
    adminTag: 'Admin', activeTag: 'Actif', disabledTag: 'Désactivé',
    resetLink: 'Lien de réinitialisation', logout: 'Déconnecter', makeAdmin: 'Rendre admin', removeAdmin: 'Retirer admin', disable: 'Désactiver', enable: 'Réactiver',
    confirmDisable: (email: string) => `Désactiver ${email} ? Ses sessions se ferment et la connexion est bloquée jusqu’à la réactivation du compte. Ses orgs et change sets sont conservés.`,
    confirmAdmin: (email: string) => `Rendre ${email} admin ? Cette personne pourra inviter des gens et gérer tous les comptes.`,
    invitesTitle: 'Invitations', inviteCols: ['E-mail', 'Créée', 'Expire', 'État'], revoke: 'Révoquer', noInvites: 'Aucune invitation pour le moment.',
    status: { pending: 'En attente', used: 'Utilisée', expired: 'Expirée' },
    errors: { EMAIL_TAKEN: 'Cet e-mail a déjà un compte.', SELF: 'Vous ne pouvez pas modifier votre propre compte ici.', ACCOUNT_DISABLED: 'Réactivez d’abord le compte.', NOT_FOUND: 'Introuvable : rechargez la page.' }
  },

  settings: {
    title: 'Paramètres',
    intro: "Votre compte, et la façon dont OrgFox affiche les matrices. Les vues sont gardées dans ce navigateur, et le menu Vue en haut de chaque outil les change aussi.",
    account: {
      title: 'Compte', name: 'Nom', save: 'Enregistrer le nom', saved: 'Enregistré.',
      currentPassword: 'Mot de passe actuel', newPassword: 'Nouveau mot de passe', changePassword: 'Changer le mot de passe',
      passwordChanged: 'Mot de passe changé. Les autres appareils ont été déconnectés.'
    },
    matrix: 'Matrices des autorisations (FLS et classes Apex)',
    layouts: 'Attributions de présentations et de pages Lightning',
    current: 'Utilisée',
    language: 'La langue se choisit dans le menu avec les drapeaux, en haut.'
  },

  views: {
    label: 'Vue',
    matrix: {
      grid: { name: 'Grille', desc: 'Chaque champ face à chaque profil et ensemble d’autorisations. Cliquez une cellule, faites glisser sur plusieurs ou cochez lignes et colonnes.' },
      focus: { name: 'Focus', desc: 'Un profil ou ensemble d’autorisations à la fois, ou un champ, avec les boutons Aucun, Lecture et Modification sur chaque ligne. Comparez-en jusqu’à trois autres et copiez leurs valeurs.' },
      dense: { name: 'Carte', desc: 'Chaque cellule en petit carré coloré : quatre à cinq fois plus de colonnes à l’écran. Survolez pour lire, faites glisser pour sélectionner, réglez au clavier.' },
      rules: { name: 'Règles', desc: 'Écrivez la modification comme une phrase : accorder la modification sur ces champs à ces ensembles d’autorisations. Vous voyez combien de cellules changent avant de l’ajouter.' }
    },
    layouts: {
      table: { name: 'Tableau', desc: 'Une ligne par profil, une colonne par type d’enregistrement, avec un menu dans chaque cellule en mode modification.' },
      paint: { name: 'Pinceau', desc: 'Chaque présentation a une couleur. Choisissez-la dans la palette et peignez des cellules, des lignes ou des colonnes entières.' },
      board: { name: 'Colonnes', desc: 'Une colonne par présentation, une carte par profil. Faites glisser les profils d’une présentation à l’autre, un type d’enregistrement à la fois.' }
    },
    levels: ['Aucun', 'Lecture', 'Modification'],
    focus: {
      byPs: 'Par profil', byField: 'Par champ', byClass: 'Par classe',
      searchPs: 'Rechercher profils et ensembles d’autorisations', searchField: 'Rechercher des champs', searchClass: 'Rechercher des classes',
      profiles: 'Profils', permSets: 'Ensembles d’autorisations',
      compare: 'comparer', comparing: 'comparé',
      uncompare: (name: string) => `Ne plus comparer ${name}`,
      pick: 'Choisissez un profil ou ensemble d’autorisations à gauche.',
      pickField: 'Choisissez un champ à gauche.',
      stats: (r: number, e: number, hidden: number) => `${r} en lecture · ${e} en modification · ${hidden} masqués`,
      statsApex: (on: number, off: number) => `${on} activées · ${off} désactivées`,
      copyAll: (from: string) => `Tout copier depuis ${from}`,
      copyOne: (v: string, from: string) => `Copier « ${v} » depuis ${from}`,
      lockedPs: 'Ensemble d’autorisations d’un package géré, un groupe ou un muting : en lecture seule.',
      selected: (n: number) => n === 1 ? '1 sélectionné' : `${n} sélectionnés`,
      set: 'Définir :',
      selectAll: 'Tout sélectionner',
      access: 'Accès',
      only: { all: 'Tous', diff: 'Différences seulement', none: 'Sans accès seulement', pending: 'Avec modifications' },
      noFls: 'Toujours visible (sans FLS)',
      more: (n: number) => `Afficher ${n} de plus`
    },
    dense: {
      size: 'Taille',
      keys: { none: 'n', read: 'l', edit: 'm' },
      help: (keys: string[]) => <>Cliquez ou faites glisser pour sélectionner · cliquez un nom pour toute la ligne ou colonne · {keys.map(k => <kbd key={k}>{k}</kbd>)} définit · <kbd>Espace</kbd> fait défiler · <kbd>Maj</kbd>+flèches étend · <kbd>Échap</kbd> annule</>
    },
    rules: {
      action: 'Action', from: 'Choisissez de qui copier l’accès',
      actions: { edit: 'Accorder la modification', read: 'Accorder la lecture', removeEdit: 'Retirer seulement la modification', none: 'Retirer tout accès', copy: 'Copier l’accès de' },
      onWord: 'sur', toWord: 'à', forWord: 'pour', toWordCopy: 'vers',
      allFields: (n: number, apex: boolean) => apex ? `les ${n} classes` : `les ${n} champs`,
      someFields: (n: number, apex: boolean) => apex ? (n === 1 ? '1 classe' : `${n} classes`) : (n === 1 ? '1 champ' : `${n} champs`),
      allPs: (n: number) => `les ${n} profils et ensembles d’autorisations`,
      somePs: (n: number) => n === 1 ? '1 profil ou ensemble d’autorisations' : `${n} profils et ensembles d’autorisations`,
      reads: (what: string, fields: string, ps: string) => `${what} sur ${fields} pour ${ps}. Un filtre vide signifie tout ce que montre la matrice.`,
      sentence: (what: string, fields: string, ps: string) => `${what} · ${fields} · ${ps}`,
      recipes: 'Raccourcis :',
      recipeClone: 'Même accès qu’un autre profil',
      recipeEncrypted: 'Pas de modification sur les champs chiffrés',
      recipeCustom: 'Lecture sur les champs personnalisés',
      recipePackage: 'Désactiver les classes des packages',
      changes: 'cellules changent', more: 'plus d’accès', less: 'moins d’accès',
      skipped: (n: number) => `${n} cellules verrouillées exclues`,
      add: 'Ajouter aux modifications en attente',
      cols: ['Champ', 'Profil / ensemble d’autorisations', 'Actuel', 'Après'],
      pickFrom: 'Choisissez de qui copier l’accès.',
      nothing: 'Rien ne change : l’accès est déjà ainsi.',
      andMore: (n: number) => `et ${n} de plus`,
      queue: 'Règles ajoutées',
      queueEmpty: 'Aucune pour l’instant. Écrivez une règle et ajoutez-la.',
      queueNote: 'Les règles ajoutées sont déjà dans les modifications en attente ; Voir l’aperçu en fait un change set. Retirer annule la dernière.',
      cells: (n: number) => n === 1 ? '1 cellule' : `${n} cellules`,
      remove: 'Retirer'
    },
    paint: {
      brush: 'Pinceau :',
      none: 'Défaut de l’app ou de l’org',
      unused: 'jamais utilisée',
      hint: 'Cliquez une cellule ou faites glisser sur plusieurs. Cliquez un profil ou un type d’enregistrement pour peindre toute la ligne ou la colonne. Alt + clic reprend la présentation d’une cellule.',
      readOnly: 'Activez Modifier les attributions pour peindre.',
      row: 'Peindre toute la ligne', col: 'Peindre toute la colonne',
      was: (v: string) => `avant ${v}`
    },
    board: {
      recordType: 'Type d’enregistrement :',
      hint: 'Faites glisser les profils vers une autre colonne, ou cliquez-en plusieurs et utilisez Déplacer vers…',
      readOnly: 'Activez Modifier les attributions pour déplacer les profils.',
      moveTo: 'Déplacer vers…',
      selected: (n: number) => n === 1 ? '1 profil sélectionné' : `${n} profils sélectionnés`,
      clear: 'Désélectionner',
      empty: 'Aucun profil',
      unused: 'Pas utilisée avec ce type d’enregistrement',
      before: (v: string) => `avant : ${v}`
    }
  },

  news: { title: 'Nouveautés', intro: 'Chaque changement d’OrgFox, du plus récent au plus ancien.', seeGuide: 'Voir dans le guide' },

  login: {
    loginTitle: 'Se connecter', signupTitle: 'Créez votre compte', resetTitle: 'Choisissez un nouveau mot de passe',
    email: 'E-mail', password: 'Mot de passe', newPassword: 'Nouveau mot de passe', name: 'Votre nom',
    passwordHint: 'Au moins 12 caractères.',
    submit: 'Se connecter', signupSubmit: 'Créer le compte', resetSubmit: 'Enregistrer et se connecter',
    signupIntro: 'Chaque compte a ses propres orgs, change sets et historique.',
    invited: (email: string) => `Invitation pour ${email}.`,
    toSignup: 'Nouveau ? Créez un compte', toLogin: 'Retour à la connexion',
    inviteOnly: 'OrgFox est en bêta fermée : il faut une invitation pour créer un compte.',
    forgot: 'Mot de passe oublié ? Écrivez-nous et nous vous enverrons un lien pour le réinitialiser.',
    errors: {
      WRONG_LOGIN: 'E-mail ou mot de passe incorrect.',
      THROTTLED: 'Trop de tentatives. Attendez quelques minutes et réessayez.',
      INVITE_REQUIRED: 'Il faut une invitation valide pour cette adresse e-mail.',
      EMAIL_TAKEN: 'Un compte existe déjà avec cet e-mail : connectez-vous.',
      LINK_INVALID: 'Ce lien n’est plus valide. Demandez-en un nouveau.',
      WRONG_PASSWORD: 'Le mot de passe actuel est incorrect.',
      INVALID: 'Vérifiez les champs : le mot de passe doit avoir au moins 12 caractères.',
      ACCOUNT_DISABLED: 'Ce compte a été désactivé. Écrivez-nous si vous pensez que c’est une erreur.'
    }
  },

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
    resumed: (date: string) => `Le serveur a redémarré pendant l'exécution de ce change set. Le ${date}, OrgFox l'a repris : les lignes déjà écrites ont été reconnues en relisant l'org, les autres ont été appliquées.`,
    rejected: 'Change set refusé. Revenez à la matrice pour en préparer un nouveau.',
    allDone: "Toutes les modifications ont été appliquées et vérifiées en relisant l'org.",
    partial: (ok: number, failed: number) => `${ok} modifications appliquées, ${failed} non appliquées.`,
    rollback: 'Annuler ces modifications',
    assign: {
      kind: { layout: 'Présentation de page', page: 'Page Lightning' },
      cols: ['Type', 'Objet', 'App', 'Profil', "Type d'enregistrement", 'Avant', 'Après', 'Résultat'],
      kpiCleared: 'Attributions de page supprimées',
      defaultPage: "Par défaut (app ou org)",
      master: 'Master'
    },
    timing: {
      title: 'Temps par étape',
      steps: { 'check org': "Vérification de l'org", check: 'Vérification des profils, pages et types', 'read app': "Lecture de l'app", 'save app': "Enregistrement de l'app", 'save profiles': 'Enregistrement des profils', verify: 'Relecture de vérification' } as Record<string, string>,
      times: (n: number) => n > 1 ? ` (${n} fois)` : '',
      note: "Enregistrer une app, c'est Salesforce qui redéploie toute l'app : avec beaucoup d'attributions, cela prend du temps. Si Salesforce refuse certaines modifications, l'app est enregistrée à nouveau pour les isoler."
    }
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
    intro: "Pour chaque objet : quelle présentation de page et quelle page Lightning voit chaque profil, par type d'enregistrement. Avec Modifier les attributions, vous pouvez les changer : les modifications passent par l'aperçu et l'approbation, comme celles de FLS.",
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
    perProfile: 'Page vue par chaque profil',
    defaults: (app: ReactNode, org: ReactNode) => <>Par défaut de l'app : <b>{app}</b>. Par défaut de l'org : <b>{org}</b>.</>,
    systemPageLower: 'page système',
    orgDefault: "Par défaut de l'org",
    appDefault: (app: string) => `Par défaut de ${app}`,
    assignedIn: (n: number, app: string) => `${n} profils/types d'enregistrement dans ${app}`,
    objectPages: "Pages Lightning de l'objet",
    pageCols: ['Page', 'Composants', 'Champs Dynamic Forms', 'Où elle est attribuée'],
    showPageProfiles: 'Afficher les profils qui voient cette page',
    pageUnassigned: 'Non attribuée',
    noPages: "Aucune page d'enregistrement Lightning pour cet objet.",
    edit: 'Modifier les attributions', editDone: 'Terminer',
    finishFirst: "Annulez d'abord les modifications ou passez à l'aperçu.",
    setColumn: 'Toute la colonne…',
    noSpecific: "(aucune : défaut de l'app ou de l'org)",
    device: 'Appareil',
    formFactor: { Large: 'Ordinateur', Small: 'Téléphone' },
    appNotOn: (app: string, device: string) => `${app} n'est pas activée sur ${device} : ces attributions n'y ont aucun effet.`,
    mirror: 'Appliquer chaque modification à l’ordinateur et au téléphone',
    noFullName: "Salesforce n'a pas renvoyé le nom de métadonnées de ce profil : il ne peut pas être modifié.",
    layoutEditHint: "Les cellules modifiées sont mises en évidence. Rien n'est écrit avant la confirmation de l'aperçu.",
    pageEditHint: "Les modifications s'appliquent à l'app choisie. Supprimer une attribution spécifique renvoie le profil au défaut de l'app ou de l'org.",
    pending: (n: number) => n === 1 ? '1 attribution en attente' : `${n} attributions en attente`,
    discard: 'Annuler', toPreview: "Voir l'aperçu", preparing: 'Préparation…',
    description: (n: number, object: string) => n === 1 ? `1 attribution sur ${object}` : `${n} attributions sur ${object}`,
    sent: (n: string) => `Les modifications sont dans le change set ${n}. Une fois appliqué, rechargez pour voir les nouvelles attributions.`,
    reload: 'Recharger'
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
