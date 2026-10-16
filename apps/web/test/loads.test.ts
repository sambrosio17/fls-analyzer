import { describe, expect, it } from 'vitest';
import { beginLoad, dismissLoad, forgetTab, getLoads as list, setVisibleTab, trackLoad } from '../src/loads.ts';

describe('load notices', () => {
  it('notifies only for work that ends in a tab out of sight', async () => {
    setVisibleTab('a');
    await trackLoad('a', 'load', Promise.resolve(1));
    expect(list()).toEqual([]);
    let resolve!: (v: number) => void;
    const slow = trackLoad('a', 'load', new Promise<number>(r => { resolve = r; }));
    expect(list()).toMatchObject([{ tabId: 'a', status: 'running' }]);
    setVisibleTab('b');
    resolve(2); await slow;
    expect(list()).toMatchObject([{ tabId: 'a', status: 'done' }]);
    // Going back to the tab clears its notice.
    setVisibleTab('a');
    expect(list()).toEqual([]);
  });

  it('keeps the error, and a closed tab drops its notices', async () => {
    setVisibleTab('x');
    await expect(trackLoad('b', 'load', Promise.reject(new Error('boom')))).rejects.toThrow('boom');
    const end = beginLoad('c', 'run');
    expect(list()).toMatchObject([{ tabId: 'b', status: 'error', message: 'boom' }, { tabId: 'c', status: 'running' }]);
    forgetTab('c'); end();
    dismissLoad(list()[0]!.id);
    expect(list()).toEqual([]);
  });
});
