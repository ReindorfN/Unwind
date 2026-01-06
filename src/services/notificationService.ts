interface NotificationPermission {
  granted: boolean;
  denied: boolean;
  default: boolean;
}

interface ReminderSettings {
  mood_reminders: boolean;
  journal_reminders: boolean;
  mood_time: string; // HH:MM format
  journal_time: string; // HH:MM format
  frequency: 'daily' | 'weekdays' | 'custom';
  custom_days?: number[]; // 0-6, Sunday-Saturday
}

class NotificationService {
  private static instance: NotificationService;
  private reminderIntervals: Map<string, NodeJS.Timeout> = new Map();

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  async showNotification(title: string, options: NotificationOptions = {}): Promise<void> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return;
    }

    if (Notification.permission !== 'granted') {
      const granted = await this.requestPermission();
      if (!granted) return;
    }

    const defaultOptions: NotificationOptions = {
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      tag: 'unwind-reminder',
      requireInteraction: false,
      silent: false,
      ...options
    };

    try {
      const notification = new Notification(title, defaultOptions);
      
      // Auto-close after 10 seconds
      setTimeout(() => {
        notification.close();
      }, 10000);

      // Handle click to focus the app
      notification.onclick = () => {
        window.focus();
        notification.close();
        
        // Navigate to appropriate page based on notification type
        if (options.data?.type === 'mood') {
          window.location.href = '/mood-tracker';
        } else if (options.data?.type === 'journal') {
          window.location.href = '/journal';
        }
      };

    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }

  scheduleReminders(settings: ReminderSettings): void {
    // Clear existing reminders
    this.clearAllReminders();

    if (settings.mood_reminders) {
      this.scheduleMoodReminder(settings.mood_time, settings.frequency, settings.custom_days);
    }

    if (settings.journal_reminders) {
      this.scheduleJournalReminder(settings.journal_time, settings.frequency, settings.custom_days);
    }
  }

  private scheduleMoodReminder(time: string, frequency: string, customDays?: number[]): void {
    const reminderKey = 'mood-reminder';
    
    const scheduleNext = () => {
      const nextTime = this.getNextReminderTime(time, frequency, customDays);
      if (!nextTime) return;

      const timeUntilReminder = nextTime.getTime() - Date.now();
      
      if (timeUntilReminder > 0) {
        const timeout = setTimeout(() => {
          this.showMoodReminder();
          scheduleNext(); // Schedule the next reminder
        }, timeUntilReminder);
        
        this.reminderIntervals.set(reminderKey, timeout);
      }
    };

    scheduleNext();
  }

  private scheduleJournalReminder(time: string, frequency: string, customDays?: number[]): void {
    const reminderKey = 'journal-reminder';
    
    const scheduleNext = () => {
      const nextTime = this.getNextReminderTime(time, frequency, customDays);
      if (!nextTime) return;

      const timeUntilReminder = nextTime.getTime() - Date.now();
      
      if (timeUntilReminder > 0) {
        const timeout = setTimeout(() => {
          this.showJournalReminder();
          scheduleNext(); // Schedule the next reminder
        }, timeUntilReminder);
        
        this.reminderIntervals.set(reminderKey, timeout);
      }
    };

    scheduleNext();
  }

  private getNextReminderTime(time: string, frequency: string, customDays?: number[]): Date | null {
    const [hours, minutes] = time.split(':').map(Number);
    const now = new Date();
    const today = new Date();
    today.setHours(hours, minutes, 0, 0);

    // If the time has already passed today, start from tomorrow
    let targetDate = today.getTime() <= now.getTime() ? 
      new Date(today.getTime() + 24 * 60 * 60 * 1000) : today;

    switch (frequency) {
      case 'daily':
        return targetDate;
        
      case 'weekdays':
        // Find next weekday (Monday = 1, Friday = 5)
        while (targetDate.getDay() === 0 || targetDate.getDay() === 6) {
          targetDate = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000);
        }
        return targetDate;
        
      case 'custom':
        if (!customDays || customDays.length === 0) return null;
        
        // Find next day that matches custom days
        let attempts = 0;
        while (attempts < 7 && !customDays.includes(targetDate.getDay())) {
          targetDate = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000);
          attempts++;
        }
        
        return attempts < 7 ? targetDate : null;
        
      default:
        return null;
    }
  }

  private async showMoodReminder(): Promise<void> {
    // Check if user has already tracked mood today
    const today = new Date().toISOString().split('T')[0];
    const hasTrackedToday = localStorage.getItem('last_mood_date') === today;
    
    if (hasTrackedToday) return;

    const messages = [
      "How are you feeling today? Take a moment to track your mood 😊",
      "Time for your daily mood check-in! Your mental health matters 💙",
      "A quick mood check can help you understand your emotional patterns 📊",
      "Remember to track your mood today - it only takes a moment! ✨",
      "Your daily mood reminder: How are you doing today? 🌟"
    ];

    const randomMessage = messages[Math.floor(Math.random() * messages.length)];

    await this.showNotification("Mood Tracker Reminder", {
      body: randomMessage,
      data: { type: 'mood' },
      actions: [
        { action: 'track', title: 'Track Now' },
        { action: 'later', title: 'Remind Later' }
      ]
    });

    // Also show in-app notification
    this.showInAppNotification('mood', randomMessage);
  }

  private async showJournalReminder(): Promise<void> {
    // Check if user has journaled today
    const today = new Date().toISOString().split('T')[0];
    const hasJournaledToday = localStorage.getItem('last_journal_date') === today;
    
    if (hasJournaledToday) return;

    const messages = [
      "Time to reflect and write in your journal 📝",
      "Your thoughts matter - take a moment to journal today ✍️",
      "Daily journaling can help process your emotions and experiences 📖",
      "Ready for some self-reflection? Your journal is waiting! 🌱",
      "Express yourself through writing - your journal reminder is here 💭"
    ];

    const randomMessage = messages[Math.floor(Math.random() * messages.length)];

    await this.showNotification("Journal Reminder", {
      body: randomMessage,
      data: { type: 'journal' },
      actions: [
        { action: 'write', title: 'Write Now' },
        { action: 'later', title: 'Remind Later' }
      ]
    });

    // Also show in-app notification
    this.showInAppNotification('journal', randomMessage);
  }

  private showInAppNotification(type: 'mood' | 'journal', message: string): void {
    // Create in-app notification element
    const notification = document.createElement('div');
    notification.className = `
      fixed top-4 right-4 z-50 max-w-sm bg-white border border-primary-200 rounded-lg shadow-lg p-4
      transform transition-all duration-300 ease-in-out translate-x-full
    `;
    
    notification.innerHTML = `
      <div class="flex items-start space-x-3">
        <div class="flex-shrink-0">
          ${type === 'mood' ? 
            '<div class="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center"><span class="text-primary-600">😊</span></div>' :
            '<div class="w-8 h-8 bg-secondary-100 rounded-full flex items-center justify-center"><span class="text-secondary-600">📝</span></div>'
          }
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-neutral-900">
            ${type === 'mood' ? 'Mood Reminder' : 'Journal Reminder'}
          </p>
          <p class="text-sm text-neutral-600 mt-1">${message}</p>
          <div class="flex space-x-2 mt-3">
            <button class="reminder-action-btn text-xs bg-primary-500 text-white px-3 py-1 rounded-md hover:bg-primary-600 transition-colors" data-action="${type}">
              ${type === 'mood' ? 'Track Now' : 'Write Now'}
            </button>
            <button class="reminder-dismiss-btn text-xs text-neutral-500 hover:text-neutral-700 transition-colors">
              Dismiss
            </button>
          </div>
        </div>
        <button class="reminder-close-btn text-neutral-400 hover:text-neutral-600 transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    `;

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
      notification.classList.remove('translate-x-full');
    }, 100);

    // Add event listeners
    const actionBtn = notification.querySelector('.reminder-action-btn');
    const dismissBtn = notification.querySelector('.reminder-dismiss-btn');
    const closeBtn = notification.querySelector('.reminder-close-btn');

    const removeNotification = () => {
      notification.classList.add('translate-x-full');
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    };

    actionBtn?.addEventListener('click', () => {
      if (type === 'mood') {
        window.location.href = '/mood-tracker';
      } else {
        window.location.href = '/journal';
      }
      removeNotification();
    });

    dismissBtn?.addEventListener('click', removeNotification);
    closeBtn?.addEventListener('click', removeNotification);

    // Auto-remove after 10 seconds
    setTimeout(removeNotification, 10000);
  }

  clearAllReminders(): void {
    this.reminderIntervals.forEach((interval) => {
      clearTimeout(interval);
    });
    this.reminderIntervals.clear();
  }

  clearReminder(type: 'mood' | 'journal'): void {
    const key = `${type}-reminder`;
    const interval = this.reminderIntervals.get(key);
    if (interval) {
      clearTimeout(interval);
      this.reminderIntervals.delete(key);
    }
  }

  // Snooze reminder for specified minutes
  snoozeReminder(type: 'mood' | 'journal', minutes: number = 30): void {
    this.clearReminder(type);
    
    const timeout = setTimeout(() => {
      if (type === 'mood') {
        this.showMoodReminder();
      } else {
        this.showJournalReminder();
      }
    }, minutes * 60 * 1000);
    
    this.reminderIntervals.set(`${type}-reminder`, timeout);
  }
}

export const notificationService = NotificationService.getInstance();
export type { ReminderSettings };