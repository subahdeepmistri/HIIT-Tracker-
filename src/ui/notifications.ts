import type { UserSettings } from '../domain/types';

export async function syncReminders(settings: UserSettings): Promise<void> {
  try {
    const Notifications = await import('expo-notifications');
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!settings.remindersEnabled) return;
    const permission = await Notifications.requestPermissionsAsync();
    if (!permission.granted) return;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'HIIT Tracker',
        body: `Your planned session is scheduled for ${pad(settings.reminderHour)}:${pad(settings.reminderMinute)}.`,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: settings.reminderHour,
        minute: settings.reminderMinute,
      },
    });
  } catch {
    // Notifications are optional. Never block the app.
  }
}

function pad(value: number): string {
  return value.toString().padStart(2, '0');
}
