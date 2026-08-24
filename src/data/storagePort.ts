import type { VoltSnapshot } from './schema';
import type { EngineState } from '../engine/workout/stateMachine';
import type { ExportPayload } from './export';

export interface StoragePort {
  // Snapshot (whole DB)
  loadSnapshot(): Promise<VoltSnapshot | null>;
  saveSnapshot(snapshot: VoltSnapshot): Promise<{ success: boolean; error?: string }>;
  subscribeSnapshot(listener: () => void): () => void;

  // Live session (separate key)
  loadLiveSession(): Promise<EngineState | null>;
  saveLiveSession(state: EngineState | null): Promise<{ success: boolean; error?: string }>;
  subscribeLiveSession(listener: (state: EngineState | null) => void): () => void;

  // Cross-tab
  onStorageEvent(key: string, handler: (newValue: string | null) => void): () => void;

  // Export/Import
  exportAll(): Promise<ExportPayload>;
  importAll(payload: ExportPayload): Promise<{ success: boolean; error?: string }>;

  // Granular subscriptions
  sessions: {
    subscribe(listener: () => void): () => void;
  };
  intervals: {
    subscribe(sessionId: string, listener: () => void): () => void;
  };
  settings: {
    subscribe(listener: () => void): () => void;
  };
}