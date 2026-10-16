import { describe, expect, it } from 'vitest';
import {
  EMPTY, closeOrg, closeTab, groupTabs, loadWorkspace, moveOrg, moveTab, newObjectTab, openChangeSet, openOrg, pruneOrgs, selectTab, selectTool,
  tabTitle, toolOf, updateTab, visibleTab
} from '../src/workspace.ts';

describe('workspace tabs', () => {
  it('reorders org tabs and object tabs, keeping object tabs inside their group', () => {
    let ws = ['a', 'b', 'c'].reduce(openOrg, EMPTY);
    expect(moveOrg(ws, 'c', 'a').orgs).toEqual(['c', 'a', 'b']);
    expect(moveOrg(ws, 'a', null).orgs).toEqual(['b', 'c', 'a']);
    expect(moveOrg(ws, 'b', 'c')).toBe(ws);
    ws = newObjectTab(newObjectTab(openOrg(ws, 'a'), 'a', 'matrix'), 'a', 'matrix');
    const ids = groupTabs(ws, 'a', 'matrix').map(t => t.id);
    expect(ids).toHaveLength(3);
    const last = moveTab(ws, ids[0]!, null);
    expect(groupTabs(last, 'a', 'matrix').map(t => t.id)).toEqual([ids[1], ids[2], ids[0]]);
    expect(groupTabs(moveTab(ws, ids[2]!, ids[0]!), 'a', 'matrix').map(t => t.id)).toEqual([ids[2], ids[0], ids[1]]);
    // Other orgs' tabs stay where they were, and a tab can't move into another group.
    expect(last.tabs.filter(t => t.orgId !== 'a')).toEqual(ws.tabs.filter(t => t.orgId !== 'a'));
    expect(moveTab(ws, ids[0]!, groupTabs(ws, 'b', 'matrix')[0]!.id)).toBe(ws);
  });

  it('opens an org on the FLS matrix with an empty object tab', () => {
    const ws = openOrg(EMPTY, 'a');
    expect(ws.orgs).toEqual(['a']);
    expect(toolOf(ws, 'a')).toBe('matrix');
    expect(tabTitle(visibleTab(ws)!, { changeSet: 'Change set', newObject: 'New object', apexTab: 'Apex classes' })).toBe('New object');
    expect(openOrg(ws, 'a').tabs).toHaveLength(1);
  });

  it('opens the Apex tool on the ApexClass pseudo-object, with its own title', () => {
    const ws = selectTool(openOrg(EMPTY, 'a'), 'a', 'apex');
    expect(visibleTab(ws)!.objects).toEqual(['ApexClass']);
    expect(tabTitle(visibleTab(ws)!, { changeSet: 'Change set', newObject: 'New object', apexTab: 'Apex classes' })).toBe('Apex classes');
    expect(visibleTab(newObjectTab(ws, 'a', 'apex'))!.objects).toEqual(['ApexClass']);
  });

  it('keeps the active tool and object tab of each org', () => {
    let ws = openOrg(EMPTY, 'a');
    ws = updateTab(ws, visibleTab(ws)!.id, { objects: ['Account'] });
    ws = newObjectTab(ws, 'a', 'matrix');
    ws = updateTab(ws, visibleTab(ws)!.id, { objects: ['Contact'] });
    ws = selectTool(ws, 'a', 'layouts');
    expect(groupTabs(ws, 'a', 'layouts')).toHaveLength(1);
    ws = openOrg(ws, 'b');
    expect(visibleTab(ws)!.orgId).toBe('b');
    ws = openOrg(ws, 'a');
    expect(visibleTab(ws)!.tool).toBe('layouts');
    ws = selectTool(ws, 'a', 'matrix');
    expect(visibleTab(ws)!.objects).toEqual(['Contact']);
    ws = selectTab(ws, groupTabs(ws, 'a', 'matrix')[0]!.id);
    expect(visibleTab(ws)!.objects).toEqual(['Account']);
  });

  it('activates the neighbour in the same group when closing the active object tab', () => {
    let ws = openOrg(EMPTY, 'a');
    ws = newObjectTab(ws, 'a', 'matrix');
    ws = newObjectTab(ws, 'a', 'matrix');
    const [x, y, z] = groupTabs(ws, 'a', 'matrix').map(t => t.id);
    ws = closeTab(selectTab(ws, y!), y!);
    expect(visibleTab(ws)!.id).toBe(z);
    ws = closeTab(ws, z!);
    expect(visibleTab(ws)!.id).toBe(x);
    ws = closeTab(ws, x!);
    expect(visibleTab(ws)).toBeNull();
    expect(ws.orgs).toEqual(['a']);
  });

  it('opens each change set once, under the change set tool of its org', () => {
    let ws = openOrg(EMPTY, 'a');
    ws = openChangeSet(ws, 'b', 'cs1', 'CS-0001');
    expect(ws.orgs).toEqual(['a', 'b']);
    expect(visibleTab(ws)).toMatchObject({ orgId: 'b', tool: 'changeset', label: 'CS-0001' });
    ws = selectTool(ws, 'b', 'matrix');
    ws = openChangeSet(ws, 'b', 'cs1');
    expect(groupTabs(ws, 'b', 'changeset')).toHaveLength(1);
    expect(visibleTab(ws)!.changeSetId).toBe('cs1');
  });

  it('closes an org with its tabs and drops disconnected orgs', () => {
    let ws = openOrg(openOrg(openOrg(EMPTY, 'a'), 'b'), 'c');
    ws = closeOrg(openOrg(ws, 'b'), 'b');
    expect(ws.orgs).toEqual(['a', 'c']);
    expect(ws.activeOrg).toBe('c');
    expect(ws.tabs.every(t => t.orgId !== 'b')).toBe(true);
    ws = pruneOrgs(ws, ['a']);
    expect(ws.orgs).toEqual(['a']);
    expect(ws.activeOrg).toBe('a');
  });

  it('regroups tabs saved by the single-row version', () => {
    const old = { active: 't2', tabs: [
      { id: 't1', orgId: 'a', tool: 'matrix', objects: ['Account'] },
      { id: 't2', orgId: 'a', tool: 'matrix', objects: ['Contact'] },
      { id: 't3', orgId: 'b', tool: 'layouts', objects: ['Case'], layoutMode: 'pages' },
      { id: 't4', orgId: null, tool: null, objects: [] },
      { id: 't5', orgId: 'a', tool: 'changeset', objects: [], changeSetId: 'cs1' }
    ] };
    const ws = loadWorkspace({ getItem: () => JSON.stringify(old) });
    expect(ws.orgs).toEqual(['a', 'b']);
    expect(groupTabs(ws, 'a', 'matrix').map(t => t.objects)).toEqual([['Account'], ['Contact']]);
    expect(groupTabs(ws, 'b', 'layouts')[0]).toMatchObject({ objects: ['Case'], layoutMode: 'pages' });
    expect(groupTabs(ws, 'a', 'changeset')[0]!.changeSetId).toBe('cs1');
  });

  it('survives missing or corrupt storage', () => {
    expect(loadWorkspace(null)).toEqual(EMPTY);
    expect(loadWorkspace({ getItem: () => '{nope' })).toEqual(EMPTY);
    expect(loadWorkspace({ getItem: () => { throw new Error('blocked'); } })).toEqual(EMPTY);
  });
});
