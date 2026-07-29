import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { 
  Calendar, 
  MapPin, 
  Clock, 
  Users, 
  Bookmark, 
  Share2, 
  Check, 
  X, 
  Plus, 
  Edit, 
  Trash2,
  Filter,
  Search,
  Sparkles,
  Eye
} from "lucide-react";
import { Event, Registration } from "../types";
import { EventCardSkeleton } from "../components/Skeletons";
import { toast } from "react-hot-toast";
import { formatToDDMMYY, parseEventDate, isPastEvent, getEventEndTimestamp } from "../utils/date";
import { canEditEvent, canDeleteEvent, isSuperAdmin } from "../utils/permissions";
import CreateEventModal from "../components/CreateEventModal";
import { ConfirmModal } from "../components/ConfirmModal";
import CalendarDatePicker, { DateFilterValue, DEFAULT_ALL_FILTER } from "../components/CalendarDatePicker";

interface EventsProps {
  searchQuery: string;
  filter?: "all" | "upcoming" | "past" | "my-registrations";
}

export default function Events({ searchQuery, filter = "all" }: EventsProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [savedEventIds, setSavedEventIds] = useState<string[]>(user?.savedEvents || []);
  const [loading, setLoading] = useState(true);
  const [clubs, setClubs] = useState<any[]>([]);

  // Filters
  const [selectedClub, setSelectedClub] = useState("All");
  const [statusFilter, setStatusFilter] = useState<"all" | "upcoming" | "past">("all");
  const [dateFilter, setDateFilter] = useState<DateFilterValue>(DEFAULT_ALL_FILTER);

  const handleTrackInteraction = (eventId: string, type: "view_details" | "view_photos") => {
    axios.post(`/api/events/${eventId}/interaction`, { type }).catch(() => {});
  };

  // Selected event details modal
  const [selectedEventDetails, setSelectedEventDetails] = useState<Event | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<Event | null>(null);

  // State for deletion modal
  const [deleteEventId, setDeleteEventId] = useState<string | null>(null);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const eventsUrl = filter === "past" ? "/api/events/past" : "/api/events";
      const res = await axios.get(eventsUrl);
      setEvents(res.data);

      const clubsRes = await axios.get("/api/clubs");
      setClubs(clubsRes.data || []);

      if (selectedEventDetails) {
        const updatedSelected = res.data.find((e: Event) => e.id === selectedEventDetails.id);
        if (updatedSelected) {
          setSelectedEventDetails(updatedSelected);
        } else {
          setSelectedEventDetails(null);
        }
      }

      if (user) {
        if (user.role === "student") {
          const regsRes = await axios.get("/api/student/registrations");
          setRegistrations(regsRes.data);
        } else {
          const regsRes = await axios.get("/api/registrations");
          setRegistrations(regsRes.data);
        }
      }
    } catch (err) {
      console.error("Failed to load events", err);
      toast.error("Failed to fetch events catalog");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [user]);

  // Handle Save Event Toggle (Bookmark)
  const handleToggleSave = async (eventId: string) => {
    try {
      const res = await axios.post(`/api/events/${eventId}/save`);
      setSavedEventIds(res.data.savedEvents);
      toast.success(
        res.data.savedEvents.includes(eventId) 
          ? "Event saved to bookmarks!" 
          : "Event removed from bookmarks"
      );
    } catch (err) {
      toast.error("Failed to update saved events list");
    }
  };

  // Handle Register for Event
  const handleRegister = async (eventId: string) => {
    try {
      await axios.post(`/api/events/${eventId}/register`);
      toast.success("Successfully registered! Ticket added to your portfolio.");
      fetchEvents();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Registration failed");
    }
  };

  // Handle Cancel Registration
  const handleCancelRegistration = async (eventId: string) => {
    try {
      const matchedReg = registrations.find(r => r.eventId === eventId && r.studentId === user?.id);
      if (!matchedReg) return;
      
      await axios.post(`/api/registrations/${matchedReg.id}/cancel`);
      toast.success("Your registration has been cancelled");
      fetchEvents();
    } catch (err) {
      toast.error("Failed to cancel event registration");
    }
  };

  // Admin: Delete Event
  const handleDeleteEvent = async (eventId: string) => {
    try {
      await axios.delete(`/api/events/${eventId}`);
      toast.success("Event deleted from catalog");
      fetchEvents();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to delete event");
    }
  };

  const approvedClubs = clubs.filter(c => c.approved).map(c => c.name);
  const clubsList = ["All", ...new Set(approvedClubs.length > 0 ? approvedClubs : events.map(e => e.clubName))];

  // Filters application
  const filteredEvents = events
    .filter(evt => {
      const matchesSearch = 
        evt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        evt.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        evt.clubName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        evt.venue.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesClub = selectedClub === "All" || 
                          evt.clubName === selectedClub ||
                          (evt.clubId && clubs.find(c => c.id === evt.clubId)?.name === selectedClub);

      let matchesFilter = true;
      if (filter === "upcoming" || (filter === "all" && statusFilter === "upcoming")) {
        matchesFilter = (evt.status === "Upcoming" || !evt.status) && !isPastEvent(evt.date, evt.time);
      } else if (filter === "past" || (filter === "all" && statusFilter === "past")) {
        matchesFilter = evt.status === "Completed" || evt.status === "Cancelled" || isPastEvent(evt.date, evt.time);
      } else if (filter === "my-registrations") {
        matchesFilter = registrations.some(r => r.eventId === evt.id && r.studentId === user?.id);
      }

      let matchesDate = true;
      if (dateFilter.type !== "all" && dateFilter.startDate && dateFilter.endDate) {
        const itemStartMs = parseEventDate(evt.date);
        const itemEndMs = getEventEndTimestamp(evt.date, evt.time) || (itemStartMs ? itemStartMs + 86399000 : 0);

        if (itemStartMs > 0) {
          const filterStartMs = dateFilter.startDate.getTime();
          const filterEndMs = dateFilter.endDate.getTime();

          matchesDate = itemStartMs <= filterEndMs && itemEndMs >= filterStartMs;
        }
      }

      return matchesSearch && matchesClub && matchesFilter && matchesDate;
    })
    .sort((a, b) => {
      // Sort past events descending (newest first), otherwise ascending (soonest first)
      if (filter === "past" || (filter === "all" && statusFilter === "past")) {
        return parseEventDate(b.date) - parseEventDate(a.date);
      }
      return parseEventDate(a.date) - parseEventDate(b.date);
    });

  return (
    <div className="space-y-6 animate-in fade-in duration-200 text-zinc-200">
      
      {/* Header with Search and Title */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-zinc-900 pb-5">
        <div>
          <h1 className="font-display text-2xl font-black tracking-tight text-white flex items-center gap-2">
            {filter === "upcoming" ? "Upcoming Campus Events" :
             filter === "past" ? "Past Events" :
             filter === "my-registrations" ? "My Event Bookings" :
             "Campus Events Catalog"}
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            {filter === "upcoming" ? "Stay ahead of schedule and register for active college activities and seminars" :
             filter === "past" ? "Relive and check details of completed/concluded campus gatherings" :
             filter === "my-registrations" ? "Your personal portfolio of reserved tickets and entry passes" :
             "Discover hackathons, cultural fests, workshops, and sports matches organized by Noida Institute"}
          </p>
        </div>
        {user?.role === "super_admin" && (
          <button
            onClick={() => {
              setEventToEdit(null);
              setIsEditModalOpen(true);
            }}
            className="flex items-center space-x-1.5 rounded-lg bg-[#f26522] hover:bg-[#ea580c] px-4 py-2 text-xs font-bold text-white transition-all shadow-lg shadow-orange-500/10 cursor-pointer self-start md:self-auto shrink-0"
          >
            <Plus className="h-3.5 w-3.5 stroke-[3]" />
            <span>Add New Event</span>
          </button>
        )}
      </div>

      {/* Filters Strip */}
      <div className="flex flex-wrap items-center gap-4 bg-[#121212] p-4 rounded-xl border border-zinc-900">
        <div className="flex items-center space-x-2 text-xs font-semibold text-zinc-500">
          <Filter className="h-3.5 w-3.5 text-[#f26522]" />
          <span>Filters:</span>
        </div>

        {/* Calendar Date Picker Component */}
        <CalendarDatePicker
          value={dateFilter}
          onChange={(newFilter) => setDateFilter(newFilter)}
        />

        {/* Club Filter */}
        <select
          className="rounded-lg bg-zinc-900 py-1.5 px-3 text-xs text-zinc-300 border border-zinc-800 focus:outline-none focus:ring-1 focus:ring-[#f26522] cursor-pointer"
          value={selectedClub}
          onChange={(e) => setSelectedClub(e.target.value)}
        >
          <option value="All">All Hosting Clubs</option>
          {clubsList.filter(c => c !== "All").map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        {/* Status Filter */}
        {filter === "all" && (
          <select
            className="rounded-lg bg-zinc-900 py-1.5 px-3 text-xs text-zinc-300 border border-zinc-800 focus:outline-none focus:ring-1 focus:ring-[#f26522] cursor-pointer"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
          >
            <option value="all">All Statuses</option>
            <option value="upcoming">Upcoming Only</option>
            <option value="past">Past Only</option>
          </select>
        )}
      </div>

      {/* Events Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(n => <EventCardSkeleton key={n} />)}
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="text-center py-20 px-4 rounded-xl border border-zinc-800 bg-[#1e1e1e] max-w-lg mx-auto">
          {filter === "past" ? (
            <>
              <Clock className="h-10 w-10 text-zinc-500 mx-auto mb-3" />
              <p className="text-sm font-semibold text-zinc-300">No past events recorded yet.</p>
            </>
          ) : (
            <>
              <Calendar className="h-10 w-10 text-zinc-500 mx-auto mb-3" />
              <p className="text-sm font-semibold text-zinc-300">
                {searchQuery ? "No events found matching current criteria" : "No upcoming events right now."}
              </p>
              {searchQuery && (
                <p className="text-xs text-zinc-500 mt-1">Try resetting search query or filter tags</p>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map(evt => {
            const isRegistered = registrations.some(r => r.eventId === evt.id && r.studentId === user?.id);
            const isSaved = savedEventIds.includes(evt.id);
            const isFull = evt.registeredCount >= evt.maxParticipants;
            
            const canManage = canEditEvent(user, evt);

            const isPast = evt.status === "Completed" || evt.status === "Cancelled" || filter === "past" || isPastEvent(evt.date, evt.time);

            return (
              <div 
                key={evt.id} 
                className="rounded-xl overflow-hidden bg-[#1e1e1e] border border-zinc-800 hover:border-zinc-700 transition-all flex flex-col group h-full shadow-lg"
              >
                {/* Banner */}
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
                  {/* Mockup Badge */}
                  <span className={`absolute top-3 right-3 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-black/60 backdrop-blur border border-white/10 ${
                    isPast ? "text-zinc-400" : "text-emerald-400"
                  }`}>
                    {isPast ? "Past" : "Upcoming"}
                  </span>
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      {/* Club name - Orange caps */}
                      <p className="text-[10px] font-black text-[#f26522] uppercase tracking-wider">
                        {evt.clubName}
                      </p>
                    </div>
                    <h3 className="font-display font-bold text-white text-sm leading-snug">
                      {evt.title}
                    </h3>
                    <p className="text-xs text-zinc-400 leading-relaxed line-clamp-3">
                      {evt.description}
                    </p>
                  </div>

                  {/* Metadata Indicators */}
                  <div className="space-y-1 text-[10px] font-medium text-zinc-500 border-t border-zinc-900 pt-3">
                    <div className="flex items-center space-x-1.5">
                      <Clock className="h-3.5 w-3.5 text-zinc-500" />
                      <span>{formatToDDMMYY(evt.date)} • {evt.time}</span>
                    </div>
                    {!isPast && (
                      <div className="flex items-center space-x-1.5">
                        <Users className="h-3.5 w-3.5 text-zinc-500" />
                        <span>{evt.registeredCount} / {evt.maxParticipants} Registered</span>
                      </div>
                    )}
                  </div>

                  {/* Controls / Actions Block */}
                  <div className="flex items-center gap-2 pt-1 shrink-0 w-full">
                    {canManage ? (
                      <div className="flex items-center gap-2 w-full">
                        <button
                          onClick={() => {
                            setSelectedEventDetails(evt);
                            handleTrackInteraction(evt.id, "view_details");
                          }}
                          className="flex-1 rounded-lg bg-[#2c2c2e] hover:bg-[#3a3a3c] py-2 text-xs font-bold text-white text-center transition-colors"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => {
                            setEventToEdit(evt);
                            setIsEditModalOpen(true);
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
                      </div>
                    ) : (
                      // Student / Other Club Admin Actions
                      <div className="flex flex-col w-full space-y-2">
                        <div className="flex items-center gap-2 w-full">
                          <button
                            onClick={() => {
                              setSelectedEventDetails(evt);
                              handleTrackInteraction(evt.id, "view_details");
                            }}
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
                              onClick={() => handleTrackInteraction(evt.id, "view_photos")}
                              className="flex-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 py-2 text-xs font-bold text-white text-center transition-colors flex items-center justify-center"
                            >
                              View Photos
                            </a>
                          )}
                        </div>
                        {user?.role === "club_admin" && (
                          <div className="flex items-center justify-center gap-1.5 rounded-lg bg-[#2c2c2e]/60 border border-zinc-800 py-1.5 px-3 text-[10px] font-bold text-zinc-400 tracking-wide uppercase">
                            <span>Read Only</span>
                            <span className="text-zinc-600">•</span>
                            <span>Managed by {evt.clubName}</span>
                          </div>
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

      {/* Details Modal */}
      {selectedEventDetails && (() => {
        const isReg = registrations.some(r => r.eventId === selectedEventDetails.id && r.studentId === user?.id);
        const isFull = selectedEventDetails.registeredCount >= selectedEventDetails.maxParticipants;
        const isPast = selectedEventDetails.status === "Completed" || selectedEventDetails.status === "Cancelled" || filter === "past";
        
        const canManage = canEditEvent(user, selectedEventDetails);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl border border-zinc-800 bg-[#121212] p-6 shadow-2xl animate-in fade-in zoom-in duration-200 text-zinc-200">
              <div className="flex items-center justify-between border-b border-zinc-900 pb-3 mb-4 shrink-0">
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

              <div className="space-y-4 text-xs overflow-y-auto pr-1">
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

                <div className="grid grid-cols-2 gap-3 bg-zinc-900/40 p-3 rounded-lg border border-zinc-900 text-xs">
                  <div>
                    <span className="text-zinc-500 font-bold uppercase text-[9px]">Hosting Club</span>
                    <p className="text-white mt-0.5">{selectedEventDetails.clubName}</p>
                  </div>
                  <div>
                    <span className="text-zinc-500 font-bold uppercase text-[9px]">Date & Time</span>
                    <p className="text-white mt-0.5">{formatToDDMMYY(selectedEventDetails.date)} at {selectedEventDetails.time}</p>
                  </div>
                </div>

                {selectedEventDetails.driveLink && (
                  <div>
                    <span className="text-zinc-500 font-bold uppercase text-[9px]">Event Memories</span>
                    <a
                      href={selectedEventDetails.driveLink}
                      target="_blank"
                      referrerPolicy="no-referrer"
                      rel="noopener noreferrer"
                      onClick={() => handleTrackInteraction(selectedEventDetails.id, "view_photos")}
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

      <CreateEventModal 
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEventToEdit(null);
        }}
        onSuccess={fetchEvents}
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

    </div>
  );
}
