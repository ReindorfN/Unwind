import { useState, useEffect } from 'react';
import { 
  Clock, 
  Calendar, 
  Plus, 
  Trash2, 
  Save, 
  AlertCircle, 
  Check,
  Copy,
  ArrowRight
} from 'lucide-react';
import { format, addDays, startOfWeek, getDay } from 'date-fns';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import SectionHeading from '../../components/common/SectionHeading';

interface TimeSlot {
  id?: string;
  day: number; // 0-6 for Sunday-Saturday
  start_time: string; // HH:MM format
  end_time: string; // HH:MM format
  is_available: boolean;
}

const TherapistAvailability = () => {
  const { user } = useAuthStore();
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDay());

  const daysOfWeek = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' }
  ];

  const timeOptions = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30'
  ];

  useEffect(() => {
    document.title = 'Set Availability | Therapist Dashboard';
    loadTimeSlots();
  }, [user]);

  const loadTimeSlots = async () => {
    if (!user) return;

    try {
      setLoading(true);
      // Fetch time slots from the database
      const { data, error } = await supabase
        .from('therapist_availability')
        .select(`
          id,
          day_of_week,
          start_time,
          end_time,
          is_available
        `)
        .eq('therapist_id', user.id);

      if (error) throw error;
      
      // Convert from database column names to our expected property names
      const formattedTimeSlots = (data || []).map(slot => ({
        id: slot.id,
        day: slot.day_of_week,
        start_time: slot.start_time,
        end_time: slot.end_time,
        is_available: slot.is_available
      }));
      
      setTimeSlots(formattedTimeSlots);
    } catch (error) {
      console.error('Error loading time slots:', error);
      setError('Failed to load your availability. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const addTimeSlot = () => {
    const newSlot: TimeSlot = {
      day: selectedDay,
      start_time: '09:00',
      end_time: '10:00',
      is_available: true
    };
    
    setTimeSlots([...timeSlots, newSlot]);
  };

  const removeTimeSlot = (id: string) => {
    setTimeSlots(timeSlots.filter(slot => slot.id !== id));
  };

  const updateTimeSlot = (id: string, field: keyof TimeSlot, value: any) => {
    setTimeSlots(timeSlots.map(slot => 
      slot.id === id ? { ...slot, [field]: value } : slot
    ));
  };

  const saveAvailability = async () => {
    if (!user) return;

    try {
      setSaving(true);
      setError('');
      setSuccess('');
      
      // Validate time slots
      for (const slot of timeSlots) {
        if (slot.start_time >= slot.end_time) {
          setError('End time must be after start time for all slots.');
          setSaving(false);
          return;
        }
      }

      // First, delete all existing time slots for this therapist
      const { error: deleteError } = await supabase
        .from('therapist_availability')
        .delete()
        .eq('therapist_id', user.id);

      if (deleteError) throw deleteError;

      // Then insert all current time slots
      const slotsToInsert = timeSlots.map(slot => ({
        therapist_id: user.id,
        day_of_week: slot.day,
        start_time: slot.start_time,
        end_time: slot.end_time,
        is_available: slot.is_available
      }));

      if (slotsToInsert.length > 0) {
        console.log('Saving time slots:', slotsToInsert);
        const { error: insertError } = await supabase
          .from('therapist_availability')
          .insert(slotsToInsert);

        if (insertError) throw insertError;
      }
      
      setSuccess('Your availability has been saved successfully.');
      setTimeout(() => setSuccess(''), 3000);
      
      // Reload time slots to get the IDs
      loadTimeSlots();
    } catch (error) {
      console.error('Error saving availability:', error);
      setError('Failed to save your availability. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const copyFromPreviousDay = () => {
    if (selectedDay === 0) return; // Can't copy if Sunday is selected
    
    const previousDay = selectedDay - 1;
    const previousDaySlots = timeSlots.filter(slot => slot.day === previousDay);
    
    if (previousDaySlots.length === 0) {
      setError(`No time slots found for ${daysOfWeek[previousDay].label} to copy.`);
      setTimeout(() => setError(''), 3000);
      return;
    }
    
    const newSlots = previousDaySlots.map(slot => ({
      ...slot,
      id: crypto.randomUUID(),
      day: selectedDay
    }));
    
    // Remove existing slots for the selected day
    const otherDaysSlots = timeSlots.filter(slot => slot.day !== selectedDay);
    
    setTimeSlots([...otherDaysSlots, ...newSlots]);
    setSuccess(`Copied availability from ${daysOfWeek[previousDay].label}.`);
    setTimeout(() => setSuccess(''), 3000);
  };

  const getDayTimeSlots = (day: number) => {
    return timeSlots.filter(slot => slot.day === day);
  };

  const formatTimeForDisplay = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
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
        title="Set Your Availability"
        subtitle="Define when you're available for appointments with clients"
        className="mb-8"
      />

      {error && (
        <div className="mb-6 p-4 bg-error-50 text-error-700 rounded-lg flex items-center">
          <AlertCircle size={20} className="mr-2" />
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-success-50 text-success-700 rounded-lg flex items-center">
          <Check size={20} className="mr-2" />
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="mb-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold flex items-center">
                <Calendar size={20} className="mr-2 text-primary-500" />
                Select Day
              </h3>
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={copyFromPreviousDay}
                  disabled={selectedDay === 0}
                  icon={<Copy size={16} />}
                >
                  Copy from Previous Day
                </Button>
                <Button 
                  variant="primary" 
                  size="sm" 
                  onClick={saveAvailability}
                  disabled={saving}
                  icon={<Save size={16} />}
                >
                  {saving ? 'Saving...' : 'Save Availability'}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2 mb-6">
              {daysOfWeek.map((day) => (
                <button
                  key={day.value}
                  onClick={() => setSelectedDay(day.value)}
                  className={`p-2 rounded-md text-center transition-colors ${
                    selectedDay === day.value
                      ? 'bg-primary-500 text-white'
                      : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
                  }`}
                >
                  <span className="block text-xs md:text-sm font-medium">{day.label.substring(0, 3)}</span>
                  <span className="block text-xs mt-1">
                    {getDayTimeSlots(day.value).length} slots
                  </span>
                </button>
              ))}
            </div>

            <div className="mb-4">
              <h4 className="font-medium text-neutral-900 mb-2 flex items-center">
                <Clock size={16} className="mr-2" />
                {daysOfWeek.find(d => d.value === selectedDay)?.label} Time Slots
              </h4>
              
              {getDayTimeSlots(selectedDay).length === 0 ? (
                <div className="text-center py-8 bg-neutral-50 rounded-lg">
                  <Clock className="mx-auto text-neutral-400 mb-2" size={32} />
                  <p className="text-neutral-600 mb-4">No time slots set for this day</p>
                  <Button 
                    variant="primary" 
                    size="sm" 
                    onClick={addTimeSlot}
                    icon={<Plus size={16} />}
                  >
                    Add Time Slot
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {getDayTimeSlots(selectedDay).map((slot) => (
                    <div key={slot.id} className="flex items-center space-x-3 p-3 bg-neutral-50 rounded-lg">
                      <div className="flex-1 grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-neutral-500 mb-1">Start Time</label>
                          <select
                            value={slot.start_time}
                            onChange={(e) => updateTimeSlot(slot.id, 'start_time', e.target.value)}
                            className="w-full p-2 border border-neutral-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                          >
                            {timeOptions.map((time) => (
                              <option key={`start-${time}`} value={time}>
                                {formatTimeForDisplay(time)}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-neutral-500 mb-1">End Time</label>
                          <select
                            value={slot.end_time}
                            onChange={(e) => updateTimeSlot(slot.id, 'end_time', e.target.value)}
                            className="w-full p-2 border border-neutral-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                          >
                            {timeOptions.map((time) => (
                              <option key={`end-${time}`} value={time}>
                                {formatTimeForDisplay(time)}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <button
                        onClick={() => removeTimeSlot(slot.id)}
                        className="p-2 text-neutral-400 hover:text-error-500 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                  
                  <div className="pt-3">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={addTimeSlot}
                      icon={<Plus size={16} />}
                      fullWidth
                    >
                      Add Another Time Slot
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Weekly Overview */}
          <Card>
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Calendar size={20} className="mr-2 text-primary-500" />
              Weekly Availability Overview
            </h3>
            
            <div className="space-y-4">
              {daysOfWeek.map((day) => {
                const slots = getDayTimeSlots(day.value);
                return (
                  <div key={day.value} className="flex items-center p-3 rounded-lg bg-neutral-50">
                    <div className="w-20 font-medium text-neutral-900">{day.label}</div>
                    <div className="flex-1">
                      {slots.length === 0 ? (
                        <span className="text-neutral-500 text-sm">Not available</span>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {slots.map((slot) => (
                            <span 
                              key={slot.id} 
                              className="inline-flex items-center px-2 py-1 bg-primary-100 text-primary-700 rounded-md text-xs"
                            >
                              {formatTimeForDisplay(slot.start_time)} 
                              <ArrowRight size={12} className="mx-1" /> 
                              {formatTimeForDisplay(slot.end_time)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div>
          <Card className="sticky top-6">
            <h3 className="text-lg font-semibold mb-4">Availability Tips</h3>
            <div className="space-y-4 text-sm text-neutral-600">
              <div>
                <h4 className="font-medium text-neutral-900 mb-1">Setting Your Schedule</h4>
                <p>Define consistent hours each week to help clients know when you're available.</p>
              </div>
              
              <div>
                <h4 className="font-medium text-neutral-900 mb-1">Session Length</h4>
                <p>Standard sessions are typically 50-60 minutes, with a 10-minute buffer between appointments.</p>
              </div>
              
              <div>
                <h4 className="font-medium text-neutral-900 mb-1">Buffer Time</h4>
                <p>Consider adding buffer time between sessions to prepare for the next client.</p>
              </div>
              
              <div>
                <h4 className="font-medium text-neutral-900 mb-1">Recurring Availability</h4>
                <p>Your availability will repeat weekly unless you update it or set exceptions.</p>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-neutral-200">
              <h4 className="font-medium text-neutral-900 mb-2">Need Help?</h4>
              <p className="text-sm text-neutral-600 mb-4">
                If you need assistance setting up your availability or have questions, our support team is here to help.
              </p>
              <Button variant="outline" fullWidth>
                Contact Support
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TherapistAvailability;