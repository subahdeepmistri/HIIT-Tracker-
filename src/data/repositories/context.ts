import type { VoltSnapshot } from '../schema';

/**
 * Everything a collection repository may do. Repositories never own the
 * snapshot or the write queue — they mutate through the live reference and
 * delegate durability to VoltDatabase, keeping one choke point for writes.
 */
export interface RepoContext {
  /** The current mutable snapshot. Call per access; never cache. */
  snapshot(): VoltSnapshot;
  /** Whole-snapshot swap (used by cascading deletes / imports). */
  setSnapshot(next: VoltSnapshot): void;
  /** Persist through the ordered single-flight write queue. */
  save(options?: { notify?: boolean }): Promise<{ success: boolean; error?: string }>;
}
