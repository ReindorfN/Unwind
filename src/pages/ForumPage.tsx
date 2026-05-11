import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  MessageCircle, 
  Plus, 
  Search, 
  Filter, 
  TrendingUp, 
  Clock, 
  ThumbsUp,
  Eye,
  Pin,
  Lock,
  Flag,
  User,
  ChevronRight,
  Heart,
  Brain,
  BookOpen,
  Users,
  Cloud,
  Sparkles
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import SectionHeading from '../components/common/SectionHeading';
import Button from '../components/common/Button';
import Card from '../components/common/Card';

interface ForumCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  post_count: number;
}

interface ForumPost {
  id: string;
  title: string;
  content: string;
  author_id: string;
  category_id: string;
  is_anonymous: boolean;
  is_pinned: boolean;
  is_locked: boolean;
  view_count: number;
  comment_count: number;
  helpful_count: number;
  created_at: string;
  author?: {
    full_name: string;
    avatar_url?: string;
  };
  category?: {
    name: string;
    color: string;
  };
}

type SortOption = 'latest' | 'helpful' | 'commented';

const iconMap: Record<string, React.ReactNode> = {
  Brain: <Brain size={20} />,
  BookOpen: <BookOpen size={20} />,
  Heart: <Heart size={20} />,
  Users: <Users size={20} />,
  Cloud: <Cloud size={20} />,
  Sparkles: <Sparkles size={20} />,
  User: <User size={20} />,
  MessageCircle: <MessageCircle size={20} />,
};

const ForumPage = () => {
  const { user } = useAuthStore();
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('latest');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'Community Forum | Unwind';
    loadCategories();
    loadPosts();
  }, [selectedCategory, sortBy]);

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

  const loadPosts = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('forum_posts')
        .select(`
          *,
          author:profiles(full_name, avatar_url),
          category:forum_categories(name, color)
        `);

      if (selectedCategory !== 'all') {
        query = query.eq('category_id', selectedCategory);
      }

      // Apply sorting
      switch (sortBy) {
        case 'helpful':
          query = query.order('helpful_count', { ascending: false });
          break;
        case 'commented':
          query = query.order('comment_count', { ascending: false });
          break;
        default:
          query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query;

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPosts = posts.filter(post =>
    post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return `${Math.floor(diffInHours / 168)}w ago`;
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
        <SectionHeading
          title="Community Forum"
          subtitle="Connect with others, share experiences, and find support in our safe community space"
          className="mb-0"
        />
        <Link to="/forum/create">
          <Button
            variant="primary"
            icon={<Plus size={18} />}
          >
            New Post
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <h3 className="text-lg font-semibold mb-4">Categories</h3>

            {/* Mobile / tablet: 2-row column grid + horizontal scroll */}
            <div
              className="lg:hidden -mx-6 px-6 overflow-x-auto overflow-y-visible overscroll-x-contain scroll-smooth [-webkit-overflow-scrolling:touch] pb-1"
              role="region"
              aria-label="Forum categories"
            >
              <div className="grid w-max grid-flow-col grid-rows-[auto_auto] gap-2 auto-cols-[minmax(11.5rem,13.5rem)]">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                  className={`flex h-full min-h-[4.25rem] w-full flex-col justify-center text-left rounded-md p-3 transition-colors ${
                    selectedCategory === 'all'
                      ? 'bg-primary-50 text-primary-700'
                      : 'hover:bg-neutral-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm leading-snug">All Categories</span>
                    <span className="shrink-0 text-sm text-neutral-500">{posts.length}</span>
                  </div>
                </button>
                {categories.map((category) => (
                  <button
                    type="button"
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`flex h-full min-h-[4.25rem] w-full flex-col justify-center text-left rounded-md p-3 transition-colors ${
                      selectedCategory === category.id
                        ? 'bg-primary-50 text-primary-700'
                        : 'hover:bg-neutral-50'
                    }`}
                  >
                    <div className="mb-1 flex min-w-0 items-center gap-2">
                      <div
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs text-white"
                        style={{ backgroundColor: category.color }}
                      >
                        {iconMap[category.icon]}
                      </div>
                      <span className="min-w-0 truncate font-medium text-sm leading-snug">
                        {category.name}
                      </span>
                    </div>
                    <div className="flex min-w-0 items-start justify-between gap-2 pl-8">
                      <span className="line-clamp-2 text-left text-xs text-neutral-600">
                        {category.description}
                      </span>
                      <span className="shrink-0 text-xs text-neutral-500">{category.post_count}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Desktop sidebar: vertical list */}
            <div className="hidden lg:block space-y-2" role="region" aria-label="Forum categories">
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`w-full text-left p-3 rounded-md transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-primary-50 text-primary-700'
                    : 'hover:bg-neutral-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">All Categories</span>
                  <span className="text-sm text-neutral-500">{posts.length}</span>
                </div>
              </button>
              {categories.map((category) => (
                <button
                  type="button"
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`w-full text-left p-3 rounded-md transition-colors ${
                    selectedCategory === category.id
                      ? 'bg-primary-50 text-primary-700'
                      : 'hover:bg-neutral-50'
                  }`}
                >
                  <div className="flex items-center mb-1">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center mr-2 text-white text-xs"
                      style={{ backgroundColor: category.color }}
                    >
                      {iconMap[category.icon]}
                    </div>
                    <span className="font-medium text-sm">{category.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-neutral-600 ml-8">{category.description}</span>
                    <span className="text-xs text-neutral-500">{category.post_count}</span>
                  </div>
                </button>
              ))}
            </div>

          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {/* Search and Filters */}
          <Card className="mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Search posts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter size={18} className="text-neutral-500" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="px-3 py-2 border border-neutral-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="latest">Latest</option>
                  <option value="helpful">Most Helpful</option>
                  <option value="commented">Most Commented</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Posts List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            </div>
          ) : filteredPosts.length === 0 ? (
            <Card className="text-center py-12">
              <MessageCircle size={48} className="mx-auto text-neutral-400 mb-4" />
              <h3 className="text-lg font-medium text-neutral-900 mb-2">No posts found</h3>
              <p className="text-neutral-600 mb-4">
                {searchQuery ? 'Try adjusting your search terms' : 'Be the first to start a discussion!'}
              </p>
              <Link to="/forum/create">
                <Button
                  variant="primary"
                  icon={<Plus size={18} />}
                >
                  Create First Post
                </Button>
              </Link>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredPosts.map((post) => (
                <Card key={post.id} className="hover:shadow-medium transition-shadow">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      {post.is_anonymous ? (
                        <div className="w-10 h-10 rounded-full bg-neutral-200 flex items-center justify-center">
                          <User size={20} className="text-neutral-500" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center overflow-hidden">
                          {post.author?.avatar_url ? (
                            <img
                              src={post.author.avatar_url}
                              alt={post.author.full_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User size={20} className="text-primary-600" />
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        {post.is_pinned && (
                          <Pin size={14} className="text-primary-500" />
                        )}
                        {post.is_locked && (
                          <Lock size={14} className="text-neutral-500" />
                        )}
                        <span 
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white"
                          style={{ backgroundColor: post.category?.color }}
                        >
                          {post.category?.name}
                        </span>
                        <span className="text-sm text-neutral-500">
                          by {post.is_anonymous ? 'Anonymous' : post.author?.full_name}
                        </span>
                        <span className="text-sm text-neutral-500">•</span>
                        <span className="text-sm text-neutral-500">
                          {formatTimeAgo(post.created_at)}
                        </span>
                      </div>

                      <Link 
                        to={`/forum/post/${post.id}`}
                        className="block group"
                      >
                        <h3 className="text-lg font-semibold text-neutral-900 group-hover:text-primary-600 transition-colors mb-2">
                          {post.title}
                        </h3>
                        <p className="text-neutral-600 text-sm line-clamp-2 mb-3">
                          {post.content.substring(0, 200)}...
                        </p>
                      </Link>

                      <div className="flex items-center space-x-4 text-sm text-neutral-500">
                        <div className="flex items-center space-x-1">
                          <Eye size={14} />
                          <span>{post.view_count}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <MessageCircle size={14} />
                          <span>{post.comment_count}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <ThumbsUp size={14} />
                          <span>{post.helpful_count}</span>
                        </div>
                        <button className="flex items-center space-x-1 hover:text-primary-600 transition-colors">
                          <Flag size={14} />
                          <span>Report</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex-shrink-0">
                      <ChevronRight size={20} className="text-neutral-400" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForumPage;