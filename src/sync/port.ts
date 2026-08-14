/**
 * Optional sync port. The live workout timer never calls this.
 * A future backend can implement push/pull. The default is a no-op.
 */
export interface SyncPort {
  push(since: number): Promise<void>;
  pull(since: number): Promise<void>;
}

export const noopSync: SyncPort = {
  async push() {},
  async pull() {},
};
