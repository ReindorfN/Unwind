import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { format, isToday, startOfDay, endOfDay, subDays, isSameDay } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

export interface JournalEntry {
  id: string;
  title: string;
  content: string;
  promptId?: string;
  moodRating?: number;
  tags: string[];
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

interface JournalContextType {
  entries: JournalEntry[];
  loading: boolean;
  addEntry: (entry: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateEntry: (id: string, updates: Partial<JournalEntry>) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  getEntriesForDate: (date: string) => JournalEntry[];
  getTodayEntries: () => JournalEntry[];
  hasTodayEntry: () => boolean;
  syncToDatabase: () => Promise<void>;
  loadFromDatabase: () => Promise<void>;
  getCurrentStreak: () => number;
}

const JournalContext = createContext<JournalContextType | undefined>(undefined);

export const useJournal = () => {
  const context = useContext(JournalContext);
  if (context === undefined) {
    throw new Error('useJournal must be used within a JournalProvider');
  }
  return context;
};

interface JournalProviderProps {
  children: ReactNode;
}

const STORAGE_KEY = 'unwind_journal_entries';

export const JournalProvider = ({ children }: JournalProviderProps) => {
  const { user } = useAuthStore();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
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
      console.error('Error loading from localStorage:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveToLocalStorage = (newEntries: JournalEntry[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newEntries));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  };

  const loadFromDatabase = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const dbEntries: JournalEntry[] = (data || []).map(entry => ({
        id: entry.id,
        title: entry.title,
        content: entry.content,
        promptId: entry.prompt_id,
        moodRating: entry.mood_rating,
        tags: entry.tags || [],
        isFavorite: entry.is_favorite,
        createdAt: entry.created_at,
        updatedAt: entry.updated_at,
      }));

      setEntries(dbEntries);
      saveToLocalStorage(dbEntries);
    } catch (error) {
      console.error('Error loading from database:', error);
    } finally {
      setLoading(false);
    }
  };

  const syncToDatabase = async () => {
    if (!user) return;

    try {
      // Get entries that need to be synced (local entries not in database)
      const { data: existingEntries } = await supabase
        .from('journal_entries')
        .select('id')
        .eq('user_id', user.id);

      const existingIds = new Set(existingEntries?.map(e => e.id) || []);
      const entriesToSync = entries.filter(entry => !existingIds.has(entry.id));

      if (entriesToSync.length > 0) {
        const { error } = await supabase
          .from('journal_entries')
          .insert(
            entriesToSync.map(entry => ({
              id: entry.id,
              user_id: user.id,
              title: entry.title,
              content: entry.content,
              prompt_id: entry.promptId,
              mood_rating: entry.moodRating,
              tags: entry.tags,
              is_favorite: entry.isFavorite,
              created_at: entry.createdAt,
              updated_at: entry.updatedAt,
            }))
          );

        if (error) throw error;
      }

      // Clear old localStorage data (keep only today's entries)
      const today = format(new Date(), 'yyyy-MM-dd');
      const todayEntries = entries.filter(entry => 
        format(new Date(entry.createdAt), 'yyyy-MM-dd') === today
      );
      
      saveToLocalStorage(todayEntries);
    } catch (error) {
      console.error('Error syncing to database:', error);
    }
  };

  const addEntry = async (entryData: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newEntry: JournalEntry = {
      ...entryData,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updatedEntries = [newEntry, ...entries];
    setEntries(updatedEntries);
    saveToLocalStorage(updatedEntries);

    // Mark that journal entry was created today for notification purposes
    localStorage.setItem('last_journal_date', format(new Date(), 'yyyy-MM-dd'));

    // If user is logged in, try to save to database immediately
    if (user) {
      try {
        await supabase
          .from('journal_entries')
          .insert({
            id: newEntry.id,
            user_id: user.id,
            title: newEntry.title,
            content: newEntry.content,
            prompt_id: newEntry.promptId,
            mood_rating: newEntry.moodRating,
            tags: newEntry.tags,
            is_favorite: newEntry.isFavorite,
            created_at: newEntry.createdAt,
            updated_at: newEntry.updatedAt,
          });
      } catch (error) {
        console.error('Error saving to database:', error);
        // Entry is still saved locally, will sync later
      }
    }
  };

  const updateEntry = async (id: string, updates: Partial<JournalEntry>) => {
    const updatedEntries = entries.map(entry =>
      entry.id === id
        ? { ...entry, ...updates, updatedAt: new Date().toISOString() }
        : entry
    );

    setEntries(updatedEntries);
    saveToLocalStorage(updatedEntries);

    // If user is logged in, try to update in database immediately
    if (user) {
      try {
        const dbUpdates: any = {};
        if (updates.title !== undefined) dbUpdates.title = updates.title;
        if (updates.content !== undefined) dbUpdates.content = updates.content;
        if (updates.promptId !== undefined) dbUpdates.prompt_id = updates.promptId;
        if (updates.moodRating !== undefined) dbUpdates.mood_rating = updates.moodRating;
        if (updates.tags !== undefined) dbUpdates.tags = updates.tags;
        if (updates.isFavorite !== undefined) dbUpdates.is_favorite = updates.isFavorite;
        dbUpdates.updated_at = new Date().toISOString();

        await supabase
          .from('journal_entries')
          .update(dbUpdates)
          .eq('id', id)
          .eq('user_id', user.id);
      } catch (error) {
        console.error('Error updating in database:', error);
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
          .from('journal_entries')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);
      } catch (error) {
        console.error('Error deleting from database:', error);
      }
    }
  };

  const getEntriesForDate = (date: string) => {
    return entries.filter(entry =>
      format(new Date(entry.createdAt), 'yyyy-MM-dd') === date
    );
  };

  const getTodayEntries = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return getEntriesForDate(today);
  };

  const hasTodayEntry = () => {
    return getTodayEntries().length > 0;
  };

  const getCurrentStreak = (): number => {
    if (entries.length === 0) return 0;
    
    // Sort entries by date (most recent first)
    const sortedEntries = [...entries].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    let streak = 0;
    let currentDate = new Date();
    
    // Check if there's an entry for today
    const todayStr = format(currentDate, 'yyyy-MM-dd');
    const hasTodayEntry = sortedEntries.some(entry => 
      format(new Date(entry.createdAt), 'yyyy-MM-dd') === todayStr
    );
    
    if (!hasTodayEntry) {
      // If no entry for today, check if there's one for yesterday to continue the streak
      const yesterdayStr = format(subDays(currentDate, 1), 'yyyy-MM-dd');
      const hasYesterdayEntry = sortedEntries.some(entry => 
        format(new Date(entry.createdAt), 'yyyy-MM-dd') === yesterdayStr
      );
      
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
      const hasEntryForDate = sortedEntries.some(entry => 
        format(new Date(entry.createdAt), 'yyyy-MM-dd') === dateStr
      );
      
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
    <JournalContext.Provider
      value={{
        entries,
        loading,
        addEntry,
        updateEntry,
        deleteEntry,
        getEntriesForDate,
        getTodayEntries,
        hasTodayEntry,
        syncToDatabase,
        loadFromDatabase,
        getCurrentStreak,
      }}
    >
      {children}
    </JournalContext.Provider>
  );
};