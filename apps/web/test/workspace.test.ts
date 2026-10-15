import { describe, expect, it } from 'vitest';
import { closeTab, loadWorkspace, openTab, pruneTabs, tabTitle, updateTab, type Workspace } from '../src/workspace.ts';

const empty: Workspace = { tabs: [], active: null };

describe('workspace tabs', () => {
  it('opens tabs next to the active one and activates them', () => {
    let ws = openTab(empty, { orgId: 'a', tool: 'matrix', objects: [] });
    const first = ws.active!;
    ws = openTab(ws, { orgId: 'b', tool: 'layouts', objects: [] });
    ws = { ...ws, active: first };
    ws = openTab(ws, { orgId: 'c', tool: 'matrix', objects: [] });
    expect(ws.tabs.map(t => t.orgId)).toEqual(['a', 'c', 'b']);
    expect(ws.tabs.find(t => t.id === ws.active)!.orgId).toBe('c');
  });

  it('activates the right neighbour, else the left one, when closing the active tab', () => {
    let ws = empty;
    for (const o of ['a', 'b', 'c']) ws = openTab(ws, { orgId: o, tool: 'matrix', objects: [] });
    const [a, b, c] = ws.tabs.map(t => t.id);
    ws = closeTab({ ...ws, active: b! }, b!);
    expect(ws.active).toBe(c);
    ws = closeTab(ws, c!);
    expect(ws.active).toBe(a);
    ws = closeTab(ws, a!);
    expect(ws).toEqual(empty);
  });

  it('keeps the active tab when closing another one', () => {
    let ws = openTab(empty, { orgId: 'a', tool: 'matrix', objects: [] });
    ws = openTab(ws, { orgId: 'b', tool: 'matrix', objects: [] });
    expect(closeTab(ws, ws.tabs[0]!.id).active).toBe(ws.active);
  });

  it('drops tabs of disconnected orgs but keeps new tabs without an org', () => {
    let ws = openTab(empty, { orgId: 'a', tool: 'matrix', objects: [] });
    ws = openTab(ws, { orgId: null, tool: null, objects: [] });
    ws = openTab(ws, { orgId: 'b', tool: 'layouts', objects: [] });
    expect(pruneTabs(ws, ['a']).tabs.map(t => t.orgId)).toEqual(['a', null]);
  });

  it('titles a tab as org, tool and objects', () => {
    let ws = openTab(empty, { orgId: 'a', tool: null, objects: [] });
    const id = ws.active!;
    expect(tabTitle(ws.tabs[0]!, 'Acme UAT')).toEqual(['Acme UAT']);
    ws = updateTab(ws, id, { tool: 'matrix', objects: ['Account', 'Contact'] });
    expect(tabTitle(ws.tabs[0]!, 'Acme UAT')).toEqual(['Acme UAT', 'Matrice FLS', 'Account, Contact']);
  });

  it('survives missing or corrupt storage', () => {
    expect(loadWorkspace(null)).toEqual(empty);
    expect(loadWorkspace({ getItem: () => '{nope' })).toEqual(empty);
    expect(loadWorkspace({ getItem: () => { throw new Error('blocked'); } })).toEqual(empty);
  });
});
