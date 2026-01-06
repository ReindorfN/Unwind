import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { 
  Book, 
  PenTool, 
  Save, 
  List, 
  Calendar, 
  Edit, 
  Trash2, 
  Heart, 
  Star,
  Plus,
  Search,
  Filter,
  Tag,
  Award
} from 'lucide-react';
import { useJournal } from '../contexts/JournalContext';
import SectionHeading from '../components/common/SectionHeading';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import AchievementBadge from '../components/gamification/AchievementBadge';
import { useGamification } from '../hooks/useGamification';

interface JournalPrompt {
  id: string;
  category: string;
  prompt: string;
}

const journalPrompts: JournalPrompt[] = [
  {
    id: 'gratitude-1',
    category: 'Gratitude',
    prompt: 'What made you smile today? Describe the moment and how it made you feel.',
  },
  {
    id: 'gratitude-2',
    category: 'Gratitude',
    prompt: 'List three things you\'re grateful for today and explain why they matter to you.',
  },
  {
    id: 'growth-1',
    category: 'Growth',
    prompt: "What's a challenge you're facing right now? How might you grow from this experience?",
  },
  {
    id: 'future-1',
    category: 'Future Vision',
    prompt: 'Write a letter to your future self one year from now. What do you hope to tell them?',
  },
  {
    id: 'healing-1',
    category: 'Healing',
    prompt: 'What\'s something you need to forgive yourself for? How can you begin that process?',
  },
  {
    id: 'reflection-1',
    category: 'Self-Reflection',
    prompt: 'How are you feeling right now? What emotions are present, and what might be causing them?',
  },
  {
    id: 'relationships-1',
    category: 'Relationships',
    prompt: 'Describe a meaningful connection you have with someone. What makes this relationship special?',
  },
  {
    id: 'mindfulness-1',
    category: 'Mindfulness',
    prompt: 'Take a moment to notice your surroundings. What do you see, hear, and feel right now?',
  },
];

const JournalingPage = () => {
  const { 
    entries, 
    loading, 
    addEntry, 
    updateEntry, 
    deleteEntry, 
    getTodayEntries 
  } = useJournal();
  
  const [selectedPrompt, setSelectedPrompt] = useState<JournalPrompt | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [moodRating, setMoodRating] = useState<number | undefined>(undefined);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const { addPoints, updateAchievement } = useGamification();

  useEffect(() => {
    document.title = 'Journaling | Unwind';
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !content.trim()) return;

    const entryData = {
      title: title.trim(),
      content: content.trim(),
      promptId: selectedPrompt?.id,
      moodRating,
      tags,
      isFavorite: false,
    };

    if (editingEntry) {
      await updateEntry(editingEntry, entryData);
      setEditingEntry(null);
    } else {
      await addEntry(entryData);
    }
    
    // Award points for journaling
    if (!editingEntry) {
      await addPoints(40);
      await updateAchievement('journal-starter', 1, 1);
      await updateAchievement('reflection-master', entries.length + 1, 5);
    }

    // Reset form
    setTitle('');
    setContent('');
    setMoodRating(undefined);
    setTags([]);
    setSelectedPrompt(null);
  };

  const handleEdit = (entry: any) => {
    setEditingEntry(entry.id);
    setTitle(entry.title);
    setContent(entry.content);
    setMoodRating(entry.moodRating);
    setTags(entry.tags || []);
    setSelectedPrompt(journalPrompts.find(p => p.id === entry.promptId) || null);
    
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (entryId: string) => {
    if (confirm('Are you sure you want to delete this journal entry?')) {
      await deleteEntry(entryId);
    }
  };

  const handleToggleFavorite = async (entryId: string, currentFavorite: boolean) => {
    await updateEntry(entryId, { isFavorite: !currentFavorite });
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const cancelEdit = () => {
    setEditingEntry(null);
    setTitle('');
    setContent('');
    setMoodRating(undefined);
    setTags([]);
    setSelectedPrompt(null);
  };

  const getMoodIcon = (mood: number) => {
    if (mood <= 2) return '😢';
    if (mood === 3) return '😐';
    return '😊';
  };

  // Filter entries
  const filteredEntries = entries.filter(entry => {
    const matchesSearch = entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         entry.content.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = filterCategory === 'all' || 
                           (selectedPrompt && journalPrompts.find(p => p.id === entry.promptId)?.category === filterCategory);
    
    const matchesFavorites = !showFavoritesOnly || entry.isFavorite;
    
    return matchesSearch && matchesCategory && matchesFavorites;
  });

  const categories = ['all', ...Array.from(new Set(journalPrompts.map(p => p.category)))];
  const todayEntries = getTodayEntries();

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
        title="Guided Journaling"
        subtitle="Express yourself freely and explore your thoughts with our therapeutic writing prompts"
        className="mb-8"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {/* Writing Form */}
          <Card className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <PenTool className="text-primary-500 mr-2" />
                <h3 className="text-xl font-semibold">
                  {editingEntry ? 'Edit Entry' : 'Write Your Entry'}
                </h3>
              </div>
              {editingEntry && (
                <Button variant="outline" onClick={cancelEdit} size="sm">
                  Cancel Edit
                </Button>
              )}
            </div>
            
            {selectedPrompt && (
              <div className="bg-primary-50 p-4 rounded-md mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-primary-600">
                    {selectedPrompt.category}
                  </span>
                  <button
                    onClick={() => setSelectedPrompt(null)}
                    className="text-primary-600 hover:text-primary-700"
                  >
                    ×
                  </button>
                </div>
                <p className="text-primary-700 font-medium">{selectedPrompt.prompt}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-neutral-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Give your entry a title..."
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="content" className="block text-sm font-medium text-neutral-700 mb-1">
                  Content *
                </label>
                <textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Start writing here..."
                  className="w-full h-64 p-4 border border-neutral-200 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Mood Rating */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  How are you feeling? (Optional)
                </label>
                <div className="flex space-x-2">
                  {[1, 2, 3, 4, 5].map((mood) => (
                    <button
                      key={mood}
                      type="button"
                      onClick={() => setMoodRating(mood === moodRating ? undefined : mood)}
                      className={`p-2 rounded-md border transition-colors ${
                        moodRating === mood
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-neutral-300 hover:border-primary-300'
                      }`}
                    >
                      <span className="text-xl">{getMoodIcon(mood)}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Tags (Optional)
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-2 py-1 bg-primary-100 text-primary-700 rounded-md text-sm"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-1 text-primary-600 hover:text-primary-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    placeholder="Add a tag..."
                    className="flex-1 px-3 py-1 border border-neutral-300 rounded-md text-sm"
                  />
                  <Button type="button" onClick={addTag} size="sm" variant="outline">
                    <Tag size={14} />
                  </Button>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={!title.trim() || !content.trim()}
                  icon={<Save size={18} />}
                >
                  {editingEntry ? 'Update Entry' : 'Save Entry'}
                </Button>
              </div>
            </form>
          </Card>

          {/* Search and Filters */}
          <Card className="mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Search entries..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                />
              </div> 
              {/* <div className="flex items-center gap-2">
                <Filter size={18} className="text-neutral-500" />
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-3 py-2 border border-neutral-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category === 'all' ? 'All Categories' : category}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                  className={`p-2 rounded-md transition-colors ${
                    showFavoritesOnly ? 'bg-primary-100 text-primary-600' : 'text-neutral-500 hover:bg-neutral-100'
                  }`}
                >
                  <Star size={18} className={showFavoritesOnly ? 'fill-current' : ''} />
                </button>
              </div> */}
            </div>
          </Card>

          {/* Entries List */}
          <div>
            <h3 className="text-xl font-semibold mb-4 flex items-center">
              <List className="mr-2" />
              Your Journal Entries ({filteredEntries.length})
            </h3>
            
            {filteredEntries.length === 0 ? (
              <Card className="text-center py-12">
                <Book size={48} className="mx-auto text-neutral-400 mb-4" />
                <h3 className="text-lg font-medium text-neutral-900 mb-2">
                  {entries.length === 0 ? 'No entries yet' : 'No entries match your search'}
                </h3>
                <p className="text-neutral-600 mb-4">
                  {entries.length === 0 
                    ? 'Start your journaling journey by writing your first entry!'
                    : 'Try adjusting your search or filters.'
                  }
                </p>
              </Card>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 pb-4">
                {filteredEntries.map((entry) => (
                  <Card key={entry.id} className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-semibold text-neutral-900">{entry.title}</h4>
                          {entry.isFavorite && (
                            <Star size={16} className="text-yellow-500 fill-current" />
                          )}
                        </div>
                        <div className="flex items-center text-sm text-neutral-500 space-x-4">
                          <div className="flex items-center">
                            <Calendar size={14} className="mr-1" />
                            <span>{format(new Date(entry.createdAt), 'MMM d, yyyy')}</span>
                          </div>
                          {entry.moodRating && (
                            <div className="flex items-center">
                              <span className="mr-1">Mood:</span>
                              <span>{getMoodIcon(entry.moodRating)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleToggleFavorite(entry.id, entry.isFavorite)}
                          className={`p-1 rounded-md transition-colors ${
                            entry.isFavorite 
                              ? 'text-yellow-500 hover:text-yellow-600' 
                              : 'text-neutral-400 hover:text-yellow-500'
                          }`}
                        >
                          <Star size={16} className={entry.isFavorite ? 'fill-current' : ''} />
                        </button>
                        <button
                          onClick={() => handleEdit(entry)}
                          className="p-1 text-neutral-400 hover:text-primary-600 transition-colors"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="p-1 text-neutral-400 hover:text-error-600 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    
                    <p className="text-neutral-700 mb-3 line-clamp-3">
                      {entry.content.substring(0, 200)}
                      {entry.content.length > 200 && '...'}
                    </p>
                    
                    {entry.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {entry.tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-block px-2 py-1 bg-neutral-100 text-neutral-600 rounded-md text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card className="sticky top-24">
            <div className="flex items-center mb-4">
              <Book className="text-primary-500 mr-2" />
              <h3 className="text-xl font-semibold">Writing Prompts</h3>
            </div>
            
            <div className="space-y-3">
              {journalPrompts.map((prompt) => (
                <button
                  key={prompt.id}
                  onClick={() => setSelectedPrompt(prompt)}
                  className={`w-full text-left p-3 rounded-md transition-colors ${
                    selectedPrompt?.id === prompt.id
                      ? 'bg-primary-50 text-primary-700'
                      : 'hover:bg-neutral-50'
                  }`}
                >
                  <span className="text-sm font-medium text-primary-600 block mb-1">
                    {prompt.category}
                  </span>
                  <p className="text-sm text-neutral-600">{prompt.prompt}</p>
                </button>
              ))}
            </div>
          </Card>

          {/* Today's Progress */}
          <Card className="sticky top-96">
            <h3 className="text-lg font-semibold mb-4">Today's Progress</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-600">Journal entries</span>
                <span className="font-semibold text-primary-600">{todayEntries.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-600">Total entries</span>
                <span className="font-semibold text-primary-600">{entries.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-600">Favorites</span>
                <span className="font-semibold text-primary-600">
                  {entries.filter(e => e.isFavorite).length}
                </span>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-neutral-200">
              <h4 className="font-medium text-neutral-900 mb-3">Achievements</h4>
              <div className="space-y-3">
                <AchievementBadge
                  icon={<Book size={18} />}
                  title="Journal Starter"
                  description="Write your first journal entry"
                  progress={entries.length > 0 ? 1 : 0}
                  maxProgress={1}
                  isUnlocked={entries.length > 0}
                  color="primary"
                />
                <AchievementBadge
                  icon={<Award size={18} />}
                  title="Reflection Master"
                  description="Complete 5 journal entries"
                  progress={Math.min(entries.length, 5)}
                  maxProgress={5}
                  isUnlocked={entries.length >= 5}
                  color="secondary"
                />
              </div>
            </div>
            
          </Card>
        </div>
      </div>
    </div>
  );
};

export default JournalingPage;