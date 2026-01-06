import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Send, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import Button from '../components/common/Button';
import Card from '../components/common/Card';

interface ForumCategory {
  id: string;
  name: string;
  description: string;
  color: string;
}

const CreatePostPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    document.title = 'Create New Post | Community Forum | Unwind';
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('forum_categories')
        .select('*')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || !selectedCategory || !user) return;

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('forum_posts')
        .insert({
          title: title.trim(),
          content: content.trim(),
          category_id: selectedCategory,
          author_id: user.id,
          is_anonymous: isAnonymous,
        })
        .select()
        .single();

      if (error) throw error;

      navigate(`/forum/post/${data.id}`);
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Error creating post. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Link to="/forum">
            <Button variant="outline" icon={<ArrowLeft size={18} />}>
              Back to Forum
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-neutral-900">Create New Post</h1>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowPreview(!showPreview)}
          icon={showPreview ? <EyeOff size={18} /> : <Eye size={18} />}
        >
          {showPreview ? 'Edit' : 'Preview'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2">
          <Card>
            {showPreview ? (
              <div>
                <h2 className="text-xl font-semibold mb-4">Preview</h2>
                <div className="border border-neutral-200 rounded-lg p-6">
                  <div className="flex items-center space-x-2 mb-4">
                    {selectedCategory && (
                      <span 
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-white"
                        style={{ 
                          backgroundColor: categories.find(c => c.id === selectedCategory)?.color || '#78A083'
                        }}
                      >
                        {categories.find(c => c.id === selectedCategory)?.name}
                      </span>
                    )}
                    <span className="text-sm text-neutral-500">
                      by {isAnonymous ? 'Anonymous' : user?.full_name}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-neutral-900 mb-4">
                    {title || 'Your post title will appear here'}
                  </h3>
                  <div className="prose max-w-none">
                    <p className="text-neutral-700 whitespace-pre-wrap">
                      {content || 'Your post content will appear here'}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <h2 className="text-xl font-semibold mb-6">Share Your Experience</h2>
                
                <div className="space-y-6">
                  <div>
                    <label htmlFor="category" className="block text-sm font-medium text-neutral-700 mb-2">
                      Category *
                    </label>
                    <select
                      id="category"
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      required
                    >
                      <option value="">Select a category</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                    {selectedCategory && (
                      <p className="mt-1 text-sm text-neutral-600">
                        {categories.find(c => c.id === selectedCategory)?.description}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="title" className="block text-sm font-medium text-neutral-700 mb-2">
                      Title *
                    </label>
                    <input
                      type="text"
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="What would you like to discuss?"
                      className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      maxLength={200}
                      required
                    />
                    <p className="mt-1 text-sm text-neutral-500">
                      {title.length}/200 characters
                    </p>
                  </div>

                  <div>
                    <label htmlFor="content" className="block text-sm font-medium text-neutral-700 mb-2">
                      Content *
                    </label>
                    <textarea
                      id="content"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Share your thoughts, experiences, or questions. Be respectful and supportive."
                      className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      rows={12}
                      required
                    />
                    <p className="mt-1 text-sm text-neutral-500">
                      {content.length} characters
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-neutral-200">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={isAnonymous}
                        onChange={(e) => setIsAnonymous(e.target.checked)}
                        className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500 mr-2"
                      />
                      <span className="text-sm text-neutral-700">Post anonymously</span>
                    </label>
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={submitting || !title.trim() || !content.trim() || !selectedCategory}
                      icon={<Send size={18} />}
                    >
                      {submitting ? 'Publishing...' : 'Publish Post'}
                    </Button>
                  </div>
                </div>
              </form>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div>
          <Card className="sticky top-6">
            <h3 className="text-lg font-semibold mb-4">Posting Guidelines</h3>
            <div className="space-y-4 text-sm text-neutral-600">
              <div>
                <h4 className="font-medium text-neutral-900 mb-2">✅ Do:</h4>
                <ul className="space-y-1">
                  <li>• Be respectful and supportive</li>
                  <li>• Share your genuine experiences</li>
                  <li>• Ask thoughtful questions</li>
                  <li>• Use content warnings when needed</li>
                  <li>• Search before posting duplicates</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium text-neutral-900 mb-2">❌ Don't:</h4>
                <ul className="space-y-1">
                  <li>• Share personal information</li>
                  <li>• Give medical advice</li>
                  <li>• Use offensive language</li>
                  <li>• Spam or self-promote</li>
                  <li>• Discuss self-harm methods</li>
                </ul>
              </div>

              <div className="pt-4 border-t border-neutral-200">
                <h4 className="font-medium text-neutral-900 mb-2">Need immediate help?</h4>
                <p className="mb-2">If you're in crisis, please reach out:</p>
                <a 
                  href="tel:988" 
                  className="text-primary-600 font-medium hover:text-primary-700"
                >
                  Call 988 (Suicide & Crisis Lifeline)
                </a>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CreatePostPage;