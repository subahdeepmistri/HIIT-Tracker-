import AsyncStorage from '@react-native-async-storage/async-storage';
import { useKeepAwake } from 'expo-keep-awake';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { WorkoutController } from '../../application/workoutController';
import { DEFAULTS } from '../../config/defaults';
import { db, type VoltDatabase } from '../../data/database';
import type { UserSettings } from '../../domain/types';
import { VoltThemeProvider, useVoltFonts } from '../../ui/theme/ThemeProvider';

interface VoltContextValue {
  db: VoltDatabase;
  revision: number;
  ready: boolean;
  controller: WorkoutController;
  settings: UserSettings;
  refresh: () => void;
}

const VoltContext = createContext<VoltContextValue | null>(null);

export function VoltRoot({ children }: { children: React.ReactNode }) {
  const fontsReady = useVoltFonts();
  const [ready, setReady] = useState(false);
  const [revision, setRevision] = useState(0);
  const [settings, setSettings] = useState<UserSettings>(db.settings.get());

  const controller = useMemo(
    () =>
      new WorkoutController({
        db,
        persistLive: async (json) => {
          if (json == null) await AsyncStorage.removeItem(DEFAULTS.sessionPersistKey);
          else await AsyncStorage.setItem(DEFAULTS.sessionPersistKey, json);
        },
        loadLive: () => AsyncStorage.getItem(DEFAULTS.sessionPersistKey),
      }),
    [],
  );

  useEffect(() => {
    let mounted = true;
    void (async () => {
      await db.init();
      if (!mounted) return;
      setSettings(db.settings.get());
      setReady(true);
    })();
    return db.subscribe(() => {
      setRevision((value) => value + 1);
      setSettings(db.settings.get());
    });
  }, []);

  const value = useMemo(
    () => ({
      db,
      revision,
      ready: ready && fontsReady,
      controller,
      settings,
      refresh: () => setRevision((value) => value + 1),
    }),
    [revision, ready, fontsReady, controller, settings],
  );

  if (!value.ready) return null;

  return (
    <VoltContext.Provider value={value}>
      <VoltThemeProvider preference={settings.theme}>{children}</VoltThemeProvider>
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
