import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { format, isToday, isYesterday, subDays, isSameDay } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

interface MoodEntry {
  id: string;
  date: string;
  mood: 1 | 2 | 3 | 4 | 5;
  note: string;
}

interface MoodTrackerContextType {
  entries: MoodEntry[];
  loading: boolean;
  addEntry: (mood: 1 | 2 | 3 | 4 | 5, note: string) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  getEntriesForDate: (date: string) => MoodEntry[];
  getEntriesForRange: (startDate: string, endDate: string) => MoodEntry[];
  getEntriesForMonth: (year: number, month: number) => MoodEntry[];
  syncToDatabase: () => Promise<void>;
  loadFromDatabase: () => Promise<void>;
  getCurrentStreak: () => number;
}

const MoodTrackerContext = createContext<MoodTrackerContextType | undefined>(undefined);

export const useMoodTracker = () => {
  const context = useContext(MoodTrackerContext);
  if (context === undefined) {
    throw new Error('useMoodTracker must be used within a MoodTrackerProvider');
  }
  return context;
};

interface MoodTrackerProviderProps {
  children: ReactNode;
}

const STORAGE_KEY = 'unwind_mood_entries';

export const MoodTrackerProvider = ({ children }: MoodTrackerProviderProps) => {
  const { user } = useAuthStore();
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Load entries from localStorage on mount
  useEffect(() => {
    loadFromLocalStorage();
  }, []);

  // Load from database when user is available
  useEffect(() => {
    if (user) {
      loadFromDatabase();
    }
  }, [user]);

  // Auto-sync to database at end of day (11:59 PM)
  useEffect(() => {
    const scheduleEndOfDaySync = () => {
      const now = new Date();
      const endOfToday = new Date(now);
      endOfToday.setHours(23, 59, 0, 0);
      
      const timeUntilEndOfDay = endOfToday.getTime() - now.getTime();
      
      if (timeUntilEndOfDay > 0) {
        setTimeout(() => {
          syncToDatabase();
          scheduleEndOfDaySync(); // Schedule for next day
        }, timeUntilEndOfDay);
      }
    };

    scheduleEndOfDaySync();
  }, []);

  const loadFromLocalStorage = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsedEntries = JSON.parse(stored);
        setEntries(parsedEntries);
      }
    } catch (error) {
      console.error('Error loading mood entries from localStorage:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveToLocalStorage = (newEntries: MoodEntry[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newEntries));
    } catch (error) {
      console.error('Error saving mood entries to localStorage:', error);
    }
  };

  const loadFromDatabase = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('mood_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (error) throw error;

      const dbEntries: MoodEntry[] = (data || []).map(entry => ({
        id: entry.id,
        date: entry.date,
        mood: entry.mood,
        note: entry.note || '',
      }));

      setEntries(dbEntries);
      saveToLocalStorage(dbEntries);
    } catch (error) {
      console.error('Error loading mood entries from database:', error);
    } finally {
      setLoading(false);
    }
  };

  const syncToDatabase = async () => {
    if (!user) return;

    try {
      // Get entries that need to be synced (local entries not in database)
      const { data: existingEntries } = await supabase
        .from('mood_entries')
        .select('id')
        .eq('user_id', user.id);

      const existingIds = new Set(existingEntries?.map(e => e.id) || []);
      const entriesToSync = entries.filter(entry => !existingIds.has(entry.id));

      if (entriesToSync.length > 0) {
        const { error } = await supabase
          .from('mood_entries')
          .insert(
            entriesToSync.map(entry => ({
              id: entry.id,
              user_id: user.id,
              mood: entry.mood,
              note: entry.note,
              date: entry.date,
            }))
          );

        if (error) throw error;
      }

      // Clear old localStorage data (keep only today's entries)
      const today = format(new Date(), 'yyyy-MM-dd');
      const todayEntries = entries.filter(entry => entry.date === today);
      
      saveToLocalStorage(todayEntries);
    } catch (error) {
      console.error('Error syncing mood entries to database:', error);
    }
  };

  const addEntry = async (mood: 1 | 2 | 3 | 4 | 5, note: string) => {
    const newEntry: MoodEntry = {
      id: crypto.randomUUID(),
      date: format(new Date(), 'yyyy-MM-dd'),
      mood,
      note,
    };

    const updatedEntries = [newEntry, ...entries];
    setEntries(updatedEntries);
    saveToLocalStorage(updatedEntries);

    // Mark that mood was tracked today for notification purposes
    localStorage.setItem('last_mood_date', format(new Date(), 'yyyy-MM-dd'));

    // If user is logged in, try to save to database immediately
    if (user) {
      try {
        await supabase
          .from('mood_entries')
          .insert({
            id: newEntry.id,
            user_id: user.id,
            mood: newEntry.mood,
            note: newEntry.note,
            date: newEntry.date,
          });
      } catch (error) {
        console.error('Error saving mood entry to database:', error);
        // Entry is still saved locally, will sync later
      }
    }
  };

  const deleteEntry = async (id: string) => {
    const updatedEntries = entries.filter(entry => entry.id !== id);
    setEntries(updatedEntries);
    saveToLocalStorage(updatedEntries);

    // If user is logged in, try to delete from database immediately
    if (user) {
      try {
        await supabase
          .from('mood_entries')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);
      } catch (error) {
        console.error('Error deleting mood entry from database:', error);
      }
    }
  };

  const getEntriesForDate = (date: string) => {
    return entries.filter(entry => entry.date === date);
  };

  const getEntriesForRange = (startDate: string, endDate: string) => {
    return entries.filter(entry => entry.date >= startDate && entry.date <= endDate);
  };

  const getEntriesForMonth = (year: number, month: number) => {
    return entries.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate.getFullYear() === year && entryDate.getMonth() === month;
    });
  };

  const getCurrentStreak = (): number => {
    if (entries.length === 0) return 0;
    
    // Sort entries by date (most recent first)
    const sortedEntries = [...entries].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    let streak = 0;
    let currentDate = new Date();
    
    // Check if there's an entry for today
    const todayStr = format(currentDate, 'yyyy-MM-dd');
    const hasTodayEntry = sortedEntries.some(entry => entry.date === todayStr);
    
    if (!hasTodayEntry) {
      // If no entry for today, check if there's one for yesterday to continue the streak
      const yesterdayStr = format(subDays(currentDate, 1), 'yyyy-MM-dd');
      const hasYesterdayEntry = sortedEntries.some(entry => entry.date === yesterdayStr);
      
      if (!hasYesterdayEntry) {
        // If no entry for yesterday either, streak is broken
        return 0;
      }
      
      // Start counting from yesterday
      currentDate = subDays(currentDate, 1);
    }
    
    // Count consecutive days with entries
    let checkDate = currentDate;
    let keepCounting = true;
    
    while (keepCounting) {
      const dateStr = format(checkDate, 'yyyy-MM-dd');
      const hasEntryForDate = sortedEntries.some(entry => entry.date === dateStr);
      
      if (hasEntryForDate) {
        streak++;
        checkDate = subDays(checkDate, 1);
      } else {
        keepCounting = false;
      }
    }
    
    return streak;
  };

  return (
    <MoodTrackerContext.Provider
      value={{
        entries,
        loading,
        addEntry,
        deleteEntry,
        getEntriesForDate,
        getEntriesForRange,
        getEntriesForMonth,
        syncToDatabase,
        loadFromDatabase,
        getCurrentStreak,
      }}
    >
      {children}
    </MoodTrackerContext.Provider>
  );
};