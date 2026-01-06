import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { 
  Calendar, 
  Clock, 
  Video, 
  Phone, 
  User, 
  Plus,
  X,
  Check,
  AlertCircle
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import SectionHeading from '../components/common/SectionHeading';
import AppointmentBooking from '../components/appointment/AppointmentBooking';

interface Appointment {
  id: string;
  therapist_id: string;
  therapist_name: string;
  date: string;
  start_time: string;
  end_time: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
  type: 'initial' | 'follow-up' | 'crisis';
  format: 'video' | 'phone' | 'in-person';
  notes?: string;
}

const AppointmentsPage = () => {
  const { user } = useAuthStore();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    document.title = 'My Appointments | Unwind';
    if (user) {
      loadAppointments();
    }
  }, [user]);

  const loadAppointments = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          therapist_id,
          therapist:therapist_id(
            profiles(full_name)
          ),
          date,
          start_time,
          end_time,
          status,
          type,
          format,
          notes
        `)
        .eq('client_id', user.id)
        .order('date', { ascending: false })
        .order('start_time', { ascending: true });

      if (error) throw error;

      const formattedAppointments = (data || []).map(appointment => ({
        id: appointment.id,
        therapist_id: appointment.therapist_id,
        therapist_name: appointment.therapist?.profiles?.full_name || 'Unknown Therapist',
        date: appointment.date,
        start_time: appointment.start_time,
        end_time: appointment.end_time,
        status: appointment.status,
        type: appointment.type,
        format: appointment.format,
        notes: appointment.notes
      }));

      setAppointments(formattedAppointments);
    } catch (error) {
      console.error('Error loading appointments:', error);
      setError('Failed to load appointments. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAppointment = async () => {
    if (!appointmentToCancel) return;

    try {
      setIsCancelling(true);
      const { error } = await supabase
        .from('appointments')
        .update({
          status: 'cancelled',
          notes: cancelReason ? `Cancelled: ${cancelReason}` : 'Cancelled by client'
        })
        .eq('id', appointmentToCancel)
        .eq('client_id', user?.id);

      if (error) throw error;

      // Reload appointments
      await loadAppointments();
      setShowCancelModal(false);
      setAppointmentToCancel(null);
      setCancelReason('');
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      setError('Failed to cancel appointment. Please try again.');
    } finally {
      setIsCancelling(false);
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

  const getAppointmentTypeLabel = (type: string) => {
    switch (type) {
      case 'initial': return 'Initial Consultation';
      case 'follow-up': return 'Follow-up Session';
      case 'crisis': return 'Crisis Session';
      default: return type;
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

  const getFormatIcon = (format: string) => {
    return format === 'video' ? 
      <Video size={16} className="text-primary-600" /> : 
      <Phone size={16} className="text-primary-600" />;
  };

  const getUpcomingAppointments = () => {
    const today = new Date().toISOString().split('T')[0];
    return appointments.filter(appointment => 
      appointment.date >= today && appointment.status === 'scheduled'
    );
  };

  const getPastAppointments = () => {
    const today = new Date().toISOString().split('T')[0];
    return appointments.filter(appointment => 
      appointment.date < today || appointment.status !== 'scheduled'
    );
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <SectionHeading
          title="My Appointments"
          subtitle="Manage your therapy sessions and appointments"
          className="mb-4 md:mb-0"
        />
        <Button
          variant="primary"
          onClick={() => setShowBookingModal(true)}
          icon={<Plus size={18} />}
        >
          Book New Appointment
        </Button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-error-50 text-error-700 rounded-lg flex items-center">
          <AlertCircle size={20} className="mr-2" />
          {error}
        </div>
      )}

      {/* Upcoming Appointments */}
      <Card className="mb-8">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <Calendar size={20} className="mr-2 text-primary-500" />
          Upcoming Appointments
        </h2>

        {getUpcomingAppointments().length > 0 ? (
          <div className="space-y-4">
            {getUpcomingAppointments().map((appointment) => (
              <div key={appointment.id} className="p-4 border border-neutral-200 rounded-lg">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center mr-3">
                      <User size={20} className="text-primary-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-neutral-900">{appointment.therapist_name}</h3>
                      <div className="flex items-center text-sm text-neutral-600">
                        <Calendar size={14} className="mr-1" />
                        <span>{format(parseISO(appointment.date), 'EEEE, MMMM d, yyyy')}</span>
                      </div>
                      <div className="flex items-center text-sm text-neutral-600 mt-1">
                        <Clock size={14} className="mr-1" />
                        <span>{formatAppointmentTime(appointment.start_time, appointment.end_time)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getAppointmentStatusColor(appointment.status)}`}>
                      {appointment.status}
                    </span>
                    <div className="w-6 h-6 rounded-full bg-neutral-100 flex items-center justify-center">
                      {getFormatIcon(appointment.format)}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-600">{getAppointmentTypeLabel(appointment.type)}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setAppointmentToCancel(appointment.id);
                      setShowCancelModal(true);
                    }}
                    icon={<X size={14} />}
                  >
                    Cancel
                  </Button>
                </div>
                
                {appointment.notes && (
                  <div className="mt-3 pt-3 border-t border-neutral-100">
                    <p className="text-xs text-neutral-600">{appointment.notes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-neutral-50 rounded-lg">
            <Calendar className="mx-auto text-neutral-400 mb-2" size={32} />
            <p className="text-neutral-600 mb-4">No upcoming appointments</p>
            <Button 
              variant="primary" 
              size="sm" 
              onClick={() => setShowBookingModal(true)}
              icon={<Plus size={16} />}
            >
              Book an Appointment
            </Button>
          </div>
        )}
      </Card>

      {/* Past Appointments */}
      {getPastAppointments().length > 0 && (
        <Card>
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Clock size={20} className="mr-2 text-primary-500" />
            Past Appointments
          </h2>

          <div className="space-y-4">
            {getPastAppointments().map((appointment) => (
              <div key={appointment.id} className="p-4 border border-neutral-200 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center mr-3">
                      <User size={20} className="text-neutral-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-neutral-900">{appointment.therapist_name}</h3>
                      <div className="flex items-center text-sm text-neutral-600">
                        <Calendar size={14} className="mr-1" />
                        <span>{format(parseISO(appointment.date), 'EEEE, MMMM d, yyyy')}</span>
                      </div>
                      <div className="flex items-center text-sm text-neutral-600 mt-1">
                        <Clock size={14} className="mr-1" />
                        <span>{formatAppointmentTime(appointment.start_time, appointment.end_time)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getAppointmentStatusColor(appointment.status)}`}>
                      {appointment.status}
                    </span>
                    <div className="w-6 h-6 rounded-full bg-neutral-100 flex items-center justify-center">
                      {getFormatIcon(appointment.format)}
                    </div>
                  </div>
                </div>
                
                <div className="text-sm text-neutral-600">
                  {getAppointmentTypeLabel(appointment.type)}
                </div>
                
                {appointment.notes && (
                  <div className="mt-2 pt-2 border-t border-neutral-100">
                    <p className="text-xs text-neutral-600">{appointment.notes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Appointment Booking Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="max-w-4xl w-full">
            <AppointmentBooking 
              onClose={() => setShowBookingModal(false)}
              onSuccess={() => {
                setShowBookingModal(false);
                loadAppointments();
              }}
            />
          </div>
        </div>
      )}

      {/* Cancel Appointment Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-md w-full">
            <h3 className="text-xl font-semibold mb-4">Cancel Appointment</h3>
            <p className="text-neutral-600 mb-4">
              Are you sure you want to cancel this appointment? This action cannot be undone.
            </p>
            <div className="mb-4">
              <label htmlFor="cancel-reason" className="block text-sm font-medium text-neutral-700 mb-1">
                Reason for cancellation (optional)
              </label>
              <textarea
                id="cancel-reason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                rows={3}
              />
            </div>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCancelModal(false);
                  setAppointmentToCancel(null);
                  setCancelReason('');
                }}
                className="flex-1"
              >
                Keep Appointment
              </Button>
              <Button
                variant="error"
                onClick={handleCancelAppointment}
                disabled={isCancelling}
                className="flex-1"
              >
                {isCancelling ? 'Cancelling...' : 'Confirm Cancellation'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AppointmentsPage;