/**
 * Emitted (and awaited with `emitAsync`) right before a user and all their
 * data are deleted, so listeners can clean up external resources first.
 */
export class UserDeletingEvent {
  static readonly SLUG = 'user.deleting';

  constructor(
    public readonly payload: { userId: number; athleteId: number | null },
  ) {}
}
