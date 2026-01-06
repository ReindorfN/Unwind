import { useEffect, useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addDays } from 'date-fns';
import { 
  Calendar, 
  TrendingUp, 
  BookOpen, 
  Brain, 
  Heart, 
  Music, 
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock,
  Target,
  Smile,
  Frown,
  Meh,
  CheckCircle,
  MessageSquare,
  Award
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useMoodTracker } from '../contexts/MoodTrackerContext';
import { useJournal } from '../contexts/JournalContext';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import MeditationSession from '../components/wellness/MeditationSession';
import GratitudePractice from '../components/wellness/GratitudePractice';
import AppointmentBooking from '../components/appointment/AppointmentBooking';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import StreakCounter from '../components/gamification/StreakCounter';
import PointsDisplay from '../components/gamification/PointsDisplay';
import AchievementBadge from '../components/gamification/AchievementBadge';
import { useGamification } from '../hooks/useGamification';

interface FocusArea {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  description: string;
}

const focusAreas: FocusArea[] = [
  {
    id: 'mindfulness',
    name: 'Mindfulness',
    icon: <Brain size={20} />,
    color: 'bg-blue-500',
    description: 'Meditation and present-moment awareness'
  },
  {
    id: 'heartbreak',
    name: 'Heartbreak Recovery',
    icon: <Heart size={20} />,
    color: 'bg-red-500',
    description: 'Healing from relationship loss'
  },
  {
    id: 'stress',
    name: 'Stress Management',
    icon: <TrendingUp size={20} />,
    color: 'bg-orange-500',
    description: 'Coping with daily pressures'
  },
  {
    id: 'anxiety',
    name: 'Anxiety Support',
    icon: <Brain size={20} />,
    color: 'bg-purple-500',
    description: 'Managing worry and fear'
  },
  {
    id: 'depression',
    name: 'Depression Support',
    icon: <Heart size={20} />,
    color: 'bg-indigo-500',
    description: 'Finding hope and motivation'
  },
  {
    id: 'burnout',
    name: 'Burnout Recovery',
    icon: <TrendingUp size={20} />,
    color: 'bg-yellow-500',
    description: 'Restoring energy and balance'
  }
];

const motivationalQuotes = {
  mindfulness: [
    "The present moment is the only time over which we have dominion. - Thich Nhat Hanh",
    "Mindfulness is a way of befriending ourselves and our experience. - Jon Kabat-Zinn",
    "Peace comes from within. Do not seek it without. - Buddha"
  ],
  heartbreak: [
    "The cure for pain is in the pain. - Rumi",
    "You are braver than you believe, stronger than you seem, and more loved than you know.",
    "Healing doesn't mean the damage never existed. It means the damage no longer controls our lives."
  ],
  stress: [
    "You have been assigned this mountain to show others it can be moved.",
    "Stress is caused by being 'here' but wanting to be 'there'. - Eckhart Tolle",
    "Take time to make your soul happy."
  ],
  anxiety: [
    "You are not your anxiety. You are the observer of your anxiety.",
    "Anxiety is the dizziness of freedom. - Søren Kierkegaard",
    "Breathe in peace, breathe out worry."
  ],
  depression: [
    "Even the darkest night will end and the sun will rise. - Victor Hugo",
    "You are stronger than you think and more resilient than you know.",
    "Small steps in the right direction can turn out to be the biggest step of your life."
  ],
  burnout: [
    "Rest when you're weary. Refresh and renew yourself, your body, your mind, your spirit.",
    "You can't pour from an empty cup. Take care of yourself first.",
    "Burnout is not a badge of honor. Recovery is."
  ]
};

const playlists = {
  mindfulness: [
    { title: "Peaceful Meditation", artist: "Nature Sounds", duration: "45 min" },
    { title: "Mindful Breathing", artist: "Calm Collective", duration: "20 min" },
    { title: "Present Moment", artist: "Zen Masters", duration: "30 min" }
  ],
  heartbreak: [
    { title: "Healing Hearts", artist: "Recovery Playlist", duration: "60 min" },
    { title: "Moving Forward", artist: "Strength Songs", duration: "45 min" },
    { title: "Self Love Anthems", artist: "Empowerment Mix", duration: "50 min" }
  ],
  stress: [
    { title: "Stress Relief", artist: "Calming Sounds", duration: "40 min" },
    { title: "Peaceful Mind", artist: "Relaxation Station", duration: "35 min" },
    { title: "Tension Release", artist: "Wellness Waves", duration: "55 min" }
  ],
  anxiety: [
    { title: "Anxiety Relief", artist: "Peaceful Vibes", duration: "38 min" },
    { title: "Calm & Centered", artist: "Serenity Sounds", duration: "42 min" },
    { title: "Breathe Easy", artist: "Mindful Music", duration: "33 min" }
  ],
  depression: [
    { title: "Hope & Healing", artist: "Uplifting Melodies", duration: "48 min" },
    { title: "Light in Darkness", artist: "Inspirational Mix", duration: "52 min" },
    { title: "Gentle Encouragement", artist: "Comfort Songs", duration: "41 min" }
  ],
  burnout: [
    { title: "Energy Restoration", artist: "Renewal Rhythms", duration: "44 min" },
    { title: "Work-Life Balance", artist: "Harmony Hub", duration: "39 min" },
    { title: "Recharge & Refresh", artist: "Recovery Radio", duration: "47 min" }
  ]
};

const HomePage = () => {
  const { user } = useAuthStore();
  const { entries, getEntriesForDate } = useMoodTracker();
  const { hasTodayEntry: hasJournalEntry } = useJournal();
  const { points, level, streak, addPoints, updateStreak } = useGamification();
  const [selectedFocusArea, setSelectedFocusArea] = useState<string>(() => {
    return localStorage.getItem('selectedFocusArea') || 'mindfulness';
  });
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showMeditation, setShowMeditation] = useState(false);
  const [showGratitude, setShowGratitude] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);

  useEffect(() => {
    document.title = 'Dashboard | Unwind';
    
    // Update streak when the page loads
    updateStreak();
  }, []);

  useEffect(() => {
    localStorage.setItem('selectedFocusArea', selectedFocusArea);
  }, [selectedFocusArea]);

  const handleFocusAreaChange = (areaId: string) => {
    setSelectedFocusArea(areaId);
  };

  const getMoodIcon = (mood: number) => {
    if (mood <= 2) return <Frown size={16} className="text-error-500" />;
    if (mood === 3) return <Meh size={16} className="text-warning-500" />;
    return <Smile size={16} className="text-success-500" />;
  };

  const handleActivityClick = (activity: any) => {
    if (activity.action === 'meditation') {
      setShowMeditation(true);
    } else if (activity.action === 'gratitude') {
      setShowGratitude(true);
    } else if (activity.link) {
      window.location.href = activity.link;
    }
  };

  const handleMeditationComplete = async () => {
    const userId = user?.id || 'anonymous';
    localStorage.setItem(`meditation_completed_today_${userId}`, format(new Date(), 'yyyy-MM-dd'));
    
    // Award points for completing meditation
    await addPoints(50);
    
    // Force re-render by updating state
    setCurrentDate(new Date());
  };

  const handleGratitudeComplete = async () => {
    const userId = user?.id || 'anonymous';
    localStorage.setItem(`gratitude_completed_today_${userId}`, format(new Date(), 'yyyy-MM-dd'));
    
    // Award points for completing gratitude practice
    await addPoints(30);
    
    // Force re-render by updating state
    setCurrentDate(new Date());
  };

  // Calculate points needed for next level
  const getNextLevelPoints = () => {
    return level * 100;
  };

  const currentFocusArea = focusAreas.find(area => area.id === selectedFocusArea);
  const currentQuotes = motivationalQuotes[selectedFocusArea as keyof typeof motivationalQuotes] || [];
  const currentPlaylists = playlists[selectedFocusArea as keyof typeof playlists] || [];
  const todayQuote = currentQuotes[Math.floor(Math.random() * currentQuotes.length)];

  // Calendar logic
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const dailyActivities = [
    { 
      id: 'mood', 
      title: 'Track Your Mood', 
      icon: <Smile size={20} />, 
      completed: getEntriesForDate(format(new Date(), 'yyyy-MM-dd')).length > 0,
      link: '../mood-tracker'
    },
    { 
      id: 'journal', 
      title: 'Write in Journal', 
      icon: <BookOpen size={20} />, 
      completed: hasJournalEntry(),
      link: '/journal'
    },
    { 
      id: 'meditation', 
      title: 'Meditate (10 min)', 
      icon: <Brain size={20} />, 
      completed: localStorage.getItem(`meditation_completed_today_${user?.id || 'anonymous'}`) === format(new Date(), 'yyyy-MM-dd'),
      action: 'meditation'
    },
    { 
      id: 'gratitude', 
      title: 'Practice Gratitude', 
      icon: <Heart size={20} />, 
      completed: localStorage.getItem(`gratitude_completed_today_${user?.id || 'anonymous'}`) === format(new Date(), 'yyyy-MM-dd'),
      action: 'gratitude'
    }
  ];

  // State for upcoming appointments
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([]);
  
  // Load upcoming appointments
  useEffect(() => {
    if (user) {
      loadUpcomingAppointments();
    }
  }, [user]);
  
  const loadUpcomingAppointments = async () => {
    if (!user) return;
    
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id, 
          date, 
          start_time, 
          end_time, 
          type, 
          format, 
          therapist_id
        `)
        .eq('client_id', user.id)
        .eq('status', 'scheduled')
        .gte('date', today)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(3);
      
      if (error) throw error;
      
      // Get therapist names in a separate query to avoid the embedding issue
      const therapistIds = [...new Set((data || []).map(a => a.therapist_id))];
      
      let therapistNames: Record<string, string> = {};
      
      if (therapistIds.length > 0) {
        const { data: therapistsData, error: therapistsError } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', therapistIds);
          
        if (therapistsError) throw therapistsError;
        
        therapistNames = (therapistsData || []).reduce((acc, therapist) => {
          acc[therapist.id] = therapist.full_name;
          return acc;
        }, {} as Record<string, string>);
      }
      
      const formattedAppointments = (data || []).map(appointment => {
        const appointmentDate = new Date(appointment.date);
        const today = new Date();
        const tomorrow = addDays(today, 1);
        
        let dateLabel = format(appointmentDate, 'EEE, MMM d');
        if (isSameDay(appointmentDate, today)) {
          dateLabel = 'Today';
        } else if (isSameDay(appointmentDate, tomorrow)) {
          dateLabel = 'Tomorrow';
        }
        
        return {
          id: appointment.id,
          title: `${appointment.type === 'initial' ? 'Initial Consultation' : 
                  appointment.type === 'follow-up' ? 'Therapy Session' : 
                  'Crisis Session'}`,
          time: formatTime(appointment.start_time),
          date: dateLabel,
          type: appointment.format, 
          therapist: therapistNames[appointment.therapist_id] || 'Your Therapist'
        };
      });
      
      setUpcomingAppointments(formattedAppointments);
    } catch (error) {
      console.error('Error loading appointments:', error);
    }
  };
  
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 mb-2">
          Hello {user?.full_name?.split(' ')[0] || 'there'}, glad you're back! 👋
        </h1>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between">
          <p className="text-neutral-600 text-sm sm:text-base mb-2 sm:mb-0">
            Here's your mental wellness dashboard for {format(new Date(), 'EEEE, MMMM do, yyyy')}
          </p>
          <Link to="/ai-companion">
            <Button 
              variant="primary" 
              size="sm" 
              icon={<MessageSquare size={16} />}
            >
              Want to talk? Rant to our AI
            </Button>
          </Link>
        </div>
      </div>

      {/* Focus Area Selection */}
      <Card className="mb-8">
        <h2 className="text-lg sm:text-xl font-semibold mb-4 flex items-center">
          <Target size={20} className="mr-2 text-primary-500" />
          What are you working on today?
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {focusAreas.map((area) => (
            <button
              key={area.id}
              onClick={() => handleFocusAreaChange(area.id)}
              className={`p-3 rounded-lg border-2 transition-all text-left ${
                selectedFocusArea === area.id
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-neutral-200 hover:border-primary-300'
              }`}
            >
              <div className={`w-8 h-8 rounded-full ${area.color} flex items-center justify-center text-white mb-2`}>
                {area.icon}
              </div>
              <h3 className="font-medium text-sm text-neutral-900">{area.name}</h3>
              <p className="text-xs text-neutral-600 mt-1 hidden sm:block">{area.description}</p>
            </button>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="xl:col-span-2 space-y-6">
          {/* Daily Motivation */}
          <Card>
            <h2 className="text-lg sm:text-xl font-semibold mb-4 flex items-center">
              <Heart size={20} className="mr-2 text-primary-500" />
              Daily Motivation for {currentFocusArea?.name}
            </h2>
            <div className="bg-black p-4 sm:p-6 rounded-lg">
              <p className="text-white italic text-base sm:text-lg leading-relaxed">
                "{todayQuote}"
              </p>
            </div>
          </Card>

          {/* Daily Activities */}
          <Card>
            <h2 className="text-lg sm:text-xl font-semibold mb-4 flex items-center">
              <Clock size={20} className="mr-2 text-primary-500" />
              Today's Wellness Activities
            </h2>
            <div className="space-y-3">
              {dailyActivities.map((activity) => (
                <button
                  key={activity.id}
                  onClick={() => handleActivityClick(activity)}
                  className={`w-full flex items-center p-3 rounded-lg border transition-colors hover:shadow-sm ${
                    activity.completed
                      ? 'bg-success-50 border-success-200'
                      : 'bg-neutral-50 border-neutral-200 hover:border-primary-300'
                  }`}
                >
                  <div className={`p-2 rounded-full mr-3 ${
                    activity.completed ? 'bg-success-100 text-success-600' : 'bg-neutral-100 text-neutral-600'
                  }`}>
                    {activity.icon}
                  </div>
                  <span className={`flex-1 text-sm sm:text-base ${
                    activity.completed ? 'text-success-700' : 'text-neutral-700'
                  }`}>
                    {activity.title}
                  </span>
                  {activity.completed ? (
                    <CheckCircle size={20} className="text-success-600" />
                  ) : (
                    <span className="text-neutral-400 text-xs sm:text-sm">Not completed</span>
                  )}
                </button>
              ))}
            </div>
          </Card>

          {/* Mood Calendar */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg sm:text-xl font-semibold flex items-center">
                <Calendar size={20} className="mr-2 text-primary-500" />
                Mood Calendar
              </h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => navigateMonth('prev')}
                  className="p-1 rounded-md hover:bg-neutral-100"
                >
                  <ChevronLeft size={20} />
                </button>
                <span className="font-medium text-neutral-700 text-sm sm:text-base">
                  {format(currentDate, 'MMM yyyy')}
                </span>
                <button
                  onClick={() => navigateMonth('next')}
                  className="p-1 rounded-md hover:bg-neutral-100"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-xs sm:text-sm font-medium text-neutral-500 p-1 sm:p-2">
                  {day}
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-7 gap-1">
              {monthDays.map(day => {
                const dayEntries = getEntriesForDate(format(day, 'yyyy-MM-dd'));
                const latestMood = dayEntries.length > 0 ? dayEntries[dayEntries.length - 1].mood : null;
                const isToday = isSameDay(day, new Date());
                
                return (
                  <div
                    key={day.toISOString()}
                    className={`aspect-square flex items-center justify-center text-xs sm:text-sm rounded-md relative ${
                      isToday ? 'bg-primary-100 text-primary-700 font-semibold' : 'text-neutral-700'
                    }`}
                  >
                    <span>{format(day, 'd')}</span>
                    {latestMood && (
                      <div className="absolute bottom-0 right-0">
                        {getMoodIcon(latestMood)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <Card>
            <h3 className="text-lg font-semibold mb-4">Quick Stats</h3>
            <div className="space-y-3">
              <StreakCounter streak={streak} className="mb-3" />
              <PointsDisplay 
                points={points} 
                level={level} 
                nextLevelPoints={getNextLevelPoints()} 
                className="mb-3"
              />
              {/* <div className="flex justify-between items-center">
                <span className="text-neutral-600 text-sm">Mood entries this month</span>
                <span className="font-semibold text-primary-600">{entries.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-600 text-sm">Current streak</span>
                <span className="font-semibold text-primary-600">7 days</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-600 text-sm">Focus area</span>
                <span className="font-semibold text-primary-600 text-sm">{currentFocusArea?.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-600 text-sm">Journal entries today</span>
                <span className="font-semibold text-primary-600">{hasJournalEntry() ? '1' : '0'}</span>
              </div> */}
            </div>
          </Card>

          {/* Upcoming Appointments */}
          <Card>
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Calendar size={18} className="mr-2" />
              <div className="flex justify-between w-full">
                <span>Upcoming Appointments</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowAppointmentModal(true)}
                >
                  Book Session
                </Button>
              </div>
            </h3>
            {upcomingAppointments.length > 0 ? (
              <div className="space-y-3">
                {upcomingAppointments.map((appointment) => (
                  <div key={appointment.id} className="flex items-center p-3 bg-neutral-50 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-neutral-900 text-sm">
                        {appointment.title} with {appointment.therapist}
                      </h4>
                      <p className="text-xs text-neutral-600">{appointment.date} at {appointment.time}</p>
                    </div>
                  </div>
                ))}
                <div className="text-center pt-2">
                  <Link to="/appointments" className="text-sm text-primary-600 hover:text-primary-700">
                    View all appointments
                  </Link>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-neutral-500 mb-3 text-sm">No upcoming appointments</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  icon={<Plus size={16} />}
                  onClick={() => setShowAppointmentModal(true)}
                >
                  Schedule Session
                </Button>
              </div>
            )}
          </Card>

          {/* Curated Playlist */} 
          {/* <Card>
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Music size={18} className="mr-2" />
              {currentFocusArea?.name} Playlist
            </h3>
            <div className="space-y-3">
              {currentPlaylists.map((playlist, index) => (
                <div key={index} className="flex items-center p-3 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition-colors cursor-pointer">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary-100 rounded-lg flex items-center justify-center mr-3">
                    <Music size={14} className="text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-neutral-900 text-xs sm:text-sm truncate">{playlist.title}</h4>
                    <p className="text-xs text-neutral-600 truncate">{playlist.artist} • {playlist.duration}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card> */}
          
          {/* Achievements Section */}
          <Card>
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Award size={18} className="mr-2" />
              Your Achievements
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <AchievementBadge
                icon={<Calendar size={18} />}
                title="Consistent Tracker"
                description="Track your mood for 7 consecutive days"
                progress={Math.min(streak, 7)}
                maxProgress={7}
                isUnlocked={streak >= 7}
                color="primary"
              />
              <AchievementBadge
                icon={<BookOpen size={18} />}
                title="Journal Master"
                description="Complete 5 journal entries"
                progress={hasJournalEntry() ? 1 : 0}
                maxProgress={5}
                isUnlocked={false}
                color="secondary"
              />
              <AchievementBadge
                icon={<Brain size={18} />}
                title="Meditation Guru"
                description="Complete 10 meditation sessions"
                progress={localStorage.getItem(`meditation_completed_today_${user?.id || 'anonymous'}`) === format(new Date(), 'yyyy-MM-dd') ? 1 : 0}
                maxProgress={10}
                isUnlocked={false}
                color="accent"
              />
              <AchievementBadge
                icon={<Heart size={18} />}
                title="Gratitude Champion"
                description="Practice gratitude 5 times"
                progress={localStorage.getItem(`gratitude_completed_today_${user?.id || 'anonymous'}`) === format(new Date(), 'yyyy-MM-dd') ? 1 : 0}
                maxProgress={5}
                isUnlocked={false}
                color="success"
              />
            </div>
          </Card>
        </div>
      </div>

      {/* Meditation Modal */}
      {showMeditation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <MeditationSession
            onComplete={handleMeditationComplete}
            onClose={() => setShowMeditation(false)}
          />
        </div>
      )}

      {/* Gratitude Modal */}
      {showGratitude && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <GratitudePractice
            onComplete={handleGratitudeComplete}
            onClose={() => setShowGratitude(false)}
          />
        </div>
      )}
      
      {/* Appointment Booking Modal */}
      {showAppointmentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="max-w-4xl w-full">
            <AppointmentBooking 
              onClose={() => setShowAppointmentModal(false)}
              onSuccess={() => {
                setShowAppointmentModal(false);
                loadUpcomingAppointments();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;