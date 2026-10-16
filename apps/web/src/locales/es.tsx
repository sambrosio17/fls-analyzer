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
    orgs: 'Orgs', history: 'Historial', logout: 'Salir',
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

  login: { password: 'Contraseña', wrong: 'Contraseña incorrecta.', submit: 'Entrar' },

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
    rejected: 'Change set rechazado. Vuelve a la matriz para preparar uno nuevo.',
    allDone: 'Todos los cambios se aplicaron y se comprobaron leyendo de nuevo la org.',
    partial: (ok: number, failed: number) => `${ok} cambios aplicados, ${failed} sin aplicar.`,
    rollback: 'Deshacer estos cambios'
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
    intro: 'Para cada objeto: qué formato de página y qué página Lightning ve cada perfil, por tipo de registro. En esta versión la sección es de solo lectura.',
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
    perProfile: 'Página que ve cada perfil (escritorio)',
    defaults: (app: ReactNode, org: ReactNode) => <>Predeterminada de la app: <b>{app}</b>. Predeterminada de la org: <b>{org}</b>.</>,
    systemPageLower: 'página del sistema',
    orgDefault: 'Predeterminada de la org',
    appDefault: (app: string) => `Predeterminada de ${app}`,
    assignedIn: (n: number, app: string) => `${n} perfiles/tipos de registro en ${app}`,
    objectPages: 'Páginas Lightning del objeto',
    pageCols: ['Página', 'Componentes', 'Campos de Dynamic Forms', 'Dónde está asignada'],
    showPageProfiles: 'Mostrar los perfiles que ven esta página',
    pageUnassigned: 'Sin asignar',
    noPages: 'No hay páginas de registro Lightning para este objeto.'
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
    csv: 'CSV',
    scope: (f: number, c: number) => `${f} campos × ${c} perfiles/conjuntos de permisos, con los filtros actuales.`,
    rowsScope: (n: number) => `${n} filas, con los filtros actuales.`,
    pending: (n: number) => n === 1 ? 'Incluye 1 cambio pendiente.' : `Incluye ${n} cambios pendientes.`,
    leftOut: (profiles: number, locked: number) => [
      profiles ? `${profiles} perfiles excluidos: Salesforce no devolvió su nombre de metadatos.` : '',
      locked ? `${locked} conjuntos de permisos gestionados o de grupo excluidos: no se pueden desplegar.` : ''
    ].filter(Boolean).join(' '),
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
