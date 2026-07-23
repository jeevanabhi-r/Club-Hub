import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import { 
  Calendar, 
  Users, 
  Layers, 
  Clock, 
  Megaphone, 
  Plus, 
  Search,
  ChevronRight,
  Edit,
  Trash2,
  Bookmark,
  TrendingUp,
  MapPin,
  CheckCircle,
  Eye,
  X
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { DashboardStats, Club, Event, Registration } from "../types";
import { CardSkeleton, ListSkeleton } from "../components/Skeletons";
import { toast } from "react-hot-toast";
import { formatToDDMMYY, parseEventDate } from "../utils/date";
import { canEditEvent } from "../utils/permissions";
import CreateEventModal from "../components/CreateEventModal";
import { ConfirmModal } from "../components/ConfirmModal";

interface DashboardProps {
  searchQuery?: string;
}

export default function Dashboard({ searchQuery = "" }: DashboardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [studentRegs, setStudentRegs] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);

  // Local Search state for Event Management view
  const [localSearch, setLocalSearch] = useState("");

  useEffect(() => {
    if (searchQuery !== undefined) {
      setLocalSearch(searchQuery);
    }
  }, [searchQuery]);

  // Detailed view modal state
  const [selectedEventDetails, setSelectedEventDetails] = useState<Event | null>(null);
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<Event | null>(null);

  // Custom confirmation modal states
  const [deleteEventId, setDeleteEventId] = useState<string | null>(null);
  const [cancelRegId, setCancelRegId] = useState<string | null>(null);
  const [cancelRegTitle, setCancelRegTitle] = useState<string>("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const statsRes = await axios.get("/api/dashboard/stats");
      setStats(statsRes.data);

      const clubsRes = await axios.get("/api/clubs");
      setClubs(clubsRes.data);

      const eventsRes = await axios.get("/api/events");
      let loadedEvents = eventsRes.data;
      setEvents(loadedEvents);

      if (selectedEventDetails) {
        const updatedSelected = loadedEvents.find((e: Event) => e.id === selectedEventDetails.id);
        if (updatedSelected) {
          setSelectedEventDetails(updatedSelected);
        } else {
          setSelectedEventDetails(null);
        }
      }

      if (user?.role === "student") {
        const regsRes = await axios.get("/api/student/registrations");
        setStudentRegs(regsRes.data);
      }
    } catch (err) {
      console.error("Error fetching dashboard data", err);
      toast.error("Failed to load dashboard statistics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleDeleteEvent = async (eventId: string) => {
    try {
      await axios.delete(`/api/events/${eventId}`);
      toast.success("Event deleted from catalog");
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to delete event");
    }
  };

  const handleRegister = async (eventId: string) => {
    try {
      await axios.post(`/api/events/${eventId}/register`);
      toast.success("Successfully registered! Ticket added to your portfolio.");
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Registration failed");
    }
  };

  const handleCancelRegistration = async (eventId: string) => {
    try {
      const matchedReg = studentRegs.find(r => r.eventId === eventId);
      if (!matchedReg) return;
      
      await axios.post(`/api/registrations/${matchedReg.id}/cancel`);
      toast.success("Your registration has been cancelled");
      fetchData();
    } catch (err) {
      toast.error("Failed to cancel event registration");
    }
  };

  if (loading || !stats) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(n => <CardSkeleton key={n} />)}
        </div>
        <ListSkeleton />
      </div>
    );
  }

  // Admin view filters
  const upcomingEvents = events.filter(evt => evt.status === "Upcoming");
  const filteredUpcoming = upcomingEvents
    .filter(evt => 
      evt.title.toLowerCase().includes(localSearch.toLowerCase()) ||
      evt.description.toLowerCase().includes(localSearch.toLowerCase()) ||
      evt.clubName.toLowerCase().includes(localSearch.toLowerCase()) ||
      evt.venue.toLowerCase().includes(localSearch.toLowerCase())
    )
    .sort((a, b) => parseEventDate(a.date) - parseEventDate(b.date));

  // If the user is a Club Admin or Student, show the mockup "Event Management" screen (Image 1)
  if (user?.role === "club_admin" || user?.role === "student") {
    const isAdmin = user?.role === "super_admin" || user?.role === "club_admin";
    return (
      <div className="space-y-6 animate-in fade-in duration-200 text-zinc-200">
        
        {/* Header Block without duplicate Search */}
        <div className="border-b border-[#2A2A2A] pb-4">
          <h1 className="font-display text-2xl font-black tracking-tight text-white">
            Event Management
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            {isAdmin 
              ? "Create, modify, and monitor active university event calendars." 
              : "Browse active campus organisation calendars and reserve your tickets."}
          </p>
        </div>

        {/* Subheader Strip */}
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold tracking-wider uppercase text-zinc-400">
            Upcoming Events
          </h2>
          {isAdmin && (
            <button
              onClick={() => {
                setEventToEdit(null);
                setIsCreateEventOpen(true);
              }}
              className="flex items-center space-x-1.5 rounded-lg bg-[#f26522] hover:bg-[#ea580c] px-4 py-2 text-xs font-bold text-white transition-all shadow-lg shadow-orange-500/10"
            >
              <Plus className="h-3.5 w-3.5 stroke-[3]" />
              <span>Add New Event</span>
            </button>
          )}
        </div>

        {/* Upcoming Events Grid or Empty State Card */}
        {filteredUpcoming.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 rounded-xl border border-zinc-800 bg-[#1e1e1e] text-center max-w-lg mx-auto mt-6">
            <div className="h-12 w-12 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800 mb-4">
              <Calendar className="h-6 w-6 text-zinc-500" />
            </div>
            <p className="text-sm font-semibold text-zinc-300">
              No upcoming events right now.
            </p>
            {isAdmin && (
              <p className="text-xs text-zinc-500 mt-1">
                Click "Add New Event" to broadcast your club's first activity roster.
              </p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredUpcoming.map(evt => {
              const isFull = evt.registeredCount >= evt.maxParticipants;
              const isRegistered = studentRegs.some(r => r.eventId === evt.id);
              const canManageEvent = canEditEvent(user, evt);
              return (
                <div 
                  key={evt.id} 
                  className="rounded-xl overflow-hidden bg-[#1e1e1e] border border-zinc-800 hover:border-zinc-700 transition-all flex flex-col group h-full shadow-lg"
                >
                  {/* Banner Image */}
                  <div className="relative h-44 w-full bg-zinc-950/40 overflow-hidden shrink-0 border-b border-zinc-900 flex items-center justify-center">
                    {evt.banner ? (
                      <img 
                        src={evt.banner} 
                        alt={evt.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-zinc-600 space-y-1">
                        <Calendar className="h-7 w-7 opacity-30 text-zinc-500" />
                        <span className="text-[9px] font-bold tracking-wider uppercase opacity-30">No Event Banner</span>
                      </div>
                    )}
                    <span className={`absolute top-3 right-3 px-2 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase bg-black/60 backdrop-blur border border-white/10 ${
                      evt.status === "Upcoming" ? "text-emerald-400" : "text-zinc-400"
                    }`}>
                      {evt.status === "Upcoming" ? "Upcoming" : "Past"}
                    </span>
                  </div>

                  {/* Card Content */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[10px] font-black text-[#f26522] uppercase tracking-wider">
                          {evt.clubName}
                        </p>
                      </div>
                      <h3 className="font-display font-bold text-white text-sm leading-snug">
                        {evt.title}
                      </h3>
                      <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">
                        {evt.description}
                      </p>
                    </div>

                    {/* Metadata Indicators */}
                    <div className="space-y-1 text-[10px] text-zinc-500 border-t border-zinc-900 pt-3">
                      <div className="flex items-center space-x-1.5">
                        <Clock className="h-3.5 w-3.5 text-zinc-500" />
                        <span>{formatToDDMMYY(evt.date)} • {evt.time}</span>
                      </div>
                    </div>

                    {/* Action Buttons styled dynamically per role */}
                    <div className="flex items-center gap-2 pt-1 shrink-0 w-full">
                      {isAdmin ? (
                        <div className="flex flex-col w-full space-y-2">
                          <div className="flex items-center gap-2 w-full">
                            <button
                              onClick={() => setSelectedEventDetails(evt)}
                              className="flex-1 rounded-lg bg-[#2c2c2e] hover:bg-[#3a3a3c] py-2 text-xs font-bold text-white text-center transition-colors"
                            >
                              View Details
                            </button>
                            {canManageEvent && (
                              <>
                                <button
                                  onClick={() => {
                                    setEventToEdit(evt);
                                    setIsCreateEventOpen(true);
                                  }}
                                  className="rounded-lg p-2 bg-[#2c2c2e] hover:bg-[#3a3a3c] text-zinc-300 transition-colors"
                                  title="Edit Event"
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => setDeleteEventId(evt.id)}
                                  className="rounded-lg p-2 bg-[#2c2c2e] hover:bg-[#3a3a3c] text-rose-400 hover:text-rose-300 transition-colors"
                                  title="Delete Event"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                          {user?.role === "club_admin" && !canManageEvent && (
                            <div className="flex items-center justify-center gap-1.5 rounded-lg bg-[#2c2c2e]/60 border border-zinc-800 py-1.5 px-3 text-[10px] font-bold text-zinc-400 tracking-wide uppercase">
                              <span>Read Only</span>
                              <span className="text-zinc-600">•</span>
                              <span>Managed by {evt.clubName}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 w-full">
                          <button
                            onClick={() => setSelectedEventDetails(evt)}
                            className="flex-1 rounded-lg bg-[#2c2c2e] hover:bg-[#3a3a3c] py-2 text-xs font-bold text-white text-center transition-colors cursor-pointer"
                          >
                            View Details
                          </button>
                          {evt.driveLink && (
                            <a
                              href={evt.driveLink}
                              target="_blank"
                              referrerPolicy="no-referrer"
                              rel="noopener noreferrer"
                              className="flex-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 py-2 text-xs font-bold text-white text-center transition-colors flex items-center justify-center"
                            >
                              View Photos
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Event specifications details modal */}
        {selectedEventDetails && (() => {
          const isReg = studentRegs.some(r => r.eventId === selectedEventDetails.id);
          const isFull = selectedEventDetails.registeredCount >= selectedEventDetails.maxParticipants;
          const isPast = selectedEventDetails.status === "Completed" || selectedEventDetails.status === "Cancelled";
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-[#121212] p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-3 mb-4">
                  <h3 className="font-display font-bold text-white text-sm">
                    Event specifications
                  </h3>
                  <button 
                    onClick={() => setSelectedEventDetails(null)}
                    className="text-zinc-400 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-4 text-xs text-zinc-300">
                  <div className="relative w-full h-40 bg-zinc-950/40 rounded-lg border border-zinc-800 flex items-center justify-center overflow-hidden">
                    {selectedEventDetails.banner ? (
                      <img 
                        src={selectedEventDetails.banner} 
                        className="w-full h-full object-cover" 
                        alt="Banner" 
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-zinc-600 space-y-1">
                        <Calendar className="h-7 w-7 opacity-30 text-zinc-500" />
                        <span className="text-[9px] font-bold tracking-wider uppercase opacity-30">No Event Banner</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white mb-1">
                      {selectedEventDetails.title}
                    </h4>
                    <p className="text-zinc-400 leading-relaxed">
                      {selectedEventDetails.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 bg-zinc-900/40 p-3 rounded-lg border border-zinc-900">
                    <div>
                      <span className="text-zinc-500 font-bold uppercase text-[9px]">Hosting Club</span>
                      <p className="text-white mt-0.5">{selectedEventDetails.clubName}</p>
                    </div>
                    <div>
                      <span className="text-zinc-500 font-bold uppercase text-[9px]">Date & Time</span>
                      <p className="text-white mt-0.5">{formatToDDMMYY(selectedEventDetails.date)} at {selectedEventDetails.time}</p>
                    </div>
                  </div>

                  {selectedEventDetails.requirements && (
                    <div>
                      <span className="text-zinc-500 font-bold uppercase text-[9px]">Requirements</span>
                      <p className="text-zinc-300 mt-1 bg-zinc-900/60 p-2.5 rounded border border-zinc-900">
                        {selectedEventDetails.requirements}
                      </p>
                    </div>
                  )}

                  {selectedEventDetails.driveLink && (
                    <div>
                      <span className="text-zinc-500 font-bold uppercase text-[9px]">Event Memories</span>
                      <a
                        href={selectedEventDetails.driveLink}
                        target="_blank"
                        referrerPolicy="no-referrer"
                        rel="noopener noreferrer"
                        className="mt-1 flex items-center justify-center gap-1.5 w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 py-2 text-xs font-bold text-white text-center transition-colors"
                      >
                        View Photos Album (Google Drive)
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Real Create Event Modal Popup styled exactly as requested */}
        <CreateEventModal 
          isOpen={isCreateEventOpen} 
          onClose={() => {
            setIsCreateEventOpen(false);
            setEventToEdit(null);
          }} 
          onSuccess={fetchData} 
          eventToEdit={eventToEdit}
        />

        {/* Event deletion confirmation */}
        <ConfirmModal
          isOpen={!!deleteEventId}
          onClose={() => setDeleteEventId(null)}
          onConfirm={() => {
            if (deleteEventId) handleDeleteEvent(deleteEventId);
          }}
          title="Delete Event?"
          description="Are you sure you want to delete this event? This will also wipe all registered participants!"
          confirmText="Delete Event"
          type="danger"
        />

        {/* Registration cancellation confirmation */}
        <ConfirmModal
          isOpen={!!cancelRegId}
          onClose={() => setCancelRegId(null)}
          onConfirm={() => {
            if (cancelRegId) handleCancelRegistration(cancelRegId);
          }}
          title="Cancel Registration?"
          description="Are you sure you want to cancel your registration for this event?"
          confirmText="Cancel Registration"
          type="danger"
        />

      </div>
    );
  }

  // Fallback: Custom Styled student/general dashboard with orange highlights instead of default blue/emerald
  return (
    <div className="space-y-8 animate-in fade-in duration-200 text-zinc-200">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-zinc-900 pb-5">
        <div>
          <h1 className="font-display text-2xl font-black tracking-tight text-white">
            Welcome, {user?.name}
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Student Suite • Browse campus organization calendars and build your event portfolio.
          </p>
        </div>
      </div>

      {/* Grid Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-6 rounded-xl bg-[#1e1e1e] border border-zinc-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase">Active Events</span>
            <Calendar className="h-4 w-4 text-[#f26522]" />
          </div>
          <p className="text-2xl font-display font-bold text-white">{stats.totalEvents}</p>
          <p className="text-[10px] text-zinc-500 mt-1">
            <span className="text-[#f26522] font-bold">{stats.upcomingEvents} Upcoming</span> • {stats.pastEvents} Completed
          </p>
        </div>

        <div className="p-6 rounded-xl bg-[#1e1e1e] border border-zinc-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
              {user?.role === "super_admin" ? "Total (Admins + Students)" : "Registered Students"}
            </span>
            <Users className="h-4 w-4 text-[#f26522]" />
          </div>
          <p className="text-2xl font-display font-bold text-white">
            {user?.role === "super_admin" ? (stats.totalStudentsAndAdmins ?? stats.students) : stats.students}
          </p>
          <p className="text-[10px] text-[#f26522] mt-1 flex items-center gap-1 font-semibold">
            <TrendingUp className="h-3 w-3" /> +12% growth this month
          </p>
        </div>

        <div className="p-6 rounded-xl bg-[#1e1e1e] border border-zinc-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase">Campus Hubs</span>
            <Layers className="h-4 w-4 text-[#f26522]" />
          </div>
          <p className="text-2xl font-display font-bold text-white">{stats.clubs}</p>
          <p className="text-[10px] text-zinc-500 mt-1">
            All organizations active
          </p>
        </div>

        <div className="p-6 rounded-xl bg-[#1e1e1e] border border-zinc-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase">Event Bookings</span>
            <CheckCircle className="h-4 w-4 text-[#f26522]" />
          </div>
          <p className="text-2xl font-display font-bold text-white">{stats.totalRegistrations}</p>
          <p className="text-[10px] text-zinc-500 mt-1">
            Total participant rosters recorded
          </p>
        </div>
      </div>

      {/* Main Panel Division */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Analytics Charts Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Student: My Registered Events Panel */}
          <div className="p-5 rounded-xl bg-[#1e1e1e] border border-zinc-800">
            <h2 className="text-xs font-extrabold text-zinc-200 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              My Event Participations ({studentRegs.length})
            </h2>
            <div className="space-y-3">
              {studentRegs.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-xs text-zinc-500 mb-3">You haven't registered for any events yet.</p>
                  <Link
                    to="/upcoming"
                    className="inline-flex items-center text-xs font-bold text-[#f26522] hover:underline gap-1"
                  >
                    Browse active events <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              ) : (
                studentRegs.map(reg => {
                  const linkedEvt = events.find(e => e.id === reg.eventId);
                  return (
                    <div key={reg.id} className="flex items-center justify-between p-4 rounded-lg bg-zinc-950/60 border border-zinc-900">
                      <div>
                        <p className="text-xs font-bold text-white">{reg.eventTitle}</p>
                        <div className="flex items-center gap-3 text-[10px] text-zinc-400 mt-1">
                          {linkedEvt && (
                            <>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" /> {formatToDDMMYY(linkedEvt.date)} @ {linkedEvt.time}
                              </span>
                              <span>•</span>
                              <span>{linkedEvt.venue}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                          reg.attendanceMarked 
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                            : "bg-zinc-900 text-zinc-400 border border-zinc-800"
                        }`}>
                          {reg.attendanceMarked ? "Attended" : "Registered"}
                        </span>
                        {!reg.attendanceMarked && (
                          <button
                            onClick={() => {
                              setCancelRegId(reg.id);
                              setCancelRegTitle(reg.eventTitle);
                            }}
                            className="text-[10px] font-bold text-rose-400 hover:text-rose-300 transition-colors bg-transparent border-0 cursor-pointer hover:underline"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Recent Activity Sidebar */}
        <div className="space-y-6">
          <div className="p-5 rounded-xl bg-[#1e1e1e] border border-zinc-800">
            <h2 className="text-xs font-extrabold text-zinc-200 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-[#f26522]" /> Recent Campus Activities
            </h2>
            <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
              {stats.recentActivity.map((act, i) => (
                <div key={i} className="flex items-start space-x-3 text-xs leading-normal">
                  <div className="mt-1 h-2 w-2 rounded-full bg-[#f26522] shrink-0 animate-pulse" />
                  <div>
                    <p className="text-zinc-300 font-semibold">
                      {act.user} <span className="text-zinc-500 font-normal">{act.details}</span> {act.target}
                    </p>
                    <span className="text-[10px] text-zinc-500 mt-0.5 block">
                      {formatToDDMMYY(act.time)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Event deletion confirmation */}
      <ConfirmModal
        isOpen={!!deleteEventId}
        onClose={() => setDeleteEventId(null)}
        onConfirm={() => {
          if (deleteEventId) handleDeleteEvent(deleteEventId);
        }}
        title="Delete Event?"
        description="Are you sure you want to delete this event? This will also wipe all registered participants!"
        confirmText="Delete Event"
        type="danger"
      />

      {/* Registration cancellation confirmation */}
      <ConfirmModal
        isOpen={!!cancelRegId}
        onClose={() => {
          setCancelRegId(null);
          setCancelRegTitle("");
        }}
        onConfirm={async () => {
          if (!cancelRegId) return;
          try {
            await axios.post(`/api/registrations/${cancelRegId}/cancel`);
            toast.success("Registration cancelled successfully");
            fetchData();
          } catch (err) {
            toast.error("Failed to cancel registration");
          }
        }}
        title="Cancel Registration?"
        description={`Are you sure you want to cancel your registration for "${cancelRegTitle}"?`}
        confirmText="Cancel Registration"
        type="danger"
      />

    </div>
  );
}
