import React, { useState, useEffect } from "react";
import axios from "axios";
import { X, Calendar as CalendarIcon, UploadCloud } from "lucide-react";
import { toast } from "react-hot-toast";
import { Club, Event } from "../types";
import { useAuth } from "../context/AuthContext";
import { formatToDDMMYY } from "../utils/date";
import { canEditEvent } from "../utils/permissions";

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  eventToEdit?: Event | null;
}

export default function CreateEventModal({ isOpen, onClose, onSuccess, eventToEdit }: CreateEventModalProps) {
  const { user } = useAuth();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(false);

  // Form states matching Image 1
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [clubId, setClubId] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [driveLink, setDriveLink] = useState("");
  const [selectedFileName, setSelectedFileName] = useState("No file chosen");
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Fetch clubs to populate Hosting Club select
      const fetchClubs = async () => {
        try {
          const res = await axios.get("/api/clubs");
          setClubs(res.data);
          if (user && user.role === "club_admin") {
            const adminClubId = user.clubId || user.assignedClubId;
            if (adminClubId) {
              setClubId(adminClubId);
            }
          } else if (!eventToEdit) {
            setClubId("");
          }
        } catch (err) {
          console.error("Error fetching clubs", err);
        }
      };
      fetchClubs();

      if (eventToEdit) {
        // Secure access check on frontend
        if (!canEditEvent(user, eventToEdit)) {
          toast.error("Access Denied: You cannot manage another club's events.");
          onClose();
          return;
        }

        setTitle(eventToEdit.title || "");
        setDescription(eventToEdit.description || "");
        setClubId(eventToEdit.clubId || "");
        setBannerUrl(eventToEdit.banner || "");
        setDriveLink(eventToEdit.driveLink || "");
        setSelectedFileName(eventToEdit.banner ? "Current Banner" : "No file chosen");
        
        setDate(eventToEdit.date ? formatToDDMMYY(eventToEdit.date) : "");
        setTime(eventToEdit.time || "");
      } else {
        // Clear form for new event
        setTitle("");
        setDescription("");
        setDate("");
        setTime("");
        if (user && user.role === "club_admin") {
          const adminClubId = user.clubId || user.assignedClubId;
          setClubId(adminClubId || "");
        } else {
          setClubId("");
        }
        setBannerUrl("");
        setDriveLink("");
        setSelectedFileName("No file chosen");
      }
    }
  }, [isOpen, eventToEdit, user]);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFileName(file.name);

      try {
        setUploadingImage(true);
        // Compress image using canvas for lightweight & permanent storage in db.json
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
          try {
            const img = new Image();
            img.src = reader.result as string;
            img.onload = async () => {
              const canvas = document.createElement("canvas");
              const maxWidth = 1200;
              let width = img.width;
              let height = img.height;
              if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
              }
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext("2d");
              let dataUrl = reader.result as string;
              if (ctx) {
                ctx.drawImage(img, 0, 0, width, height);
                dataUrl = canvas.toDataURL("image/jpeg", 0.82);
              }

              const res = await axios.post("/api/upload", {
                name: file.name,
                type: "image/jpeg",
                data: dataUrl
              });
              setBannerUrl(res.data.url || dataUrl);
              toast.success("Cover image uploaded and saved!");
              setUploadingImage(false);
            };
            img.onerror = () => {
              setBannerUrl(reader.result as string);
              toast.success("Cover image selected!");
              setUploadingImage(false);
            };
          } catch (err) {
            toast.error("Failed to upload cover image");
            setUploadingImage(false);
          }
        };
      } catch (err) {
        toast.error("Failed to upload cover image");
        setUploadingImage(false);
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) {
      toast.error("Event title is required");
      return;
    }
    if (!description) {
      toast.error("Event description is required");
      return;
    }
    if (!date) {
      toast.error("Date is required");
      return;
    }
    if (!time) {
      toast.error("Time is required");
      return;
    }

    let finalClubId = clubId;
    if (user && user.role === "club_admin") {
      finalClubId = user.clubId || user.assignedClubId || "";
    }

    if (!finalClubId) {
      toast.error("Hosting Club is required");
      return;
    }

    try {
      setLoading(true);
      const hostClub = clubs.find(c => c.id === finalClubId);
      const clubName = hostClub ? hostClub.name : (user?.clubName || "Unknown Club");

      // Attach Google Drive Link in requirements/notes if present
      const reqText = driveLink ? `Google Drive Resource: ${driveLink}` : "";

      const formattedDate = formatToDDMMYY(date);

      const payload = {
        title,
        clubId: finalClubId,
        clubName,
        category: eventToEdit ? eventToEdit.category : "Coding",
        description,
        banner: bannerUrl || "",
        venue: eventToEdit ? eventToEdit.venue : "Seminar Hall 1",
        date: formattedDate,
        time: time,
        maxParticipants: eventToEdit ? eventToEdit.maxParticipants : 100,
        deadline: eventToEdit ? eventToEdit.deadline : formattedDate,
        requirements: eventToEdit ? eventToEdit.requirements : reqText,
        organizer: clubName,
        status: eventToEdit ? eventToEdit.status : "Upcoming",
        driveLink
      };

      if (eventToEdit) {
        await axios.put(`/api/events/${eventToEdit.id}`, payload);
        toast.success("Event details modified successfully!");
      } else {
        await axios.post("/api/events", payload);
        toast.success("New event published!");
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to save event");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-850 bg-[#121212] p-6 shadow-2xl relative text-zinc-200">
        
        {/* Header Block */}
        <div className="flex items-center justify-between border-b border-zinc-900 pb-3 mb-5">
          <h2 className="font-display font-black text-sm text-white">
            {eventToEdit ? "Edit Event" : "Create New Event"}
          </h2>
          <button 
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          
          {/* Event Title */}
          <div>
            <label className="block text-[10px] font-black uppercase text-zinc-500 tracking-wider mb-1.5">
              Event Title
            </label>
            <input
              type="text"
              placeholder="Event title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg bg-[#1e1e1e] border border-zinc-800/80 px-3.5 py-2.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-[#f26522] transition-all"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-[10px] font-black uppercase text-zinc-500 tracking-wider mb-1.5">
              Description
            </label>
            <textarea
              placeholder="Event description..."
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg bg-[#1e1e1e] border border-zinc-800/80 px-3.5 py-2.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-[#f26522] transition-all"
            />
          </div>

          {/* Grid fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Date */}
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 tracking-wider mb-1.5">
                Date (DD/MM/YY) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="E.g., 15/10/26"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg bg-[#1e1e1e] border border-zinc-800/80 px-3.5 py-2.5 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-[#f26522] transition-all"
              />
            </div>

            {/* Time */}
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 tracking-wider mb-1.5">
                Time <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="E.g., 03:00 PM"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full rounded-lg bg-[#1e1e1e] border border-zinc-800/80 px-3.5 py-2.5 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-[#f26522] transition-all"
              />
            </div>

            {/* Hosting Club */}
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 tracking-wider mb-1.5">
                Hosting Club
              </label>
              {user?.role === "club_admin" ? (
                <div className="w-full rounded-lg bg-zinc-900/60 border border-zinc-800 px-3.5 py-2.5 text-xs text-zinc-400 select-none">
                  {user.clubName || clubs.find(c => c.id === clubId)?.name || "Assigned Club"}
                </div>
              ) : (
                <select
                  required
                  value={clubId}
                  onChange={(e) => setClubId(e.target.value)}
                  className="w-full rounded-lg bg-[#1e1e1e] border border-zinc-800/80 px-3.5 py-2.5 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-[#f26522] transition-all"
                >
                  <option value="">-- Select Club --</option>
                  {clubs.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Event Cover Image */}
          <div className="border border-zinc-800/50 bg-zinc-900/10 rounded-xl p-4.5 space-y-3.5">
            <span className="block text-[10px] font-black uppercase text-zinc-500 tracking-wider">
              Event Cover Image
            </span>

            <div className="flex flex-wrap items-center gap-3">
              <label htmlFor="modal-file-upload" className="rounded-lg bg-[#f26522] hover:bg-[#ea580c] px-4 py-2 text-xs font-bold text-white cursor-pointer select-none transition-all shadow-md shadow-orange-500/5">
                {uploadingImage ? "Uploading..." : "Choose File"}
              </label>
              <input 
                id="modal-file-upload" 
                type="file" 
                accept="image/*"
                className="hidden" 
                onChange={handleFileChange} 
              />
              <span className="text-zinc-500 text-xs truncate max-w-xs">
                {selectedFileName}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-zinc-500 font-bold uppercase shrink-0">OR URL:</span>
              <input
                type="text"
                placeholder="https://..."
                value={bannerUrl}
                onChange={(e) => setBannerUrl(e.target.value)}
                className="flex-1 rounded-lg bg-[#1e1e1e] border border-zinc-800/80 px-3.5 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-[#f26522] transition-all"
              />
            </div>

            {bannerUrl && (
              <div className="h-32 w-full rounded-lg border border-zinc-800 overflow-hidden mt-2 relative bg-zinc-950 flex items-center justify-center">
                <img 
                  src={bannerUrl} 
                  alt="Banner Preview" 
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  className="w-full h-full object-cover relative z-10" 
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center text-zinc-500 z-0 space-y-1">
                  <span className="text-xs font-semibold text-zinc-400">Previous cover link expired or empty</span>
                  <span className="text-[10px] text-zinc-600">Choose a file above or paste an image URL to update</span>
                </div>
              </div>
            )}
          </div>

          {/* Google Drive Link (Optional) */}
          <div>
            <label className="block text-[10px] font-black uppercase text-zinc-500 tracking-wider mb-1.5">
              Google Drive Link (Optional)
            </label>
            <input
              type="text"
              placeholder="https://drive.google.com/..."
              value={driveLink}
              onChange={(e) => setDriveLink(e.target.value)}
              className="w-full rounded-lg bg-[#1e1e1e] border border-zinc-800/80 px-3.5 py-2.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-[#f26522] transition-all"
            />
          </div>

          {/* Footer Action Strip */}
          <div className="flex justify-end items-center gap-3 border-t border-zinc-900 pt-4 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2.5 text-xs font-bold text-zinc-400 hover:text-white transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || uploadingImage}
              className="rounded-lg bg-[#f26522] hover:bg-[#ea580c] px-5 py-2.5 text-xs font-bold text-white transition-all shadow-lg shadow-orange-500/10 disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save Event"}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
