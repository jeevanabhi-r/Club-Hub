import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import { 
  BarChart3, 
  Search, 
  Filter, 
  ArrowUpDown, 
  Eye, 
  Image as ImageIcon, 
  MousePointerClick, 
  Calendar, 
  Clock, 
  X, 
  Sparkles,
  ExternalLink,
  Maximize2
} from "lucide-react";
import { EventAnalyticsData } from "../types";
import { formatToDDMMYY, parseEventDate, getEventEndTimestamp } from "../utils/date";
import { EventCardSkeleton } from "../components/Skeletons";
import CalendarDatePicker, { DateFilterValue, DEFAULT_ALL_FILTER } from "../components/CalendarDatePicker";
import { toast } from "react-hot-toast";
import ImageLightboxModal from "../components/ImageLightboxModal";
import { FormattedText } from "../components/FormattedText";

export default function EventAnalytics() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<EventAnalyticsData[]>([]);
  const [clubs, setClubs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Sort States
  const [selectedClub, setSelectedClub] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<"highest" | "lowest" | "default">("default");
  const [dateFilter, setDateFilter] = useState<DateFilterValue>(DEFAULT_ALL_FILTER);

  // Details Modal State
  const [selectedEvent, setSelectedEvent] = useState<EventAnalyticsData | null>(null);
  const [fullViewImage, setFullViewImage] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const token = localStorage.getItem("clubhub_token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const params = new URLSearchParams();
      if (user?.role === "super_admin") {
        if (selectedClub !== "All") params.append("club", selectedClub);
        if (searchQuery.trim()) params.append("search", searchQuery.trim());
        if (sortBy !== "default") params.append("sort", sortBy);
      }

      const res = await axios.get(`/api/analytics/events?${params.toString()}`, { headers });
      setAnalytics(res.data || []);

      // Fetch clubs list for Super Admin dropdown
      if (user?.role === "super_admin" && clubs.length === 0) {
        const clubsRes = await axios.get("/api/clubs", { headers });
        const clubNames = (clubsRes.data || []).map((c: any) => c.name);
        setClubs(["All", ...new Set<string>(clubNames)]);
      }
    } catch (err: any) {
      console.error("Failed to fetch event analytics:", err);
      const errorMsg = err.response?.data?.error || err.message || "Failed to load event interaction analytics";
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [user, selectedClub, sortBy]);

  // Track Interaction API call
  const recordInteraction = async (eventId: string, type: "view_details" | "view_photos") => {
    try {
      const res = await axios.post(`/api/events/${eventId}/interaction`, { type });
      if (res.data?.success) {
        // Update local state smoothly
        setAnalytics(prev => prev.map(item => {
          if (item.eventId === eventId || item.id === eventId) {
            const newDetails = res.data.viewDetailsCount;
            const newPhotos = res.data.viewPhotosCount;
            return {
              ...item,
              viewDetailsCount: newDetails,
              viewPhotosCount: newPhotos,
              totalInteractions: newDetails + newPhotos
            };
          }
          return item;
        }));

        if (selectedEvent && (selectedEvent.eventId === eventId || selectedEvent.id === eventId)) {
          setSelectedEvent(prev => prev ? {
            ...prev,
            viewDetailsCount: res.data.viewDetailsCount,
            viewPhotosCount: res.data.viewPhotosCount,
            totalInteractions: res.data.viewDetailsCount + res.data.viewPhotosCount
          } : null);
        }
      }
    } catch (err) {
      console.warn("Interaction recording notification:", err);
    }
  };

  const handleViewDetails = (item: EventAnalyticsData) => {
    setSelectedEvent(item);
    recordInteraction(item.eventId || item.id, "view_details");
  };

  const handleViewPhotos = (item: EventAnalyticsData, url?: string) => {
    recordInteraction(item.eventId || item.id, "view_photos");
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      toast("Photos album link is available in event details", { icon: "📸" });
      setSelectedEvent(item);
    }
  }  // Client-side filtering fallback for search & date filter
  const displayedAnalytics = analytics
    .filter(item => {
      // 1. Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesSearch = (
          item.title.toLowerCase().includes(q) ||
          item.clubName.toLowerCase().includes(q) ||
          (item.description && item.description.toLowerCase().includes(q))
        );
        if (!matchesSearch) return false;
      }

      // 2. Date Filter
      if (dateFilter.type !== "all" && dateFilter.startDate && dateFilter.endDate) {
        const itemStartMs = parseEventDate(item.date);
        const itemEndMs = getEventEndTimestamp(item.date, item.time) || (itemStartMs ? itemStartMs + 86399000 : 0);

        if (itemStartMs > 0) {
          const filterStartMs = dateFilter.startDate.getTime();
          const filterEndMs = dateFilter.endDate.getTime();

          // Check if event range overlaps with selected filter range
          const overlaps = itemStartMs <= filterEndMs && itemEndMs >= filterStartMs;
          if (!overlaps) return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      if (sortBy === "highest") {
        return b.totalInteractions - a.totalInteractions;
      } else if (sortBy === "lowest") {
        return a.totalInteractions - b.totalInteractions;
      }
      return 0;
    });

  const clubTitle = user?.clubName || user?.assignedClubName || "My Club";

  return (
    <div className="space-y-6 animate-in fade-in duration-200 text-zinc-200">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-zinc-900 pb-5">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f26522]/10 border border-[#f26522]/20 text-[#f26522]">
              <BarChart3 className="h-5 w-5" />
            </div>
            <h1 className="font-display text-2xl font-black tracking-tight text-white">
              Event Interaction Analytics
            </h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1.5 ml-0 md:ml-11">
            {user?.role === "super_admin" 
              ? "Comprehensive student engagement analytics and interaction counters across all university clubs"
              : `Real-time interaction breakdown and engagement metrics for ${clubTitle}'s campus events`
            }
          </p>
        </div>

        {/* Total Events Counter Badge */}
        <div className="flex items-center space-x-3 self-start md:self-auto bg-[#121212] border border-zinc-800 rounded-xl px-4 py-2.5 shadow-sm">
          <MousePointerClick className="h-4 w-4 text-[#f26522]" />
          <div>
            <p className="text-[10px] font-extrabold uppercase text-zinc-500 tracking-wider">Tracked Events</p>
            <p className="text-sm font-black text-white">{analytics.length} Events</p>
          </div>
        </div>
      </div>

      {/* Control & Filtering Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-[#121212] p-4 rounded-xl border border-zinc-900 shadow-md">
        
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 pointer-events-none z-10" />
          <input
            type="text"
            placeholder="Search event title or keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchAnalytics()}
            className="search-input w-full rounded-lg bg-zinc-900 pr-3 text-xs text-zinc-200 placeholder-zinc-500 border border-zinc-800 focus:outline-none focus:ring-1 focus:ring-[#f26522] transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Calendar Date Picker Component */}
          <CalendarDatePicker
            value={dateFilter}
            onChange={(newFilter) => setDateFilter(newFilter)}
          />

          {/* Club Filter (Super Admin Only) */}
          {user?.role === "super_admin" && (
            <div className="flex items-center space-x-1.5">
              <Filter className="h-3.5 w-3.5 text-[#f26522] shrink-0" />
              <select
                value={selectedClub}
                onChange={(e) => setSelectedClub(e.target.value)}
                className="rounded-lg bg-zinc-900 py-2 px-3 text-xs text-zinc-300 border border-zinc-800 focus:outline-none focus:ring-1 focus:ring-[#f26522] cursor-pointer"
              >
                <option value="All">All Clubs</option>
                {clubs.filter(c => c !== "All").map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          )}

          {/* Sort By Interactions */}
          <div className="flex items-center space-x-1.5">
            <ArrowUpDown className="h-3.5 w-3.5 text-[#f26522] shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="rounded-lg bg-zinc-900 py-2 px-3 text-xs text-zinc-300 border border-zinc-800 focus:outline-none focus:ring-1 focus:ring-[#f26522] cursor-pointer"
            >
              <option value="default">Sort: Default</option>
              <option value="highest">Sort: Highest Interactions</option>
              <option value="lowest">Sort: Lowest Interactions</option>
            </select>
          </div>
        </div>
      </div>

      {/* Analytics Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(n => <EventCardSkeleton key={n} />)}
        </div>
      ) : displayedAnalytics.length === 0 ? (
        <div className="text-center py-20 px-4 rounded-xl border border-zinc-800 bg-[#1e1e1e] max-w-lg mx-auto shadow-xl">
          <BarChart3 className="h-10 w-10 text-zinc-500 mx-auto mb-3 opacity-60" />
          <p className="text-sm font-semibold text-zinc-200">No event analytics found</p>
          <p className="text-xs text-zinc-500 mt-1">
            {user?.role === "club_admin" 
              ? `No events have been published by ${clubTitle} yet.`
              : "Try adjusting your search query or club filter options."
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedAnalytics.map(item => {
            const viewDetailsCount = item.viewDetailsCount || 0;
            const viewPhotosCount = item.viewPhotosCount || 0;
            const totalInteractions = item.totalInteractions || (viewDetailsCount + viewPhotosCount);

            return (
              <div
                key={item.eventId || item.id}
                className="rounded-xl overflow-hidden bg-[#1e1e1e] border border-zinc-800 hover:border-zinc-700 transition-all flex flex-col justify-between shadow-xl group"
              >
                {/* Event Image Banner */}
                <div className="relative h-44 w-full bg-zinc-950/40 border-b border-zinc-900 overflow-hidden shrink-0 flex items-center justify-center">
                  {item.banner && (
                    <img 
                      src={item.banner} 
                      alt={item.title}
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (!target.dataset.retried) {
                          target.dataset.retried = "1";
                          setTimeout(() => { target.src = target.src; }, 500);
                        } else {
                          target.style.display = 'none';
                        }
                      }}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 relative z-10"
                    />
                  )}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-600 space-y-1 z-0">
                    <Calendar className="h-7 w-7 opacity-30 text-zinc-500" />
                    <span className="text-[9px] font-bold tracking-wider uppercase opacity-30">No Event Banner</span>
                  </div>

                  {/* Club Tag */}
                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-black/75 backdrop-blur border border-white/10 text-[#f26522] shadow-md">
                    {item.clubName}
                  </span>
                </div>

                {/* Card Main Body */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  
                  {/* Title & Date */}
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-black text-[#f26522] uppercase tracking-wider">
                      {item.clubName}
                    </p>
                    <h3 className="font-display font-bold text-white text-base leading-snug">
                      {item.title}
                    </h3>
                    <div className="flex items-center space-x-1.5 text-xs text-zinc-400 pt-0.5">
                      <Clock className="h-3.5 w-3.5 text-zinc-500" />
                      <span>{formatToDDMMYY(item.date)}</span>
                    </div>
                  </div>



                  {/* INTERACTION METRICS PANEL (3 Columns) */}
                  <div className="grid grid-cols-3 gap-2 bg-[#121212] p-3 rounded-xl border border-zinc-900 text-center">
                    
                    {/* View Details Count */}
                    <div className="flex flex-col justify-between p-1.5 rounded-lg bg-zinc-900/50">
                      <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                        View Details
                      </span>
                      <span className="text-base font-black text-white">
                        {viewDetailsCount}
                      </span>
                    </div>

                    {/* View Photos Count */}
                    <div className="flex flex-col justify-between p-1.5 rounded-lg bg-zinc-900/50">
                      <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                        View Photos
                      </span>
                      <span className="text-base font-black text-emerald-400">
                        {viewPhotosCount}
                      </span>
                    </div>

                    {/* Total Interactions */}
                    <div className="flex flex-col justify-between p-1.5 rounded-lg bg-[#f26522]/10 border border-[#f26522]/30">
                      <span className="text-[9px] font-extrabold text-[#f26522] uppercase tracking-wider mb-1">
                        Total Interactions
                      </span>
                      <span className="text-base font-black text-[#f26522]">
                        {totalInteractions}
                      </span>
                    </div>

                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl border border-zinc-800 bg-[#121212] p-6 shadow-2xl animate-in fade-in zoom-in duration-200 text-zinc-200">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3 mb-4 shrink-0">
              <h3 className="font-display font-bold text-white text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#f26522]" />
                Event Specifications & Analytics
              </h3>
              <button 
                onClick={() => setSelectedEvent(null)}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-4 text-xs overflow-y-auto pr-1">
              {/* Banner */}
              {(() => {
                const modalBanner = selectedEvent.banner || selectedEvent.coverImage || selectedEvent.bannerImage || selectedEvent.image || selectedEvent.poster || "";
                return (
                  <div className="relative w-full bg-zinc-950/90 rounded-xl border border-zinc-800 flex items-center justify-center overflow-hidden p-1 group min-h-[200px] max-h-[460px]">
                    {modalBanner ? (
                      <>
                        <img 
                          src={modalBanner} 
                          alt={selectedEvent.title}
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          className="w-full max-h-[440px] object-contain relative z-10 rounded-lg cursor-zoom-in transition-transform group-hover:scale-[1.01]"
                          onClick={() => setFullViewImage(modalBanner)}
                        />
                        <button
                          type="button"
                          onClick={() => setFullViewImage(modalBanner)}
                          className="absolute top-3 right-3 z-20 px-2.5 py-1.5 rounded-lg bg-black/80 hover:bg-black text-white backdrop-blur-md opacity-90 group-hover:opacity-100 transition-opacity text-[11px] font-semibold flex items-center gap-1.5 border border-white/20 shadow-lg cursor-pointer"
                          title="View Full Size Image"
                        >
                          <Maximize2 className="h-3.5 w-3.5 text-[#f26522]" />
                          <span>Full Image</span>
                        </button>
                      </>
                    ) : null}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-600 space-y-1 p-6 z-0">
                      <Calendar className="h-7 w-7 opacity-30 text-zinc-500" />
                      <span className="text-[9px] font-bold tracking-wider uppercase opacity-30">No Event Banner</span>
                    </div>
                  </div>
                );
              })()}

              <div>
                <span className="text-[#f26522] font-black uppercase text-[10px] tracking-wider">{selectedEvent.clubName}</span>
                <h4 className="font-bold text-base text-white mt-0.5 mb-1">
                  {selectedEvent.title}
                </h4>
                <div className="text-zinc-400 text-xs leading-relaxed">
                  <FormattedText text={selectedEvent.description || "No detailed description available."} />
                </div>
              </div>

              {/* Quick Info Grid */}
              <div className="grid grid-cols-2 gap-3 bg-zinc-900/40 p-3 rounded-lg border border-zinc-900 text-xs">
                <div>
                  <span className="text-zinc-500 font-bold uppercase text-[9px]">Hosting Club</span>
                  <p className="text-white mt-0.5">{selectedEvent.clubName}</p>
                </div>
                <div>
                  <span className="text-zinc-500 font-bold uppercase text-[9px]">Date & Time</span>
                  <p className="text-white mt-0.5">{formatToDDMMYY(selectedEvent.date)} {selectedEvent.time ? `at ${selectedEvent.time}` : ""}</p>
                </div>
              </div>

              {/* Interaction Breakdown Summary */}
              <div className="bg-[#18181b] p-4 rounded-xl border border-zinc-800 space-y-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider block mb-2">Live Interaction Counters</span>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-zinc-900 p-2 rounded-lg">
                    <p className="text-[9px] font-bold text-zinc-400 uppercase">View Details</p>
                    <p className="text-sm font-black text-white mt-0.5">{selectedEvent.viewDetailsCount}</p>
                  </div>
                  <div className="bg-zinc-900 p-2 rounded-lg">
                    <p className="text-[9px] font-bold text-zinc-400 uppercase">View Photos</p>
                    <p className="text-sm font-black text-emerald-400 mt-0.5">{selectedEvent.viewPhotosCount}</p>
                  </div>
                  <div className="bg-[#f26522]/10 border border-[#f26522]/30 p-2 rounded-lg">
                    <p className="text-[9px] font-bold text-[#f26522] uppercase">Total</p>
                    <p className="text-sm font-black text-[#f26522] mt-0.5">{selectedEvent.totalInteractions}</p>
                  </div>
                </div>
              </div>

              {/* Photos Link */}
              {selectedEvent.driveLink && (
                <div>
                  <a
                    href={selectedEvent.driveLink}
                    target="_blank"
                    referrerPolicy="no-referrer"
                    rel="noopener noreferrer"
                    onClick={() => recordInteraction(selectedEvent.eventId || selectedEvent.id, "view_photos")}
                    className="flex items-center justify-center gap-1.5 w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 py-2.5 text-xs font-bold text-white text-center transition-colors shadow-lg"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>View Photos Album (Google Drive)</span>
                  </a>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* Image Lightbox Modal */}
      <ImageLightboxModal 
        imageUrl={fullViewImage} 
        onClose={() => setFullViewImage(null)} 
        title={selectedEvent?.title} 
      />

    </div>
  );
}
