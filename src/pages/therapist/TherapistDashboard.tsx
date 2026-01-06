import { useEffect, useState } from 'react';
import { 
  Calendar, 
  Users, 
  MessageCircle, 
  Clock, 
  Award, 
  FileText, 
  CheckCircle, 
  AlertCircle,
  ArrowUpRight,
  BarChart,
  User
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import SectionHeading from '../../components/common/SectionHeading';

interface ForumActivity {
  id: string;
  title: string;
  category: string;
  created_at: string;
  comment_count: number;
}

interface Appointment {
  id: string;
  client_id: string;
  client_name?: string;
  date: string;
  start_time: string;
  end_time: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
  type: 'initial' | 'follow-up' | 'crisis';
  format: 'video' | 'phone' | 'in-person';
  notes?: string;
}

interface TherapistStats {
  totalClients: number;
  totalAppointments: number;
  completedAppointments: number;
  upcomingAppointments: number;
  averageRating: number;
}

const TherapistDashboard = () => {
  const { user } = useAuthStore();
  const [therapistInfo, setTherapistInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [forumActivity, setForumActivity] = useState<ForumActivity[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState<TherapistStats>({
    totalClients: 0,
    totalAppointments: 0,
    completedAppointments: 0,
    upcomingAppointments: 0,
    averageRating: 4.8
  });
  
  useEffect(() => {
    document.title = 'Therapist Dashboard | Unwind';
    loadTherapistInfo();
    loadUpcomingAppointments();
    loadForumActivity();
  }, [user]);

  const loadTherapistInfo = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('therapists')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setTherapistInfo(data);

      // Simulate loading stats
      setStats({
        totalClients: 12,
        totalAppointments: 48,
        completedAppointments: 42,
        upcomingAppointments: 6,
        averageRating: 4.8
      });
    } catch (error) {
      console.error('Error loading therapist info:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUpcomingAppointments = async () => {
    if (!user) return;

    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      
      // Get upcoming appointments for the therapist
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointments')
        .select(`
          id,
          client_id,
          date,
          start_time,
          end_time,
          status,
          type,
          format,
          notes,
          profiles:client_id(full_name)
        `)
        .eq('therapist_id', user.id)
        .eq('status', 'scheduled')
        .gte('date', today)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(5);

      if (appointmentsError) throw appointmentsError;

      // Format appointments with client names
      const formattedAppointments = (appointmentsData || []).map(appointment => ({
        id: appointment.id,
        client_id: appointment.client_id,
        client_name: appointment.profiles?.full_name || 'Unknown Client',
        date: appointment.date,
        start_time: appointment.start_time,
        end_time: appointment.end_time,
        status: appointment.status,
        type: appointment.type,
        format: appointment.format,
        notes: appointment.notes
      }));

      setUpcomingAppointments(formattedAppointments);

      // Update stats
      const { count: totalAppointmentsCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('therapist_id', user.id);

      const { count: completedAppointmentsCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('therapist_id', user.id)
        .eq('status', 'completed');

      const { count: upcomingAppointmentsCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('therapist_id', user.id)
        .eq('status', 'scheduled')
        .gte('date', today);

      // Get unique client count
      const { data: uniqueClients } = await supabase
        .from('appointments')
        .select('client_id')
        .eq('therapist_id', user.id)
        .limit(1000);

      const uniqueClientIds = new Set((uniqueClients || []).map(a => a.client_id));

      setStats({
        totalClients: uniqueClientIds.size,
        totalAppointments: totalAppointmentsCount || 0,
        completedAppointments: completedAppointmentsCount || 0,
        upcomingAppointments: upcomingAppointmentsCount || 0,
        averageRating: 4.8 // Placeholder until we implement ratings
      });

    } catch (error) {
      console.error('Error loading appointments:', error);
    }
  };

  const loadForumActivity = async () => {
    try {
      // Get recent forum posts
      const { data: postsData, error: postsError } = await supabase
        .from('forum_posts')
        .select(`
          id,
          title,
          created_at,
          comment_count,
          forum_categories(name)
        `)
        .order('created_at', { ascending: false })
        .limit(3);

      if (postsError) throw postsError;

      // Format forum activity
      const formattedActivity = (postsData || []).map(post => ({
        id: post.id,
        title: post.title,
        category: post.forum_categories?.name || 'General',
        created_at: post.created_at,
        comment_count: post.comment_count
      }));

      setForumActivity(formattedActivity);
    } catch (error) {
      console.error('Error loading forum activity:', error);
    }
  };

  const formatAppointmentDate = (dateStr: string) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
    
    if (dateStr === today) return 'Today';
    if (dateStr === tomorrow) return 'Tomorrow';
    return format(new Date(dateStr), 'EEE, MMM d');
  };
  
  const formatAppointmentTime = (startTime: string, endTime: string) => {
    const formatTime = (time: string) => {
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      return `${hour12}:${minutes} ${ampm}`;
    };
    
    return `${formatTime(startTime)}`;
  };

  const getAppointmentTypeLabel = (type: string) => {
    switch (type) {
      case 'initial': return 'Initial Consultation';
      case 'follow-up': return 'Follow-up Session';
      case 'crisis': return 'Crisis Session';
      default: return type;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return `${Math.floor(diffInHours / 168)}w ago`;
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
        title={`Welcome, ${user?.full_name?.split(' ')[0] || 'Therapist'}`}
        subtitle="Manage your appointments, clients, and availability"
        className="mb-8"
      />

      {/* Verification Status */}
      {therapistInfo?.verified ? (
        <div className="bg-success-50 border border-success-200 rounded-lg p-4 mb-8 flex items-start">
          <CheckCircle className="text-success-600 mr-3 mt-0.5" size={20} />
          <div>
            <h3 className="font-medium text-success-800">Verified Therapist Account</h3>
            <p className="text-success-700 text-sm">
              Your account has been verified. You have full access to all therapist features.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-warning-50 border border-warning-200 rounded-lg p-4 mb-8 flex items-start">
          <AlertCircle className="text-warning-600 mr-3 mt-0.5" size={20} />
          <div>
            <h3 className="font-medium text-warning-800">Verification Pending</h3>
            <p className="text-warning-700 text-sm">
              Your therapist account is pending verification. Some features may be limited until verification is complete.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center mb-2">
                  <Users className="text-primary-600" size={20} />
                </div>
                <span className="text-2xl font-bold text-neutral-900">{stats.totalClients}</span>
                <span className="text-sm text-neutral-600">Total Clients</span>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-secondary-100 flex items-center justify-center mb-2">
                  <Calendar className="text-secondary-600" size={20} />
                </div>
                <span className="text-2xl font-bold text-neutral-900">{stats.totalAppointments}</span>
                <span className="text-sm text-neutral-600">Total Sessions</span>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-accent-100 flex items-center justify-center mb-2">
                  <Clock className="text-accent-600" size={20} />
                </div>
                <span className="text-2xl font-bold text-neutral-900">{stats.upcomingAppointments}</span>
                <span className="text-sm text-neutral-600">Upcoming</span>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-success-100 flex items-center justify-center mb-2">
                  <Award className="text-success-600" size={20} />
                </div>
                <span className="text-2xl font-bold text-neutral-900">{stats.averageRating}</span>
                <span className="text-sm text-neutral-600">Avg. Rating</span>
              </div>
            </Card>
          </div>

          {/* Upcoming Appointments */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center">
                <Calendar className="mr-2 text-primary-500" size={20} />
                Upcoming Appointments
              </h3>
              <div className="flex space-x-2">
                <Link to="/therapist/availability">
                  <Button variant="outline" size="sm">Set Availability</Button>
                </Link>
                <Link to="/therapist/appointments">
                  <Button variant="outline" size="sm">View All</Button>
                </Link>
              </div>
            </div>
            
            {upcomingAppointments.length > 0 ? (
              <div className="space-y-3">
                {upcomingAppointments.map((appointment) => (
                  <div key={appointment.id} className="flex items-center p-3 bg-neutral-50 rounded-lg">
                    <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center mr-3">
                      <User className="text-primary-600" size={18} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center">
                        <h4 className="font-medium text-neutral-900">{appointment.client_name}</h4>
                        <span className="ml-2 px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full text-xs">
                          {getAppointmentTypeLabel(appointment.type)}
                        </span>
                      </div>
                      <p className="text-sm text-neutral-600">
                        {formatAppointmentDate(appointment.date)} at {formatAppointmentTime(appointment.start_time, appointment.end_time)}
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      Details
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="mx-auto text-neutral-400 mb-2" size={32} />
                <p className="text-neutral-600 mb-4">No upcoming appointments</p>
                <Link to="/therapist/availability">
                  <Button variant="primary" size="sm">Set Availability</Button>
                </Link>
              </div>
            )}
          </Card>

          {/* Recent Forum Activity */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center">
                <MessageCircle className="mr-2 text-primary-500" size={20} />
                Recent Forum Activity
              </h3>
              <div className="flex space-x-2">
                <Link to="/forum/create">
                  <Button variant="outline" size="sm">Create Post</Button>
                </Link>
                <Link to="/forum">
                  <Button variant="outline" size="sm">View Forum</Button>
                </Link>
              </div>
            </div>
            
            {forumActivity.length > 0 ? (
              <div className="space-y-3">
                {forumActivity.map((activity) => (
                  <div key={activity.id} className="p-3 bg-neutral-50 rounded-lg">
                    <div className="flex items-start">
                      <div className="flex-1">
                        <span className="text-xs text-neutral-500">{activity.category} • {formatTimeAgo(activity.created_at)}</span>
                        <h4 className="font-medium text-neutral-900 text-sm">{activity.title}</h4>
                        <p className="text-xs text-neutral-600 mt-1">
                          {activity.comment_count > 0 
                            ? `Active discussion with ${activity.comment_count} comment${activity.comment_count !== 1 ? 's' : ''}.`
                            : 'New post with no comments yet.'}
                        </p>
                      </div>
                      <Link to={`/forum/post/${activity.id}`}>
                        <ArrowUpRight className="text-primary-500" size={16} />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <MessageCircle className="mx-auto text-neutral-400 mb-2" size={32} />
                <p className="text-neutral-600 mb-4">No recent forum activity</p>
                <Link to="/forum/create">
                  <Button variant="primary" size="sm">Create First Post</Button>
                </Link>
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <Link to="/therapist/appointments/new">
                <Button variant="primary" fullWidth icon={<Calendar size={16} />}>
                  Schedule Appointment
                </Button>
              </Link>
              <Link to="/therapist/availability">
                <Button variant="outline" fullWidth icon={<Clock size={16} />}>
                  Update Availability
                </Button>
              </Link>
              <Link to="/forum/create">
                <Button variant="outline" fullWidth icon={<MessageCircle size={16} />}>
                  Create Forum Post
                </Button>
              </Link>
              <Link to="/therapist/notes">
                <Button variant="outline" fullWidth icon={<FileText size={16} />}>
                  Client Notes
                </Button>
              </Link>
            </div>
          </Card>

          {/* Weekly Schedule */}
          <Card>
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Clock className="mr-2" size={18} />
              This Week's Schedule
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-neutral-900">Monday</h4>
                  <p className="text-sm text-neutral-600">3 appointments</p>
                </div>
                <span className="text-sm text-primary-600">9 AM - 5 PM</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-neutral-900">Tuesday</h4>
                  <p className="text-sm text-neutral-600">4 appointments</p>
                </div>
                <span className="text-sm text-primary-600">10 AM - 6 PM</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-neutral-900">Wednesday</h4>
                  <p className="text-sm text-neutral-600">2 appointments</p>
                </div>
                <span className="text-sm text-primary-600">9 AM - 3 PM</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-neutral-900">Thursday</h4>
                  <p className="text-sm text-neutral-600">5 appointments</p>
                </div>
                <span className="text-sm text-primary-600">11 AM - 7 PM</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-neutral-900">Friday</h4>
                  <p className="text-sm text-neutral-600">3 appointments</p>
                </div>
                <span className="text-sm text-primary-600">9 AM - 4 PM</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-neutral-200">
              <Link to="/therapist/availability">
                <Button variant="outline" size="sm" fullWidth>
                  Manage Schedule
                </Button>
              </Link>
            </div>
          </Card>

          {/* Performance Stats */}
          <Card>
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <BarChart className="mr-2" size={18} />
              Performance
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-neutral-600">Session completion rate</span>
                <span className="font-semibold text-primary-600">98%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-neutral-600">Client satisfaction</span>
                <span className="font-semibold text-primary-600">4.8/5</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-neutral-600">Avg. response time</span>
                <span className="font-semibold text-primary-600">4 hours</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-neutral-600">Forum contributions</span>
                <span className="font-semibold text-primary-600">12 posts</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TherapistDashboard;