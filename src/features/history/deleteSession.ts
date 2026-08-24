import type { SessionId } from '../../domain/ids';
import type { VoltDatabase } from '../../data/database';
import type { ValidatedDatabase } from '../../data/validatedDatabase';
import { confirmAction } from '../../ui/confirm';

// Common interface for database operations needed by feature code
export interface FeatureDatabase {
  sessions: {
    delete: (id: SessionId) => Promise<void>;
    list: () => any[];
    get: (id: SessionId) => any;
    inProgress: () => any;
  };
  intervals: {
    listBySession: (id: SessionId) => any[];
  };
  performance: {
    getBySession: (id: SessionId) => any;
  };
  settings: {
    get: () => any;
  };
}

// Both VoltDatabase and ValidatedDatabase satisfy this interface
type DatabaseImpl = VoltDatabase | ValidatedDatabase;

export async function confirmAndDeleteSession(db: DatabaseImpl, sessionId: SessionId): Promise<boolean> {
  const ok = await confirmAction(
    'Delete this session?',
    'This only removes the recorded session on this device. The workout plan stays. Stats and personal records are rebuilt from what remains.',
    'Yes, delete',
    { cancelLabel: 'Cancel', tone: 'danger' },
  );
  if (!ok) return false;
  await db.sessions.delete(sessionId);
  return true;
}