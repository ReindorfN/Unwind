import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Smile, Frown, Meh, Calendar, Save, Trash2, Award } from 'lucide-react';
import { useMoodTracker } from '../contexts/MoodTrackerContext';
import SectionHeading from '../components/common/SectionHeading';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import AchievementBadge from '../components/gamification/AchievementBadge';
import { useGamification } from '../hooks/useGamification';

const MoodTracker = () => {
  const { entries, loading, addEntry, deleteEntry, getEntriesForDate } = useMoodTracker();
  const [selectedMood, setSelectedMood] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const [note, setNote] = useState('');
  const [today] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [todayEntries, setTodayEntries] = useState(getEntriesForDate(today));
  const { addPoints, updateAchievement } = useGamification();

  useEffect(() => {
    document.title = 'Mood Tracker | Unwind';
    setTodayEntries(getEntriesForDate(today));
  }, [entries, today]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedMood === null) return;
    
    await addEntry(selectedMood, note);
    setSelectedMood(null);
    
    // Award points and update achievements
    await addPoints(20);
    await updateAchievement('mood-tracker', entries.length + 1, 5);
    await updateAchievement('mood-insights', entries.length + 1, 7);
    
    setNote('');
  };

  const handleDelete = async (entryId: string) => {
    if (confirm('Are you sure you want to delete this mood entry?')) {
      await deleteEntry(entryId);
    }
  };

  const getMoodIcon = (mood: number, size = 24) => {
    if (mood <= 2) return <Frown size={size} className="text-error-500" />;
    if (mood === 3) return <Meh size={size} className="text-warning-500" />;
    return <Smile size={size} className="text-success-500" />;
  };

  const getMoodText = (mood: number) => {
    switch (mood) {
      case 1: return 'Very Bad';
      case 2: return 'Bad';
      case 3: return 'Neutral';
      case 4: return 'Good';
      case 5: return 'Very Good';
      default: return '';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <SectionHeading
        title="Mood Tracker"
        subtitle="Track your daily moods to gain insights about your emotional patterns"
        className="mb-8"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card className="mb-8">
            <h3 className="text-xl font-semibold mb-4 flex items-center">
              <Calendar size={20} className="mr-2 text-primary-500" />
              How are you feeling today?
            </h3>
            
            <form onSubmit={handleSubmit}>
              <div className="flex flex-wrap justify-between gap-2 mb-6">
                {[1, 2, 3, 4, 5].map((mood) => (
                  <button
                    key={mood}
                    type="button"
                    onClick={() => setSelectedMood(mood as 1 | 2 | 3 | 4 | 5)}
                    className={`flex-1 min-w-[80px] p-3 rounded-md border transition-all ${
                      selectedMood === mood
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-neutral-200 hover:border-primary-300'
                    }`}
                  >
                    <div className="flex flex-col items-center">
                      {getMoodIcon(mood, 32)}
                      <span className="mt-2 text-sm font-medium">{getMoodText(mood)}</span>
                    </div>
                  </button>
                ))}
              </div>

              <div className="mb-6">
                <label htmlFor="note" className="block text-sm font-medium text-neutral-700 mb-1">
                  Add a note (optional)
                </label>
                <textarea
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full p-3 border border-neutral-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  rows={3}
                  placeholder="What's contributing to your mood today?"
                ></textarea>
              </div>

              <Button
                type="submit"
                variant="primary"
                disabled={selectedMood === null}
                icon={<Save size={18} />}
              >
                Save Mood
              </Button>
            </form>
          </Card>

          <h3 className="text-xl font-semibold mb-4">Your Mood History</h3>
          {entries.length === 0 ? (
            <Card className="text-center py-12">
              <Calendar size={48} className="mx-auto text-neutral-400 mb-4" />
              <h3 className="text-lg font-medium text-neutral-900 mb-2">No mood entries yet</h3>
              <p className="text-neutral-600">Start by adding your current mood above!</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {entries.slice().reverse().map((entry) => (
                <Card key={entry.id} className="p-4 !shadow-soft">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center">
                      {getMoodIcon(entry.mood)}
                      <div className="ml-3">
                        <div className="font-medium">{getMoodText(entry.mood)}</div>
                        <div className="text-sm text-neutral-500">
                          {format(new Date(entry.date), 'MMM d, yyyy')}
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDelete(entry.id)}
                      className="text-neutral-400 hover:text-error-500 transition-colors"
                      aria-label="Delete entry"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  {entry.note && (
                    <p className="mt-2 text-neutral-600 text-sm">{entry.note}</p>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>

        <div>
          <Card className="sticky top-24">
            <h3 className="text-xl font-semibold mb-4">Mood Insights</h3>
            
            <div className="mb-6">
              <h4 className="font-medium text-neutral-800 mb-2">Today's Mood</h4>
              {todayEntries.length > 0 ? (
                <div className="flex items-center">
                  {getMoodIcon(todayEntries[todayEntries.length - 1].mood, 28)}
                  <span className="ml-2 text-lg">{getMoodText(todayEntries[todayEntries.length - 1].mood)}</span>
                </div>
              ) : (
                <p className="text-neutral-600 text-sm">No mood logged for today yet.</p>
              )}
            </div>
            
            <div className="mb-6">
              <h4 className="font-medium text-neutral-800 mb-2">Tracking Stats</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-neutral-600">Total entries</span>
                  <span className="font-semibold text-primary-600">{entries.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-neutral-600">This month</span>
                  <span className="font-semibold text-primary-600">
                    {entries.filter(entry => {
                      const entryDate = new Date(entry.date);
                      const now = new Date();
                      return entryDate.getMonth() === now.getMonth() && 
                             entryDate.getFullYear() === now.getFullYear();
                    }).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-neutral-600">Today's entries</span>
                  <span className="font-semibold text-primary-600">{todayEntries.length}</span>
                </div>
              </div>
            </div> 
            
            <div className="mt-6">
              <h4 className="font-medium text-neutral-800 mb-2">Achievements</h4>
              <div className="space-y-3">
                <AchievementBadge
                  icon={<Calendar size={18} />}
                  title="Mood Tracker"
                  description="Track your mood 5 times"
                  progress={Math.min(entries.length, 5)}
                  maxProgress={5}
                  isUnlocked={entries.length >= 5}
                  color="primary"
                />
                <AchievementBadge
                  icon={<Award size={18} />}
                  title="Mood Insights"
                  description="Track your mood for 7 consecutive days"
                  progress={Math.min(entries.length, 7)}
                  maxProgress={7}
                  isUnlocked={entries.length >= 7}
                  color="secondary"
                />
              </div>
            </div>
            
            {/* <div>
              <h4 className="font-medium text-neutral-800 mb-2">Tips for Mood Tracking</h4>
              <ul className="text-sm text-neutral-600 space-y-2">
                <li>• Track your mood at consistent times each day</li>
                <li>• Note factors that might impact your mood (sleep, exercise, social interactions)</li>
                <li>• Look for patterns over time to identify triggers</li>
                <li>• Use insights to make small positive changes to your routine</li>
              </ul>
            </div> */}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MoodTracker;