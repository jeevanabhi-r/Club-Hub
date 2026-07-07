import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import { 
  Megaphone, 
  Clock, 
  Send, 
  Plus,
  Layers,
  Sparkles,
  Trash2
} from "lucide-react";
import { Announcement } from "../types";
import { toast } from "react-hot-toast";
import { ConfirmModal } from "../components/ConfirmModal";
import { formatToDDMMYY } from "../utils/date";

export default function Announcements() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const [deleteAnnouncementId, setDeleteAnnouncementId] = useState<string | null>(null);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/api/announcements");
      setAnnouncements(res.data);
    } catch (err) {
      toast.error("Failed to load announcements board");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    try {
      await axios.delete(`/api/announcements/${id}`);
      toast.success("Notice deleted successfully");
      fetchAnnouncements();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to delete notice");
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post("/api/announcements", { title, content });
      toast.success("Notice published campus-wide!");
      setTitle("");
      setContent("");
      setShowForm(false);
      fetchAnnouncements();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to broadcast notice");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-900 pb-5">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            Campus Broadcasts <Sparkles className="h-5 w-5 text-emerald-400" />
          </h1>
          <p className="text-xs text-slate-400">Official bulletins, schedule changes, and event updates from club representatives</p>
        </div>

        {user?.role !== "student" && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center space-x-1.5 rounded-lg bg-emerald-500 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-400 transition-all shadow-lg"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Post New Announcement</span>
          </button>
        )}
      </div>

      {/* Quick Add Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-3 animate-in slide-in-from-top-3 duration-200">
          <h3 className="text-xs font-bold text-slate-200">Draft Bulletin</h3>
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Title</label>
            <input
              type="text"
              required
              placeholder="Notice title (e.g., Room allocation changes...)"
              className="w-full rounded-lg bg-slate-950/60 py-2 px-3 text-xs text-slate-200 border border-slate-850 focus:border-emerald-500 focus:outline-none"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Notice Body</label>
            <textarea
              required
              placeholder="Announcement details..."
              className="w-full rounded-lg bg-slate-950/60 py-2 px-3 text-xs text-slate-200 border border-slate-850 focus:border-emerald-500 focus:outline-none h-24"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 text-xs">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center space-x-1 rounded-lg bg-emerald-500 px-3 py-1.5 font-semibold text-white hover:bg-emerald-400 transition-all"
            >
              <Send className="h-3 w-3" /> <span>Publish Notice</span>
            </button>
          </div>
        </form>
      )}

      {/* Announcements Board */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map(n => (
            <div key={n} className="p-6 rounded-xl bg-slate-900/40 border border-slate-800 animate-pulse h-32" />
          ))}
        </div>
      ) : announcements.length === 0 ? (
        <div className="text-center py-12 rounded-xl bg-slate-900/10 border border-dashed border-slate-800">
          <Megaphone className="h-10 w-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-300">Announcements board is currently empty</p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map(ann => (
            <div 
              key={ann.id} 
              className="p-6 rounded-xl bg-slate-900/20 border border-slate-850 hover:border-slate-800 transition-all"
            >
              <div className="flex items-center justify-between mb-3 text-[10px] text-slate-400 font-semibold">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-slate-300">{ann.clubName}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{formatToDDMMYY(ann.createdAt)}</span>
                  </div>
                  {user?.role === "club_admin" && (!user.clubId || ann.clubId === user.clubId) && (
                    <button
                      onClick={() => setDeleteAnnouncementId(ann.id)}
                      className="text-rose-400 hover:text-rose-300 transition-colors p-1 rounded hover:bg-slate-900 cursor-pointer"
                      title="Delete Notice"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <h3 className="font-display font-semibold text-slate-200 text-sm leading-snug mb-2">
                {ann.title}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-wrap">
                {ann.content}
              </p>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteAnnouncementId}
        onClose={() => setDeleteAnnouncementId(null)}
        onConfirm={() => {
          if (deleteAnnouncementId) handleDeleteAnnouncement(deleteAnnouncementId);
        }}
        title="Delete Announcement Notice?"
        description="Are you sure you want to delete this announcement notice?"
        confirmText="Delete Notice"
        type="danger"
      />

    </div>
  );
}
