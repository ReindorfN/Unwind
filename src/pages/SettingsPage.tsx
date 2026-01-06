import { useState, useEffect } from 'react';
import { 
  Settings, 
  Bell, 
  Shield, 
  Database, 
  Download, 
  Trash2, 
  AlertTriangle,
  Check,
  X,
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  Smartphone,
  Mail,
  Lock,
  Key,
  HelpCircle,
  Palette,
  Sparkles,
  Music,
  Bot,
  Trophy,
  CalendarRange,
  Users,
  Zap,
  MessageSquare
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';
import { useTheme, type Theme } from '../contexts/ThemeContext';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import SectionHeading from '../components/common/SectionHeading';
import NotificationSettings from '../components/settings/NotificationSettings';
import PasswordResetModal from '../pages/auth/ResetPasswordPage';

interface UserSettings {
  notification_preferences: {
    email: boolean;
    push: boolean;
    mood_reminders: boolean;
    journal_reminders: boolean;
    forum_updates: boolean;
  };
  privacy_settings: {
    profile_visible: boolean;
    activity_visible: boolean;
    allow_friend_requests: boolean;
    show_online_status: boolean;
  };
  app_preferences: {
    sound_enabled: boolean;
    auto_save: boolean;
    data_sync: boolean;
  };
}

const SettingsPage = () => {
  const { user, signOut } = useAuthStore();
  const { theme, setTheme, isPublicPage } = useTheme();
  const [settings, setSettings] = useState<UserSettings>({
    notification_preferences: {
      email: true,
      push: true,
      mood_reminders: true,
      journal_reminders: true,
      forum_updates: false,
    },
    privacy_settings: {
      profile_visible: true,
      activity_visible: false,
      allow_friend_requests: true,
      show_online_status: true,
    },
    app_preferences: {
      sound_enabled: false,
      auto_save: false,
      data_sync: true,
    },
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);

  const themeOptions = [
    { value: 'light' as const, label: 'Light', description: 'Clean and bright' },
    { value: 'dark' as const, label: 'Dark', description: 'Easy on the eyes' },
    { value: 'midnight' as const, label: 'Midnight', description: 'Deep blue darkness' }];

  useEffect(() => {
    document.title = 'Settings | Unwind';
    loadSettings();
  }, []);

  const loadSettings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setSettings({
          notification_preferences: {
            ...settings.notification_preferences,
            ...data.notification_preferences,
          },
          privacy_settings: {
            ...settings.privacy_settings,
            ...data.privacy_settings,
          },
          app_preferences: {
            ...settings.app_preferences,
          },
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError('');

      const updatedSettings = { ...settings, ...newSettings };
      setSettings(updatedSettings);

      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          notification_preferences: updatedSettings.notification_preferences,
          privacy_settings: updatedSettings.privacy_settings,
        });

      if (error) throw error;

      setSuccessMessage('Settings updated successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setError('Failed to update settings. Please try again.');
      setTimeout(() => setError(''), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotificationChange = (key: keyof UserSettings['notification_preferences'], value: boolean) => {
    updateSettings({
      notification_preferences: {
        ...settings.notification_preferences,
        [key]: value,
      },
    });
  };

  const handlePrivacyChange = (key: keyof UserSettings['privacy_settings'], value: boolean) => {
    updateSettings({
      privacy_settings: {
        ...settings.privacy_settings,
        [key]: value,
      },
    });
  };

  const handleAppPreferenceChange = (key: keyof UserSettings['app_preferences'], value: any) => {
    updateSettings({
      app_preferences: {
        ...settings.app_preferences,
        [key]: value,
      },
    });
  };

  const exportData = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      
      // Fetch all user data
      const [moodEntries, journalEntries, rantSessions] = await Promise.all([
        supabase.from('mood_entries').select('*').eq('user_id', user.id),
        supabase.from('journal_entries').select('*').eq('user_id', user.id),
        supabase.from('rant_sessions').select('*').eq('user_id', user.id),
      ]);

      const userData = {
        profile: user,
        mood_entries: moodEntries.data || [],
        journal_entries: journalEntries.data || [],
        rant_sessions: rantSessions.data || [],
        exported_at: new Date().toISOString(),
      };

      // Create and download file
      const blob = new Blob([JSON.stringify(userData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `unwind-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSuccessMessage('Data exported successfully');
    } catch (error) {
      setError('Failed to export data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE MY ACCOUNT') {
      setError('Please type "DELETE MY ACCOUNT" to confirm');
      return;
    }

    try {
      setIsLoading(true);
      
      // Use the database function to completely delete user account
      const { error } = await supabase.rpc('delete_user_account', {
        user_id_to_delete: user?.id
      });

      if (error) throw error;

      // Clear any local storage data
      localStorage.clear();
      
      // Sign out and redirect
      await signOut();
    } catch (error) {
      console.error('Account deletion error:', error);
      setError('Failed to delete account. Please try again or contact support if the problem persists.');
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <SectionHeading
        title="Settings"
        subtitle="Customize your Unwind experience and manage your account preferences"
        className="mb-8"
      />

      {error && (
        <div className="mb-4 p-4 bg-error-50 text-error-700 rounded-md flex items-center">
          <AlertTriangle size={18} className="mr-2" />
          {error}
        </div>
      )}

      {successMessage && (
        <div className="mb-4 p-4 bg-success-50 text-success-700 rounded-md flex items-center">
          <Check size={18} className="mr-2" />
          {successMessage}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Notification Reminders */}
          <NotificationSettings />

          {/* General Notifications */}
          <Card>
            <h3 className="text-xl font-semibold mb-4 flex items-center">
              <Bell size={20} className="mr-2 text-primary-500" />
              General Notifications
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Mail size={18} className="mr-2 text-neutral-500" />
                  <div>
                    <span className="font-medium">Email Notifications</span>
                    <p className="text-sm text-neutral-600">Receive updates via email</p>
                  </div>
                </div>
                <button
                  onClick={() => handleNotificationChange('email', !settings.notification_preferences.email)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.notification_preferences.email ? 'bg-primary-500' : 'bg-neutral-300'
                  }`}
                  defaultChecked={settings.notification_preferences.email}
                  disabled={true}
                >
                  {/* <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.notification_preferences.email ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  /> */}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Smartphone size={18} className="mr-2 text-neutral-500" />
                  <div>
                    <span className="font-medium">Push Notifications</span>
                    <p className="text-sm text-neutral-600">Receive push notifications</p>
                  </div>
                </div>
                <button
                  onClick={() => handleNotificationChange('push', !settings.notification_preferences.push)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.notification_preferences.push ? 'bg-primary-500' : 'bg-neutral-300'
                  }`}
                  defaultChecked={settings.notification_preferences.push}
                  disabled={true}
                >
                  {/* <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.notification_preferences.push ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  /> */}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium">Forum Updates</span>
                  <p className="text-sm text-neutral-600">Notifications about forum activity</p>
                </div>
                <button
                  onClick={() => handleNotificationChange('forum_updates', !settings.notification_preferences.forum_updates)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.notification_preferences.forum_updates ? 'bg-primary-500' : 'bg-neutral-300'
                  }`}
                  defaultChecked={settings.notification_preferences.forum_updates}
                  disabled={true}
                >
                  {/* <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.notification_preferences.forum_updates ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  /> */}
                </button>
              </div>
            </div>
          </Card>

          {/* Privacy */} 
          {/* <Card>
            <h3 className="text-xl font-semibold mb-4 flex items-center">
              <Shield size={20} className="mr-2 text-primary-500" />
              Privacy & Security
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Eye size={18} className="mr-2 text-neutral-500" />
                  <div>
                    <span className="font-medium">Profile Visibility</span>
                    <p className="text-sm text-neutral-600">Make your profile visible to other users</p>
                  </div>
                </div>
                <button
                  onClick={() => handlePrivacyChange('profile_visible', !settings.privacy_settings.profile_visible)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.privacy_settings.profile_visible ? 'bg-primary-500' : 'bg-neutral-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.privacy_settings.profile_visible ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium">Activity Visibility</span>
                  <p className="text-sm text-neutral-600">Show your activity status to others</p>
                </div>
                <button
                  onClick={() => handlePrivacyChange('activity_visible', !settings.privacy_settings.activity_visible)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.privacy_settings.activity_visible ? 'bg-primary-500' : 'bg-neutral-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.privacy_settings.activity_visible ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium">Online Status</span>
                  <p className="text-sm text-neutral-600">Show when you're online</p>
                </div>
                <button
                  onClick={() => handlePrivacyChange('show_online_status', !settings.privacy_settings.show_online_status)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.privacy_settings.show_online_status ? 'bg-primary-500' : 'bg-neutral-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.privacy_settings.show_online_status ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </Card> */}

          {/* App Preferences */}
          <Card>
            <h3 className="text-xl font-semibold mb-4 flex items-center">
              <Settings size={20} className="mr-2 text-primary-500" />
              App Preferences
            </h3>
            <div className="space-y-4">
              {/* Only show theme selector on protected pages */}
              {!isPublicPage && (
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Palette size={18} className="mr-2 text-neutral-500" />
                  <div>
                    <span className="font-medium">Theme</span>
                    <p className="text-sm text-neutral-600">Choose your preferred color scheme</p>
                  </div>
                </div>
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value as Theme)}
                  className="px-3 py-2 border border-neutral-300 rounded-md focus:ring-primary-500 focus:border-primary-500 bg-white"
                >
                  {themeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label} - {option.description}
                    </option>
                  ))}
                </select>
              </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {settings.app_preferences.sound_enabled ? (
                    <Volume2 size={18} className="mr-2 text-neutral-500" />
                  ) : (
                    <VolumeX size={18} className="mr-2 text-neutral-500" />
                  )}
                  <div>
                    <span className="font-medium">Sound Effects</span>
                    <p className="text-sm text-neutral-600">Enable app sound effects</p>
                  </div>
                </div>
                <button
                  onClick={() => handleAppPreferenceChange('sound_enabled', !settings.app_preferences.sound_enabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.app_preferences.sound_enabled ? 'bg-primary-500' : 'bg-neutral-300'
                  }`}
                  defaultChecked={settings.app_preferences.sound_enabled}
                  disabled={true}
                >
                  {/* <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.app_preferences.sound_enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  /> */}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Database size={18} className="mr-2 text-neutral-500" />
                  <div>
                    <span className="font-medium">Auto-save</span>
                    <p className="text-sm text-neutral-600">Automatically save your entries</p>
                  </div>
                </div>
                <button
                  onClick={() => handleAppPreferenceChange('auto_save', !settings.app_preferences.auto_save)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.app_preferences.auto_save ? 'bg-primary-500' : 'bg-neutral-300'
                  }`}
                  defaultChecked={settings.app_preferences.auto_save}
                  disabled={true}
                >
                  {/* <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.app_preferences.auto_save ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  /> */}
                </button>
              </div>
            </div>
          </Card>

          {/* Data Management */}
          <Card>
            <h3 className="text-xl font-semibold mb-4 flex items-center">
              <Database size={20} className="mr-2 text-primary-500" />
              Data Management
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium">Export Your Data</span>
                  <p className="text-sm text-neutral-600">Download all your data in JSON format</p>
                </div>
                <Button
                  variant="outline"
                  onClick={exportData}
                  disabled={isLoading}
                  icon={<Download size={18} />}
                >
                  Export Data
                </Button>
              </div>
            </div>
          </Card>

          {/* Danger Zone */}
          <Card className="border-error-200">
            <h3 className="text-xl font-semibold mb-4 flex items-center text-error-600">
              <AlertTriangle size={20} className="mr-2" />
              Danger Zone
            </h3>
            <div className="space-y-4">
              <div className="p-4 bg-error-50 rounded-lg">
                <h4 className="font-medium text-error-800 mb-2">Delete Account</h4>
                <p className="text-sm text-error-700 mb-4">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
                {!showDeleteConfirm ? (
                  <Button
                    variant="error"
                    onClick={() => setShowDeleteConfirm(true)}
                    icon={<Trash2 size={18} />}
                  >
                    Delete Account
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-error-800">
                      Type "DELETE MY ACCOUNT" to confirm:
                    </p>
                    <input
                      type="text"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      className="w-full px-3 py-2 border border-error-300 rounded-md focus:ring-error-500 focus:border-error-500"
                      placeholder="DELETE MY ACCOUNT"
                    />
                    <div className="flex space-x-2">
                      <Button
                        variant="error"
                        onClick={deleteAccount}
                        disabled={isLoading || deleteConfirmText !== 'DELETE MY ACCOUNT'}
                        icon={<Trash2 size={18} />}
                      >
                        {isLoading ? 'Deleting...' : 'Confirm Delete'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowDeleteConfirm(false);
                          setDeleteConfirmText('');
                        }}
                        icon={<X size={18} />}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div>
          <Card className="sticky top-6"> 
            

            <div className="mt-6 pt-6 border-t border-neutral-200">
              <h4 className="font-medium text-neutral-900 mb-2">Account Info</h4>
              <div className="text-sm text-neutral-600 space-y-1 mb-4">
                <p>Member since: {new Date(user?.created_at || '').toLocaleDateString()}</p>
                <p>Account type: {user?.role}</p>
                <p>Last updated: {new Date(user?.updated_at || '').toLocaleDateString()}</p>
              </div>
              <Button
                variant="outline"
                fullWidth
                icon={<Key size={18} />}
                onClick={() => setShowPasswordResetModal(true)}
                disabled={true}
              >
                Change Password
              </Button>
            </div>
            
            <div className="mt-6 pt-6 border-t border-neutral-200">
            <div className="flex items-center text-sm">
                  <AlertTriangle size={14} className="text-warning-500 mr-2" />
                  <span className="text-neutral-700">Unwind is still in active development.</span>
                </div>

              <h4 className="font-medium text-neutral-900 mb-3">Upcoming Features</h4>
              <div className="space-y-2">
                <div className="flex items-center text-sm">
                  <Smartphone size={14} className="text-primary-500 mr-2" />
                  <span className="text-neutral-700">Mobile App</span>
                </div>
                <div className="flex items-center text-sm">
                  <Music size={14} className="text-primary-500 mr-2" />
                  <span className="text-neutral-700">Mood-Based Playlists</span>
                </div>
                <div className="flex items-center text-sm">
                  <Bot size={14} className="text-primary-500 mr-2" />
                  <span className="text-neutral-700">Mobile AI Guide</span>
                </div>
                <div className="flex items-center text-sm">
                  <Trophy size={14} className="text-primary-500 mr-2" />
                  <span className="text-neutral-700">Enhanced Gamification</span>
                </div>
                <div className="flex items-center text-sm">
                  <CalendarRange size={14} className="text-primary-500 mr-2" />
                  <span className="text-neutral-700">Advanced Mood Calendar</span>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-3 w-full"
                icon={<MessageSquare size={14} />}
                disabled={true}
              >
                Suggest a Feature
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Password Reset Modal */}
      {showPasswordResetModal && (
        <PasswordResetModal
          isOpen={showPasswordResetModal} 
          onClose={() => setShowPasswordResetModal(false)}
        />
      )}
    </div>
  );
};

export default SettingsPage;