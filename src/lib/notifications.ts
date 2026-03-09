/**
 * Local notification reminders for the 3-day flow tracker.
 *
 * Uses the Notification API + setTimeout for scheduling.
 * When a service worker is active, notifications fire via
 * ServiceWorkerRegistration.showNotification() so they work
 * even when the app is in the background.
 *
 * Language: simple, friendly, non-clinical — aimed at general
 * users (not health professionals).
 *
 * Reminder schedule (local time):
 * - 8:00 AM: Morning — first pee reminder
 * - 2:00 PM: Afternoon — general check-in
 * - 9:00 PM: Evening — bedtime reminder
 */

export type PermissionStatus = 'granted' | 'denied' | 'default' | 'unsupported';

export function getNotificationPermission(): PermissionStatus {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<PermissionStatus> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  const result = await Notification.requestPermission();
  return result;
}

interface ReminderSchedule {
  hour: number;
  minute: number;
  title: string;
  body: string;
}

const DAILY_REMINDERS: ReminderSchedule[] = [
  {
    hour: 8,
    minute: 0,
    title: 'Good morning! ☀️',
    body: 'Don\'t forget to add your wake-up time and first pee of the day.',
  },
  {
    hour: 14,
    minute: 0,
    title: 'Quick check-in 💧',
    body: 'Have you been adding your drinks and pees? It only takes a second.',
  },
  {
    hour: 21,
    minute: 0,
    title: 'Almost done for the day 🌙',
    body: 'When you\'re ready to sleep, tap "Go to bed" to wrap up your day.',
  },
];

// Store timer IDs so we can cancel
let reminderTimers: ReturnType<typeof setTimeout>[] = [];

function showNotification(title: string, body: string): void {
  if (getNotificationPermission() !== 'granted') return;

  // Try service worker notification first (works when app is backgrounded)
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.ready.then((reg) => {
      reg.showNotification(title, {
        body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: title.toLowerCase().replace(/\s/g, '-'),
      } as NotificationOptions);
    });
  } else {
    // Fallback: basic notification
    new Notification(title, {
      body,
      icon: '/icon-192.png',
    });
  }
}

function getNextOccurrence(hour: number, minute: number): Date {
  const now = new Date();
  const next = new Date();
  next.setHours(hour, minute, 0, 0);

  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }
  return next;
}

export function scheduleReminders(): void {
  cancelReminders();

  if (getNotificationPermission() !== 'granted') return;

  for (const reminder of DAILY_REMINDERS) {
    const scheduleNext = () => {
      const nextTime = getNextOccurrence(reminder.hour, reminder.minute);
      const delay = nextTime.getTime() - Date.now();

      const timer = setTimeout(() => {
        showNotification(reminder.title, reminder.body);
        // Re-schedule for next day
        scheduleNext();
      }, delay);

      reminderTimers.push(timer);
    };

    scheduleNext();
  }
}

export function cancelReminders(): void {
  for (const timer of reminderTimers) {
    clearTimeout(timer);
  }
  reminderTimers = [];
}

/**
 * Schedule a one-time "diary complete" notification for day 4.
 */
export function scheduleDiaryCompleteReminder(startDate: string): void {
  const start = new Date(startDate + 'T09:00:00');
  const day4 = new Date(start);
  day4.setDate(day4.getDate() + 3);

  const delay = day4.getTime() - Date.now();
  if (delay <= 0) return;

  const timer = setTimeout(() => {
    showNotification(
      'You did it! 🎉',
      'Your 3-day flow check is complete. Open the app to see your summary.',
    );
  }, delay);

  reminderTimers.push(timer);
}
