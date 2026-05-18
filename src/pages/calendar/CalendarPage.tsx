import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Truck, 
  Wrench, 
  Clock,
  User,
  X,
  CheckCircle2,
  AlertCircle,
  Flag
} from 'lucide-react';
import PageHeader from '../../components/shared/PageHeader';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { 
  getCalendarEvents, 
  createCalendarEvent, 
  updateCalendarEvent, 
  deleteCalendarEvent,
  CalendarEvent,
  EventType
} from '../../services/calendarService';

const eventTypes: { type: EventType; label: string; color: string; icon: React.ReactNode }[] = [
  { type: 'trip', label: 'Trip', color: 'bg-indigo-100 text-indigo-600 border-indigo-200', icon: <Truck className="w-4 h-4" /> },
  { type: 'maintenance', label: 'Maintenance', color: 'bg-amber-100 text-amber-600 border-amber-200', icon: <Wrench className="w-4 h-4" /> },
  { type: 'meeting', label: 'Meeting', color: 'bg-emerald-100 text-emerald-600 border-emerald-200', icon: <User className="w-4 h-4" /> },
  { type: 'holiday', label: 'SL Holiday', color: 'bg-rose-100 text-rose-600 border-rose-200', icon: <Flag className="w-4 h-4" /> },
  { type: 'other', label: 'Other', color: 'bg-purple-100 text-purple-600 border-purple-200', icon: <Clock className="w-4 h-4" /> },
];

// Sri Lankan Public Holidays (Sample for 2026)
const slHolidays: { date: string, title: string }[] = [
  { date: '2026-01-01', title: 'Duruthu Full Moon Poya Day' },
  { date: '2026-01-14', title: 'Tamil Thai Pongal Day' },
  { date: '2026-02-04', title: 'Independence Day' },
  { date: '2026-02-15', title: 'Navam Full Moon Poya Day' },
  { date: '2026-02-17', title: 'Mahasivaratri Day' },
  { date: '2026-03-31', title: 'Bak Full Moon Poya Day' },
  { date: '2026-04-13', title: 'Sinhala & Tamil New Year Eve' },
  { date: '2026-04-14', title: 'Sinhala & Tamil New Year Day' },
  { date: '2026-05-01', title: 'May Day' },
  { date: '2026-05-15', title: 'Vesak Full Moon Poya Day' },
  { date: '2026-05-16', title: 'Day following Vesak Poya' },
  { date: '2026-06-14', title: 'Poson Full Moon Poya Day' },
  { date: '2026-07-13', title: 'Esala Full Moon Poya Day' },
  { date: '2026-08-12', title: 'Nikini Full Moon Poya Day' },
  { date: '2026-09-10', title: 'Binara Full Moon Poya Day' },
  { date: '2026-10-09', title: 'Vap Full Moon Poya Day' },
  { date: '2026-11-08', title: 'Deepavali' },
  { date: '2026-11-07', title: 'Il Full Moon Poya Day' },
  { date: '2026-12-07', title: 'Unduvap Full Moon Poya Day' },
  { date: '2026-12-25', title: 'Christmas Day' }
];

const CalendarPage: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const data = await getCalendarEvents();
      setEvents(data);
    } catch (err) {
      console.error('Failed to fetch events:', err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchEvents();
  }, []);

  const handleSaveEvent = async (eventData: any) => {
    try {
      if (selectedEvent?.id) {
        await updateCalendarEvent(selectedEvent.id, eventData);
      } else {
        await createCalendarEvent(eventData);
      }
      fetchEvents();
      setIsModalOpen(false);
    } catch (err) {
      console.error('Failed to save event:', err);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (window.confirm('Delete this event?')) {
      try {
        await deleteCalendarEvent(id);
        fetchEvents();
        setIsModalOpen(false);
      } catch (err) {
        console.error('Failed to delete event:', err);
      }
    }
  };

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days = [];

    for (let i = startingDay - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push({ date, isCurrentMonth: false });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      days.push({ date, isCurrentMonth: true });
    }

    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i);
      days.push({ date, isCurrentMonth: false });
    }

    return days;
  }, [currentDate]);

  const getEventsForDate = (date: Date) => {
    // Prevent timezone shift by using local date parts
    const localDateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    
    const holiday = slHolidays.find(h => h.date === localDateString);
    const dayEvents = events.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate.toDateString() === date.toDateString();
    });

    if (holiday) {
      return [{
        id: `holiday-${holiday.date}`,
        title: holiday.title,
        type: 'holiday',
        date: date,
        startTime: '00:00',
        endTime: '23:59'
      } as CalendarEvent, ...dayEvents];
    }

    return dayEvents;
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const getEventTypeConfig = (type: EventType) => {
    return eventTypes.find(et => et.type === type) || eventTypes[4];
  };

  return (
    <div className="space-y-6 pb-20">
      <PageHeader 
        title="Calendar & Scheduling" 
        subtitle="Manage trips, maintenance, and appointments (Sri Lankan Sync)"
        actions={
          <button 
            onClick={() => {
              setSelectedEvent(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20"
          >
            <Plus className="w-4 h-4" />
            New Event
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <div className="bg-white border border-gray-100 rounded-[2.5rem] p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-gray-900">
                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h2>
              <div className="flex items-center gap-2">
                <button 
                  onClick={prevMonth}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <button 
                  onClick={() => setCurrentDate(new Date())}
                  className="px-4 py-2 text-xs font-black text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                >
                  Today
                </button>
                <button 
                  onClick={nextMonth}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map(({ date, isCurrentMonth }, index) => {
                const dayEvents = getEventsForDate(date);
                const isToday = date.toDateString() === new Date().toDateString();
                const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
                const isPoya = dayEvents.some(e => e.type === 'holiday' && e.title.includes('Poya'));

                return (
                  <div
                    key={index}
                    onClick={() => {
                      setSelectedDate(date);
                    }}
                    className={cn(
                      "min-h-[100px] p-2 rounded-xl border transition-all cursor-pointer group",
                      !isCurrentMonth && "bg-gray-50 border-transparent opacity-40",
                      isCurrentMonth && "bg-white border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/30",
                      isToday && "bg-indigo-50 border-indigo-200",
                      isSelected && "ring-2 ring-indigo-500 ring-offset-2",
                      isPoya && "bg-rose-50/30"
                    )}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className={cn(
                        "text-sm font-black w-7 h-7 flex items-center justify-center rounded-full",
                        isToday ? "bg-indigo-600 text-white" : "text-gray-700",
                        isPoya && !isToday && "text-rose-600"
                      )}>
                        {date.getDate()}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {dayEvents.slice(0, 3).map(event => {
                        const config = getEventTypeConfig(event.type);
                        return (
                          <div
                            key={event.id}
                            onClick={(e) => {
                              if (event.type === 'holiday') return;
                              e.stopPropagation();
                              setSelectedEvent(event);
                              setIsModalOpen(true);
                            }}
                            className={cn(
                              "text-[10px] px-1.5 py-0.5 rounded truncate font-bold border",
                              config.color,
                              event.type === 'holiday' && "animate-pulse"
                            )}
                          >
                            {event.title}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-gray-100 rounded-[2.5rem] p-6 shadow-sm">
            <h3 className="text-lg font-black text-gray-900 mb-4 uppercase tracking-tight">Event Context</h3>
            <div className="space-y-3">
              {eventTypes.map(type => (
                <div key={type.type} className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-lg", type.color)}>
                    {type.icon}
                  </div>
                  <span className="text-sm font-bold text-gray-700">{type.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-[2.5rem] p-6 shadow-sm">
            <h3 className="text-lg font-black text-gray-900 mb-4 uppercase tracking-tight">Upcoming SL Holidays</h3>
            <div className="space-y-3">
               {slHolidays
                .filter(h => new Date(h.date) >= new Date())
                .slice(0, 5)
                .map((holiday, i) => (
                  <div key={i} className="p-3 bg-rose-50 rounded-xl border border-rose-100">
                    <div className="flex items-center gap-3">
                       <Flag className="w-4 h-4 text-rose-500" />
                       <div>
                         <p className="text-xs font-black text-rose-700">{holiday.title}</p>
                         <p className="text-[10px] font-bold text-rose-400">{new Date(holiday.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                       </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <EventModal
            event={selectedEvent}
            selectedDate={selectedDate}
            onClose={() => setIsModalOpen(false)}
            onSave={handleSaveEvent}
            onDelete={handleDeleteEvent}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

interface EventModalProps {
  event: CalendarEvent | null;
  selectedDate: Date | null;
  onClose: () => void;
  onSave: (event: any) => void;
  onDelete?: (id: string) => void;
}

const EventModal: React.FC<EventModalProps> = ({ event, selectedDate, onClose, onSave, onDelete }) => {
  const [formData, setFormData] = useState<Partial<CalendarEvent>>({
    title: '',
    type: 'trip',
    date: selectedDate || new Date(),
    startTime: '09:00',
    endTime: '17:00',
    description: '',
    ...event,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: event?.id || Date.now().toString(),
      title: formData.title || '',
      type: formData.type as EventType,
      date: formData.date || new Date(),
      startTime: formData.startTime || '09:00',
      endTime: formData.endTime || '17:00',
      description: formData.description,
      completed: event?.completed || false,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden"
      >
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-black text-gray-900">{event ? 'Edit Event' : 'New Event'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Event Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              placeholder="Enter event title"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Event Type</label>
            <div className="grid grid-cols-4 gap-2">
              {eventTypes.filter(t => t.type !== 'holiday').map(type => (
                <button
                  key={type.type}
                  type="button"
                  onClick={() => setFormData({ ...formData, type: type.type })}
                  className={cn(
                    "p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1",
                    formData.type === type.type
                      ? cn("border-indigo-500 bg-indigo-50", type.color)
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  )}
                >
                  {type.icon}
                  <span className="text-[10px] font-black">{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Date</label>
              <input
                type="date"
                value={formData.date?.toISOString().split('T')[0]}
                onChange={(e) => setFormData({ ...formData, date: new Date(e.target.value) })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Start Time</label>
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">End Time</label>
              <input
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Description (Optional)</label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
              placeholder="Add a description..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-200 text-gray-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
            {event && onDelete && (
              <button
                type="button"
                onClick={() => onDelete(event.id)}
                className="px-6 py-3 bg-rose-50 text-rose-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-rose-100 transition-all border border-rose-100"
              >
                Delete
              </button>
            )}
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all"
            >
              {event ? 'Update' : 'Create'} Event
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default CalendarPage;
