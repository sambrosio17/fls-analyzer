import { describe, expect, it } from 'vitest';
import { transition, TransitionError } from '../src/index.ts';

const prod = { isProduction: true, actor: 'me', author: 'me' };
const sandbox = { ...prod, isProduction: false };

describe('transition', () => {
  it('lets sandbox drafts run directly', () => {
    expect(transition('draft', 'start', sandbox)).toBe('running');
  });

  it('requires approval in production', () => {
    expect(() => transition('draft', 'start', prod)).toThrow(TransitionError);
    const pending = transition('draft', 'submit', prod);
    const approved = transition(pending, 'approve', prod);
    expect(transition(approved, 'start', prod)).toBe('running');
    expect(transition('running', 'finish', { ...prod, outcome: 'partial' })).toBe('partial');
  });

  it('allows self-approval unless a different approver is required', () => {
    expect(transition('pending_approval', 'approve', prod)).toBe('approved');
    expect(() => transition('pending_approval', 'approve', { ...prod, requireDifferentApprover: true })).toThrow(/different/);
    expect(transition('pending_approval', 'approve', { ...prod, actor: 'boss', requireDifferentApprover: true })).toBe('approved');
  });

  it('rejects only pending change sets', () => {
    expect(transition('pending_approval', 'reject', prod)).toBe('rejected');
    expect(() => transition('rejected', 'start', prod)).toThrow(TransitionError);
  });
});
