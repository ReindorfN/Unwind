import { useState, useEffect } from 'react';
import { Heart, Plus, Trash2, Save, Sparkles, Star } from 'lucide-react';
import Button from '../common/Button';
import Card from '../common/Card';

interface GratitudeEntry {
  id: string;
  text: string;
  category: 'people' | 'experiences' | 'things' | 'moments' | 'achievements';
  timestamp: number;
}

interface GratitudePracticeProps {
  onComplete: () => void;
  onClose: () => void;
}

const GratitudePractice = ({ onComplete, onClose }: GratitudePracticeProps) => {
  const [entries, setEntries] = useState<GratitudeEntry[]>([]);
  const [currentEntry, setCurrentEntry] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<GratitudeEntry['category']>('experiences');
  const [phase, setPhase] = useState<'intro' | 'writing' | 'reflection' | 'complete'>('intro');
  const [reflectionAnswers, setReflectionAnswers] = useState({
    feeling: '',
    impact: '',
    sharing: ''
  });

  const categories = [
    { value: 'people' as const, label: 'People', icon: '👥', description: 'Family, friends, mentors' },
    { value: 'experiences' as const, label: 'Experiences', icon: '✨', description: 'Memories, adventures, learning' },
    { value: 'things' as const, label: 'Things', icon: '🎁', description: 'Objects, possessions, comforts' },
    { value: 'moments' as const, label: 'Moments', icon: '⏰', description: 'Small joys, peaceful times' },
    { value: 'achievements' as const, label: 'Achievements', icon: '🏆', description: 'Accomplishments, progress' },
  ];

  const prompts = [
    "What made you smile today?",
    "Who in your life are you most grateful for and why?",
    "What's something you often take for granted?",
    "What challenge helped you grow recently?",
    "What small pleasure brought you joy this week?",
    "What opportunity are you thankful for?",
    "What about your health are you grateful for?",
    "What skill or ability do you appreciate having?",
  ];

  const [currentPrompt, setCurrentPrompt] = useState(prompts[0]);

  useEffect(() => {
    // Load saved gratitude entries from localStorage (user-specific)
    const userId = localStorage.getItem('current_user_id') || 'anonymous';
    const saved = localStorage.getItem(`gratitude_entries_${userId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setEntries(parsed);
      } catch (error) {
        console.error('Error loading gratitude entries:', error);
      }
    }
  }, []);

  const saveEntries = (newEntries: GratitudeEntry[]) => {
    setEntries(newEntries);
    const userId = localStorage.getItem('current_user_id') || 'anonymous';
    localStorage.setItem(`gratitude_entries_${userId}`, JSON.stringify(newEntries));
  };

  const addEntry = () => {
    if (!currentEntry.trim()) return;

    const newEntry: GratitudeEntry = {
      id: crypto.randomUUID(),
      text: currentEntry.trim(),
      category: selectedCategory,
      timestamp: Date.now(),
    };

    const updatedEntries = [newEntry, ...entries];
    saveEntries(updatedEntries);
    setCurrentEntry('');
    
    // Get a new random prompt
    const availablePrompts = prompts.filter(p => p !== currentPrompt);
    if (availablePrompts.length > 0) {
      setCurrentPrompt(availablePrompts[Math.floor(Math.random() * availablePrompts.length)]);
    }
  };

  const removeEntry = (id: string) => {
    const updatedEntries = entries.filter(entry => entry.id !== id);
    saveEntries(updatedEntries);
  };

  const getTodayEntries = () => {
    const today = new Date().toDateString();
    return entries.filter(entry => new Date(entry.timestamp).toDateString() === today);
  };

  const completeSession = () => {
    setPhase('complete');
    onComplete();
  };

  if (phase === 'intro') {
    return (
      <Card className="max-w-lg mx-auto">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-accent-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Heart className="text-accent-600" size={32} />
          </div>
          <h3 className="text-xl font-semibold text-neutral-900 mb-2">Gratitude Practice</h3>
          <p className="text-neutral-600">
            Take a moment to reflect on the good things in your life. Research shows that practicing gratitude can improve mood and overall well-being.
          </p>
        </div>

        <div className="bg-accent-50 p-4 rounded-lg mb-6">
          <h4 className="font-medium text-accent-800 mb-2">Today's Progress</h4>
          <div className="flex items-center justify-between">
            <span className="text-sm text-accent-700">Gratitude entries today:</span>
            <span className="font-semibold text-accent-800">{getTodayEntries().length}</span>
          </div>
        </div>

        <div className="flex space-x-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button variant="primary" onClick={() => setPhase('writing')} className="flex-1">
            Start Practice
          </Button>
        </div>
      </Card>
    );
  }

  if (phase === 'writing') {
    const todayEntries = getTodayEntries();
    
    return (
      <Card className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-neutral-900 mb-2">What are you grateful for?</h3>
          <div className="bg-primary-50 p-4 rounded-lg">
            <div className="flex items-center mb-2">
              <Sparkles className="text-primary-600 mr-2" size={16} />
              <span className="text-sm font-medium text-primary-700">Reflection Prompt</span>
            </div>
            <p className="text-primary-700 font-medium">{currentPrompt}</p>
          </div>
        </div>

        {/* Category Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-neutral-700 mb-2">Category</label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {categories.map((category) => (
              <button
                key={category.value}
                onClick={() => setSelectedCategory(category.value)}
                className={`p-3 rounded-lg border-2 transition-colors text-center ${
                  selectedCategory === category.value
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-neutral-200 hover:border-primary-300'
                }`}
              >
                <div className="text-lg mb-1">{category.icon}</div>
                <div className="text-xs font-medium text-neutral-900">{category.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Entry Input */}
        <div className="mb-6">
          <textarea
            value={currentEntry}
            onChange={(e) => setCurrentEntry(e.target.value)}
            placeholder="I'm grateful for..."
            className="w-full p-4 border border-neutral-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 resize-none"
            rows={4}
          />
          <div className="flex justify-between items-center mt-2">
            <span className="text-sm text-neutral-500">{currentEntry.length} characters</span>
            <Button
              onClick={addEntry}
              disabled={!currentEntry.trim()}
              icon={<Plus size={18} />}
              size="sm"
            >
              Add Entry
            </Button>
          </div>
        </div>

        {/* Today's Entries */}
        {todayEntries.length > 0 && (
          <div className="mb-6">
            <h4 className="font-medium text-neutral-900 mb-3">Today's Gratitude ({todayEntries.length})</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {todayEntries.map((entry) => {
                const category = categories.find(c => c.value === entry.category);
                return (
                  <div key={entry.id} className="flex items-start space-x-3 p-3 bg-neutral-50 rounded-lg">
                    <span className="text-lg">{category?.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-neutral-700">{entry.text}</p>
                      <span className="text-xs text-neutral-500">{category?.label}</span>
                    </div>
                    <button
                      onClick={() => removeEntry(entry.id)}
                      className="text-neutral-400 hover:text-error-500 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex space-x-3">
          <Button variant="outline" onClick={() => setPhase('intro')} className="flex-1">
            Back
          </Button>
          {todayEntries.length >= 3 && (
            <Button variant="secondary" onClick={() => setPhase('reflection')} className="flex-1">
              Reflect
            </Button>
          )}
          <Button variant="primary" onClick={completeSession} className="flex-1">
            Complete
          </Button>
        </div>
      </Card>
    );
  }

  if (phase === 'reflection') {
    return (
      <Card className="max-w-lg mx-auto">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Star className="text-success-600" size={32} />
          </div>
          <h3 className="text-xl font-semibold text-neutral-900 mb-2">Reflection Time</h3>
          <p className="text-neutral-600">
            Take a moment to reflect on your gratitude practice
          </p>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              How do you feel after expressing gratitude?
            </label>
            <textarea
              value={reflectionAnswers.feeling}
              onChange={(e) => setReflectionAnswers(prev => ({ ...prev, feeling: e.target.value }))}
              className="w-full p-3 border border-neutral-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              rows={2}
              placeholder="I feel..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              How might this gratitude impact your day?
            </label>
            <textarea
              value={reflectionAnswers.impact}
              onChange={(e) => setReflectionAnswers(prev => ({ ...prev, impact: e.target.value }))}
              className="w-full p-3 border border-neutral-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              rows={2}
              placeholder="This might help me..."
            />
          </div>
        </div>

        <div className="flex space-x-3">
          <Button variant="outline" onClick={() => setPhase('writing')} className="flex-1">
            Back
          </Button>
          <Button variant="primary" onClick={completeSession} className="flex-1">
            Complete
          </Button>
        </div>
      </Card>
    );
  }

  if (phase === 'complete') {
    const todayEntries = getTodayEntries();
    
    return (
      <Card className="max-w-lg mx-auto text-center">
        <div className="w-16 h-16 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Heart className="text-success-600" size={32} />
        </div>
        <h3 className="text-xl font-semibold text-neutral-900 mb-2">Practice Complete!</h3>
        <p className="text-neutral-600 mb-6">
          You've added {todayEntries.length} gratitude {todayEntries.length === 1 ? 'entry' : 'entries'} today. 
          Keep nurturing this positive mindset!
        </p>
        
        <div className="bg-accent-50 p-4 rounded-lg mb-6">
          <p className="text-sm text-accent-700 italic">
            "Gratitude turns what we have into enough, and more. It turns denial into acceptance, chaos into order, confusion into clarity."
          </p>
          <p className="text-xs text-accent-600 mt-2">- Melody Beattie</p>
        </div>

        <div className="flex space-x-3">
          <Button variant="outline" onClick={() => setPhase('writing')} className="flex-1">
            Add More
          </Button>
          <Button variant="primary" onClick={onClose} className="flex-1">
            Done
          </Button>
        </div>
      </Card>
    );
  }

  return null;
};

export default GratitudePractice;