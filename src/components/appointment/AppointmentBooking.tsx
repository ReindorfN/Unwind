import { useState, useEffect } from 'react';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';
import { 
  Calendar, 
  Clock, 
  User, 
  Video, 
  Phone, 
  Check,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';
import Button from '../common/Button';
import Card from '../common/Card';

interface Therapist {
  id: string;
  full_name: string;
  specialization: string;
  session_fee: number;
  session_length: number;
  avatar_url?: string;
}

interface TimeSlot {
  start_time: string;
  end_time: string;
  is_available: boolean;
}

interface AppointmentBookingProps {
  onClose?: () => void;
  onSuccess?: () => void;
}

const AppointmentBooking = ({ onClose, onSuccess }: AppointmentBookingProps) => {
  const { user } = useAuthStore();
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [selectedTherapist, setSelectedTherapist] = useState<Therapist | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
  const [appointmentType, setAppointmentType] = useState<'initial' | 'follow-up' | 'crisis'>('follow-up');
  const [appointmentFormat, setAppointmentFormat] = useState<'video' | 'phone'>('video');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadTherapists();
  }, []);

  useEffect(() => {
    if (selectedTherapist && selectedDate) {
      loadAvailableTimeSlots();
    } else {
      setAvailableTimeSlots([]);
    }
  }, [selectedTherapist, selectedDate]);

  const loadTherapists = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('therapists')
        .select(`
          id,
          specialization,
          session_fee,
          session_length,
          profiles(full_name, avatar_url)
        `)
        .eq('verified', true);

      if (error) throw error;

      const formattedTherapists = (data || []).map(therapist => ({
        id: therapist.id,
        full_name: therapist.profiles?.full_name || 'Unknown Therapist',
        specialization: therapist.specialization || 'General Therapy',
        session_fee: therapist.session_fee || 100,
        session_length: therapist.session_length || 50,
        avatar_url: therapist.profiles?.avatar_url
      }));

      setTherapists(formattedTherapists);
      setLoading(false);
    } catch (error) {
      console.error('Error loading therapists:', error);
      setError('Failed to load therapists. Please try again.');
      setLoading(false);
    }
  };

  const loadAvailableTimeSlots = async () => {
    if (!selectedTherapist || !selectedDate) return;

    try {
      setLoading(true);
      const dayOfWeek = selectedDate.getDay(); // 0-6 for Sunday-Saturday
      
      console.log('Loading availability for day of week:', dayOfWeek);
      
      // Get therapist's availability for the selected day
      const { data, error } = await supabase
        .from('therapist_availability') 
        .select('*')
        .eq('therapist_id', selectedTherapist.id)
        .eq('day_of_week', dayOfWeek)
        .eq('is_available', true);

      if (error) throw error;
      
      console.log('Availability data:', data);

      if (!data || data.length === 0) {
        setAvailableTimeSlots([]);
        setLoading(false);
        return;
      }

      // Get existing appointments for the selected date and therapist
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      const { data: existingAppointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('start_time, end_time')
        .eq('therapist_id', selectedTherapist.id)
        .eq('date', formattedDate)
        .eq('status', 'scheduled');

      if (appointmentsError) throw appointmentsError;

      // Generate available time slots based on therapist's availability
      // and excluding existing appointments
      const slots: TimeSlot[] = [];
      
      console.log('Availability data:', data);
      
      data.forEach(availability => {
        // Convert from database column names to our expected property names
        const start_time = availability.start_time;
        const end_time = availability.end_time;
        const sessionLength = selectedTherapist.session_length || 50;

        console.log(`Processing slot: ${start_time} - ${end_time}`);
        
        // Generate 30-minute or 50-minute slots within the availability window
        const startMinutes = parseInt(start_time.split(':')[0]) * 60 + parseInt(start_time.split(':')[1]);
        const endMinutes = parseInt(end_time.split(':')[0]) * 60 + parseInt(end_time.split(':')[1]);
        
        for (let slotStart = startMinutes; slotStart + sessionLength <= endMinutes; slotStart += 60) {
          const slotEnd = slotStart + sessionLength;
          
          const formattedStart = `${Math.floor(slotStart / 60).toString().padStart(2, '0')}:${(slotStart % 60).toString().padStart(2, '0')}`;
          const formattedEnd = `${Math.floor(slotEnd / 60).toString().padStart(2, '0')}:${(slotEnd % 60).toString().padStart(2, '0')}`;
          
          // Check if this slot conflicts with any existing appointment
          const isConflicting = (existingAppointments || []).some(appointment => {
            const apptStart = appointment.start_time;
            const apptEnd = appointment.end_time;
            
            return (
              (formattedStart <= apptStart && formattedEnd > apptStart) ||
              (formattedStart < apptEnd && formattedEnd >= apptEnd) ||
              (formattedStart >= apptStart && formattedEnd <= apptEnd)
            );
          });
          
          if (!isConflicting) {
            slots.push({
              start_time: formattedStart,
              end_time: formattedEnd,
              is_available: true
            });
          }
        }
      });

      console.log('Generated time slots:', slots);
      
      setAvailableTimeSlots(slots);
      setLoading(false);
    } catch (error) {
      console.error('Error loading available time slots:', error);
      setError('Failed to load available time slots. Please try again.');
      setLoading(false);
    }
  };

  const handleBookAppointment = async () => {
    if (!user || !selectedTherapist || !selectedDate || !selectedTimeSlot) {
      setError('Please select a therapist, date, and time slot.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const appointmentData = {
        therapist_id: selectedTherapist.id,
        client_id: user.id,
        date: format(selectedDate, 'yyyy-MM-dd'),
        start_time: selectedTimeSlot.start_time,
        end_time: selectedTimeSlot.end_time,
        status: 'scheduled',
        type: appointmentType,
        format: appointmentFormat,
        notes: notes.trim() || null
      };

      const { error } = await supabase
        .from('appointments')
        .insert(appointmentData);

      if (error) throw error;

      setSuccess(true);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error booking appointment:', error);
      setError('Failed to book appointment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

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

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  if (success) {
    return (
      <Card className="max-w-lg mx-auto text-center">
        <div className="w-16 h-16 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="text-success-600" size={32} />
        </div>
        <h3 className="text-xl font-semibold text-neutral-900 mb-2">Appointment Booked!</h3>
        <p className="text-neutral-600 mb-6">
          Your appointment with {selectedTherapist?.full_name} has been successfully scheduled for {selectedDate && format(selectedDate, 'EEEE, MMMM d, yyyy')} at {selectedTimeSlot && formatTime(selectedTimeSlot.start_time)}.
        </p>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Close
          </Button>
          <Button variant="primary" onClick={() => window.location.href = '/home'} className="flex-1">
            Go to Dashboard
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="max-w-4xl mx-auto">
      <div className="flex justify-end">
        <button 
          onClick={onClose} 
          className="p-1 rounded-full hover:bg-neutral-100 transition-colors"
          aria-label="Close"
        >
          <X size={20} className="text-neutral-500" />
        </button>
      </div>
      <h2 className="text-xl font-semibold mb-6">Book an Appointment</h2>

      {error && (
        <div className="mb-6 p-4 bg-error-50 text-error-700 rounded-lg flex items-center">
          <AlertCircle size={20} className="mr-2" />
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* Step 1: Select Therapist */}
        <div>
          <h3 className="font-medium text-neutral-900 mb-3">1. Select a Therapist</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {therapists.map((therapist) => (
              <button
                key={therapist.id}
                onClick={() => setSelectedTherapist(therapist)}
                className={`p-4 border-2 rounded-lg text-left transition-colors ${
                  selectedTherapist?.id === therapist.id
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-neutral-200 hover:border-primary-300'
                }`}
              >
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center overflow-hidden mr-3">
                    {therapist.avatar_url ? (
                      <img
                        src={therapist.avatar_url}
                        alt={therapist.full_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User size={24} className="text-primary-600" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-medium text-neutral-900">{therapist.full_name}</h4>
                    <p className="text-sm text-neutral-600">{therapist.specialization}</p>
                    <div className="flex items-center mt-1 text-xs text-neutral-500">
                      <span className="mr-2">${therapist.session_fee}/session</span>
                      <span>{therapist.session_length} min</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Select Date */}
        {selectedTherapist && (
          <div>
            <h3 className="font-medium text-neutral-900 mb-3">2. Select a Date</h3>
            <div className="bg-white p-4 rounded-lg border border-neutral-200">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => navigateMonth('prev')}
                  className="p-1 rounded-md hover:bg-neutral-100"
                >
                  <ChevronLeft size={20} />
                </button>
                <h4 className="font-medium">{format(currentDate, 'MMMM yyyy')}</h4>
                <button
                  onClick={() => navigateMonth('next')}
                  className="p-1 rounded-md hover:bg-neutral-100"
                >
                  <ChevronRight size={20} />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center text-xs font-medium text-neutral-500 p-2">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {eachDayOfInterval({
                  start: startOfWeek(startOfWeek(currentDate)),
                  end: endOfWeek(endOfWeek(currentDate))
                }).map(day => {
                  const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                  const isToday = isSameDay(day, new Date());
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  const isPast = day < new Date() && !isToday;

                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => !isPast && setSelectedDate(day)}
                      disabled={isPast}
                      className={`
                        h-10 rounded-md flex items-center justify-center text-sm
                        ${!isCurrentMonth ? 'text-neutral-300' : isPast ? 'text-neutral-400' : 'text-neutral-700'}
                        ${isSelected ? 'bg-primary-500 text-white' : isToday ? 'bg-primary-100' : ''}
                        ${!isPast && !isSelected ? 'hover:bg-neutral-100' : ''}
                        ${isPast ? 'cursor-not-allowed' : 'cursor-pointer'}
                      `}
                    >
                      {format(day, 'd')}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Select Time Slot */}
        {selectedTherapist && selectedDate && (
          <div>
            <h3 className="font-medium text-neutral-900 mb-3">3. Select a Time</h3>
            {availableTimeSlots.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {availableTimeSlots.map((slot, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedTimeSlot(slot)}
                    className={`p-3 border rounded-md text-center transition-colors ${
                      selectedTimeSlot === slot
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-neutral-200 hover:border-primary-300 text-neutral-700'
                    }`}
                  >
                    <div className="flex items-center justify-center">
                      <Clock size={14} className="mr-1" />
                      <span>{formatTime(slot.start_time)}</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 bg-neutral-50 rounded-lg">
                <Clock className="mx-auto text-neutral-400 mb-2" size={32} />
                <p className="text-neutral-600">No available time slots for this date</p>
                <p className="text-sm text-neutral-500 mt-1">Please select another date or therapist</p>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Appointment Details */}
        {selectedTherapist && selectedDate && selectedTimeSlot && (
          <div>
            <h3 className="font-medium text-neutral-900 mb-3">4. Appointment Details</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Appointment Type
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setAppointmentType('initial')}
                    className={`p-3 border rounded-md text-center transition-colors ${
                      appointmentType === 'initial'
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-neutral-200 hover:border-primary-300 text-neutral-700'
                    }`}
                  >
                    Initial Consultation
                  </button>
                  <button
                    type="button"
                    onClick={() => setAppointmentType('follow-up')}
                    className={`p-3 border rounded-md text-center transition-colors ${
                      appointmentType === 'follow-up'
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-neutral-200 hover:border-primary-300 text-neutral-700'
                    }`}
                  >
                    Follow-up Session
                  </button>
                  <button
                    type="button"
                    onClick={() => setAppointmentType('crisis')}
                    className={`p-3 border rounded-md text-center transition-colors ${
                      appointmentType === 'crisis'
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-neutral-200 hover:border-primary-300 text-neutral-700'
                    }`}
                  >
                    Crisis Session
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Session Format
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setAppointmentFormat('video')}
                    className={`p-3 border rounded-md text-left transition-colors ${
                      appointmentFormat === 'video'
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-neutral-200 hover:border-primary-300 text-neutral-700'
                    }`}
                  >
                    <div className="flex items-center">
                      <Video size={18} className="mr-2" />
                      <div>
                        <div className="font-medium">Video Call</div>
                        <div className="text-xs">Meet face-to-face virtually</div>
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAppointmentFormat('phone')}
                    className={`p-3 border rounded-md text-left transition-colors ${
                      appointmentFormat === 'phone'
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-neutral-200 hover:border-primary-300 text-neutral-700'
                    }`}
                  >
                    <div className="flex items-center">
                      <Phone size={18} className="mr-2" />
                      <div>
                        <div className="font-medium">Phone Call</div>
                        <div className="text-xs">Talk over the phone</div>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-neutral-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes or topics you'd like to discuss..."
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  rows={3}
                />
              </div>
            </div>
          </div>
        )}

        {/* Summary and Submit */}
        {selectedTherapist && selectedDate && selectedTimeSlot && (
          <div className="pt-4 border-t border-neutral-200">
            <div className="bg-neutral-50 p-4 rounded-lg mb-4">
              <h4 className="font-medium text-neutral-900 mb-2">Appointment Summary</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-600">Therapist:</span>
                  <span className="font-medium">{selectedTherapist.full_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">Date:</span>
                  <span className="font-medium">{format(selectedDate, 'EEEE, MMMM d, yyyy')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">Time:</span>
                  <span className="font-medium">{formatTime(selectedTimeSlot.start_time)} - {formatTime(selectedTimeSlot.end_time)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">Type:</span>
                  <span className="font-medium">
                    {appointmentType === 'initial' ? 'Initial Consultation' : 
                     appointmentType === 'follow-up' ? 'Follow-up Session' : 'Crisis Session'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">Format:</span>
                  <span className="font-medium">
                    {appointmentFormat === 'video' ? 'Video Call' : 'Phone Call'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">Fee:</span>
                  <span className="font-medium">${selectedTherapist.session_fee}</span>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleBookAppointment}
                disabled={submitting}
                className="flex-1"
              >
                {submitting ? 'Booking...' : 'Confirm Booking'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default AppointmentBooking;