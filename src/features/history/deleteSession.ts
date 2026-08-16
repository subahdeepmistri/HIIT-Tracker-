import type { VoltDatabase } from '../../data/database';
import type { SessionId } from '../../domain/ids';
import { confirmAction } from '../../ui/confirm';

export async function confirmAndDeleteSession(db: VoltDatabase, sessionId: SessionId): Promise<boolean> {
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
