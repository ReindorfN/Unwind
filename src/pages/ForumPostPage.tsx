import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft,
  ThumbsUp,
  MessageCircle,
  Eye,
  Flag,
  User,
  Pin,
  Lock,
  Edit,
  Trash2,
  Send,
  Heart,
  MoreVertical
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import Button from '../components/common/Button';
import Card from '../components/common/Card';

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
  updated_at: string;
  author?: {
    full_name: string;
    avatar_url?: string;
  };
  category?: {
    name: string;
    color: string;
    icon: string;
  };
}

interface ForumComment {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  is_anonymous: boolean;
  helpful_count: number;
  created_at: string;
  updated_at: string;
  author?: {
    full_name: string;
    avatar_url?: string;
  };
}

interface HelpfulVote {
  id: string;
  user_id: string;
  post_id?: string;
  comment_id?: string;
}

const ForumPostPage = () => {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [post, setPost] = useState<ForumPost | null>(null);
  const [comments, setComments] = useState<ForumComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [helpfulVotes, setHelpfulVotes] = useState<HelpfulVote[]>([]);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportTarget, setReportTarget] = useState<{ type: 'post' | 'comment'; id: string } | null>(null);

  useEffect(() => {
    if (postId) {
      loadPost();
      loadComments();
      loadHelpfulVotes();
      incrementViewCount();
    }
  }, [postId]);

  const loadPost = async () => {
    try {
      const { data, error } = await supabase
        .from('forum_posts')
        .select(`
          *,
          author:profiles(full_name, avatar_url),
          category:forum_categories(name, color, icon)
        `)
        .eq('id', postId)
        .single();

      if (error) throw error;
      setPost(data);
      document.title = `${data.title} | Community Forum | Unwind`;
    } catch (error) {
      console.error('Error loading post:', error);
      navigate('/forum');
    }
  };

  const loadComments = async () => {
    try {
      const { data, error } = await supabase
        .from('forum_comments')
        .select(`
          *,
          author:profiles(full_name, avatar_url)
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadHelpfulVotes = async () => {
    try {
      const { data, error } = await supabase
        .from('forum_helpful_votes')
        .select('*')
        .eq('user_id', user?.id);

      if (error) throw error;
      setHelpfulVotes(data || []);
    } catch (error) {
      console.error('Error loading helpful votes:', error);
    }
  };

  const incrementViewCount = async () => {
    try {
      await supabase
        .from('forum_posts')
        .update({ view_count: (post?.view_count || 0) + 1 })
        .eq('id', postId);
    } catch (error) {
      console.error('Error incrementing view count:', error);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('forum_comments')
        .insert({
          post_id: postId,
          author_id: user.id,
          content: newComment.trim(),
          is_anonymous: isAnonymous,
        });

      if (error) throw error;

      setNewComment('');
      setIsAnonymous(false);
      await loadComments();
      await loadPost(); // Refresh to update comment count
    } catch (error) {
      console.error('Error submitting comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleHelpfulVote = async (type: 'post' | 'comment', targetId: string) => {
    if (!user) return;

    try {
      const existingVote = helpfulVotes.find(vote => 
        type === 'post' ? vote.post_id === targetId : vote.comment_id === targetId
      );

      if (existingVote) {
        // Remove vote
        await supabase
          .from('forum_helpful_votes')
          .delete()
          .eq('id', existingVote.id);
      } else {
        // Add vote
        await supabase
          .from('forum_helpful_votes')
          .insert({
            user_id: user.id,
            [type === 'post' ? 'post_id' : 'comment_id']: targetId,
          });
      }

      await loadHelpfulVotes();
      if (type === 'post') {
        await loadPost();
      } else {
        await loadComments();
      }
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  const handleReport = async () => {
    if (!reportTarget || !reportReason.trim() || !user) return;

    try {
      await supabase
        .from('forum_reports')
        .insert({
          reporter_id: user.id,
          [reportTarget.type === 'post' ? 'post_id' : 'comment_id']: reportTarget.id,
          reason: reportReason.trim(),
        });

      setShowReportModal(false);
      setReportTarget(null);
      setReportReason('');
      alert('Report submitted successfully. Thank you for helping keep our community safe.');
    } catch (error) {
      console.error('Error submitting report:', error);
      alert('Error submitting report. Please try again.');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      await supabase
        .from('forum_comments')
        .delete()
        .eq('id', commentId);

      await loadComments();
      await loadPost();
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const isPostHelpful = helpfulVotes.some(vote => vote.post_id === post?.id);
  const getCommentHelpfulStatus = (commentId: string) => 
    helpfulVotes.some(vote => vote.comment_id === commentId);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-neutral-900 mb-2">Post not found</h2>
          <p className="text-neutral-600 mb-4">The post you're looking for doesn't exist or has been removed.</p>
          <Link to="/forum">
            <Button variant="primary" icon={<ArrowLeft size={18} />}>
              Back to Forum
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Back Button */}
      <div className="mb-6">
        <Link to="/forum">
          <Button variant="outline" icon={<ArrowLeft size={18} />}>
            Back to Forum
          </Button>
        </Link>
      </div>

      {/* Post Content */}
      <Card className="mb-6">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            {post.is_anonymous ? (
              <div className="w-12 h-12 rounded-full bg-neutral-200 flex items-center justify-center">
                <User size={24} className="text-neutral-500" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center overflow-hidden">
                {post.author?.avatar_url ? (
                  <img
                    src={post.author.avatar_url}
                    alt={post.author.full_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User size={24} className="text-primary-600" />
                )}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-3">
              {post.is_pinned && (
                <Pin size={16} className="text-primary-500" />
              )}
              {post.is_locked && (
                <Lock size={16} className="text-neutral-500" />
              )}
              <span 
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-white"
                style={{ backgroundColor: post.category?.color }}
              >
                {post.category?.name}
              </span>
            </div>

            <h1 className="text-2xl font-bold text-neutral-900 mb-3">{post.title}</h1>

            <div className="flex items-center space-x-4 text-sm text-neutral-500 mb-4">
              <span>
                by {post.is_anonymous ? 'Anonymous' : post.author?.full_name}
              </span>
              <span>•</span>
              <span>
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
              </span>
              {post.updated_at !== post.created_at && (
                <>
                  <span>•</span>
                  <span>
                    edited {formatDistanceToNow(new Date(post.updated_at), { addSuffix: true })}
                  </span>
                </>
              )}
            </div>

            <div className="prose max-w-none mb-6">
              <p className="text-neutral-700 whitespace-pre-wrap">{post.content}</p>
            </div>

            <div className="flex items-center space-x-6 text-sm text-neutral-500">
              <div className="flex items-center space-x-1">
                <Eye size={16} />
                <span>{post.view_count}</span>
              </div>
              <div className="flex items-center space-x-1">
                <MessageCircle size={16} />
                <span>{post.comment_count}</span>
              </div>
              <button
                onClick={() => handleHelpfulVote('post', post.id)}
                className={`flex items-center space-x-1 transition-colors ${
                  isPostHelpful 
                    ? 'text-primary-600' 
                    : 'hover:text-primary-600'
                }`}
              >
                <ThumbsUp size={16} className={isPostHelpful ? 'fill-current' : ''} />
                <span>{post.helpful_count}</span>
              </button>
              <button
                onClick={() => {
                  setReportTarget({ type: 'post', id: post.id });
                  setShowReportModal(true);
                }}
                className="flex items-center space-x-1 hover:text-error-600 transition-colors"
              >
                <Flag size={16} />
                <span>Report</span>
              </button>
              {user?.id === post.author_id && (
                <div className="flex items-center space-x-2">
                  <button className="flex items-center space-x-1 hover:text-primary-600 transition-colors">
                    <Edit size={16} />
                    <span>Edit</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Comments Section */}
      <Card>
        <h2 className="text-xl font-semibold mb-6">
          Comments ({comments.length})
        </h2>

        {/* New Comment Form */}
        {!post.is_locked && (
          <form onSubmit={handleSubmitComment} className="mb-8">
            <div className="mb-4">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Share your thoughts..."
                className="w-full p-3 border border-neutral-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                rows={4}
                required
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500 mr-2"
                />
                <span className="text-sm text-neutral-600">Post anonymously</span>
              </label>
              <Button
                type="submit"
                variant="primary"
                disabled={submitting || !newComment.trim()}
                icon={<Send size={18} />}
              >
                {submitting ? 'Posting...' : 'Post Comment'}
              </Button>
            </div>
          </form>
        )}

        {/* Comments List */}
        {comments.length === 0 ? (
          <div className="text-center py-8">
            <MessageCircle size={48} className="mx-auto text-neutral-400 mb-4" />
            <h3 className="text-lg font-medium text-neutral-900 mb-2">No comments yet</h3>
            <p className="text-neutral-600">
              {post.is_locked 
                ? 'This post is locked and no longer accepting comments.'
                : 'Be the first to share your thoughts!'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {comments.map((comment) => (
              <div key={comment.id} className="border-b border-neutral-100 last:border-0 pb-6 last:pb-0">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    {comment.is_anonymous ? (
                      <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center">
                        <User size={16} className="text-neutral-500" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center overflow-hidden">
                        {comment.author?.avatar_url ? (
                          <img
                            src={comment.author.avatar_url}
                            alt={comment.author.full_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User size={16} className="text-primary-600" />
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="font-medium text-neutral-900">
                        {comment.is_anonymous ? 'Anonymous' : comment.author?.full_name}
                      </span>
                      <span className="text-sm text-neutral-500">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                      </span>
                      {comment.updated_at !== comment.created_at && (
                        <span className="text-sm text-neutral-500">(edited)</span>
                      )}
                    </div>

                    <p className="text-neutral-700 mb-3 whitespace-pre-wrap">{comment.content}</p>

                    <div className="flex items-center space-x-4 text-sm text-neutral-500">
                      <button
                        onClick={() => handleHelpfulVote('comment', comment.id)}
                        className={`flex items-center space-x-1 transition-colors ${
                          getCommentHelpfulStatus(comment.id)
                            ? 'text-primary-600' 
                            : 'hover:text-primary-600'
                        }`}
                      >
                        <ThumbsUp size={14} className={getCommentHelpfulStatus(comment.id) ? 'fill-current' : ''} />
                        <span>{comment.helpful_count}</span>
                      </button>
                      <button
                        onClick={() => {
                          setReportTarget({ type: 'comment', id: comment.id });
                          setShowReportModal(true);
                        }}
                        className="flex items-center space-x-1 hover:text-error-600 transition-colors"
                      >
                        <Flag size={14} />
                        <span>Report</span>
                      </button>
                      {user?.id === comment.author_id && (
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="flex items-center space-x-1 hover:text-error-600 transition-colors"
                        >
                          <Trash2 size={14} />
                          <span>Delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Report Content</h3>
              <p className="text-neutral-600 mb-4">
                Help us keep the community safe by reporting inappropriate content.
              </p>
              <textarea
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="Please describe why you're reporting this content..."
                className="w-full p-3 border border-neutral-300 rounded-md focus:ring-primary-500 focus:border-primary-500 mb-4"
                rows={4}
                required
              />
              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowReportModal(false);
                    setReportTarget(null);
                    setReportReason('');
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="error"
                  onClick={handleReport}
                  disabled={!reportReason.trim()}
                  className="flex-1"
                >
                  Submit Report
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ForumPostPage;