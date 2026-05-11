import { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';
import { notificationService, type ReminderSettings } from '../services/notificationService';

interface NotificationState {
  permission: NotificationPermission;
  settings: ReminderSettings;
  loading: boolean;
  error: string | null;
}

const defaultSettings: ReminderSettings = {
  mood_reminders: true,
  journal_reminders: true,
  mood_time: '09:00',
  journal_time: '20:00',
  frequency: 'daily',
  custom_days: []
};

function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

function readBrowserNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) return 'default';
  return window.Notification.permission;
}

export const useNotifications = () => {
  const { user } = useAuthStore();
  const [state, setState] = useState<NotificationState>({
    permission: readBrowserNotificationPermission(),
    settings: defaultSettings,
    loading: true,
    error: null
  });

  // Load user notification settings
  useEffect(() => {
    if (user) {
      loadNotificationSettings();
    }
  }, [user]);

  // Set up reminders when settings change
  useEffect(() => {
    if (state.permission === 'granted' && !state.loading) {
      notificationService.scheduleReminders(state.settings);
    }
    
    return () => {
      notificationService.clearAllReminders();
    };
  }, [state.settings, state.permission, state.loading]);

  const loadNotificationSettings = async () => {
    if (!user) return;

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const { data, error } = await supabase
        .from('user_settings')
        .select('notification_preferences')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data?.notification_preferences) {
        const settings: ReminderSettings = {
          mood_reminders: data.notification_preferences.mood_reminders ?? defaultSettings.mood_reminders,
          journal_reminders: data.notification_preferences.journal_reminders ?? defaultSettings.journal_reminders,
          mood_time: data.notification_preferences.mood_time ?? defaultSettings.mood_time,
          journal_time: data.notification_preferences.journal_time ?? defaultSettings.journal_time,
          frequency: data.notification_preferences.frequency ?? defaultSettings.frequency,
          custom_days: data.notification_preferences.custom_days ?? defaultSettings.custom_days
        };

        setState(prev => ({ ...prev, settings, loading: false }));
      } else {
        setState(prev => ({ ...prev, settings: defaultSettings, loading: false }));
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to load notification settings',
        loading: false 
      }));
    }
  };

  const updateSettings = async (newSettings: Partial<ReminderSettings>) => {
    if (!user) return;

    try {
      setState(prev => ({ ...prev, error: null }));

      const updatedSettings = { ...state.settings, ...newSettings };

      // Update in database
      const { error } = await supabase
        .from('user_settings')
        .update({
          notification_preferences: {
            ...state.settings,
            ...updatedSettings
          }
        })
        .eq('user_id', user.id);

      if (error) throw error;

      setState(prev => ({ ...prev, settings: updatedSettings }));
    } catch (error) {
      console.error('Error updating notification settings:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to update notification settings' 
      }));
    }
  };

  const requestPermission = async () => {
    try {
      const granted = await notificationService.requestPermission();
      setState(prev => ({
        ...prev,
        permission: granted ? 'granted' : readBrowserNotificationPermission(),
      }));
      return granted;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to request notification permission' 
      }));
      return false;
    }
  };

  const testNotification = async (type: 'mood' | 'journal') => {
    if (state.permission !== 'granted') {
      const granted = await requestPermission();
      if (!granted) return;
    }

    const messages = {
      mood: "This is a test mood reminder! 😊",
      journal: "This is a test journal reminder! 📝"
    };

    await notificationService.showNotification(
      `Test ${type === 'mood' ? 'Mood' : 'Journal'} Reminder`,
      {
        body: messages[type],
        data: { type }
      }
    );
  };

  const snoozeReminder = (type: 'mood' | 'journal', minutes: number = 30) => {
    notificationService.snoozeReminder(type, minutes);
  };

  return {
    ...state,
    notificationsSupported: isNotificationSupported(),
    updateSettings,
    requestPermission,
    testNotification,
    snoozeReminder,
    refreshSettings: loadNotificationSettings
  };
};