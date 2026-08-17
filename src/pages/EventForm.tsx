import React, { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, UploadCloud, Save, Sparkles, Calendar } from "lucide-react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { Club, Event } from "../types";
import { useAuth } from "../context/AuthContext";
import { formatToDDMMYY, isPastEvent } from "../utils/date";
import { canEditEvent } from "../utils/permissions";

interface EventFormProps {
  mode: "add" | "edit";
}

export default function EventForm({ mode }: EventFormProps) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(mode === "edit");
  const [clubs, setClubs] = useState<Club[]>([]);
  const [accessDenied, setAccessDenied] = useState(false);

  // Form Fields State
  const [title, setTitle] = useState("");
  const [clubId, setClubId] = useState("");
  const [category, setCategory] = useState("Coding");
  const [description, setDescription] = useState("");
  const [banner, setBanner] = useState("");
  const [poster, setPoster] = useState("");
  const [venue, setVenue] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [maxParticipants, setMaxParticipants] = useState("100");
  const [deadline, setDeadline] = useState("");
  const [requirements, setRequirements] = useState("");
  const [organizer, setOrganizer] = useState("");
  const [status, setStatus] = useState<"Upcoming" | "Completed" | "Cancelled">("Upcoming");
  const [driveLink, setDriveLink] = useState("");

  // Drag-and-drop states
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingPoster, setUploadingPoster] = useState(false);
  const [dragActiveBanner, setDragActiveBanner] = useState(false);
  const [dragActivePoster, setDragActivePoster] = useState(false);

  useEffect(() => {
    // Fetch all clubs to populate dropdown selection
    const fetchClubs = async () => {
      try {
        const res = await axios.get("/api/clubs");
        setClubs(res.data);
        if (user && user.role === "club_admin") {
          const adminClubId = user.clubId || user.assignedClubId;
          if (adminClubId) {
            setClubId(adminClubId);
          }
        } else if (res.data.length > 0 && mode === "add") {
          // Keep hosting club select is default option and admin can select as per their choice
          setClubId("");
        }
      } catch (err) {
        toast.error("Failed to load campus clubs");
      }
    };

    fetchClubs();

    if (mode === "add") {
      if (user && user.role !== "super_admin" && user.role !== "club_admin") {
        setAccessDenied(true);
      }
    }

    if (mode === "edit" && id) {
      const fetchEventDetails = async () => {
        try {
          const res = await axios.get("/api/events");
          const found = res.data.find((e: Event) => e.id === id);
          if (found) {
            // Secure URL Access Check on frontend
            if (!canEditEvent(user, found)) {
              setAccessDenied(true);
              setFetching(false);
              return;
            }

            setTitle(found.title || "");
            setClubId(found.clubId || "");
            setCategory(found.category || "Coding");
            setDescription(found.description || "");
            const currentBanner = found.banner || found.coverImage || found.bannerImage || found.image || found.poster || "";
            setBanner(currentBanner);
            setPoster(found.poster || "");
            setVenue(found.venue || "");
            setDate(found.date ? formatToDDMMYY(found.date) : "");
            setTime(found.time || "");
            setMaxParticipants(found.maxParticipants?.toString() || "100");
            setDeadline(found.deadline ? formatToDDMMYY(found.deadline) : "");
            setRequirements(found.requirements || "");
            setOrganizer(found.organizer || "");
            setStatus(found.status || "Upcoming");
            setDriveLink(found.driveLink || "");
          } else {
            toast.error("Event not found");
            navigate("/events");
          }
        } catch (err) {
          toast.error("Failed to fetch event specifications");
        } finally {
          setFetching(false);
        }
      };
      fetchEventDetails();
    }
  }, [mode, id, navigate, user]);

  const uploadImage = async (file: File, type: "banner" | "poster") => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        if (type === "banner") setUploadingBanner(true);
        else setUploadingPoster(true);

        const img = new Image();
        img.src = reader.result as string;
        img.onload = async () => {
          const canvas = document.createElement("canvas");
          const maxWidth = 800;
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
            dataUrl = canvas.toDataURL("image/jpeg", 0.72);
          }

          const res = await axios.post("/api/upload", {
            name: file.name,
            type: "image/jpeg",
            data: dataUrl
          });

          if (res.data && res.data.url) {
            if (type === "banner") {
              setBanner(res.data.url);
              toast.success("Event banner uploaded and saved!");
            } else {
              setPoster(res.data.url);
              toast.success("Event poster uploaded and saved!");
            }
          } else {
            toast.error("Failed to upload image.");
          }
          setUploadingBanner(false);
          setUploadingPoster(false);
        };
        img.onerror = () => {
          toast.error("Could not process selected image. Please try another file.");
          setUploadingBanner(false);
          setUploadingPoster(false);
        };
      } catch (err) {
        toast.error("Failed to upload image. Please try again.");
        setUploadingBanner(false);
        setUploadingPoster(false);
      }
    };
    reader.onerror = () => {
      toast.error("Failed to read image file");
      setUploadingBanner(false);
      setUploadingPoster(false);
    };
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: "banner" | "poster") => {
    if (e.target.files && e.target.files[0]) {
      uploadImage(e.target.files[0], type);
    }
  };

  const handleDrag = (e: React.DragEvent, type: "banner" | "poster", active: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    if (type === "banner") setDragActiveBanner(active);
    else setDragActivePoster(active);
  };

  const handleDrop = (e: React.DragEvent, type: "banner" | "poster") => {
    e.preventDefault();
    e.stopPropagation();
    if (type === "banner") setDragActiveBanner(false);
    else setDragActivePoster(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadImage(e.dataTransfer.files[0], type);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploadingBanner || uploadingPoster) {
      toast.error("Please wait until image upload finishes");
      return;
    }
    let finalClubId = clubId;
    if (user && user.role === "club_admin") {
      finalClubId = user.clubId || user.assignedClubId || "";
    }

    if (!title || !finalClubId || !description || !venue || !date || !time) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setLoading(true);
      const hostClub = clubs.find(c => c.id === finalClubId);
      const clubName = hostClub ? hostClub.name : (user?.clubName || "Unknown Club");

      const formattedDate = formatToDDMMYY(date);
      const formattedDeadline = deadline ? formatToDDMMYY(deadline) : formattedDate;
      const isPast = isPastEvent(formattedDate, time);
      const computedStatus = status === "Cancelled"
        ? "Cancelled"
        : isPast
          ? "Completed"
          : "Upcoming";

      const payload = {
        title,
        clubId: finalClubId,
        clubName,
        category,
        description,
        banner: banner || "",
        poster,
        venue,
        date: formattedDate,
        time,
        maxParticipants: parseInt(maxParticipants) || 100,
        deadline: formattedDeadline,
        requirements,
        organizer: organizer || clubName,
        status: computedStatus,
        driveLink
      };

      if (mode === "add") {
        await axios.post("/api/events", payload);
        toast.success("Event created successfully! System notifications sent to all students.");
      } else {
        await axios.put(`/api/events/${id}`, payload);
        toast.success("Event details modified successfully!");
      }
      navigate("/events");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 rounded-xl border border-zinc-800 bg-[#121212] max-w-lg mx-auto text-center space-y-4 animate-in fade-in duration-200 mt-10">
        <div className="rounded-full bg-rose-500/10 p-3 text-rose-500 border border-rose-500/20">
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0-6V9m0-6a9 9 0 11-12 0 9 9 0 0112 0z" />
          </svg>
        </div>
        <h2 className="font-display text-xl font-bold text-white">Access Denied</h2>
        <p className="text-xs text-zinc-400 max-w-sm">
          You can only manage your own club's events.
        </p>
        <div className="pt-2">
          <Link
            to="/events"
            className="inline-flex items-center space-x-2 rounded-lg bg-zinc-900 border border-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-350 hover:bg-zinc-800 hover:text-zinc-200 transition-all"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Events</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Breadcrumb Header */}
      <div className="flex items-center justify-between border-b border-zinc-850 pb-5">
        <div className="flex items-center space-x-3">
          <Link
            to="/events"
            className="rounded-lg p-2 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
              {mode === "add" ? "Host New Event" : "Edit Event Details"}
              <Calendar className="h-5 w-5 text-emerald-400" />
            </h1>
            <p className="text-xs text-zinc-400">
              {mode === "add"
                ? "Schedule and announce a new campus gathering, hackathon, or cultural evening"
                : "Modify scheduled times, guidelines, or enrollment configurations"}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Main Form Elements */}
          <div className="md:col-span-2 space-y-5 bg-zinc-900/20 p-6 rounded-xl border border-zinc-800/80">
            <h2 className="text-sm font-semibold text-zinc-200">Event Specifications</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1.5">
                  Event Name / Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="E.g., Space Coding Hackathon 2026"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg bg-zinc-950 py-2.5 px-3 text-xs text-zinc-200 border border-zinc-850 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1.5">
                    Hosting Club / Organization <span className="text-rose-500">*</span>
                  </label>
                  {user?.role === "club_admin" ? (
                    <div className="w-full rounded-lg bg-zinc-950/60 py-2.5 px-3 text-xs text-zinc-400 border border-zinc-850 select-none">
                      {user.clubName || clubs.find(c => c.id === clubId)?.name || "Assigned Club"}
                    </div>
                  ) : (
                    <select
                      value={clubId}
                      onChange={(e) => setClubId(e.target.value)}
                      required
                      className="w-full rounded-lg bg-zinc-950 py-2.5 px-3 text-xs text-zinc-350 border border-zinc-850 focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="">Select hosting club...</option>
                      {clubs.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1.5">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-lg bg-zinc-950 py-2.5 px-3 text-xs text-zinc-350 border border-zinc-850 focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="Coding">Coding</option>
                    <option value="AI & ML">AI & ML</option>
                    <option value="Robotics">Robotics</option>
                    <option value="Culture">Culture</option>
                    <option value="Sports">Sports</option>
                    <option value="Science">Science</option>
                    <option value="Workshop">Workshop</option>
                    <option value="Gaming">Gaming</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1.5">
                  Description <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Detail the timeline, guest mentors, awards, schedules..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-lg bg-zinc-950 py-2.5 px-3 text-xs text-zinc-200 border border-zinc-850 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1.5">
                    Venue <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="E.g., Audi-A / Seminar Hall 2"
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    className="w-full rounded-lg bg-zinc-950 py-2.5 px-3 text-xs text-zinc-200 border border-zinc-850 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1.5">
                    Organizer / Host Team <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="E.g., ACM Technical Board"
                    value={organizer}
                    onChange={(e) => setOrganizer(e.target.value)}
                    className="w-full rounded-lg bg-zinc-950 py-2.5 px-3 text-xs text-zinc-200 border border-zinc-850 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1.5">
                    Date (DD/MM/YY) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="E.g., 15/10/26"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-lg bg-zinc-950 py-2.5 px-3 text-xs text-zinc-200 border border-zinc-850 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1.5">
                    Time <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="E.g., 03:00 PM - 06:00 PM"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full rounded-lg bg-zinc-950 py-2.5 px-3 text-xs text-zinc-200 border border-zinc-850 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1.5">Max Seat Capacity</label>
                  <input
                    type="number"
                    placeholder="100"
                    value={maxParticipants}
                    onChange={(e) => setMaxParticipants(e.target.value)}
                    className="w-full rounded-lg bg-zinc-950 py-2.5 px-3 text-xs text-zinc-200 border border-zinc-850 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1.5">Registration Deadline (DD/MM/YY)</label>
                  <input
                    type="text"
                    placeholder="E.g., 14/10/26"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full rounded-lg bg-zinc-950 py-2.5 px-3 text-xs text-zinc-200 border border-zinc-850 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1.5">Requirements / Prerequisites</label>
                <input
                  type="text"
                  placeholder="E.g., Laptop with VSCode, Basic JavaScript knowledge, GitHub repository"
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  className="w-full rounded-lg bg-zinc-950 py-2.5 px-3 text-xs text-zinc-200 border border-zinc-850 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1.5">Google Drive Photos Link (Optional)</label>
                <input
                  type="url"
                  placeholder="E.g., https://drive.google.com/drive/folders/..."
                  value={driveLink}
                  onChange={(e) => setDriveLink(e.target.value)}
                  className="w-full rounded-lg bg-zinc-950 py-2.5 px-3 text-xs text-zinc-200 border border-zinc-850 focus:border-emerald-500 focus:outline-none"
                />
                <p className="text-[10px] text-zinc-500 mt-1">If specified, students can view the photos album of the event from their dashboard.</p>
              </div>
            </div>
          </div>

          {/* Media & Image Upload Sidebar */}
          <div className="space-y-6">
            
            {/* Event Status Selector */}
            <div className="bg-zinc-900/20 p-5 rounded-xl border border-zinc-800/80 space-y-3">
              <h3 className="text-xs font-semibold text-zinc-200">Event Scheduling Status</h3>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full rounded-lg bg-zinc-950 py-2.5 px-3 text-xs text-zinc-300 border border-zinc-850 focus:border-emerald-500 focus:outline-none"
              >
                <option value="Upcoming">Upcoming (Active Enrollment)</option>
                <option value="Completed">Completed (Past Event)</option>
                <option value="Cancelled">Cancelled (Halted Event)</option>
              </select>
            </div>

            {/* Event Banner */}
            <div className="bg-zinc-900/20 p-5 rounded-xl border border-zinc-800/80 space-y-4">
              <h3 className="text-xs font-semibold text-zinc-200">Horizontal Event Banner</h3>
              
              <div 
                className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-4 transition-all ${
                  dragActiveBanner ? "border-emerald-500 bg-emerald-500/5" : "border-zinc-800 bg-zinc-950/40"
                }`}
                onDragOver={(e) => handleDrag(e, "banner", true)}
                onDragLeave={(e) => handleDrag(e, "banner", false)}
                onDrop={(e) => handleDrop(e, "banner")}
              >
                {banner ? (
                  <div className="text-center space-y-2 w-full">
                    <img src={banner} alt="Banner Preview" className="h-32 w-full object-cover rounded-lg border border-zinc-800" />
                    <p className="text-[10px] text-zinc-500">Banner saved</p>
                    <button 
                      type="button" 
                      onClick={() => setBanner("")} 
                      className="text-[10px] text-rose-400 font-semibold hover:underline"
                    >
                      Remove Banner
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center cursor-pointer text-center py-2">
                    <UploadCloud className="h-8 w-8 text-zinc-500 mb-1.5" />
                    <span className="text-[11px] text-zinc-300 font-medium">Click to upload or Drag & Drop</span>
                    <span className="text-[9px] text-zinc-500 mt-0.5">Horizontal ratio up to 10MB</span>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*" 
                      onChange={(e) => handleFileChange(e, "banner")} 
                    />
                  </label>
                )}

                {uploadingBanner && (
                  <div className="absolute inset-0 bg-zinc-950/80 flex items-center justify-center rounded-lg">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-500"></div>
                  </div>
                )}
              </div>
            </div>

            {/* Event Poster */}
            <div className="bg-zinc-900/20 p-5 rounded-xl border border-zinc-800/80 space-y-4">
              <h3 className="text-xs font-semibold text-zinc-200">Vertical Event Poster</h3>
              
              <div 
                className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-4 transition-all ${
                  dragActivePoster ? "border-emerald-500 bg-emerald-500/5" : "border-zinc-800 bg-zinc-950/40"
                }`}
                onDragOver={(e) => handleDrag(e, "poster", true)}
                onDragLeave={(e) => handleDrag(e, "poster", false)}
                onDrop={(e) => handleDrop(e, "poster")}
              >
                {poster ? (
                  <div className="text-center space-y-2">
                    <img src={poster} alt="Poster Preview" className="h-32 w-24 object-cover rounded-lg border border-zinc-800 mx-auto" />
                    <p className="text-[10px] text-zinc-500">Poster saved</p>
                    <button 
                      type="button" 
                      onClick={() => setPoster("")} 
                      className="text-[10px] text-rose-400 font-semibold hover:underline"
                    >
                      Remove Poster
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center cursor-pointer text-center py-2">
                    <UploadCloud className="h-8 w-8 text-zinc-500 mb-1.5" />
                    <span className="text-[11px] text-zinc-300 font-medium">Click to upload or Drag & Drop</span>
                    <span className="text-[9px] text-zinc-500 mt-0.5">Vertical ratio up to 10MB</span>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*" 
                      onChange={(e) => handleFileChange(e, "poster")} 
                    />
                  </label>
                )}

                {uploadingPoster && (
                  <div className="absolute inset-0 bg-zinc-950/80 flex items-center justify-center rounded-lg">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-500"></div>
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>

        {/* Submit Action Strip */}
        <div className="flex justify-end items-center gap-3 border-t border-zinc-900 pt-5">
          <Link
            to="/events"
            className="rounded-lg px-4 py-2 text-xs font-semibold text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 border border-transparent transition-all"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center space-x-1.5 rounded-lg bg-emerald-600 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-600/10 disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            <span>{loading ? "Scheduling Gatherings..." : mode === "add" ? "Publish Event" : "Apply Changes"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
