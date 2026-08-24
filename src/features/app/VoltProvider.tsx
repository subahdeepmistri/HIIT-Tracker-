import { useKeepAwake } from 'expo-keep-awake';
import React, { createContext, useContext, useEffect, useLayoutEffect, useMemo, useState } from 'react';

import { WorkoutController } from '../../application/workoutController';
import { getValidatedDatabase, type ValidatedDatabase } from '../../data/validatedDatabase';
import type { UserSettings } from '../../domain/types';
import { listenForWebInstall } from '../../pwa/install';
import { registerWebApp } from '../../pwa/register';
import { ConfirmProvider } from '../../ui/ConfirmProvider';
import {
  PersistenceBanner,
  type PersistenceStatus,
} from '../../ui/components/PersistenceBanner';
import { VoltThemeProvider, useVoltFonts } from '../../ui/theme/ThemeProvider';

interface VoltContextValue {
  db: ValidatedDatabase;
  revision: number;
  ready: boolean;
  controller: WorkoutController;
  settings: UserSettings;
  lastSaveError: string | null;
  storageStatus: PersistenceStatus;
  clearLastSaveError: () => void;
  refresh: () => void;
}

const VoltContext = createContext<VoltContextValue | null>(null);

export function VoltRoot({ children }: { children: React.ReactNode }) {
  const fontsReady = useVoltFonts();
  const [ready, setReady] = useState(false);
  const [revision, setRevision] = useState(0);
  const [settings, setSettings] = useState<UserSettings>({} as UserSettings);
  const [lastSaveError, setLastSaveError] = useState<string | null>(null);
  const [storageStatus, setStorageStatus] = useState<PersistenceStatus>({
    ok: true,
    failure: null,
    source: 'snapshot',
  });

  const db = useMemo(() => getValidatedDatabase(), []);

  const controller = useMemo(
    () =>
      new WorkoutController({
        db,
        persistLive: async (json) => {
          await db.saveLiveSession(json as never);
        },
        loadLive: async () => {
          const state = await db.loadLiveSession();
          return state ? JSON.stringify(state) : null;
        },
      }),
    [db],
  );

  useEffect(() => {
    registerWebApp();
    listenForWebInstall();
    let mounted = true;
    void (async () => {
      await db.init();
      if (!mounted) return;
      setSettings(db.settings.get());
      setReady(true);
    })();

    // Subscribe to granular changes
    const unsubSessions = db.sessions.subscribe(() => {
      setSettings(db.settings.get());
      setRevision((v) => v + 1);
    });
    const unsubSettings = db.settings.subscribe(() => {
      setSettings(db.settings.get());
      setRevision((v) => v + 1);
    });
    // Whole-snapshot changes: cross-tab reloadFromStorage, importAll, repair.
    // The data layer owns the window 'storage' listener; this only reacts.
    const unsubSnapshot = db.subscribe(() => {
      setSettings(db.settings.get());
      setRevision((v) => v + 1);
    });

    // Check for save errors periodically
    const errorCheck = setInterval(() => {
      const err = db.getLastSaveError();
      if (err && err !== lastSaveError) {
        setLastSaveError(err);
      }
      setStorageStatus(db.getStorageStatus());
    }, 1000);

    return () => {
      mounted = false;
      unsubSessions();
      unsubSettings();
      unsubSnapshot();
      clearInterval(errorCheck);
    };
  }, []);

  const value = useMemo(
    () => ({
      db,
      revision,
      ready,
      controller,
      settings,
      lastSaveError,
      storageStatus,
      clearLastSaveError: () => {
        db.clearLastSaveError();
        setLastSaveError(null);
      },
      refresh: () => setRevision((v) => v + 1),
    }),
    [ready, controller, settings, lastSaveError, storageStatus, db, revision],
  );

  useLayoutEffect(() => {
    if (ready && typeof document !== 'undefined') {
      document.getElementById('hiit-boot')?.remove();
    }
  }, [ready]);

  if (!ready) return null;

  return (
    <VoltContext.Provider value={value}>
      <VoltThemeProvider preference={settings.theme}>
        <ConfirmProvider>
          <PersistenceBanner status={storageStatus} />
          {children}
        </ConfirmProvider>
      </VoltThemeProvider>
    </VoltContext.Provider>
  );
}

export function useVolt(): VoltContextValue {
  const value = useContext(VoltContext);
  if (!value) throw new Error('useVolt must be used inside VoltRoot');
  return value;
}

export function KeepAwakeWhile({ active }: { active: boolean }) {
  if (active) {
    return <KeepAwakeOn />;
  }
  return null;
}

function KeepAwakeOn() {
  useKeepAwake();
  return null;
}
