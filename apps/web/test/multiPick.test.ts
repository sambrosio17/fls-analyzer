import { describe, expect, it } from 'vitest';
import { matchOptions } from '../src/MultiPick.tsx';

const opts = [
  { id: '1', label: 'Sales User', sub: 'Sales_User' },
  { id: '2', label: 'Sales Manager', sub: 'Sales_Manager' },
  { id: '3', label: 'Inside Sales', sub: 'Inside_Sales' },
  { id: '4', label: 'Service', sub: 'Service_Agent' }
];

describe('matchOptions', () => {
  it('returns everything for an empty query', () => expect(matchOptions(opts, '  ')).toHaveLength(4));
  it('matches every word in label or API name, ignoring case', () => {
    expect(matchOptions(opts, 'sales').map(o => o.id)).toEqual(['1', '2', '3']);
    expect(matchOptions(opts, 'SALES man').map(o => o.id)).toEqual(['2']);
    expect(matchOptions(opts, 'agent').map(o => o.id)).toEqual(['4']);
  });
});
