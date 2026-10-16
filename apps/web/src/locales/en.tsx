import type { ReactNode } from 'react';

/**
 * English, the source language. Every other locale must provide the same keys with the same shape:
 * plain strings, or functions for text with values in it.
 */
export const en = {
  locale: 'en-US',
  language: 'Language',
  common: {
    close: 'Close', cancel: 'Cancel', save: 'Save', open: 'Open', loading: 'Loading…',
    sandbox: 'Sandbox', production: 'Production', all: 'all', none: 'none'
  },
  access: {
    short: ['—', 'R', 'R+E'],
    long: ['No access', 'Read', 'Read and edit'],
    pending: 'Pending change',
    locked: 'Not editable'
  },
  status: {
    draft: 'Draft', pending_approval: 'Awaiting approval', approved: 'Approved', rejected: 'Rejected',
    running: 'Running', done: 'Completed', partial: 'Partial', failed: 'Failed'
  } as Record<string, string>,
  warning: {
    CALCULATED_READ_ONLY: 'Calculated field: only read access was applied.',
    NO_OBJECT_ACCESS: 'No read access on the object: the field will stay hidden.'
  } as Record<string, string>,
  skip: {
    NOT_PERMISSIONABLE: 'Fields without FLS',
    MANAGED_PERMISSION_SET: 'Permission sets from managed packages',
    GROUP_PERMISSION_SET: 'Permission set groups or muting',
    UNKNOWN_FIELD: 'Fields not found',
    UNKNOWN_PERMISSION_SET: 'Profiles or permission sets not found',
    NO_CHANGE: 'Already set to the requested value'
  } as Record<string, string>,
  tools: { matrix: 'FLS matrix', apex: 'Apex classes', layouts: 'Layouts and pages', changeset: 'Change sets' },

  app: {
    guide: 'Guide', news: 'What’s new', newsUnread: 'New changes to read',
    orgs: 'Orgs', history: 'History', logout: 'Log out',
    openOrgs: 'Open orgs', toolsLabel: 'Tools', openObjects: 'Open objects', openChangeSets: 'Open change sets',
    closeX: (name: string) => `Close ${name}`,
    openOrg: 'Open an org',
    allOpen: 'All connected orgs are already open.',
    noOrgs: 'No connected orgs.',
    manageOrgs: 'Connect or manage orgs…',
    newObject: 'New object',
    apexTab: 'Apex classes',
    changeSet: 'Change set',
    noOrgOpen: (orgsButton: ReactNode) => <>No org is open. Open one with <b>+</b> above or from the {orgsButton} page.</>,
    noChangeSetOpen: 'No change set is open. They open here when you send the matrix changes to preview, or from History.',
    noObjectOpen: 'No object is open.',
    openObject: 'Open an object',
    confirmCloseTab: 'This tab has changes not yet sent to preview. Close it and lose them?',
    confirmCloseOrg: 'Some tabs in this org have changes not yet sent to preview. Close it and lose them?'
  },

  guide: {
    title: 'Orgsmith guide',
    intro: 'Everything Orgsmith does, with short animations. New features are listed in What’s new and link back here.',
    groups: { start: 'Getting started', matrix: 'FLS matrix', tools: 'Other tools', apply: 'Change sets and exports', more: 'More' },
    sections: {
      orgs: { title: 'Connect an org', body: <>On the <b>Orgs</b> page, give the org an alias, pick Production, Sandbox or My Domain and log in with Salesforce: Orgsmith never sees your password and acts with your own user's permissions. Give each org one of 10 <b>colours</b>; the work area takes the colour of the open org. <b>Renew token</b> logs in again when the session expires.</> },
      tabs: { title: 'Work tabs', body: <>Tabs go on three levels: the open <b>orgs</b>, the <b>tool</b> of the active org (FLS matrix, Apex classes, Layouts and pages, Change sets) and the <b>objects</b> open in that tool. Each object tab keeps its filters and pending changes. <b>Drag</b> a tab to move it, or use <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>←</kbd>/<kbd>→</kbd>. The coloured dot on an org tab changes its colour, ↻ renews its session, a middle click closes a tab.</> },
      notices: { title: 'Slow loads in the background', body: <>Loads keep going when you change tab. If you leave a tab while it loads a matrix, layouts or runs a change set, a panel at the bottom right follows it and says when it is ready; <b>Open</b> takes you back. Coming back to the tab clears the notice.</> },
      apex: { title: 'Apex classes', body: <>Which profiles and permission sets can run each Apex class. It works like the FLS matrix with two states, enabled or not: click, drag, right click and bulk actions, then preview and approval. Managed package classes can be hidden with a filter.</> },
      layouts: { title: 'Layouts and pages', body: <>Pick an object to see, for each profile and record type, which <b>page layout</b> and which <b>Lightning page</b> it gets (by app, record type and org default), and the layout fields the profile cannot read. With <b>Edit assignments</b> you change them cell by cell, or a whole column with <b>Whole column…</b>; edited cells turn purple. <b>Go to preview</b> makes a change set, applied like FLS changes. For Lightning pages the change applies to the chosen app, and removing a specific assignment sends the profile back to the app or org default. <b>Desktop</b> and <b>Phone</b> have separate assignments: switch between them next to the app, and while editing tick “Apply each change to desktop and phone” to change both. If Salesforce refuses some changes, the others still go through and the result shows the time each step took.</> },
      changesets: { title: 'Change sets', body: <>Nothing is written until you confirm. <b>Go to preview</b> turns pending changes into a change set with what is added, changed and removed, and warnings. In production it needs approval and the org name typed in. Running it shows progress and the result per row.</> },
      export: { title: 'Export', body: <>The <b>Export</b> button saves what you see: the matrix as Excel or CSV or as Salesforce metadata (package.xml and one file per profile and permission set), change sets as Excel, CSV or metadata with the values they set, and layouts as Excel or CSV. A panel at the bottom right shows the progress of big files.</> },
      history: { title: 'History and undo', body: <><b>History</b> lists every change set with who prepared and approved it and when. Each one keeps the values from before, so <b>Undo these changes</b>, in the change set, creates a change set that restores them.</> },
      settings: { title: 'Language and session', body: <>Pick English, Italiano, Français or Español from the menu with the flags. <b>Log out</b> ends the Orgsmith session; your orgs stay connected.</> }
    }
  },

  news: { title: 'What’s new', intro: 'Every change to Orgsmith, newest first.', seeGuide: 'See in the guide' },

  login: { password: 'Password', wrong: 'Wrong password.', submit: 'Log in' },

  history: {
    title: 'Change history',
    intro: 'Each change set records who prepared and approved it, when, and the previous state so it can be undone.',
    cols: ['Change set', 'Created', 'Org', 'Description', 'Changes', 'Status'],
    notApplied: (n: number) => `${n} not applied`,
    empty: 'No change sets yet.'
  },

  token: {
    renewedAt: (at: string) => `Token renewed at ${at}`,
    renewTitle: 'Renew the access token',
    renewOf: (org: string) => `Renew the token for ${org}`,
    renewing: 'Renewing…',
    renew: 'Renew token',
    renewedMsg: (at: string) => `Access token renewed at ${at}.`,
    refused: (detail: string) => `Salesforce did not renew the token (${detail}). Log in to the org again.`,
    reconnect: 'Reconnect',
    reconnectNow: (org: string) => `Reconnect ${org} now?`
  },

  orgs: {
    title: 'Salesforce orgs',
    intro: 'The app uses OAuth: it never sees your password and acts with the permissions of your Salesforce user.',
    connectFailed: (error: string) => `Connection failed: ${error}`,
    connected: 'Connected orgs',
    none: 'No connected orgs. Connect one with the form next to this list.',
    alias: 'Alias',
    readAt: (date: string) => ` · read on ${date}`,
    rename: 'Rename', addAlias: 'Add alias', disconnect: 'Disconnect',
    confirmDisconnect: (org: string) => `Disconnect ${org}? Its saved token will be deleted.`,
    connectNew: 'Connect a new org',
    aliasPlaceholder: 'e.g. Acme UAT',
    aliasHelp: 'The name you will see for this org in the app. Useful because sandboxes have the same name as production.',
    environment: 'Environment',
    myDomain: 'My Domain',
    permsNeeded: 'Permissions your user needs',
    permManage: 'Manage Profiles and Permission Sets (to make changes)',
    login: 'Log in with Salesforce'
  },

  changeSet: {
    result: 'Result', preview: 'Change preview',
    undoes: ' · undoes an earlier change set',
    kpiChanges: 'Changes', kpiNew: 'New access', kpiChanged: 'Changed access', kpiRemoved: 'Removed access',
    kpiFailed: 'Errors and conflicts', kpiWarnings: 'With warnings',
    detail: 'Details',
    filters: { all: 'All', insert: 'Insert', update: 'Update', delete: 'Delete', warn: 'With warnings', failed: 'Errors' },
    cols: ['Profile / permission set', 'Field', 'Before', 'After', 'Operation', 'Outcome'],
    item: { pending: 'To apply', ok: 'Applied', error: 'Error', conflict: 'Conflict' } as Record<string, string>,
    noRows: 'No rows.',
    shown: (n: number, total: number) => `Showing ${n} of ${total}.`,
    showMore: 'Show more',
    skipped: 'Skipped automatically',
    approval: 'Approval', confirmation: 'Confirmation', twoStep: '2 steps',
    nothing: 'No changes to apply.',
    prodNeedsApproval: 'Production org: the change set must be sent for approval before it runs.',
    submit: 'Send for approval',
    submittedAt: (date: string) => `Sent on ${date}. Approving it makes the app check the org's current state again.`,
    reject: 'Reject', approve: 'Approve',
    conflicts: (n: number) => `${n} rows changed in the org after the preview: they will be skipped.`,
    noConflicts: "Approved. No conflicts with the org's current state.",
    typeToConfirm: (org: string) => <>Type <b>{org}</b> to confirm</>,
    reviewed: (n: number) => `I have reviewed the ${n} changes`,
    apply: (n: number) => `Apply ${n} changes`,
    running: 'Applying… the page updates by itself.',
    rejected: 'Change set rejected. Go back to the matrix to prepare a new one.',
    allDone: 'All changes were applied and checked by reading the org again.',
    partial: (ok: number, failed: number) => `${ok} changes applied, ${failed} not applied.`,
    rollback: 'Undo these changes',
    assign: {
      kind: { layout: 'Page layout', page: 'Lightning page' },
      cols: ['Type', 'Object', 'App', 'Profile', 'Record type', 'Before', 'After', 'Result'],
      kpiCleared: 'Page assignments removed',
      defaultPage: 'Default (app or org)',
      master: 'Master'
    },
    timing: {
      title: 'Time per step',
      steps: { 'check org': 'Check against the org', check: 'Check profiles, pages and record types', 'read app': 'Read the app', 'save app': 'Save the app', 'save profiles': 'Save the profiles', verify: 'Read back to verify' } as Record<string, string>,
      times: (n: number) => n > 1 ? ` (${n} times)` : '',
      note: 'Saving an app is Salesforce redeploying the whole app: with many overrides it takes a while. When Salesforce refuses some changes, the app is saved again to isolate them.'
    }
  },

  pick: {
    chosen: (n: number) => `${n} selected`,
    removeFilter: (label: string) => `Remove the ${label} filter`,
    search: (label: string) => `Search ${label.toLowerCase()}`,
    tickAll: (untick: boolean, n: number, searching: boolean) =>
      `${untick ? 'Untick' : 'Tick'} ${searching ? `the ${n} results` : `all (${n})`}`,
    clear: (n: number) => `Clear (${n})`,
    noResults: 'No results.',
    more: (n: number) => `${n} more: refine the search.`
  },

  matrix: {
    title: 'Field Level Security matrix',
    intro: 'Choose the objects. Click a cell to change it, drag the mouse over several cells to pick their access from a menu, or select rows and columns and apply a bulk action. Nothing is written until you confirm the preview.',
    guide: '? Guide',
    removeObject: (o: string) => `Remove ${o}`,
    addObject: 'Add object (e.g. Account)',
    sent: (n: string) => `The changes are in change set ${n}. After applying it, reload the matrix to see the updated values.`,
    reload: 'Reload',
    hiddenWarning: "I couldn't read the fields your user can't see, so some may be missing. Details:",
    loading: 'Reading fields, profiles and FieldPermissions…',
    empty: 'Add one or more objects to see the matrix.',
    fields: 'Fields',
    profilesAndPs: 'Profiles and permission sets',
    kind: { all: 'Profiles and permission sets', profiles: 'Profiles only', permsets: 'Permission sets only' },
    quick: { all: 'All', none: 'Hidden from everyone', editall: 'Editable by all', custom: 'Custom only', pending: 'With changes' },
    selected: (rows: number, cols: number) => <><b>{rows}</b> fields · <b>{cols}</b> profiles/permission sets selected</>,
    bulk: { read: 'Read', edit: 'Read and edit', removeEdit: 'Remove edit', none: 'No access' },
    applyToSelection: 'Apply to selection',
    deselect: 'Clear selection',
    pending: (n: number) => <><b>{n}</b> pending changes</>,
    discard: 'Discard',
    preparing: 'Preparing the preview…',
    toPreview: 'Go to preview',
    size: (f: number, c: number) => `${f} fields × ${c} profiles/permission sets`,
    field: 'Field',
    allColumns: 'All columns',
    profile: 'Profile',
    permSet: 'Perm. set',
    profileSub: 'profile',
    counts: (r: number, e: number) => `R ${r} · E ${e}`,
    select: 'select',
    noObjectRead: 'No read access on the object',
    objectWarn: 'object',
    hiddenTag: 'Hidden from you',
    hiddenTagTitle: "Your user can't see this field: Salesforce does not return it in the describe",
    noFls: 'No FLS', readOnly: 'Read only', encrypted: 'Encrypted',
    alwaysTitle: 'Field without FLS: always visible',
    always: 'always',
    before: (v: string) => ` (before: ${v})`,
    was: (v: string) => `was ${v}`,
    tooMany: (n: string, max: string) => `Too many changes for one change set (${n}, at most ${max}). Split them into several change sets, for example by filtering the profiles.`,
    description: (fields: number, ps: number) => `${fields} fields on ${ps} profiles/permission sets`
  },

  apex: {
    matrix: {
      title: 'Apex class access',
      intro: "Which profiles and permission sets can run each Apex class. Click a cell to enable or disable it, drag over several cells, or tick rows and columns to do it in bulk. As in the FLS matrix, nothing is written until you confirm the preview.",
      loading: 'Reading Apex classes, profiles and access…',
      fields: 'Classes',
      quick: { all: 'All', none: 'Enabled for no one', editall: 'Enabled for all', custom: 'Without package classes', pending: 'With changes' },
      selected: (rows: number, cols: number) => <><b>{rows}</b> classes · <b>{cols}</b> profiles/permission sets selected</>,
      size: (f: number, c: number) => `${f} classes × ${c} profiles/permission sets`,
      field: 'Class',
      counts: (r: number, _e: number) => `${r} enabled`,
      description: (fields: number, ps: number) => `Access to ${fields} Apex classes on ${ps} profiles/permission sets`
    },
    access: { short: ['—', '✓', '✓'], long: ['Disabled', 'Enabled', 'Enabled'] },
    bulk: { enable: 'Enable', disable: 'Disable' },
    managed: 'Package',
    sheet: 'Apex classes'
  },

  loads: {
    open: 'Open',
    load: { running: 'Loading…', done: 'Loaded, ready to view', error: 'Loading failed' },
    run: { running: 'Applying changes…', done: 'Run finished, see the result', error: 'Run failed' }
  },
  accent: {
    color: 'Color', label: 'Org color', change: 'Change the org color',
    names: { ember: 'Ember', amber: 'Amber', olive: 'Olive', emerald: 'Emerald', cyan: 'Cyan', blue: 'Blue', indigo: 'Indigo', magenta: 'Magenta', sand: 'Sand', slate: 'Slate' }
  },

  cellMenu: {
    cells: (n: number) => n === 1 ? '1 cell' : `${n} cells`,
    editable: (n: number) => ` · ${n} editable`,
    removeEditOnly: 'Remove edit only',
    revert: 'Restore the org values',
    clear: 'Clear selection'
  },

  layouts: {
    title: 'Layouts and Lightning pages',
    intro: 'For each object: which page layout and which Lightning page each profile sees, per record type. Click Edit assignments to change them: the changes go through preview and approval, like FLS changes.',
    changeObject: 'Change object',
    chooseObject: 'Choose an object (e.g. Account)',
    pageLayout: 'Page layout',
    lightningPage: 'Lightning page',
    loadingLayouts: 'Reading layouts and assignments…',
    loadingPages: 'Reading Lightning pages and assignments…',
    empty: 'Choose an object to see its layouts and Lightning pages.',
    profiles: 'Profiles', recordType: 'Record type', layout: 'Layout',
    onlyGaps: 'Only with unreadable fields',
    onlySpecific: 'Only with a specific assignment',
    resetFilters: 'Clear filters',
    kpiLayouts: 'Page layouts', kpiUnassigned: 'Unassigned', kpiProfiles: 'Profiles',
    kpiGaps: 'Profiles with unreadable fields', kpiNoAccess: 'No access to the object',
    assignments: 'Assignments by profile and record type',
    profile: 'Profile',
    inactive: ' (inactive)',
    noObjectAccess: 'No access to the object',
    unreadable: (n: number) => n === 1 ? '1 unreadable field' : `${n} unreadable fields`,
    noProfiles: 'No profiles.',
    gapNote: '"Unreadable fields": fields on the layout that the profile alone has no read FLS for. Users see them only if a permission set grants it.',
    objectLayouts: "The object's page layouts",
    layoutCols: ['Layout', 'Fields', 'Assigned profiles', 'Status'],
    showLayoutProfiles: 'Show the profiles that use this layout',
    inUse: 'In use',
    unassignedOne: 'Unassigned',
    source: { 'app-profile': 'App, record type and profile', app: 'App default', org: 'Org default', system: 'System page' } as Record<string, string>,
    kpiPages: 'Lightning pages', kpiPagesUnassigned: 'Unassigned', kpiApps: 'Lightning apps',
    kpiAssignments: 'App, record type and profile assignments', kpiOrgDefault: 'Org default',
    systemPage: 'System page',
    perProfile: 'Page each profile sees',
    defaults: (app: ReactNode, org: ReactNode) => <>App default: <b>{app}</b>. Org default: <b>{org}</b>.</>,
    systemPageLower: 'system page',
    orgDefault: 'Org default',
    appDefault: (app: string) => `Default for ${app}`,
    assignedIn: (n: number, app: string) => `${n} profiles/record types in ${app}`,
    objectPages: "The object's Lightning pages",
    pageCols: ['Page', 'Components', 'Dynamic Forms fields', 'Where it is assigned'],
    showPageProfiles: 'Show the profiles that see this page',
    pageUnassigned: 'Unassigned',
    noPages: 'No Lightning record pages for this object.',
    edit: 'Edit assignments', editDone: 'Done editing',
    finishFirst: 'Discard the changes or go to the preview first.',
    setColumn: 'Whole column…',
    noSpecific: '(none: app or org default)',
    device: 'Device',
    formFactor: { Large: 'Desktop', Small: 'Phone' },
    appNotOn: (app: string, device: string) => `${app} is not enabled on ${device}: these assignments have no effect there.`,
    mirror: 'Apply each change to desktop and phone',
    noFullName: 'Salesforce did not return the metadata name of this profile, so it cannot be edited.',
    layoutEditHint: 'Changed cells are highlighted. Nothing is written until you confirm the preview.',
    pageEditHint: "Changes apply to the chosen app. Removing a specific assignment sends the profile back to the app or org default.",
    pending: (n: number) => n === 1 ? '1 assignment pending' : `${n} assignments pending`,
    discard: 'Discard', toPreview: 'Go to preview', preparing: 'Preparing…',
    description: (n: number, object: string) => n === 1 ? `1 assignment on ${object}` : `${n} assignments on ${object}`,
    sent: (n: string) => `The changes are in change set ${n}. Once it is applied, reload to see the new assignments.`,
    reload: 'Reload'
  },

  export: {
    button: 'Export', preparing: 'Generating…',
    generating: (what: string) => `Generating ${what}`,
    ready: (what: string) => `${what} ready, the download has started`,
    failed: (what: string) => `${what} could not be generated`,
    stage: { collect: 'Collecting the data', write: 'Writing the file', compress: 'Packing the file' },
    keepOpen: 'You can keep working, just leave this page open.',
    excel: 'Excel (.xlsx)', excelHint: 'Matrix and one row per field and profile',
    csvGrid: 'CSV, as shown', csvLong: 'CSV, one row per field and profile',
    metadata: 'Salesforce metadata (.zip)', metadataHint: 'Profiles and permission sets to deploy with sf or keep in Git',
    metadataChangeSetHint: 'package.xml and the XML of each profile and permission set, with the values this change set sets (all its rows)',
    csv: 'CSV',
    scope: (f: number, c: number) => `${f} fields × ${c} profiles/permission sets, with the current filters.`,
    rowsScope: (n: number) => `${n} rows, with the current filters.`,
    pending: (n: number) => n === 1 ? 'Includes 1 pending change.' : `Includes ${n} pending changes.`,
    leftOut: (profiles: number, locked: number) => [
      profiles ? `${profiles} profiles left out: Salesforce did not return their metadata name.` : '',
      locked ? `${locked} managed or group permission sets left out: they can't be deployed.` : ''
    ].filter(Boolean).join(' '),
    leftOutRows: (n: number) => `${n} rows left out: Salesforce did not return the metadata name of their profile or permission set.`,
    nothing: 'Nothing to export with the current filters.',
    sheetMatrix: 'Matrix', sheetDetails: 'Details', sheetAssignments: 'Assignments', sheetLayouts: 'Layouts', sheetPages: 'Pages', sheetChanges: 'Changes',
    object: 'Object', field: 'Field', apiName: 'API name', type: 'Type', kind: 'Profile or permission set', name: 'Name', read: 'Read', edit: 'Edit',
    profile: 'Profile', permSet: 'Permission set', warnings: 'Warnings', error: 'Error', source: 'Source'
  },

  help: {
    title: 'How the FLS matrix works',
    menuCells: (n: number) => `${n} cells`,
    menuCell: '1 cell',
    flow: ['Matrix', 'Preview', 'Approval', 'Applied'],
    flowNote: 'Approval is needed only in production',
    pickPill: 'Profiles: 2 selected',
    sections: {
      read: {
        title: 'Reading the matrix',
        body: <>Each row is a field, each column a profile or permission set. At the top of a column, <b>R</b> and <b>E</b> count the readable and editable fields. Hatched cells can't be changed: fields without FLS, permission sets from managed packages, groups and muting. "Hidden from you" marks a field your user can't see.</>
      },
      click: {
        title: 'Changing a cell',
        body: <>A click cycles the cell: no access, read, read and edit. Formula and read-only fields only switch between no access and read. A changed cell turns purple and remembers its previous value.</>
      },
      drag: {
        title: 'Selecting several cells by dragging',
        body: <>Hold the mouse button down on a cell and drag: when you release it, a menu opens to choose the access for the whole block. Near the edges the table scrolls by itself. <kbd>Shift</kbd> + click extends the selection to another cell, <kbd>Esc</kbd> cancels it. The menu can also restore the org values.</>
      },
      right: {
        title: 'Right-click menu',
        body: <>Right-click opens the same menu on the cell under the mouse, or on the whole selection if the cell is part of it.</>
      },
      bulk: {
        title: 'Bulk actions on rows and columns',
        body: <>Tick fields on the left and profiles at the top of the columns, choose the action in the orange bar and press <b>Apply to selection</b>. The action applies to every crossing, even off screen. "All columns" selects the filtered columns.</>
      },
      filter: {
        title: 'Searching and filtering',
        body: <>The <b>Fields</b> and <b>Profiles and permission sets</b> filters open with a click: search, then tick only the results you need. If you search "sales" and find three profiles, you can keep two. <b>Tick the results</b> takes them all, <b>Clear</b> or the × removes the filter, and nothing ticked means all. There are also quick filters: fields hidden from everyone, editable by all, custom only, or with pending changes. The counts at the top of the columns follow the filters.</>
      },
      export: {
        title: 'Exporting',
        body: <><b>Export</b> saves what you see: the filtered fields and profiles, pending changes included. <b>Excel</b> has two sheets, the matrix as shown and one row per field and profile; the two <b>CSV</b> files have the same shapes. <b>Salesforce metadata</b> is a zip with package.xml and one file per profile and permission set, ready for <code>sf project deploy</code> or Git; managed and group permission sets are left out. While the file is generated the button is locked and a panel at the bottom right shows the progress, so you can keep working. Change sets and Layouts and pages have their own Export button.</>
      },
      flow: {
        title: 'From preview to Salesforce',
        body: <>Nothing is written until you confirm. <b>Go to preview</b> creates a change set with the pending changes and opens it in a tab. In production it needs an approval and you must type the org name. Every change set can be undone from History.</>
      }
    }
  }
};

export type Messages = typeof en;
