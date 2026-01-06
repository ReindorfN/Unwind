import { useState } from 'react';
import { 
  Bell, 
  Clock, 
  Calendar, 
  TestTube, 
  Volume2, 
  VolumeX,
  Smartphone,
  Mail,
  AlertCircle,
  Check,
  Settings as SettingsIcon
} from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';
import Button from '../common/Button';
import Card from '../common/Card';

const NotificationSettings = () => {
  const { 
    permission, 
    settings, 
    loading, 
    error, 
    updateSettings, 
    requestPermission, 
    testNotification 
  } = useNotifications();

  const [testingNotification, setTestingNotification] = useState<'mood' | 'journal' | null>(null);

  const handleToggle = (key: keyof typeof settings, value: boolean) => {
    updateSettings({ [key]: value });
  };

  const handleTimeChange = (key: 'mood_time' | 'journal_time', value: string) => {
    updateSettings({ [key]: value });
  };

  const handleFrequencyChange = (frequency: 'daily' | 'weekdays' | 'custom') => {
    updateSettings({ frequency });
  };

  const handleCustomDaysChange = (day: number, checked: boolean) => {
    const currentDays = settings.custom_days || [];
    const newDays = checked 
      ? [...currentDays, day].sort()
      : currentDays.filter(d => d !== day);
    
    updateSettings({ custom_days: newDays });
  };

  const handleTestNotification = async (type: 'mood' | 'journal') => {
    setTestingNotification(type);
    try {
      await testNotification(type);
    } finally {
      setTimeout(() => setTestingNotification(null), 2000);
    }
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (loading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <h3 className="text-xl font-semibold mb-4 flex items-center">
        <Bell size={20} className="mr-2 text-primary-500" />
        Notification Reminders
      </h3>

      {error && (
        <div className="mb-4 p-3 bg-error-50 text-error-700 rounded-md flex items-center">
          <AlertCircle size={16} className="mr-2" />
          {error}
        </div>
      )}

      {/* Permission Status */}
      <div className="mb-6 p-4 rounded-lg border border-neutral-200">
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium text-neutral-900">Browser Notifications</span>
          <div className="flex items-center space-x-2">
            {permission === 'granted' && (
              <span className="text-success-600 text-sm flex items-center">
                <Check size={16} className="mr-1" />
                Enabled
              </span>
            )}
            {permission === 'denied' && (
              <span className="text-error-600 text-sm flex items-center">
                <AlertCircle size={16} className="mr-1" />
                Blocked
              </span>
            )}
            {permission === 'default' && (
              <Button
                size="sm"
                variant="primary"
                onClick={requestPermission}
                icon={<Bell size={16} />}
                disabled
              >
                Enable
              </Button>
            )}
          </div>
        </div>
        <p className="text-sm text-neutral-600">
          {permission === 'granted' && 'You will receive browser notifications for reminders.'}
          {permission === 'denied' && 'Browser notifications are blocked. You can enable them in your browser settings.'}
          {permission === 'default' && 'Enable browser notifications to receive reminders even when the app is closed.'}
        </p>
      </div>

      {/* Mood Reminders */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center mr-3">
              <span className="text-primary-600">😊</span>
            </div>
            <div>
              <span className="font-medium text-neutral-900">Mood Tracking Reminders</span>
              <p className="text-sm text-neutral-600">Daily reminders to track your mood</p>
            </div>
          </div>
          <button
            onClick={() => handleToggle('mood_reminders', !settings.mood_reminders)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.mood_reminders ? 'bg-primary-500' : 'bg-neutral-300'
            }`}
            defaultChecked={settings.mood_reminders}
            disabled={true}
          >
            {/* <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.mood_reminders ? 'translate-x-6' : 'translate-x-1'
              }`}
            /> */}
          </button>
        </div>

        {settings.mood_reminders && (
          <div className="ml-11 space-y-3">
            <div className="flex items-center space-x-3">
              <Clock size={16} className="text-neutral-500" />
              <label className="text-sm font-medium text-neutral-700">Reminder time:</label>
              <input
                type="time"
                value={settings.mood_time}
                onChange={(e) => handleTimeChange('mood_time', e.target.value)}
                className="px-3 py-1 border border-neutral-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              />
              {/* <Button
                size="sm"
                variant="outline"
                onClick={() => handleTestNotification('mood')}
                disabled={testingNotification === 'mood'}
                icon={<TestTube size={14} />}
              >
                {testingNotification === 'mood' ? 'Testing...' : 'Test'}
              </Button> */} 
            </div>
          </div>
        )}
      </div>

      {/* Journal Reminders */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-secondary-100 rounded-full flex items-center justify-center mr-3">
              <span className="text-secondary-600">📝</span>
            </div>
            <div>
              <span className="font-medium text-neutral-900">Journal Writing Reminders</span>
              <p className="text-sm text-neutral-600">Daily reminders to write in your journal</p>
            </div>
          </div>
          <button
            onClick={() => handleToggle('journal_reminders', !settings.journal_reminders)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.journal_reminders ? 'bg-primary-500' : 'bg-neutral-300'
            }`}
            defaultChecked={settings.journal_reminders}
            disabled={true}
          >
            {/* <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.journal_reminders ? 'translate-x-6' : 'translate-x-1'
              }`}
            /> */}
          </button>
        </div>

        {settings.journal_reminders && (
          <div className="ml-11 space-y-3">
            <div className="flex items-center space-x-3">
              <Clock size={16} className="text-neutral-500" />
              <label className="text-sm font-medium text-neutral-700">Reminder time:</label>
              <input
                type="time"
                value={settings.journal_time}
                onChange={(e) => handleTimeChange('journal_time', e.target.value)}
                className="px-3 py-1 border border-neutral-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              />
              {/* <Button
                size="sm"
                variant="outline"
                onClick={() => handleTestNotification('journal')}
                disabled={testingNotification === 'journal'}
                icon={<TestTube size={14} />}
              >
                {testingNotification === 'journal' ? 'Testing...' : 'Test'}
              </Button> */} 
            </div>
          </div>
        )}
      </div>

      {/* Frequency Settings */}
      {(settings.mood_reminders || settings.journal_reminders) && (
        <div className="mb-6 pt-6 border-t border-neutral-200">
          <div className="flex items-center mb-4">
            <Calendar size={16} className="text-neutral-500 mr-2" />
            <span className="font-medium text-neutral-900">Reminder Frequency</span>
          </div>

          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="radio"
                name="frequency"
                value="daily"
                checked={settings.frequency === 'daily'}
                onChange={() => handleFrequencyChange('daily')}
                className="mr-2 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-neutral-700">Daily</span>
            </label>

            <label className="flex items-center">
              <input
                type="radio"
                name="frequency"
                value="weekdays"
                checked={settings.frequency === 'weekdays'}
                onChange={() => handleFrequencyChange('weekdays')}
                className="mr-2 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-neutral-700">Weekdays only (Monday - Friday)</span>
            </label>

            <label className="flex items-center">
              <input
                type="radio"
                name="frequency"
                value="custom"
                checked={settings.frequency === 'custom'}
                onChange={() => handleFrequencyChange('custom')}
                className="mr-2 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-neutral-700">Custom days</span>
            </label>

            {settings.frequency === 'custom' && (
              <div className="ml-6 flex flex-wrap gap-2">
                {dayNames.map((day, index) => (
                  <label key={day} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={(settings.custom_days || []).includes(index)}
                      onChange={(e) => handleCustomDaysChange(index, e.target.checked)}
                      className="mr-1 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-neutral-700">{day}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tips */}
      {/* <div className="bg-primary-50 p-4 rounded-lg">
        <h4 className="font-medium text-primary-800 mb-2">💡 Tips for Better Reminders</h4>
        <ul className="text-sm text-primary-700 space-y-1">
          <li>• Set mood reminders for morning to start your day with awareness</li>
          <li>• Schedule journal reminders for evening to reflect on your day</li>
          <li>• Enable browser notifications to receive reminders even when the app is closed</li>
          <li>• You can snooze reminders for 30 minutes if you're not ready</li>
        </ul>
      </div> */} 
    </Card>
  );
};

export default NotificationSettings;