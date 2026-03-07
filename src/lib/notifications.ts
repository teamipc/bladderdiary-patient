/**
 * Local notification reminders for the 3-day bladder diary.
 *
 * Uses the Notification API + setTimeout/setInterval for scheduling.
 * In a PWA with a service worker, these would use the
 * ServiceWorkerRegistration.showNotification() API.
 *
 * Reminder schedule:
 * - 8:00 AM: "Have you logged your morning void?"
 * - 2:00 PM: "Don't forget to log your drinks and voids"
 * - 9:00 PM: "Mark your bedtime before you sleep"
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
    title: 'Morning Void Reminder',
    body: "Have you logged your morning void? Don't forget to measure and record it.",
  },
  {
    hour: 14,
    minute: 0,
    title: 'Diary Reminder',
    body: "Don't forget to log your drinks and voids throughout the day.",
  },
  {
    hour: 21,
    minute: 0,
    title: 'Bedtime Reminder',
    body: 'Mark your bedtime before you sleep, and log any remaining voids.',
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
      'Diary Complete! 🎉',
      'Your 3-day bladder diary is done. Export it now for your clinician.',
    );
  }, delay);

  reminderTimers.push(timer);
}
