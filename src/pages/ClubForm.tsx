import React, { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, UploadCloud, Save, Sparkles, AlertCircle } from "lucide-react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { Club } from "../types";

interface ClubFormProps {
  mode: "add" | "edit";
}

export default function ClubForm({ mode }: ClubFormProps) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(mode === "edit");

  // Form Fields State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [logo, setLogo] = useState("");
  const [banner, setBanner] = useState("");
  const [category, setCategory] = useState("Coding");
  const [facultyCoordinator, setFacultyCoordinator] = useState("");
  const [studentCoordinator, setStudentCoordinator] = useState("");
  const [department, setDepartment] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [instagram, setInstagram] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState("Active");

  // Drag-and-drop upload state
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [dragActiveLogo, setDragActiveLogo] = useState(false);
  const [dragActiveBanner, setDragActiveBanner] = useState(false);

  useEffect(() => {
    if (mode === "edit" && id) {
      const fetchClubDetails = async () => {
        try {
          const res = await axios.get("/api/clubs");
          const found = res.data.find((c: Club) => c.id === id);
          if (found) {
            setName(found.name || "");
            setDescription(found.description || "");
            setLogo(found.logo || "");
            setBanner(found.banner || "");
            setCategory(found.category || "Coding");
            setFacultyCoordinator(found.facultyCoordinator || "");
            setStudentCoordinator(found.studentCoordinator || "");
            setDepartment(found.department || "");
            setEmail(found.email || "");
            setPhone(found.phone || "");
            setInstagram(found.instagram || "");
            setLinkedin(found.linkedin || "");
            setWebsite(found.website || "");
            setStatus(found.status || "Active");
          } else {
            toast.error("Club not found");
            navigate("/clubs");
          }
        } catch (err) {
          toast.error("Failed to fetch club details");
        } finally {
          setFetching(false);
        }
      };
      fetchClubDetails();
    }
  }, [mode, id, navigate]);

  // Handle image upload through base64 endpoint
  const uploadImage = async (file: File, type: "logo" | "banner") => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        if (type === "logo") setUploadingLogo(true);
        else setUploadingBanner(true);

        const res = await axios.post("/api/upload", {
          name: file.name,
          type: file.type,
          data: reader.result as string
        });

        if (type === "logo") {
          setLogo(res.data.url);
          toast.success("Logo uploaded and saved successfully!");
        } else {
          setBanner(res.data.url);
          toast.success("Banner uploaded and saved successfully!");
        }
      } catch (err) {
        toast.error("Failed to upload image. Please try again.");
      } finally {
        setUploadingLogo(false);
        setUploadingBanner(false);
      }
    };
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: "logo" | "banner") => {
    if (e.target.files && e.target.files[0]) {
      uploadImage(e.target.files[0], type);
    }
  };

  const handleDrag = (e: React.DragEvent, type: "logo" | "banner", active: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    if (type === "logo") setDragActiveLogo(active);
    else setDragActiveBanner(active);
  };

  const handleDrop = (e: React.DragEvent, type: "logo" | "banner") => {
    e.preventDefault();
    e.stopPropagation();
    if (type === "logo") setDragActiveLogo(false);
    else setDragActiveBanner(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadImage(e.dataTransfer.files[0], type);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !description) {
      toast.error("Please fill out all required fields");
      return;
    }

    try {
      setLoading(true);
      const payload = {
        name,
        description,
        logo: logo || "🔥",
        banner,
        category,
        facultyCoordinator,
        studentCoordinator,
        department,
        email,
        phone,
        instagram,
        linkedin,
        website,
        status
      };

      if (mode === "add") {
        await axios.post("/api/clubs", payload);
        toast.success("Club created successfully!");
      } else {
        await axios.put(`/api/clubs/${id}`, payload);
        toast.success("Club updated successfully!");
      }
      navigate("/clubs");
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

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Breadcrumb Header */}
      <div className="flex items-center justify-between border-b border-zinc-850 pb-5">
        <div className="flex items-center space-x-3">
          <Link
            to="/clubs"
            className="rounded-lg p-2 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
              {mode === "add" ? "Register New Club" : "Edit Club Registry"}
              <Sparkles className="h-5 w-5 text-emerald-400" />
            </h1>
            <p className="text-xs text-zinc-400">
              {mode === "add"
                ? "Manually establish a certified college student chapter"
                : "Modify official college organization details"}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Main info block */}
          <div className="md:col-span-2 space-y-5 bg-zinc-900/20 p-6 rounded-xl border border-zinc-800/80">
            <h2 className="text-sm font-semibold text-zinc-200">Organization Profile Details</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1.5">
                  Club Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="E.g., Association for Computing Machinery"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg bg-zinc-950 py-2.5 px-3 text-xs text-zinc-200 border border-zinc-850 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1.5">
                  Description <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Official purpose, key events calendar, student engagement..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-lg bg-zinc-950 py-2.5 px-3 text-xs text-zinc-200 border border-zinc-850 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1.5">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-lg bg-zinc-950 py-2.5 px-3 text-xs text-zinc-300 border border-zinc-850 focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="Coding">Coding & Development</option>
                    <option value="AI & ML">Artificial Intelligence & ML</option>
                    <option value="Robotics">Robotics & IoT</option>
                    <option value="Culture">Art & Culture</option>
                    <option value="Sports">Sports & Fitness</option>
                    <option value="Science">Science & Tech</option>
                    <option value="Creative">Creative Writing & Debate</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1.5">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full rounded-lg bg-zinc-950 py-2.5 px-3 text-xs text-zinc-300 border border-zinc-850 focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="Active">Active</option>
                    <option value="Suspended">Suspended</option>
                    <option value="On Probation">On Probation</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1.5">Faculty Coordinator</label>
                  <input
                    type="text"
                    placeholder="Prof. Jane Doe"
                    value={facultyCoordinator}
                    onChange={(e) => setFacultyCoordinator(e.target.value)}
                    className="w-full rounded-lg bg-zinc-950 py-2.5 px-3 text-xs text-zinc-200 border border-zinc-850 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1.5">Student President / Lead</label>
                  <input
                    type="text"
                    placeholder="John Smith"
                    value={studentCoordinator}
                    onChange={(e) => setStudentCoordinator(e.target.value)}
                    className="w-full rounded-lg bg-zinc-950 py-2.5 px-3 text-xs text-zinc-200 border border-zinc-850 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1.5">Primary Department</label>
                  <input
                    type="text"
                    placeholder="Computer Science & Eng"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full rounded-lg bg-zinc-950 py-2.5 px-3 text-xs text-zinc-200 border border-zinc-850 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1.5">Official Website URL</label>
                  <input
                    type="url"
                    placeholder="https://acm.college.edu"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className="w-full rounded-lg bg-zinc-950 py-2.5 px-3 text-xs text-zinc-200 border border-zinc-850 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar file upload block */}
          <div className="space-y-6">
            
            {/* Logo upload */}
            <div className="bg-zinc-900/20 p-5 rounded-xl border border-zinc-800/80 space-y-4">
              <h3 className="text-xs font-semibold text-zinc-200">Club Branding Logo</h3>
              
              <div 
                className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-4 transition-all ${
                  dragActiveLogo ? "border-emerald-500 bg-emerald-500/5" : "border-zinc-800 bg-zinc-950/40"
                }`}
                onDragOver={(e) => handleDrag(e, "logo", true)}
                onDragLeave={(e) => handleDrag(e, "logo", false)}
                onDrop={(e) => handleDrop(e, "logo")}
              >
                {logo ? (
                  <div className="text-center space-y-2">
                    <img src={logo} alt="Logo Preview" className="h-16 w-16 object-contain rounded-lg mx-auto bg-zinc-900 p-1 border border-zinc-800" />
                    <p className="text-[10px] text-zinc-500">Logo saved</p>
                    <button 
                      type="button" 
                      onClick={() => setLogo("")} 
                      className="text-[10px] text-rose-400 font-semibold hover:underline"
                    >
                      Remove Logo
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center cursor-pointer text-center py-2">
                    <UploadCloud className="h-8 w-8 text-zinc-500 mb-1.5" />
                    <span className="text-[11px] text-zinc-300 font-medium">Click to upload or Drag & Drop</span>
                    <span className="text-[9px] text-zinc-500 mt-0.5">PNG, JPG up to 5MB</span>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*" 
                      onChange={(e) => handleFileChange(e, "logo")} 
                    />
                  </label>
                )}

                {uploadingLogo && (
                  <div className="absolute inset-0 bg-zinc-950/80 flex items-center justify-center rounded-lg">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-500"></div>
                  </div>
                )}
              </div>
            </div>

            {/* Banner upload */}
            <div className="bg-zinc-900/20 p-5 rounded-xl border border-zinc-800/80 space-y-4">
              <h3 className="text-xs font-semibold text-zinc-200">Hero Banner Background</h3>
              
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
                    <img src={banner} alt="Banner Preview" className="h-16 w-full object-cover rounded-lg border border-zinc-800" />
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
                    <span className="text-[9px] text-zinc-500 mt-0.5">PNG, JPG up to 10MB</span>
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

            {/* Socials & Contact Info */}
            <div className="bg-zinc-900/20 p-5 rounded-xl border border-zinc-800/80 space-y-4">
              <h3 className="text-xs font-semibold text-zinc-200">Contact & Social Channels</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">Official Email</label>
                  <input
                    type="email"
                    placeholder="acm@college.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value.toLowerCase())}
                    className="w-full rounded-lg bg-zinc-950 py-2 px-2.5 text-xs text-zinc-200 border border-zinc-850 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">Official Phone</label>
                  <input
                    type="tel"
                    placeholder="+1 (555) 019-2834"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-lg bg-zinc-950 py-2 px-2.5 text-xs text-zinc-200 border border-zinc-850 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">Instagram Username</label>
                  <input
                    type="text"
                    placeholder="acm_chapter"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    className="w-full rounded-lg bg-zinc-950 py-2 px-2.5 text-xs text-zinc-200 border border-zinc-850 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">LinkedIn Page Name</label>
                  <input
                    type="text"
                    placeholder="acm-college-chapter"
                    value={linkedin}
                    onChange={(e) => setLinkedin(e.target.value)}
                    className="w-full rounded-lg bg-zinc-950 py-2 px-2.5 text-xs text-zinc-200 border border-zinc-850 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Submit action strip */}
        <div className="flex justify-end items-center gap-3 border-t border-zinc-900 pt-5">
          <Link
            to="/clubs"
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
            <span>{loading ? "Saving Organization..." : mode === "add" ? "Publish Club" : "Apply Changes"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
