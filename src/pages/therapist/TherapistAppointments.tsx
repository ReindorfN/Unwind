import { useState, useEffect } from 'react';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  User, 
  Video, 
  Phone,
  FileText,
  Filter,
  Search,
  Plus,
  Check,
  X,
  AlertCircle
} from 'lucide-react';
import { format, addDays, subDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import SectionHeading from '../../components/common/SectionHeading';

interface Appointment {
  id: string;
  client_id: string; 
  client_name?: string;
  date: string;
  start_time: string;
  end_time: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
  type: 'initial' | 'follow-up' | 'crisis';
  format: 'video' | 'phone';
  notes?: string;
}

const TherapistAppointments = () => {
  const { user } = useAuthStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'day' | 'week' | 'month'>('week');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    document.title = 'Appointments | Therapist Dashboard';
    loadAppointments();
  }, [user]);

  useEffect(() => {
    filterAppointments();
  }, [appointments, statusFilter, searchQuery, currentDate, view]);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      // Fetch appointments from the database with proper joins
      const { data, error } = await supabase
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
          notes
        `)
        .eq('therapist_id', user?.id)
        .order('date', { ascending: true });

      if (error) throw error;

      // Get client names in a separate query to avoid the embedding issue
      const clientIds = [...new Set((data || []).map(a => a.client_id))];
      
      let clientNames: Record<string, string> = {};
      
      if (clientIds.length > 0) {
        const { data: clientsData, error: clientsError } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', clientIds);
          
        if (clientsError) throw clientsError;
        
        clientNames = (clientsData || []).reduce((acc, client) => {
          acc[client.id] = client.full_name;
          return acc;
        }, {} as Record<string, string>);
      }
      
      // Format appointments with client names from the separate query
      const formattedAppointments = (data || []).map(appointment => {
        return {
          id: appointment.id,
          client_id: appointment.client_id,
          client_name: clientNames[appointment.client_id] || 'Unknown Client',
          date: appointment.date,
          start_time: appointment.start_time,
          end_time: appointment.end_time,
          status: appointment.status,
          type: appointment.type,
          format: appointment.format,
          notes: appointment.notes
        };
      });

      setAppointments(formattedAppointments);
    } catch (error) {
      console.error('Error loading appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAppointments = () => {
    let filtered = [...appointments];
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(appointment => appointment.status === statusFilter);
    }
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(appointment => 
        appointment.client_name.toLowerCase().includes(query) ||
        appointment.notes?.toLowerCase().includes(query)
      );
    }
    
    // Apply date filter based on view
    if (view === 'day') {
      filtered = filtered.filter(appointment => 
        appointment.date === format(currentDate, 'yyyy-MM-dd')
      );
    } else if (view === 'week') {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
      const weekDates = eachDayOfInterval({ start: weekStart, end: weekEnd }).map(date => 
        format(date, 'yyyy-MM-dd')
      );
      filtered = filtered.filter(appointment => weekDates.includes(appointment.date));
    } else if (view === 'month') {
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();
      filtered = filtered.filter(appointment => {
        const appointmentDate = new Date(appointment.date);
        return appointmentDate.getMonth() === currentMonth && 
               appointmentDate.getFullYear() === currentYear;
      });
    }
    
    // Sort by date and time
    filtered.sort((a, b) => {
      if (a.date !== b.date) {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      }
      return a.start_time.localeCompare(b.start_time);
    });
    
    setFilteredAppointments(filtered);
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      if (view === 'day') {
        direction === 'prev' ? newDate.setDate(prevDate.getDate() - 1) : newDate.setDate(prevDate.getDate() + 1);
      } else if (view === 'week') {
        direction === 'prev' ? newDate.setDate(prevDate.getDate() - 7) : newDate.setDate(prevDate.getDate() + 7);
      } else if (view === 'month') {
        direction === 'prev' ? newDate.setMonth(prevDate.getMonth() - 1) : newDate.setMonth(prevDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const getDateRangeText = () => {
    if (view === 'day') {
      return format(currentDate, 'MMMM d, yyyy');
    } else if (view === 'week') {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
      return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
    } else {
      return format(currentDate, 'MMMM yyyy');
    }
  };

  const getAppointmentStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-primary-100 text-primary-700';
      case 'completed': return 'bg-success-100 text-success-700';
      case 'cancelled': return 'bg-neutral-100 text-neutral-700';
      case 'no-show': return 'bg-error-100 text-error-700';
      default: return 'bg-neutral-100 text-neutral-700';
    }
  };

  const getAppointmentTypeLabel = (type: string) => {
    switch (type) {
      case 'initial': return 'Initial Consultation';
      case 'follow-up': return 'Follow-up Session';
      case 'crisis': return 'Crisis Session';
      default: return type;
    }
  };

  const formatAppointmentTime = (start: string, end: string) => {
    const formatTime = (time: string) => {
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      return `${hour12}:${minutes} ${ampm}`;
    };
    
    return `${formatTime(start)} - ${formatTime(end)}`;
  };

  const getAppointmentsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return filteredAppointments.filter(appointment => appointment.date === dateStr);
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
        title="Appointments"
        subtitle="Manage your client appointments and schedule"
        className="mb-8"
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <Card className="mb-6">
            {/* Calendar Header */}
            <div className="flex flex-wrap items-center justify-between mb-6">
              <div className="flex items-center space-x-2 mb-2 sm:mb-0">
                <button
                  onClick={() => navigateDate('prev')}
                  className="p-1 rounded-md hover:bg-neutral-100"
                >
                  <ChevronLeft size={20} />
                </button>
                <h3 className="text-lg font-semibold">{getDateRangeText()}</h3>
                <button
                  onClick={() => navigateDate('next')}
                  className="p-1 rounded-md hover:bg-neutral-100"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => setView('day')}
                  className={`px-3 py-1 rounded-md text-sm ${
                    view === 'day' ? 'bg-primary-500 text-white' : 'bg-neutral-100 text-neutral-700'
                  }`}
                >
                  Day
                </button>
                <button
                  onClick={() => setView('week')}
                  className={`px-3 py-1 rounded-md text-sm ${
                    view === 'week' ? 'bg-primary-500 text-white' : 'bg-neutral-100 text-neutral-700'
                  }`}
                >
                  Week
                </button>
                <button
                  onClick={() => setView('month')}
                  className={`px-3 py-1 rounded-md text-sm ${
                    view === 'month' ? 'bg-primary-500 text-white' : 'bg-neutral-100 text-neutral-700'
                  }`}
                >
                  Month
                </button>
              </div>
            </div>

            {/* Day View */}
            {view === 'day' && (
              <div>
                <div className="mb-4">
                  <h4 className="font-medium text-neutral-900 mb-2">
                    {format(currentDate, 'EEEE, MMMM d, yyyy')}
                  </h4>
                  
                  {getAppointmentsForDate(currentDate).length === 0 ? (
                    <div className="text-center py-8 bg-neutral-50 rounded-lg">
                      <Calendar className="mx-auto text-neutral-400 mb-2" size={32} />
                      <p className="text-neutral-600 mb-4">No appointments scheduled for this day</p>
                      <Button 
                        variant="primary" 
                        size="sm" 
                        icon={<Plus size={16} />}
                      >
                        Add Appointment
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {getAppointmentsForDate(currentDate).map((appointment) => (
                        <AppointmentCard key={appointment.id} appointment={appointment} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Week View */}
            {view === 'week' && (
              <div>
                <div className="grid grid-cols-7 gap-2 mb-4">
                  {eachDayOfInterval({
                    start: startOfWeek(currentDate, { weekStartsOn: 0 }),
                    end: endOfWeek(currentDate, { weekStartsOn: 0 })
                  }).map((day) => (
                    <div key={day.toISOString()} className="text-center">
                      <div className={`mb-1 font-medium ${
                        isSameDay(day, new Date()) ? 'text-primary-600' : 'text-neutral-700'
                      }`}>
                        {format(day, 'EEE')}
                      </div>
                      <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${
                        isSameDay(day, new Date()) 
                          ? 'bg-primary-100 text-primary-700 font-semibold' 
                          : 'text-neutral-700'
                      }`}>
                        {format(day, 'd')}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="space-y-6">
                  {eachDayOfInterval({
                    start: startOfWeek(currentDate, { weekStartsOn: 0 }),
                    end: endOfWeek(currentDate, { weekStartsOn: 0 })
                  }).map((day) => {
                    const dayAppointments = getAppointmentsForDate(day);
                    if (dayAppointments.length === 0) return null;
                    
                    return (
                      <div key={day.toISOString()}>
                        <h4 className="font-medium text-neutral-900 mb-2">
                          {format(day, 'EEEE, MMMM d')}
                        </h4>
                        <div className="space-y-3">
                          {dayAppointments.map((appointment) => (
                            <AppointmentCard key={appointment.id} appointment={appointment} />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Month View - Simplified for this example */}
            {view === 'month' && (
              <div>
                <p className="text-center mb-4">
                  Showing all appointments for {format(currentDate, 'MMMM yyyy')}
                </p>
                
                {filteredAppointments.length === 0 ? (
                  <div className="text-center py-8 bg-neutral-50 rounded-lg">
                    <Calendar className="mx-auto text-neutral-400 mb-2" size={32} />
                    <p className="text-neutral-600 mb-4">No appointments found for this month</p>
                    <Button 
                      variant="primary" 
                      size="sm" 
                      icon={<Plus size={16} />}
                    >
                      Add Appointment
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredAppointments.map((appointment) => (
                      <AppointmentCard key={appointment.id} appointment={appointment} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div>
          <Card className="sticky top-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Filters</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Search
              </label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search clients or notes"
                  className="w-full pl-9 pr-3 py-2 border border-neutral-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="all">All Statuses</option>
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="no-show">No Show</option>
              </select>
            </div>
            
            <Button 
              variant="primary" 
              fullWidth 
              icon={<Plus size={16} />}
            >
              New Appointment
            </Button>
          </Card>

          <Card>
            <h3 className="text-lg font-semibold mb-4">Today's Schedule</h3>
            
            {getAppointmentsForDate(new Date()).length > 0 ? (
              <div className="space-y-3">
                {getAppointmentsForDate(new Date()).map((appointment) => (
                  <div key={appointment.id} className="p-3 bg-neutral-50 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-neutral-900">{appointment.client_name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getAppointmentStatusColor(appointment.status)}`}>
                        {appointment.status}
                      </span>
                    </div>
                    <div className="flex items-center text-sm text-neutral-600">
                      <Clock size={14} className="mr-1" />
                      <span>{formatAppointmentTime(appointment.start_time, appointment.end_time)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-neutral-600 text-sm">No appointments scheduled for today</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

// Helper component for appointment cards
const AppointmentCard = ({ appointment }: { appointment: Appointment }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-primary-100 text-primary-700';
      case 'completed': return 'bg-success-100 text-success-700';
      case 'cancelled': return 'bg-neutral-100 text-neutral-700';
      case 'no-show': return 'bg-error-100 text-error-700';
      default: return 'bg-neutral-100 text-neutral-700';
    }
  };

  const getFormatIcon = (format: string) => {
    return format === 'video' ? 
      <Video size={16} className="text-primary-600" /> : 
      <Phone size={16} className="text-primary-600" />;
  };

  const formatTime = (start: string, end: string) => {
    const formatTimeStr = (time: string) => {
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      return `${hour12}:${minutes} ${ampm}`;
    };
    
    return `${formatTimeStr(start)} - ${formatTimeStr(end)}`;
  };

  return (
    <div className="p-4 border border-neutral-200 rounded-lg hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center mr-2">
            <User size={16} className="text-primary-600" />
          </div>
          <div>
            <h4 className="font-medium text-neutral-900">{appointment.client_name}</h4>
            <div className="flex items-center text-sm text-neutral-600">
              <Clock size={14} className="mr-1" />
              <span>{formatTime(appointment.start_time, appointment.end_time)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(appointment.status)}`}>
            {appointment.status}
          </span>
          <div className="w-6 h-6 rounded-full bg-neutral-100 flex items-center justify-center">
            {getFormatIcon(appointment.format)}
          </div>
        </div>
      </div>
      
      <div className="flex items-center justify-between text-sm">
        <span className="text-neutral-600">{getAppointmentTypeLabel(appointment.type)}</span>
        <div className="flex space-x-1">
          {appointment.status === 'scheduled' && (
            <>
              <button className="p-1 text-success-600 hover:text-success-700 transition-colors">
                <Check size={16} />
              </button>
              <button className="p-1 text-error-600 hover:text-error-700 transition-colors">
                <X size={16} />
              </button>
            </>
          )}
          <button className="p-1 text-primary-600 hover:text-primary-700 transition-colors">
            <FileText size={16} />
          </button>
        </div>
      </div>
      
      {appointment.notes && (
        <div className="mt-2 pt-2 border-t border-neutral-100">
          <p className="text-xs text-neutral-600">{appointment.notes}</p>
        </div>
      )}
    </div>
  );
};

// Helper functions
const getAppointmentStatusColor = (status: string) => {
  switch (status) {
    case 'scheduled': return 'bg-primary-100 text-primary-700';
    case 'completed': return 'bg-success-100 text-success-700';
    case 'cancelled': return 'bg-neutral-100 text-neutral-700';
    case 'no-show': return 'bg-error-100 text-error-700';
    default: return 'bg-neutral-100 text-neutral-700';
  }
};

const getAppointmentTypeLabel = (type: string) => {
  switch (type) {
    case 'initial': return 'Initial Consultation';
    case 'follow-up': return 'Follow-up Session';
    case 'crisis': return 'Crisis Session';
    default: return type;
  }
};

export default TherapistAppointments;