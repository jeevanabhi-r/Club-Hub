import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { 
  ShieldAlert, 
  Layers, 
  Trash2, 
  ExternalLink,
  Users,
  Search,
  CheckCircle,
  Sparkles,
  Edit3,
  PlusCircle
} from "lucide-react";
import { Club } from "../types";
import { toast } from "react-hot-toast";
import { ConfirmModal } from "../components/ConfirmModal";
import { FormattedText } from "../components/FormattedText";

export default function Clubs() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const [deleteClubId, setDeleteClubId] = useState<string | null>(null);

  const fetchClubs = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/api/clubs");
      setClubs(res.data);
    } catch (err) {
      toast.error("Failed to fetch clubs directory");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClub = async (id: string) => {
    try {
      await axios.delete(`/api/clubs/${id}`);
      toast.success("Club permanently removed from directory");
      fetchClubs();
    } catch (err) {
      toast.error("Failed to delete club");
    }
  };

  useEffect(() => {
    fetchClubs();
  }, []);

  const categories = ["All", ...new Set(clubs.map(c => c.category))];

  const filteredClubs = clubs.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) || 
                          c.description.toLowerCase().includes(search.toLowerCase()) ||
                          c.category.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === "All" || c.category === selectedCategory;

    // Students only see approved clubs
    if (user?.role === "student") {
      return matchesSearch && matchesCategory && c.approved;
    }
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-zinc-900 pb-5">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
            Campus Organizations <Sparkles className="h-5 w-5 text-emerald-400" />
          </h1>
          <p className="text-xs text-zinc-400">Discover and join clubs hosting coding, robotics, theater, and sports activities</p>
        </div>
        {(user?.role === "club_admin" || user?.role === "super_admin") && (
          <Link
            to="/clubs/add"
            className="flex items-center space-x-1.5 rounded-lg bg-[#f26522] hover:bg-[#ea580c] px-3.5 py-2 text-xs font-bold text-white transition-all shadow-lg self-start md:self-auto cursor-pointer"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Add New Club</span>
          </Link>
        )}
      </div>

      {/* Filters Search Strip */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/20 p-4 rounded-xl border border-slate-800/60">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 pointer-events-none z-10" />
          <input
            type="text"
            placeholder="Search clubs by keyword..."
            className="search-input w-full rounded-lg bg-slate-950/60 py-2.5 pl-14 pr-12 text-xs text-slate-200 placeholder-slate-650 border border-slate-800 focus:border-emerald-500 focus:outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="rounded-lg bg-slate-950 py-1.5 px-3 text-xs text-slate-300 border border-slate-800 focus:outline-none"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          <option value="All">All Categories</option>
          {categories.filter(cat => cat !== "All").map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Clubs Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(n => (
            <div key={n} className="p-6 rounded-xl bg-slate-900/40 border border-slate-800 animate-pulse h-48" />
          ))}
        </div>
      ) : filteredClubs.length === 0 ? (
        <div className="text-center py-12 rounded-xl bg-slate-900/10 border border-dashed border-slate-800">
          <Layers className="h-10 w-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-300">No organizations found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClubs.map(club => (
            <div 
              key={club.id} 
              className="rounded-xl bg-slate-900/30 border border-slate-850 hover:border-slate-800 transition-all flex flex-col justify-between overflow-hidden"
            >
              {/* Club Cover Banner */}
              {club.banner && (
                <div className="relative h-28 w-full bg-zinc-950/60 border-b border-zinc-900 overflow-hidden shrink-0">
                  <img 
                    src={club.banner} 
                    alt={club.name}
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-3xl">{club.logo || "🌟"}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="px-2.5 py-0.5 rounded text-[9px] font-bold bg-slate-950 border border-slate-850 text-slate-400 capitalize">
                        {club.category}
                      </span>
                      {!club.approved && (
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          Pending Approval
                        </span>
                      )}
                    </div>
                  </div>
                  <h3 className="font-display font-semibold text-slate-200 text-sm leading-snug">
                    {club.name}
                  </h3>
                  <div className="text-xs text-slate-400 leading-relaxed mt-2 line-clamp-3">
                    <FormattedText text={club.description} />
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-zinc-900 pt-4 mt-2 text-[10px] text-zinc-400">
                  <div className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 text-emerald-500" />
                    <span>{club.memberCount || 1} members</span>
                  </div>
                  {(user?.role === "club_admin" || user?.role === "super_admin") && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => navigate(`/clubs/edit/${club.id}`)}
                        className="rounded-lg p-1.5 bg-[#2c2c2e] hover:bg-[#3a3a3c] text-zinc-300 transition-colors cursor-pointer"
                        title="Edit Club"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteClubId(club.id)}
                        className="rounded-lg p-1.5 bg-[#2c2c2e] hover:bg-[#3a3a3c] text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                        title="Delete Club"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteClubId}
        onClose={() => setDeleteClubId(null)}
        onConfirm={() => {
          if (deleteClubId) handleDeleteClub(deleteClubId);
        }}
        title="Delete Club?"
        description="Are you sure you want to delete this club? This will also purge all scheduled events and registered student participants for this club!"
        confirmText="Delete Club"
        type="danger"
      />

    </div>
  );
}
