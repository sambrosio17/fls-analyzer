import type { ReactNode } from 'react';
import type { Messages } from './en.tsx';

export const es: Messages = {
  locale: 'es-ES',
  language: 'Idioma',
  common: {
    close: 'Cerrar', cancel: 'Cancelar', save: 'Guardar', open: 'Abrir', loading: 'Cargando…',
    sandbox: 'Sandbox', production: 'Producción', all: 'todos', none: 'ninguna'
  },
  access: {
    short: ['—', 'L', 'L+E'],
    long: ['Sin acceso', 'Lectura', 'Lectura y edición'],
    pending: 'Cambio pendiente',
    locked: 'No editable'
  },
  status: {
    draft: 'Borrador', pending_approval: 'Pendiente de aprobación', approved: 'Aprobado', rejected: 'Rechazado',
    running: 'En ejecución', done: 'Completado', partial: 'Parcial', failed: 'Fallido'
  },
  warning: {
    CALCULATED_READ_ONLY: 'Campo calculado: solo se aplicó la lectura.',
    NO_OBJECT_ACCESS: 'Falta la lectura del objeto: el campo seguirá invisible.'
  },
  skip: {
    NOT_PERMISSIONABLE: 'Campos sin FLS',
    MANAGED_PERMISSION_SET: 'Conjuntos de permisos de paquetes gestionados',
    GROUP_PERMISSION_SET: 'Grupos de conjuntos de permisos o silenciamiento',
    UNKNOWN_FIELD: 'Campos no encontrados',
    UNKNOWN_PERMISSION_SET: 'Perfiles o conjuntos de permisos no encontrados',
    NO_CHANGE: 'Ya tienen el valor solicitado'
  },
  tools: { matrix: 'Matriz FLS', apex: 'Clases Apex', layouts: 'Formatos y páginas', changeset: 'Change sets' },

  app: {
    guide: 'Guía', news: 'Novedades', newsUnread: 'Hay novedades por leer',
    orgs: 'Orgs', history: 'Historial', logout: 'Salir', settings: 'Ajustes', admin: 'Administración',
    openOrgs: 'Orgs abiertas', toolsLabel: 'Herramientas', openObjects: 'Objetos abiertos', openChangeSets: 'Change sets abiertos',
    closeX: (name: string) => `Cerrar ${name}`,
    openOrg: 'Abrir una org',
    allOpen: 'Todas las orgs conectadas ya están abiertas.',
    noOrgs: 'No hay orgs conectadas.',
    manageOrgs: 'Conectar o gestionar orgs…',
    newObject: 'Nuevo objeto',
    apexTab: 'Clases Apex',
    changeSet: 'Change set',
    noOrgOpen: (orgsButton: ReactNode) => <>No hay ninguna org abierta. Abre una con <b>+</b> arriba o desde la página {orgsButton}</>,
    noChangeSetOpen: 'No hay ningún change set abierto. Se abren aquí cuando envías a vista previa los cambios de la matriz, o desde el Historial.',
    noObjectOpen: 'No hay ningún objeto abierto.',
    openObject: 'Abrir un objeto',
    confirmCloseTab: 'Esta pestaña tiene cambios que aún no se enviaron a vista previa. ¿Cerrarla y perderlos?',
    confirmCloseOrg: 'Esta org tiene pestañas con cambios que aún no se enviaron a vista previa. ¿Cerrarla y perderlos?'
  },

  guide: {
    title: 'Guía de OrgFox',
    intro: 'Todo lo que hace OrgFox, con animaciones breves. Las novedades aparecen en Novedades y enlazan aquí.',
    groups: { start: 'Para empezar', matrix: 'Matriz FLS', tools: 'Otras herramientas', apply: 'Change sets y exportaciones', more: 'Más' },
    sections: {
      orgs: { title: 'Conectar una org', body: <>En la página <b>Org</b>, dale un alias a la org, elige Producción, Sandbox o My Domain e inicia sesión con Salesforce: OrgFox nunca ve tu contraseña y actúa con los permisos de tu usuario. Dale a cada org uno de los 10 <b>colores</b>; el área de trabajo toma el color de la org abierta. <b>Renovar token</b> vuelve a iniciar sesión cuando caduca.</> },
      tabs: { title: 'Pestañas de trabajo', body: <>Las pestañas tienen tres niveles: las <b>orgs</b> abiertas, la <b>herramienta</b> de la org activa (Matriz FLS, Clases Apex, Formatos y páginas, Change sets) y los <b>objetos</b> abiertos en esa herramienta. Cada pestaña de objeto guarda sus filtros y cambios pendientes. <b>Arrastra</b> una pestaña para moverla, o usa <kbd>Ctrl</kbd>+<kbd>Mayús</kbd>+<kbd>←</kbd>/<kbd>→</kbd>. El punto de color de la pestaña de la org cambia su color, ↻ renueva la sesión, el clic central cierra una pestaña.</> },
      notices: { title: 'Cargas largas en segundo plano', body: <>Las cargas siguen aunque cambies de pestaña. Si dejas una pestaña mientras carga una matriz, formatos o ejecuta un change set, un panel abajo a la derecha la sigue y te avisa cuando está lista; <b>Abrir</b> te lleva de vuelta. Al volver a la pestaña el aviso desaparece.</> },
      apex: { title: 'Clases Apex', body: <>Qué perfiles y conjuntos de permisos pueden ejecutar cada clase Apex. Funciona como la matriz FLS con dos estados, activada o no: clic, arrastre, clic derecho y acciones en bloque, luego vista previa y aprobación. Las clases de paquetes gestionados se pueden ocultar con un filtro.</> },
      views: { title: 'Cuatro formas de ver la matriz', body: <>El menú <b>Vista</b> arriba en la matriz FLS y en las clases Apex, o la página <b>Ajustes</b>, cambia entre cuatro vistas de los mismos datos y de los mismos cambios pendientes. <b>Cuadrícula</b> es la tabla clásica. <b>Foco</b> abre un perfil o conjunto de permisos (o un campo) con los botones <b>Ninguno</b>, <b>Lectura</b> y <b>Edición</b> en cada fila; con <b>comparar</b> pones al lado hasta otros tres para copiar sus valores. <b>Mapa</b> dibuja cada celda como un cuadradito, así caben muchos más perfiles: pasa el ratón para leer una celda, arrastra para seleccionar un bloque y elige el acceso o pulsa <kbd>N</kbd>, <kbd>L</kbd>, <kbd>E</kbd>. <b>Reglas</b> escribe el cambio como una frase, por ejemplo «Conceder edición en estos campos a estos conjuntos de permisos», y muestra cuántas celdas cambian antes de añadirlo.</> },
      layoutViews: { title: 'Pincel y tablero para las asignaciones', body: <>Formatos y páginas también tiene tres vistas, desde <b>Vista</b> o <b>Ajustes</b>. <b>Tabla</b> es la lista con un menú por celda. <b>Pincel</b> da a cada formato o página Lightning un color: con <b>Editar asignaciones</b> activo, elige uno de la paleta y haz clic o arrastra sobre las celdas, o haz clic en un perfil o tipo de registro para pintar toda la fila o la columna; <kbd>Alt</kbd> + clic toma el formato de una celda. <b>Tablero</b> tiene una columna por formato o página y una tarjeta por perfil, un tipo de registro a la vez: arrastra las tarjetas, o haz clic en varias y usa <b>Mover a…</b>. Una columna vacía es un formato que nadie usa.</> },
      layouts: { title: 'Formatos y páginas', body: <>Elige un objeto para ver, por cada perfil y tipo de registro, qué <b>formato de página</b> y qué <b>página Lightning</b> recibe (por app, tipo de registro y valor por defecto de la org), y los campos del formato que el perfil no puede leer. Con <b>Editar asignaciones</b> las cambias celda por celda, o toda una columna con <b>Toda la columna…</b>; las celdas cambiadas se vuelven moradas. <b>Ir a la vista previa</b> crea un change set, que se aplica como los de FLS. Para las páginas Lightning el cambio vale para la app elegida, y quitar una asignación específica devuelve el perfil a la predeterminada de la app o la org. <b>Escritorio</b> y <b>Teléfono</b> tienen asignaciones separadas: se cambia entre ellos junto a la app, y al editar “Aplicar cada cambio a escritorio y teléfono” cambia ambos. Si Salesforce rechaza algunos cambios, los demás pasan igualmente y el resultado muestra cuánto tardó cada paso.</> },
      changesets: { title: 'Change sets', body: <>No se escribe nada hasta que confirmas. <b>Ir a la vista previa</b> convierte los cambios pendientes en un change set con lo que se añade, cambia y quita, y los avisos. En producción necesita aprobación y escribir el nombre de la org. La ejecución muestra el progreso y el resultado fila por fila. Si el servidor se reinicia durante una ejecución, OrgFox la retoma al arrancar: relee la org para reconocer las filas ya escritas y aplica solo las demás.</> },
      export: { title: 'Exportar', body: <>El botón <b>Exportar</b> guarda lo que ves: la matriz en Excel, CSV o como metadatos de Salesforce (package.xml y un archivo por perfil y conjunto de permisos), los change sets en Excel, CSV o metadatos con los valores que fijan, y los formatos en Excel o CSV. Un panel abajo a la derecha muestra el progreso de los archivos grandes.</> },
      history: { title: 'Historial y deshacer', body: <>El <b>Historial</b> muestra cada change set con quién lo preparó y aprobó, y cuándo. Cada uno guarda los valores anteriores, así que <b>Deshacer estos cambios</b>, en el change set, crea un change set que los restaura.</> },
      settings: { title: 'Cuenta, idioma y sesión', body: <>Entras con tu <b>email y contraseña</b>, y cada cuenta ve solo sus propias orgs, change sets e historial. En la beta cerrada se entra con un enlace de invitación. Haz clic en tu nombre arriba para abrir <b>Ajustes</b>, donde cambias tu nombre y tu contraseña: una contraseña nueva cierra la sesión en tus otros dispositivos. Elige English, Italiano, Français o Español en el menú con las banderas. <b>Salir</b> cierra la sesión de OrgFox; tus orgs siguen conectadas. La sesión también se cierra tras 12 horas sin uso.</> },
      admin: { title: 'Administración', body: <>La primera cuenta de una instalación es <b>admin</b> y ve la página <b>Administración</b>. Allí <b>invitas</b> a personas: escribe su email, elige cuánto dura el enlace, cópialo y envíalo tú (OrgFox todavía no envía emails). El enlace sirve una sola vez y solo para ese email; mientras no se use puedes <b>revocarlo</b>. La lista de cuentas muestra la fecha de alta y del último acceso de cada una, cuántas orgs y change sets tiene y si tiene sesiones abiertas. Para cada cuenta puedes crear un <b>enlace para cambiar la contraseña</b>, <b>cerrar su sesión</b> en todas partes, hacerla admin y <b>desactivarla</b>: sus sesiones se cierran y no puede entrar hasta que la reactives. En esta página no puedes cambiar tu propia cuenta.</> }
    }
  },

  admin: {
    title: 'Administración',
    intro: 'Invita a personas a OrgFox y gestiona sus cuentas. Solo los admins ven esta página.',
    inviteTitle: 'Invitar a alguien', email: 'Email', placeholder: 'nombre@empresa.es', validFor: 'Enlace válido', days: (n: number) => `${n} días`, createInvite: 'Crear invitación',
    signupInvite: 'Las cuentas nuevas necesitan invitación', signupOpen: 'Cualquiera puede crear una cuenta (SIGNUP=open)',
    inviteReady: (email: string, days: number) => `Invitación para ${email}, válida ${days} días y una sola vez. Cópiala y envíala tú: OrgFox todavía no envía emails.`,
    resetReady: (email: string) => `Enlace para cambiar la contraseña de ${email}, válido 24 horas. Cópialo y envíalo tú.`,
    link: 'Enlace', copy: 'Copiar', copied: 'Copiado',
    usersTitle: 'Cuentas', count: (n: number) => `${n} cuentas`, you: 'tú',
    userCols: ['Cuenta', 'Estado', 'Alta', 'Último acceso', 'Orgs · change sets', 'Sesiones'],
    adminTag: 'Admin', activeTag: 'Activa', disabledTag: 'Desactivada',
    resetLink: 'Enlace de contraseña', logout: 'Cerrar sesión', makeAdmin: 'Hacer admin', removeAdmin: 'Quitar admin', disable: 'Desactivar', enable: 'Reactivar',
    confirmDisable: (email: string) => `¿Desactivar ${email}? Sus sesiones se cierran y no podrá entrar hasta que reactives la cuenta. Sus orgs y change sets se conservan.`,
    confirmAdmin: (email: string) => `¿Hacer admin a ${email}? Podrá invitar a personas y gestionar todas las cuentas.`,
    invitesTitle: 'Invitaciones', inviteCols: ['Email', 'Creada', 'Caduca', 'Estado'], revoke: 'Revocar', noInvites: 'Todavía no hay invitaciones.',
    status: { pending: 'Pendiente', used: 'Usada', expired: 'Caducada' },
    errors: { EMAIL_TAKEN: 'Este email ya tiene una cuenta.', SELF: 'Aquí no puedes cambiar tu propia cuenta.', ACCOUNT_DISABLED: 'Primero reactiva la cuenta.', NOT_FOUND: 'No encontrado: recarga la página.' }
  },

  settings: {
    title: 'Ajustes',
    intro: "Tu cuenta, y cómo muestra OrgFox las matrices. Las vistas se guardan en este navegador, y el menú Vista arriba en cada herramienta también las cambia.",
    account: {
      title: 'Cuenta', name: 'Nombre', save: 'Guardar nombre', saved: 'Guardado.',
      currentPassword: 'Contraseña actual', newPassword: 'Contraseña nueva', changePassword: 'Cambiar contraseña',
      passwordChanged: 'Contraseña cambiada. Se cerró la sesión en los demás dispositivos.'
    },
    matrix: 'Matrices de permisos (FLS y clases Apex)',
    layouts: 'Asignaciones de formatos y páginas Lightning',
    current: 'En uso',
    language: 'El idioma se elige en el menú con las banderas, arriba.'
  },

  views: {
    label: 'Vista',
    matrix: {
      grid: { name: 'Cuadrícula', desc: 'Cada campo frente a cada perfil y conjunto de permisos. Haz clic en una celda, arrastra sobre varias o marca filas y columnas.' },
      focus: { name: 'Foco', desc: 'Un perfil o conjunto de permisos a la vez, o un campo, con los botones Ninguno, Lectura y Edición en cada fila. Compara hasta otros tres y copia sus valores.' },
      dense: { name: 'Mapa', desc: 'Cada celda como un cuadradito de color: caben de cuatro a cinco veces más columnas. Pasa el ratón para leer, arrastra para seleccionar, cambia con el teclado.' },
      rules: { name: 'Reglas', desc: 'Escribe el cambio como una frase: conceder edición en estos campos a estos conjuntos de permisos. Ves cuántas celdas cambian antes de añadirlo.' }
    },
    layouts: {
      table: { name: 'Tabla', desc: 'Una fila por perfil, una columna por tipo de registro, con un menú en cada celda al editar.' },
      paint: { name: 'Pincel', desc: 'Cada formato tiene un color. Elígelo en la paleta y pinta celdas, filas enteras o columnas enteras.' },
      board: { name: 'Tablero', desc: 'Una columna por formato, una tarjeta por perfil. Arrastra los perfiles de un formato a otro, un tipo de registro a la vez.' }
    },
    levels: ['Ninguno', 'Lectura', 'Edición'],
    focus: {
      byPs: 'Por perfil', byField: 'Por campo', byClass: 'Por clase',
      searchPs: 'Buscar perfiles y conjuntos de permisos', searchField: 'Buscar campos', searchClass: 'Buscar clases',
      profiles: 'Perfiles', permSets: 'Conjuntos de permisos',
      compare: 'comparar', comparing: 'comparando',
      uncompare: (name: string) => `Dejar de comparar ${name}`,
      pick: 'Elige un perfil o conjunto de permisos a la izquierda.',
      pickField: 'Elige un campo a la izquierda.',
      stats: (r: number, e: number, hidden: number) => `${r} en lectura · ${e} en edición · ${hidden} ocultos`,
      statsApex: (on: number, off: number) => `${on} activadas · ${off} desactivadas`,
      copyAll: (from: string) => `Copiar todo de ${from}`,
      copyOne: (v: string, from: string) => `Copiar «${v}» de ${from}`,
      lockedPs: 'Conjunto de permisos de un paquete gestionado, un grupo o un muting: solo se puede leer.',
      selected: (n: number) => n === 1 ? '1 seleccionado' : `${n} seleccionados`,
      set: 'Asignar:',
      selectAll: 'Seleccionar todo',
      access: 'Acceso',
      only: { all: 'Todos', diff: 'Solo diferencias', none: 'Solo sin acceso', pending: 'Con cambios' },
      noFls: 'Siempre visible (sin FLS)',
      more: (n: number) => `Mostrar ${n} más`
    },
    dense: {
      size: 'Tamaño',
      keys: { none: 'n', read: 'l', edit: 'e' },
      help: (keys: string[]) => <>Haz clic o arrastra para seleccionar · clic en un nombre para toda la fila o columna · {keys.map(k => <kbd key={k}>{k}</kbd>)} asigna · <kbd>Espacio</kbd> alterna · <kbd>Mayús</kbd>+flechas amplía · <kbd>Esc</kbd> cancela</>
    },
    rules: {
      action: 'Acción', from: 'Elige de quién copiar el acceso',
      actions: { edit: 'Conceder edición', read: 'Conceder lectura', removeEdit: 'Quitar solo la edición', none: 'Quitar todo acceso', copy: 'Copiar el acceso de' },
      onWord: 'en', toWord: 'a', forWord: 'para', toWordCopy: 'hacia',
      allFields: (n: number, apex: boolean) => apex ? `las ${n} clases` : `los ${n} campos`,
      someFields: (n: number, apex: boolean) => apex ? (n === 1 ? '1 clase' : `${n} clases`) : (n === 1 ? '1 campo' : `${n} campos`),
      allPs: (n: number) => `los ${n} perfiles y conjuntos de permisos`,
      somePs: (n: number) => n === 1 ? '1 perfil o conjunto de permisos' : `${n} perfiles y conjuntos de permisos`,
      reads: (what: string, fields: string, ps: string) => `${what} en ${fields} para ${ps}. Un filtro vacío significa todo lo que muestra la matriz.`,
      sentence: (what: string, fields: string, ps: string) => `${what} · ${fields} · ${ps}`,
      recipes: 'Atajos:',
      recipeClone: 'Mismo acceso que otro perfil',
      recipeEncrypted: 'Sin edición en campos cifrados',
      recipeCustom: 'Lectura en campos personalizados',
      recipePackage: 'Desactivar las clases de paquetes',
      changes: 'celdas cambian', more: 'más acceso', less: 'menos acceso',
      skipped: (n: number) => `${n} celdas bloqueadas excluidas`,
      add: 'Añadir a los cambios pendientes',
      cols: ['Campo', 'Perfil / conjunto de permisos', 'Ahora', 'Después'],
      pickFrom: 'Elige de quién copiar el acceso.',
      nothing: 'No cambia nada: el acceso ya es así.',
      andMore: (n: number) => `y ${n} más`,
      queue: 'Reglas añadidas',
      queueEmpty: 'Ninguna todavía. Escribe una regla y añádela.',
      queueNote: 'Las reglas añadidas ya están en los cambios pendientes; Ir a la vista previa las convierte en un change set. Quitar deshace la última.',
      cells: (n: number) => n === 1 ? '1 celda' : `${n} celdas`,
      remove: 'Quitar'
    },
    paint: {
      brush: 'Pincel:',
      none: 'Predeterminada de la app o la org',
      unused: 'nunca usado',
      hint: 'Haz clic en una celda o arrastra sobre varias. Haz clic en un perfil o tipo de registro para pintar toda la fila o la columna. Alt + clic toma el formato de una celda.',
      readOnly: 'Activa Editar asignaciones para pintar.',
      row: 'Pintar toda la fila', col: 'Pintar toda la columna',
      was: (v: string) => `antes ${v}`
    },
    board: {
      recordType: 'Tipo de registro:',
      hint: 'Arrastra los perfiles a otra columna, o haz clic en varios y usa Mover a…',
      readOnly: 'Activa Editar asignaciones para mover los perfiles.',
      moveTo: 'Mover a…',
      selected: (n: number) => n === 1 ? '1 perfil seleccionado' : `${n} perfiles seleccionados`,
      clear: 'Deseleccionar',
      empty: 'Ningún perfil',
      unused: 'No se usa con este tipo de registro',
      before: (v: string) => `antes: ${v}`
    }
  },

  news: { title: 'Novedades', intro: 'Cada cambio de OrgFox, del más reciente al más antiguo.', seeGuide: 'Ver en la guía' },

  login: {
    loginTitle: 'Entrar', signupTitle: 'Crea tu cuenta', resetTitle: 'Elige una contraseña nueva',
    email: 'Email', password: 'Contraseña', newPassword: 'Contraseña nueva', name: 'Tu nombre',
    passwordHint: 'Al menos 12 caracteres.',
    submit: 'Entrar', signupSubmit: 'Crear cuenta', resetSubmit: 'Guardar y entrar',
    signupIntro: 'Cada cuenta tiene sus propias orgs, change sets e historial.',
    invited: (email: string) => `Invitación para ${email}.`,
    toSignup: '¿Nuevo? Crea una cuenta', toLogin: 'Volver a entrar',
    inviteOnly: 'OrgFox está en beta cerrada: necesitas una invitación para crear una cuenta.',
    forgot: '¿Olvidaste la contraseña? Escríbenos y te enviaremos un enlace para cambiarla.',
    errors: {
      WRONG_LOGIN: 'Email o contraseña incorrectos.',
      THROTTLED: 'Demasiados intentos. Espera unos minutos y vuelve a intentarlo.',
      INVITE_REQUIRED: 'Necesitas una invitación válida para esta dirección de email.',
      EMAIL_TAKEN: 'Ya existe una cuenta con este email: entra con ella.',
      LINK_INVALID: 'Este enlace ya no es válido. Pide uno nuevo.',
      WRONG_PASSWORD: 'La contraseña actual es incorrecta.',
      INVALID: 'Revisa los campos: la contraseña necesita al menos 12 caracteres.',
      ACCOUNT_DISABLED: 'Esta cuenta se ha desactivado. Escríbenos si crees que es un error.'
    }
  },

  history: {
    title: 'Historial de cambios',
    intro: 'Cada change set registra quién lo preparó y lo aprobó, cuándo, y el estado anterior para poder deshacerlo.',
    cols: ['Change set', 'Creado', 'Org', 'Descripción', 'Cambios', 'Estado'],
    notApplied: (n: number) => `${n} sin aplicar`,
    empty: 'Todavía no hay change sets.'
  },

  token: {
    renewedAt: (at: string) => `Token renovado a las ${at}`,
    renewTitle: 'Renovar el token de acceso',
    renewOf: (org: string) => `Renovar el token de ${org}`,
    renewing: 'Renovando…',
    renew: 'Renovar token',
    renewedMsg: (at: string) => `Token de acceso renovado a las ${at}.`,
    refused: (detail: string) => `Salesforce no renovó el token (${detail}). Vuelve a conectar la org.`,
    reconnect: 'Reconectar',
    reconnectNow: (org: string) => `¿Reconectar ${org} ahora?`
  },

  orgs: {
    title: 'Orgs de Salesforce',
    intro: 'La app usa OAuth: nunca ve tu contraseña y actúa con los permisos de tu usuario de Salesforce.',
    connectFailed: (error: string) => `No se pudo conectar: ${error}`,
    connected: 'Orgs conectadas',
    none: 'No hay orgs conectadas. Conecta una con el formulario de al lado.',
    alias: 'Alias',
    readAt: (date: string) => ` · leída el ${date}`,
    rename: 'Renombrar', addAlias: 'Añadir alias', disconnect: 'Desconectar',
    confirmDisconnect: (org: string) => `¿Desconectar ${org}? Se borrará su token guardado.`,
    connectNew: 'Conectar una org nueva',
    aliasPlaceholder: 'p. ej. Acme UAT',
    aliasHelp: 'El nombre con el que verás esta org en la app. Útil porque los sandbox tienen el mismo nombre que producción.',
    environment: 'Entorno',
    myDomain: 'My Domain',
    permsNeeded: 'Permisos que necesita tu usuario',
    permManage: 'Manage Profiles and Permission Sets (para hacer cambios)',
    login: 'Iniciar sesión con Salesforce'
  },

  changeSet: {
    result: 'Resultado', preview: 'Vista previa de los cambios',
    undoes: ' · deshace un change set anterior',
    kpiChanges: 'Cambios', kpiNew: 'Accesos nuevos', kpiChanged: 'Accesos modificados', kpiRemoved: 'Accesos retirados',
    kpiFailed: 'Errores y conflictos', kpiWarnings: 'Con avisos',
    detail: 'Detalle',
    filters: { all: 'Todos', insert: 'Insert', update: 'Update', delete: 'Delete', warn: 'Con avisos', failed: 'Errores' },
    cols: ['Perfil / conjunto de permisos', 'Campo', 'Antes', 'Después', 'Operación', 'Resultado'],
    item: { pending: 'Por aplicar', ok: 'Aplicado', error: 'Error', conflict: 'Conflicto' },
    noRows: 'No hay filas.',
    shown: (n: number, total: number) => `Mostrando ${n} de ${total}.`,
    showMore: 'Mostrar más',
    skipped: 'Excluidos automáticamente',
    approval: 'Aprobación', confirmation: 'Confirmación', twoStep: '2 pasos',
    nothing: 'No hay cambios que aplicar.',
    prodNeedsApproval: 'Org de producción: el change set debe enviarse a aprobación antes de ejecutarse.',
    submit: 'Enviar a aprobación',
    submittedAt: (date: string) => `Enviado el ${date}. Al aprobarlo, la app vuelve a comprobar el estado actual de la org.`,
    reject: 'Rechazar', approve: 'Aprobar',
    conflicts: (n: number) => `${n} filas cambiaron en la org después de la vista previa: se omitirán.`,
    noConflicts: 'Aprobado. Ningún conflicto con el estado actual de la org.',
    typeToConfirm: (org: string) => <>Escribe <b>{org}</b> para confirmar</>,
    reviewed: (n: number) => `He revisado los ${n} cambios`,
    apply: (n: number) => `Aplicar ${n} cambios`,
    running: 'Aplicando… la página se actualiza sola.',
    resumed: (date: string) => `El servidor se reinició mientras este change set se estaba ejecutando. El ${date} OrgFox lo retomó: las filas ya escritas se reconocieron releyendo la org, las demás se aplicaron.`,
    rejected: 'Change set rechazado. Vuelve a la matriz para preparar uno nuevo.',
    allDone: 'Todos los cambios se aplicaron y se comprobaron leyendo de nuevo la org.',
    partial: (ok: number, failed: number) => `${ok} cambios aplicados, ${failed} sin aplicar.`,
    rollback: 'Deshacer estos cambios',
    assign: {
      kind: { layout: 'Formato de página', page: 'Página Lightning' },
      cols: ['Tipo', 'Objeto', 'App', 'Perfil', 'Tipo de registro', 'Antes', 'Después', 'Resultado'],
      kpiCleared: 'Asignaciones de página eliminadas',
      defaultPage: 'Predeterminada (app u org)',
      master: 'Master'
    },
    timing: {
      title: 'Tiempo por paso',
      steps: { 'check org': 'Comprobación en la org', check: 'Comprobación de perfiles, páginas y tipos', 'read app': 'Lectura de la app', 'save app': 'Guardado de la app', 'save profiles': 'Guardado de los perfiles', verify: 'Relectura de verificación' } as Record<string, string>,
      times: (n: number) => n > 1 ? ` (${n} veces)` : '',
      note: 'Guardar una app es Salesforce volviendo a desplegar toda la app: con muchas asignaciones tarda. Si Salesforce rechaza algunos cambios, la app se guarda de nuevo para aislarlos.'
    }
  },

  pick: {
    chosen: (n: number) => n === 1 ? '1 elegido' : `${n} elegidos`,
    removeFilter: (label: string) => `Quitar el filtro ${label}`,
    search: (label: string) => `Buscar ${label.toLowerCase()}`,
    tickAll: (untick: boolean, n: number, searching: boolean) =>
      `${untick ? 'Desmarcar' : 'Marcar'} ${searching ? `los ${n} resultados` : `todos (${n})`}`,
    clear: (n: number) => `Vaciar (${n})`,
    noResults: 'Sin resultados.',
    more: (n: number) => `${n} más: afina la búsqueda.`
  },

  matrix: {
    title: 'Matriz de Field Level Security',
    intro: 'Elige los objetos. Haz clic en una celda para cambiarla, arrastra el ratón sobre varias celdas para elegir el acceso en un menú, o selecciona filas y columnas y aplica una acción en bloque. No se escribe nada hasta que confirmes la vista previa.',
    guide: '? Guía',
    removeObject: (o: string) => `Quitar ${o}`,
    addObject: 'Añadir objeto (p. ej. Account)',
    sent: (n: string) => `Los cambios están en el change set ${n}. Después de aplicarlo, recarga la matriz para ver los valores actualizados.`,
    reload: 'Recargar',
    hiddenWarning: 'No pude leer los campos que tu usuario no ve, así que pueden faltar algunos. Detalle:',
    loading: 'Leyendo campos, perfiles y FieldPermissions…',
    empty: 'Añade uno o más objetos para ver la matriz.',
    fields: 'Campos',
    profilesAndPs: 'Perfiles y conjuntos de permisos',
    kind: { all: 'Perfiles y conjuntos de permisos', profiles: 'Solo perfiles', permsets: 'Solo conjuntos de permisos' },
    quick: { all: 'Todos', none: 'Invisibles para todos', editall: 'Editables por todos', custom: 'Solo personalizados', pending: 'Con cambios' },
    selected: (rows: number, cols: number) => <><b>{rows}</b> campos · <b>{cols}</b> perfiles/conjuntos de permisos seleccionados</>,
    bulk: { read: 'Lectura', edit: 'Lectura y edición', removeEdit: 'Quitar la edición', none: 'Sin acceso' },
    applyToSelection: 'Aplicar a la selección',
    deselect: 'Deseleccionar',
    pending: (n: number) => <><b>{n}</b> cambios pendientes</>,
    discard: 'Descartar',
    preparing: 'Preparando la vista previa…',
    toPreview: 'Ir a la vista previa',
    size: (f: number, c: number) => `${f} campos × ${c} perfiles/conjuntos de permisos`,
    field: 'Campo',
    allColumns: 'Todas las columnas',
    profile: 'Perfil',
    permSet: 'Conj. perm.',
    profileSub: 'perfil',
    counts: (r: number, e: number) => `L ${r} · E ${e}`,
    select: 'seleccionar',
    noObjectRead: 'Sin lectura del objeto',
    objectWarn: 'objeto',
    hiddenTag: 'Oculto para ti',
    hiddenTagTitle: 'Tu usuario no ve este campo: Salesforce no lo devuelve en el describe',
    noFls: 'Sin FLS', readOnly: 'Solo lectura', encrypted: 'Cifrado',
    alwaysTitle: 'Campo sin FLS: siempre visible',
    always: 'siempre',
    before: (v: string) => ` (antes: ${v})`,
    was: (v: string) => `era ${v}`,
    tooMany: (n: string, max: string) => `Demasiados cambios para un solo change set (${n}, máximo ${max}). Repártelos en varios change sets, por ejemplo filtrando los perfiles.`,
    description: (fields: number, ps: number) => `${fields} campos en ${ps} perfiles/conjuntos de permisos`
  },

  apex: {
    matrix: {
      title: 'Acceso a las clases Apex',
      intro: "Qué perfiles y conjuntos de permisos pueden ejecutar cada clase Apex. Haz clic en una celda para activarla o desactivarla, arrastra sobre varias celdas o marca filas y columnas para hacerlo en bloque. Como en la matriz FLS, no se escribe nada hasta que confirmes la vista previa.",
      loading: 'Leyendo clases Apex, perfiles y accesos…',
      fields: 'Clases',
      quick: { all: 'Todas', none: 'Activadas para nadie', editall: 'Activadas para todos', custom: 'Sin las clases de paquetes', pending: 'Con cambios' },
      selected: (rows: number, cols: number) => <><b>{rows}</b> clases · <b>{cols}</b> perfiles/conjuntos de permisos seleccionados</>,
      size: (f: number, c: number) => `${f} clases × ${c} perfiles/conjuntos de permisos`,
      field: 'Clase',
      counts: (r: number, _e: number) => `${r} activadas`,
      description: (fields: number, ps: number) => `Acceso a ${fields} clases Apex en ${ps} perfiles/conjuntos de permisos`
    },
    access: { short: ['—', '✓', '✓'], long: ['Desactivada', 'Activada', 'Activada'] },
    bulk: { enable: 'Activar', disable: 'Desactivar' },
    managed: 'Paquete',
    sheet: 'Clases Apex'
  },

  loads: {
    open: 'Abrir',
    load: { running: 'Cargando…', done: 'Cargado, listo para ver', error: 'Error al cargar' },
    run: { running: 'Aplicando los cambios…', done: 'Ejecución terminada, mira el resultado', error: 'Error en la ejecución' }
  },
  accent: {
    color: 'Color', label: 'Color de la org', change: 'Cambiar el color de la org',
    names: { ember: 'Brasa', amber: 'Ámbar', olive: 'Oliva', emerald: 'Esmeralda', cyan: 'Cian', blue: 'Azul', indigo: 'Índigo', magenta: 'Magenta', sand: 'Arena', slate: 'Pizarra' }
  },

  cellMenu: {
    cells: (n: number) => n === 1 ? '1 celda' : `${n} celdas`,
    editable: (n: number) => ` · ${n} editables`,
    removeEditOnly: 'Quitar solo la edición',
    revert: 'Restaurar los valores de la org',
    clear: 'Cancelar la selección'
  },

  layouts: {
    title: 'Formatos y páginas Lightning',
    intro: 'Para cada objeto: qué formato de página y qué página Lightning ve cada perfil, por tipo de registro. Con Editar asignaciones puedes cambiarlas: los cambios pasan por vista previa y aprobación, como los de FLS.',
    changeObject: 'Cambiar de objeto',
    chooseObject: 'Elige un objeto (p. ej. Account)',
    pageLayout: 'Formato de página',
    lightningPage: 'Página Lightning',
    loadingLayouts: 'Leyendo formatos y asignaciones…',
    loadingPages: 'Leyendo páginas Lightning y asignaciones…',
    empty: 'Elige un objeto para ver sus formatos y páginas Lightning.',
    profiles: 'Perfiles', recordType: 'Tipo de registro', layout: 'Formato',
    onlyGaps: 'Solo con campos no legibles',
    onlySpecific: 'Solo con asignación específica',
    resetFilters: 'Borrar filtros',
    kpiLayouts: 'Formatos de página', kpiUnassigned: 'Sin asignar', kpiProfiles: 'Perfiles',
    kpiGaps: 'Perfiles con campos no legibles', kpiNoAccess: 'Sin acceso al objeto',
    assignments: 'Asignaciones por perfil y tipo de registro',
    profile: 'Perfil',
    inactive: ' (inactivo)',
    noObjectAccess: 'Sin acceso al objeto',
    unreadable: (n: number) => n === 1 ? '1 campo no legible' : `${n} campos no legibles`,
    noProfiles: 'No hay perfiles.',
    gapNote: '"Campos no legibles": campos del formato sobre los que el perfil, por sí solo, no tiene FLS de lectura. Los usuarios solo los ven si un conjunto de permisos se la concede.',
    objectLayouts: 'Formatos de página del objeto',
    layoutCols: ['Formato', 'Campos', 'Perfiles asignados', 'Estado'],
    showLayoutProfiles: 'Mostrar los perfiles que usan este formato',
    inUse: 'En uso',
    unassignedOne: 'Sin asignar',
    source: { 'app-profile': 'App, tipo de registro y perfil', app: 'Predeterminada de la app', org: 'Predeterminada de la org', system: 'Página del sistema' },
    kpiPages: 'Páginas Lightning', kpiPagesUnassigned: 'Sin asignar', kpiApps: 'Apps Lightning',
    kpiAssignments: 'Asignaciones de app, tipo de registro y perfil', kpiOrgDefault: 'Predeterminada de la org',
    systemPage: 'Página del sistema',
    perProfile: 'Página que ve cada perfil',
    defaults: (app: ReactNode, org: ReactNode) => <>Predeterminada de la app: <b>{app}</b>. Predeterminada de la org: <b>{org}</b>.</>,
    systemPageLower: 'página del sistema',
    orgDefault: 'Predeterminada de la org',
    appDefault: (app: string) => `Predeterminada de ${app}`,
    assignedIn: (n: number, app: string) => `${n} perfiles/tipos de registro en ${app}`,
    objectPages: 'Páginas Lightning del objeto',
    pageCols: ['Página', 'Componentes', 'Campos de Dynamic Forms', 'Dónde está asignada'],
    showPageProfiles: 'Mostrar los perfiles que ven esta página',
    pageUnassigned: 'Sin asignar',
    noPages: 'No hay páginas de registro Lightning para este objeto.',
    edit: 'Editar asignaciones', editDone: 'Terminar',
    finishFirst: 'Primero descarta los cambios o ve a la vista previa.',
    setColumn: 'Toda la columna…',
    noSpecific: '(ninguna: predeterminada de la app o la org)',
    device: 'Dispositivo',
    formFactor: { Large: 'Escritorio', Small: 'Teléfono' },
    appNotOn: (app: string, device: string) => `${app} no está activada en ${device}: estas asignaciones no tienen efecto allí.`,
    mirror: 'Aplicar cada cambio a escritorio y teléfono',
    noFullName: 'Salesforce no devolvió el nombre de metadatos de este perfil, así que no se puede editar.',
    layoutEditHint: 'Las celdas cambiadas están resaltadas. No se escribe nada hasta que confirmes la vista previa.',
    pageEditHint: 'Los cambios valen para la app elegida. Quitar una asignación específica devuelve el perfil a la predeterminada de la app o la org.',
    pending: (n: number) => n === 1 ? '1 asignación pendiente' : `${n} asignaciones pendientes`,
    discard: 'Descartar', toPreview: 'Ir a la vista previa', preparing: 'Preparando…',
    description: (n: number, object: string) => n === 1 ? `1 asignación en ${object}` : `${n} asignaciones en ${object}`,
    sent: (n: string) => `Los cambios están en el change set ${n}. Cuando se aplique, recarga para ver las nuevas asignaciones.`,
    reload: 'Recargar'
  },

  export: {
    button: 'Exportar', preparing: 'Generando…',
    generating: (what: string) => `Generando ${what}`,
    ready: (what: string) => `${what} listo, la descarga ha empezado`,
    failed: (what: string) => `No se pudo generar ${what}`,
    stage: { collect: 'Recopilando los datos', write: 'Escribiendo el archivo', compress: 'Empaquetando el archivo' },
    keepOpen: 'Puedes seguir trabajando, solo deja esta página abierta.',
    excel: 'Excel (.xlsx)', excelHint: 'Matriz y una fila por campo y perfil',
    csvGrid: 'CSV, como en pantalla', csvLong: 'CSV, una fila por campo y perfil',
    metadata: 'Metadatos de Salesforce (.zip)', metadataHint: 'Perfiles y conjuntos de permisos para desplegar con sf o guardar en Git',
    metadataChangeSetHint: 'package.xml y el XML de cada perfil y conjunto de permisos, con los valores que fija este change set (todas sus filas)',
    csv: 'CSV',
    scope: (f: number, c: number) => `${f} campos × ${c} perfiles/conjuntos de permisos, con los filtros actuales.`,
    rowsScope: (n: number) => `${n} filas, con los filtros actuales.`,
    pending: (n: number) => n === 1 ? 'Incluye 1 cambio pendiente.' : `Incluye ${n} cambios pendientes.`,
    leftOut: (profiles: number, locked: number) => [
      profiles ? `${profiles} perfiles excluidos: Salesforce no devolvió su nombre de metadatos.` : '',
      locked ? `${locked} conjuntos de permisos gestionados o de grupo excluidos: no se pueden desplegar.` : ''
    ].filter(Boolean).join(' '),
    leftOutRows: (n: number) => `${n} filas excluidas: Salesforce no devolvió el nombre de metadatos de su perfil o conjunto de permisos.`,
    nothing: 'Nada que exportar con los filtros actuales.',
    sheetMatrix: 'Matriz', sheetDetails: 'Detalle', sheetAssignments: 'Asignaciones', sheetLayouts: 'Formatos', sheetPages: 'Páginas', sheetChanges: 'Cambios',
    object: 'Objeto', field: 'Campo', apiName: 'Nombre API', type: 'Tipo', kind: 'Perfil o conjunto de permisos', name: 'Nombre', read: 'Lectura', edit: 'Edición',
    profile: 'Perfil', permSet: 'Conjunto de permisos', warnings: 'Avisos', error: 'Error', source: 'Origen'
  },

  help: {
    title: 'Cómo funciona la matriz FLS',
    menuCells: (n: number) => `${n} celdas`,
    menuCell: '1 celda',
    flow: ['Matriz', 'Vista previa', 'Aprobación', 'Aplicado'],
    flowNote: 'La aprobación solo se necesita en producción',
    pickPill: 'Perfiles: 2 elegidos',
    sections: {
      read: {
        title: 'Leer la matriz',
        body: <>Cada fila es un campo, cada columna un perfil o conjunto de permisos. En la cabecera de la columna, <b>L</b> y <b>E</b> cuentan los campos legibles y editables. Las celdas rayadas no se pueden cambiar: campos sin FLS, conjuntos de permisos de paquetes gestionados, grupos y silenciamiento. "Oculto para ti" indica un campo que tu usuario no ve.</>
      },
      click: {
        title: 'Cambiar una celda',
        body: <>Un clic hace girar la celda: sin acceso, lectura, lectura y edición. Los campos de fórmula y de solo lectura solo alternan entre sin acceso y lectura. La celda cambiada se vuelve morada y recuerda el valor anterior.</>
      },
      drag: {
        title: 'Seleccionar varias celdas arrastrando',
        body: <>Mantén pulsado el ratón sobre una celda y arrastra: al soltarlo se abre un menú para elegir el acceso de todo el bloque. Cerca de los bordes la tabla se desplaza sola. Con <kbd>Mayús</kbd> + clic amplías la selección hasta otra celda, con <kbd>Esc</kbd> la cancelas. Desde el menú también puedes restaurar los valores de la org.</>
      },
      right: {
        title: 'Menú del botón derecho',
        body: <>El botón derecho abre el mismo menú sobre la celda bajo el ratón, o sobre toda la selección si la celda forma parte de ella.</>
      },
      bulk: {
        title: 'Acciones en bloque sobre filas y columnas',
        body: <>Marca campos a la izquierda y perfiles en la cabecera de las columnas, elige la acción en la barra naranja y pulsa <b>Aplicar a la selección</b>. La acción vale para todos los cruces, incluso fuera de la pantalla. "Todas las columnas" selecciona las columnas filtradas.</>
      },
      filter: {
        title: 'Buscar y filtrar',
        body: <>Los filtros <b>Campos</b> y <b>Perfiles y conjuntos de permisos</b> se abren con un clic: busca y marca solo los resultados que necesitas. Si buscas "sales" y encuentras tres perfiles, puedes quedarte con dos. <b>Marcar los resultados</b> los toma todos, <b>Vaciar</b> o la × quitan el filtro, y sin nada marcado se ven todos. También hay filtros rápidos: campos invisibles para todos, editables por todos, solo personalizados, o con cambios pendientes. Los contadores de las columnas siguen los filtros.</>
      },
      export: {
        title: 'Exportar',
        body: <><b>Exportar</b> guarda lo que ves: los campos y perfiles filtrados, con los cambios pendientes. El <b>Excel</b> tiene dos hojas, la matriz como en pantalla y una fila por campo y perfil; los dos <b>CSV</b> tienen las mismas formas. Los <b>metadatos de Salesforce</b> son un zip con package.xml y un archivo por perfil y conjunto de permisos, listo para <code>sf project deploy</code> o Git; los conjuntos gestionados o de grupo quedan fuera. Mientras se genera el archivo el botón queda bloqueado y un panel abajo a la derecha muestra el avance, así que puedes seguir trabajando. Los change sets y Formatos y páginas también tienen su botón Exportar.</>
      },
      flow: {
        title: 'De la vista previa a Salesforce',
        body: <>No se escribe nada hasta que confirmas. <b>Ir a la vista previa</b> crea un change set con los cambios pendientes y lo abre en una pestaña. En producción hace falta una aprobación y debes escribir el nombre de la org. Cada change set se puede deshacer desde el Historial.</>
      }
    }
  }
};
