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

// ─────────────────────────────────────────────────────────────────────────────
// Sri Lanka Public Holidays 2024–2027
// Sources: Government Gazette notifications + Buddhist calendar full-moon dates
// ─────────────────────────────────────────────────────────────────────────────
const SL_HOLIDAYS: { date: string; title: string }[] = [
  // ── 2024 ──────────────────────────────────────────────────────────────────
  { date: '2024-01-01', title: "New Year's Day" },
  { date: '2024-01-14', title: 'Tamil Thai Pongal Day' },
  { date: '2024-01-25', title: 'Duruthu Full Moon Poya Day' },
  { date: '2024-02-04', title: 'Independence Day' },
  { date: '2024-02-23', title: 'Navam Full Moon Poya Day' },
  { date: '2024-03-08', title: 'Mahasivaratri Day' },
  { date: '2024-03-25', title: 'Medin Full Moon Poya Day' },
  { date: '2024-03-29', title: 'Good Friday' },
  { date: '2024-04-13', title: 'Sinhala & Tamil New Year Eve' },
  { date: '2024-04-14', title: 'Sinhala & Tamil New Year Day' },
  { date: '2024-04-23', title: 'Bak Full Moon Poya Day' },
  { date: '2024-05-01', title: 'May Day' },
  { date: '2024-05-23', title: 'Vesak Full Moon Poya Day' },
  { date: '2024-05-24', title: 'Day following Vesak Poya' },
  { date: '2024-06-17', title: 'Id-ul-Adha (Hajj Festival Day)' },
  { date: '2024-06-21', title: 'Poson Full Moon Poya Day' },
  { date: '2024-07-21', title: 'Esala Full Moon Poya Day' },
  { date: '2024-08-19', title: 'Nikini Full Moon Poya Day' },
  { date: '2024-09-15', title: "Milad-un-Nabi (Prophet's Birthday)" },
  { date: '2024-09-17', title: 'Binara Full Moon Poya Day' },
  { date: '2024-10-17', title: 'Vap Full Moon Poya Day' },
  { date: '2024-11-01', title: 'Deepavali' },
  { date: '2024-11-15', title: 'Il Full Moon Poya Day' },
  { date: '2024-12-14', title: 'Unduvap Full Moon Poya Day' },
  { date: '2024-12-25', title: 'Christmas Day' },

  // ── 2025 ──────────────────────────────────────────────────────────────────
  { date: '2025-01-01', title: "New Year's Day" },
  { date: '2025-01-13', title: 'Duruthu Full Moon Poya Day' },
  { date: '2025-01-14', title: 'Tamil Thai Pongal Day' },
  { date: '2025-02-04', title: 'Independence Day' },
  { date: '2025-02-12', title: 'Navam Full Moon Poya Day' },
  { date: '2025-02-26', title: 'Mahasivaratri Day' },
  { date: '2025-03-14', title: 'Medin Full Moon Poya Day' },
  { date: '2025-04-12', title: 'Bak Full Moon Poya Day' },
  { date: '2025-04-13', title: 'Sinhala & Tamil New Year Eve' },
  { date: '2025-04-14', title: 'Sinhala & Tamil New Year Day' },
  { date: '2025-04-18', title: 'Good Friday' },
  { date: '2025-05-01', title: 'May Day' },
  { date: '2025-05-12', title: 'Vesak Full Moon Poya Day' },
  { date: '2025-05-13', title: 'Day following Vesak Poya' },
  { date: '2025-06-07', title: 'Id-ul-Adha (Hajj Festival Day)' },
  { date: '2025-06-11', title: 'Poson Full Moon Poya Day' },
  { date: '2025-07-10', title: 'Esala Full Moon Poya Day' },
  { date: '2025-08-09', title: 'Nikini Full Moon Poya Day' },
  { date: '2025-09-05', title: "Milad-un-Nabi (Prophet's Birthday)" },
  { date: '2025-09-07', title: 'Binara Full Moon Poya Day' },
  { date: '2025-10-07', title: 'Vap Full Moon Poya Day' },
  { date: '2025-10-20', title: 'Deepavali' },
  { date: '2025-11-05', title: 'Il Full Moon Poya Day' },
  { date: '2025-12-04', title: 'Unduvap Full Moon Poya Day' },
  { date: '2025-12-25', title: 'Christmas Day' },

  // ── 2026 ──────────────────────────────────────────────────────────────────
  { date: '2026-01-01', title: "New Year's Day" },
  { date: '2026-01-12', title: 'Duruthu Full Moon Poya Day' },
  { date: '2026-01-14', title: 'Tamil Thai Pongal Day' },
  { date: '2026-02-04', title: 'Independence Day' },
  { date: '2026-02-11', title: 'Navam Full Moon Poya Day' },
  { date: '2026-02-17', title: 'Mahasivaratri Day' },
  { date: '2026-03-13', title: 'Medin Full Moon Poya Day' },
  { date: '2026-04-03', title: 'Good Friday' },
  { date: '2026-04-12', title: 'Bak Full Moon Poya Day' },
  { date: '2026-04-13', title: 'Sinhala & Tamil New Year Eve' },
  { date: '2026-04-14', title: 'Sinhala & Tamil New Year Day' },
  { date: '2026-05-01', title: 'May Day' },
  { date: '2026-05-11', title: 'Vesak Full Moon Poya Day' },
  { date: '2026-05-12', title: 'Day following Vesak Poya' },
  { date: '2026-05-27', title: 'Id-ul-Adha (Hajj Festival Day)' },
  { date: '2026-06-10', title: 'Poson Full Moon Poya Day' },
  { date: '2026-07-09', title: 'Esala Full Moon Poya Day' },
  { date: '2026-08-08', title: 'Nikini Full Moon Poya Day' },
  { date: '2026-08-25', title: "Milad-un-Nabi (Prophet's Birthday)" },
  { date: '2026-09-06', title: 'Binara Full Moon Poya Day' },
  { date: '2026-10-05', title: 'Vap Full Moon Poya Day' },
  { date: '2026-11-04', title: 'Il Full Moon Poya Day' },
  { date: '2026-11-08', title: 'Deepavali' },
  { date: '2026-12-03', title: 'Unduvap Full Moon Poya Day' },
  { date: '2026-12-25', title: 'Christmas Day' },

  // ── 2027 ──────────────────────────────────────────────────────────────────
  { date: '2027-01-01', title: "New Year's Day" },
  { date: '2027-01-02', title: 'Duruthu Full Moon Poya Day' },
  { date: '2027-01-14', title: 'Tamil Thai Pongal Day' },
  { date: '2027-01-31', title: 'Navam Full Moon Poya Day' },
  { date: '2027-02-04', title: 'Independence Day' },
  { date: '2027-02-16', title: 'Mahasivaratri Day' },
  { date: '2027-03-02', title: 'Medin Full Moon Poya Day' },
  { date: '2027-03-26', title: 'Good Friday' },
  { date: '2027-04-01', title: 'Bak Full Moon Poya Day' },
  { date: '2027-04-13', title: 'Sinhala & Tamil New Year Eve' },
  { date: '2027-04-14', title: 'Sinhala & Tamil New Year Day' },
  { date: '2027-04-30', title: 'Vesak Full Moon Poya Day' },
  { date: '2027-05-01', title: 'May Day' },
  { date: '2027-05-01', title: 'Day following Vesak Poya' },
  { date: '2027-05-16', title: 'Id-ul-Adha (Hajj Festival Day)' },
  { date: '2027-05-30', title: 'Poson Full Moon Poya Day' },
  { date: '2027-06-29', title: 'Esala Full Moon Poya Day' },
  { date: '2027-07-28', title: 'Nikini Full Moon Poya Day' },
  { date: '2027-08-15', title: "Milad-un-Nabi (Prophet's Birthday)" },
  { date: '2027-08-27', title: 'Binara Full Moon Poya Day' },
  { date: '2027-09-26', title: 'Vap Full Moon Poya Day' },
  { date: '2027-10-26', title: 'Il Full Moon Poya Day' },
  { date: '2027-10-29', title: 'Deepavali' },
  { date: '2027-11-24', title: 'Unduvap Full Moon Poya Day' },
  { date: '2027-12-25', title: 'Christmas Day' },
];

// Build a lookup map for O(1) access
const HOLIDAY_MAP = new Map<string, string[]>();
SL_HOLIDAYS.forEach(h => {
  const existing = HOLIDAY_MAP.get(h.date) || [];
  existing.push(h.title);
  HOLIDAY_MAP.set(h.date, existing);
});

// Format a Date as YYYY-MM-DD using local timezone (avoids UTC shift)
const toLocalDateStr = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Today's local date string for comparisons
const todayStr = () => toLocalDateStr(new Date());

// ─────────────────────────────────────────────────────────────────────────────

const eventTypes: { type: EventType; label: string; color: string; icon: React.ReactNode }[] = [
  { type: 'trip',        label: 'Trip',        color: 'bg-indigo-100 text-indigo-600 border-indigo-200',  icon: <Truck  className="w-4 h-4" /> },
  { type: 'maintenance', label: 'Maintenance', color: 'bg-amber-100  text-amber-600  border-amber-200',   icon: <Wrench className="w-4 h-4" /> },
  { type: 'meeting',     label: 'Meeting',     color: 'bg-emerald-100 text-emerald-600 border-emerald-200', icon: <User  className="w-4 h-4" /> },
  { type: 'holiday',     label: 'SL Holiday',  color: 'bg-rose-100   text-rose-600   border-rose-200',    icon: <Flag  className="w-4 h-4" /> },
  { type: 'other',       label: 'Other',       color: 'bg-purple-100 text-purple-600 border-purple-200',  icon: <Clock className="w-4 h-4" /> },
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

  React.useEffect(() => { fetchEvents(); }, []);

  const handleSaveEvent = async (eventData: Omit<CalendarEvent, 'id'>) => {
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
    const lastDay  = new Date(year, month + 1, 0);
    const daysInMonth  = lastDay.getDate();
    const startingDay  = firstDay.getDay();
    const days: { date: Date; isCurrentMonth: boolean }[] = [];

    for (let i = startingDay - 1; i >= 0; i--) {
      days.push({ date: new Date(year, month, -i), isCurrentMonth: false });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }
    return days;
  }, [currentDate]);

  const getEventsForDate = (date: Date): CalendarEvent[] => {
    const ds = toLocalDateStr(date);
    const titles = HOLIDAY_MAP.get(ds) || [];
    const holidays: CalendarEvent[] = titles.map((title, i) => ({
      id: `holiday-${ds}-${i}`,
      title,
      type: 'holiday',
      date,
      startTime: '00:00',
      endTime: '23:59',
    }));
    const dayEvents = events.filter(ev => {
      const evDate = ev.date instanceof Date ? ev.date : new Date(ev.date);
      return toLocalDateStr(evDate) === ds;
    });
    return [...holidays, ...dayEvents];
  };

  const getEventTypeConfig = (type: EventType) =>
    eventTypes.find(et => et.type === type) || eventTypes[4];

  const upcomingHolidays = SL_HOLIDAYS
    .filter(h => h.date >= todayStr())
    .slice(0, 6);

  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        title="Calendar & Scheduling"
        subtitle="Fleet operations calendar with Sri Lanka public holidays"
        actions={
          <button
            onClick={() => { setSelectedEvent(null); setIsModalOpen(true); }}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20"
          >
            <Plus className="w-4 h-4" />
            New Event
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* ── Main Calendar ── */}
        <div className="lg:col-span-3">
          <div className="bg-white border border-gray-100 rounded-[2.5rem] p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-gray-900">
                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h2>
              <div className="flex items-center gap-2">
                <button onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <button onClick={() => setCurrentDate(new Date())}
                  className="px-4 py-2 text-xs font-black text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                  Today
                </button>
                <button onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
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
                const ds = toLocalDateStr(date);
                const isToday    = ds === toLocalDateStr(new Date());
                const isSelected = selectedDate && toLocalDateStr(selectedDate) === ds;
                const isPoya     = dayEvents.some(e => e.type === 'holiday' && e.title.includes('Poya'));
                const isHoliday  = dayEvents.some(e => e.type === 'holiday');

                return (
                  <div
                    key={index}
                    onClick={() => setSelectedDate(date)}
                    className={cn(
                      "min-h-[100px] p-2 rounded-xl border transition-all cursor-pointer",
                      !isCurrentMonth && "bg-gray-50 border-transparent opacity-40",
                      isCurrentMonth && "bg-white border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/30",
                      isToday    && "bg-indigo-50 border-indigo-200",
                      isSelected && "ring-2 ring-indigo-500 ring-offset-2",
                      isHoliday  && isCurrentMonth && !isToday && "bg-rose-50/30"
                    )}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className={cn(
                        "text-sm font-black w-7 h-7 flex items-center justify-center rounded-full",
                        isToday ? "bg-indigo-600 text-white" : "text-gray-700",
                        isPoya && !isToday && "text-rose-600",
                      )}>
                        {date.getDate()}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 3).map((event, ei) => {
                        const config = getEventTypeConfig(event.type);
                        return (
                          <div
                            key={`${event.id}-${ei}`}
                            onClick={e => {
                              if (event.type === 'holiday') return;
                              e.stopPropagation();
                              setSelectedEvent(event);
                              setIsModalOpen(true);
                            }}
                            className={cn(
                              "text-[9px] px-1.5 py-0.5 rounded truncate font-bold border leading-tight",
                              config.color,
                            )}
                            title={event.title}
                          >
                            {event.title}
                          </div>
                        );
                      })}
                      {dayEvents.length > 3 && (
                        <p className="text-[9px] text-gray-400 font-black px-1">+{dayEvents.length - 3}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Sidebar ── */}
        <div className="space-y-6">
          {/* Legend */}
          <div className="bg-white border border-gray-100 rounded-[2.5rem] p-6 shadow-sm">
            <h3 className="text-sm font-black text-gray-900 mb-4 uppercase tracking-tight">Event Types</h3>
            <div className="space-y-3">
              {eventTypes.map(type => (
                <div key={type.type} className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-lg border", type.color)}>{type.icon}</div>
                  <span className="text-xs font-bold text-gray-700">{type.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming SL Holidays */}
          <div className="bg-white border border-gray-100 rounded-[2.5rem] p-6 shadow-sm">
            <h3 className="text-sm font-black text-gray-900 mb-4 uppercase tracking-tight">Upcoming SL Holidays</h3>
            <div className="space-y-2">
              {upcomingHolidays.length === 0 ? (
                <p className="text-[10px] text-gray-400 font-bold text-center py-4">No upcoming holidays</p>
              ) : (
                upcomingHolidays.map((holiday, i) => {
                  const d = new Date(holiday.date + 'T00:00:00');
                  return (
                    <div key={i} className="p-3 bg-rose-50 rounded-xl border border-rose-100">
                      <div className="flex items-start gap-2">
                        <Flag className="w-3.5 h-3.5 text-rose-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-[10px] font-black text-rose-700 leading-tight">{holiday.title}</p>
                          <p className="text-[9px] font-bold text-rose-400 mt-0.5">
                            {d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Selected date events */}
          {selectedDate && (
            <div className="bg-white border border-gray-100 rounded-[2.5rem] p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">
                  {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </h3>
                <button
                  onClick={() => { setSelectedEvent(null); setIsModalOpen(true); }}
                  className="p-1.5 bg-indigo-50 rounded-lg text-indigo-600 hover:bg-indigo-100 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="space-y-2">
                {getEventsForDate(selectedDate).length === 0 ? (
                  <p className="text-[10px] text-gray-400 text-center py-3">No events</p>
                ) : (
                  getEventsForDate(selectedDate).map((ev, i) => {
                    const cfg = getEventTypeConfig(ev.type);
                    return (
                      <div
                        key={i}
                        onClick={() => {
                          if (ev.type === 'holiday') return;
                          setSelectedEvent(ev);
                          setIsModalOpen(true);
                        }}
                        className={cn("p-2.5 rounded-xl border text-[10px] font-bold leading-tight", cfg.color, ev.type !== 'holiday' && "cursor-pointer hover:opacity-80")}
                      >
                        <p className="font-black">{ev.title}</p>
                        {ev.type !== 'holiday' && (
                          <p className="mt-0.5 opacity-70">{ev.startTime} – {ev.endTime}</p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
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

// ─────────────────────────────────────────────────────────────────────────────
// Event Modal
// ─────────────────────────────────────────────────────────────────────────────

interface EventModalProps {
  event: CalendarEvent | null;
  selectedDate: Date | null;
  onClose: () => void;
  onSave: (event: Omit<CalendarEvent, 'id'>) => void;
  onDelete?: (id: string) => void;
}

const EventModal: React.FC<EventModalProps> = ({ event, selectedDate, onClose, onSave, onDelete }) => {
  const defaultDate = event?.date instanceof Date
    ? event.date
    : selectedDate || new Date();

  const [formData, setFormData] = useState({
    title: event?.title || '',
    type: event?.type || 'trip' as EventType,
    dateStr: toLocalDateStr(defaultDate),
    startTime: event?.startTime || '09:00',
    endTime: event?.endTime || '17:00',
    description: event?.description || '',
    completed: event?.completed || false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Parse date from local string to avoid UTC shift
    const [y, m, d] = formData.dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    onSave({
      title: formData.title,
      type: formData.type,
      date: dateObj,
      startTime: formData.startTime,
      endTime: formData.endTime,
      description: formData.description,
      completed: formData.completed,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
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
              onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
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
                  onClick={() => setFormData(p => ({ ...p, type: type.type }))}
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
                value={formData.dateStr}
                onChange={e => setFormData(p => ({ ...p, dateStr: e.target.value }))}
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
                onChange={e => setFormData(p => ({ ...p, startTime: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">End Time</label>
              <input
                type="time"
                value={formData.endTime}
                onChange={e => setFormData(p => ({ ...p, endTime: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Description (Optional)</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
              placeholder="Add a description..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-200 text-gray-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-50 transition-all">
              Cancel
            </button>
            {event && onDelete && (
              <button type="button" onClick={() => onDelete(event.id)}
                className="px-6 py-3 bg-rose-50 text-rose-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-rose-100 transition-all border border-rose-100">
                Delete
              </button>
            )}
            <button type="submit"
              className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all">
              {event ? 'Update' : 'Create'} Event
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default CalendarPage;
