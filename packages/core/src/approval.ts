export type ChangeSetStatus =
  | 'draft' | 'pending_approval' | 'approved' | 'rejected'
  | 'running' | 'done' | 'partial' | 'failed';

export type ChangeSetEvent = 'submit' | 'approve' | 'reject' | 'start' | 'finish';

export interface TransitionContext {
  /** Production orgs require the two-step approval before running. */
  isProduction: boolean;
  actor: string;
  author: string;
  /** When true the approver must be someone other than the author (multi-client phase). */
  requireDifferentApprover?: boolean;
  /** Outcome, only for the "finish" event. */
  outcome?: 'done' | 'partial' | 'failed';
}

export class TransitionError extends Error {}

/** Change set state machine. Throws TransitionError when the move is not allowed. */
export function transition(status: ChangeSetStatus, event: ChangeSetEvent, ctx: TransitionContext): ChangeSetStatus {
  const fail = (why: string): never => { throw new TransitionError(why); };
  switch (event) {
    case 'submit':
      if (status !== 'draft') fail(`Cannot submit a change set in status ${status}.`);
      return 'pending_approval';
    case 'approve':
      if (status !== 'pending_approval') fail(`Cannot approve a change set in status ${status}.`);
      if (ctx.requireDifferentApprover && ctx.actor === ctx.author) fail('The approver must be different from the author.');
      return 'approved';
    case 'reject':
      if (status !== 'pending_approval') fail(`Cannot reject a change set in status ${status}.`);
      return 'rejected';
    case 'start':
      if (status === 'approved') return 'running';
      if (status === 'draft' && !ctx.isProduction) return 'running';
      if (status === 'draft') fail('Production change sets must be approved before running.');
      return fail(`Cannot run a change set in status ${status}.`);
    case 'finish':
      if (status !== 'running') fail(`Cannot finish a change set in status ${status}.`);
      return ctx.outcome ?? fail('Missing outcome.');
  }
}
