import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import { 
  Users, 
  Search, 
  RefreshCw, 
  UserCheck, 
  AlertCircle, 
  Shield, 
  GraduationCap,
  Sparkles,
  Info,
  Trash2
} from "lucide-react";
import { User } from "../types";
import { toast } from "react-hot-toast";
import { doc, onSnapshot, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export default function RoleManagement() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [clubs, setClubs] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  // Delete User Confirmation Modal States
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Handle exporting users to Excel
  const handleDownloadUsers = async () => {
    setIsExporting(true);
    try {
      let firestoreUsers: User[] = [];
      let firestoreClubs: any[] = [];

      try {
        const docRef = doc(db, "system_data", "database");
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
          const data = snapshot.data();
          firestoreUsers = data?.users || [];
          firestoreClubs = data?.clubs || [];
        }
      } catch (err) {
        console.warn("Direct Firestore read failed or denied, using API / state fallback:", err);
      }

      // Fallback to local state if Firestore read didn't return users
      if (!firestoreUsers || firestoreUsers.length === 0) {
        if (users && users.length > 0) {
          firestoreUsers = users;
          firestoreClubs = clubs;
        } else {
          // fetch via API as final fallback
          const [usersRes, clubsRes] = await Promise.all([
            axios.get("/api/admin/users"),
            axios.get("/api/clubs")
          ]);
          firestoreUsers = usersRes.data || [];
          firestoreClubs = clubsRes.data || [];
        }
      }

      if (!firestoreUsers || firestoreUsers.length === 0) {
        toast.error("No users available to export.");
        setIsExporting(false);
        return;
      }

      const today = new Date().toISOString().split("T")[0];
      const filename = `ClubHub_Users_${today}.xlsx`;

      const worksheetData = firestoreUsers.map((u, idx) => {
        let regDateStr = "—";
        if (u.id && u.id.startsWith("usr_")) {
          const ts = parseInt(u.id.replace("usr_", ""));
          if (!isNaN(ts)) {
            regDateStr = new Date(ts).toISOString().split("T")[0];
          }
        }
        
        // Resolve club name
        const clubName = u.role === "club_admin" 
          ? (firestoreClubs.find(c => c.id === (u.clubId || u.assignedClubId))?.name || u.clubName || u.assignedClubName || "—")
          : "—";

        // Resolve role label
        const roleLabel = u.role === "super_admin" 
          ? "Super Admin" 
          : u.role === "club_admin" 
            ? "Club Admin" 
            : "Student";

        // Resolve status label
        const statusLabel = u.role === "club_admin" 
          ? (u.approved ? "Approved" : "Pending") 
          : "Active";

        return {
          "S.No": idx,
          "User ID": u.id || "—",
          "Full Name": u.name || "—",
          "Email": u.email || "—",
          "Password": (u as any).password || "—",
          "Role": roleLabel,
          "Club": clubName,
          "Department": u.department || "—",
          "Phone Number": u.phone || "—",
          "Registration Date": regDateStr,
          "Status": statusLabel
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(worksheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Users");

      // Auto-fit column widths
      const maxLengths = {
        "S.No": 8,
        "User ID": 20,
        "Full Name": 25,
        "Email": 30,
        "Password": 15,
        "Role": 15,
        "Club": 25,
        "Department": 20,
        "Phone Number": 15,
        "Registration Date": 18,
        "Status": 12
      };

      const wscols = Object.keys(maxLengths).map((key) => ({
        wch: Math.max(
          key.length,
          ...worksheetData.map(row => String(row[key as keyof typeof row] || "").length)
        ) + 2
      }));
      worksheet["!cols"] = wscols;

      const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      const dataBlob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8" });
      saveAs(dataBlob, filename);

      toast.success("Users exported successfully.");
    } catch (err: any) {
      console.error("Failed to export users:", err);
      toast.error("Failed to export users.");
    } finally {
      setIsExporting(false);
    }
  };

  // Manual fallback fetch (in case Firestore has local sync delays or permission limits)
  const fetchUsersFallback = async () => {
    try {
      setLoading(true);
      const [usersRes, clubsRes] = await Promise.all([
        axios.get("/api/admin/users"),
        axios.get("/api/clubs")
      ]);
      setUsers(usersRes.data);
      setClubs(clubsRes.data || []);
    } catch (err: any) {
      console.error("Failed to fetch user directory via fallback API:", err);
      toast.error("Failed to load user directory.");
    } finally {
      setLoading(false);
    }
  };

  // Setup Firestore real-time snapshot listener
  useEffect(() => {
    if (!user || user.role !== "super_admin") return;

    // Load initial directory immediately from backend to prevent offline/unreachable hang
    fetchUsersFallback();

    const docRef = doc(db, "system_data", "database");
    
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.users) {
          setUsers(data.users);
        }
        if (data.clubs) {
          setClubs(data.clubs || []);
        }
      }
    }, (error) => {
      console.warn("[RoleManagement] Firestore realtime listener warning (likely offline/unreachable):", error);
    });

    return () => unsubscribe();
  }, [user?.role]);

  // Handle updating user role
  const handleUpdateRole = async (targetUserId: string, newRole: "super_admin" | "club_admin" | "student", clubId?: string) => {
    if (targetUserId === user?.id) {
      toast.error("You cannot demote yourself to prevent losing system access!");
      return;
    }

    try {
      setUpdatingUserId(targetUserId);
      const res = await axios.put(`/api/admin/users/${targetUserId}/role`, { role: newRole, clubId });
      
      if (res.data.success) {
        toast.success("User role updated successfully!");
        // State is updated automatically by Firestore onSnapshot, but update local state just in case of latency
        setUsers(prev => prev.map(u => u.id === targetUserId ? { ...u, role: newRole, clubId: clubId || "" } : u));
      }
    } catch (err: any) {
      console.error("Failed to update user role:", err);
      const displayError = err.response?.data?.error || "Failed to update role.";
      toast.error(displayError);
    } finally {
      setUpdatingUserId(null);
    }
  };

  // Handle deleting user
  const handleDeleteUser = async (targetUserId: string) => {
    try {
      setDeletingUserId(targetUserId);
      await axios.delete(`/api/admin/users/${targetUserId}`);
      toast.success("User deleted successfully!");
      // State is updated automatically by Firestore onSnapshot, but update local state just in case of latency
      setUsers(prev => prev.filter(u => u.id !== targetUserId));
      setUserToDelete(null);
    } catch (err: any) {
      console.error("Failed to delete user:", err);
      const displayError = err.response?.data?.error || "Failed to delete user.";
      toast.error(displayError);
    } finally {
      setDeletingUserId(null);
    }
  };

  // Security Guard: Only Super Admin
  if (!user || user.role !== "super_admin") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 bg-zinc-900/30 rounded-xl border border-zinc-900 max-w-lg mx-auto">
        <AlertCircle className="h-12 w-12 text-rose-500 mb-4 animate-bounce" />
        <h3 className="text-lg font-bold text-white mb-2">Access Restricted</h3>
        <p className="text-xs text-zinc-400">
          Only the Super Admin is authorized to access the system Role Management directory.
        </p>
      </div>
    );
  }

  // Get active approved clubs
  const approvedClubs = clubs.filter(c => c.approved);

  // Helper to resolve dropdown and filter selection values
  const getSelectValue = (user: User) => {
    if (user.role === "super_admin") return "super_admin";
    if (user.role === "club_admin" && user.clubId) return `club_admin_${user.clubId}`;
    return "student";
  };

  // Handle dropdown selection action
  const handleDropdownChange = (userId: string, value: string) => {
    if (value === "super_admin") {
      handleUpdateRole(userId, "super_admin");
    } else if (value === "student") {
      handleUpdateRole(userId, "student");
    } else if (value.startsWith("club_admin_")) {
      const clubId = value.replace("club_admin_", "");
      handleUpdateRole(userId, "club_admin", clubId);
    }
  };

  // Filtering users
  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.rollNumber && u.rollNumber.toLowerCase().includes(searchQuery.toLowerCase()));
      
    let matchesRole = true;
    if (roleFilter !== "all") {
      if (roleFilter === "super_admin") {
        matchesRole = u.role === "super_admin";
      } else if (roleFilter === "student") {
        matchesRole = u.role === "student";
      } else if (roleFilter.startsWith("club_admin_")) {
        const targetClubId = roleFilter.replace("club_admin_", "");
        matchesRole = u.role === "club_admin" && u.clubId === targetClubId;
      }
    }

    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-200">
      
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-5">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            Role Management <UserCheck className="h-5 w-5 text-[#f26522]" />
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Manage system permissions, elevate student coordinators to club-specific admins, or grant platform-wide Super Admin access.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {user?.role === "super_admin" && (
            <button
              onClick={handleDownloadUsers}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold text-white bg-[#f26522] hover:bg-[#d94f12] active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              {isExporting ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Exporting...</span>
                </>
              ) : (
                <span>📥 Download Users</span>
              )}
            </button>
          )}

          <button
            onClick={fetchUsersFallback}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-850 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Directory</span>
          </button>
        </div>
      </div>

      {/* Info Notice Banner */}
      <div className="bg-orange-500/5 border border-orange-500/10 rounded-xl p-4 flex gap-3 text-xs text-zinc-400 leading-normal">
        <Info className="h-4.5 w-4.5 text-[#f26522] shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-zinc-200">Administrative Safeguards Active:</span> Changing a user's role immediately grants them matching database and workspace authorization. The logged-in administrator is protected from self-deletion.
        </div>
      </div>

      {/* Filter strip */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900/20 p-4 rounded-xl border border-zinc-900/60">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 pointer-events-none z-10" />
          <input
            type="text"
            placeholder="Search users by name, email, or roll number..."
            className="search-input w-full rounded-[12px] bg-zinc-950/60 py-2.5 pl-14 pr-12 text-xs text-zinc-200 placeholder-zinc-500 border border-zinc-900 focus:border-[#f26522] focus:outline-none transition-all duration-200"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
              title="Clear search"
            >
              <span className="text-sm font-bold leading-none">×</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Role Filter:</span>
          <select
            className="rounded-lg bg-zinc-950/60 py-1.5 px-3 text-xs text-zinc-300 border border-zinc-900 focus:border-[#f26522] focus:outline-none transition-colors cursor-pointer"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">All Roles</option>
            <option value="student">Student</option>
            <option value="super_admin">Super Admin</option>
            {approvedClubs.map(club => (
              <option key={club.id} value={`club_admin_${club.id}`}>
                {club.name} Admin
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Directory Table/Cards */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-zinc-900/10 border border-zinc-900/40 rounded-xl space-y-3">
          <RefreshCw className="h-8 w-8 text-[#f26522] animate-spin" />
          <p className="text-xs text-zinc-500">Loading user permissions directory...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-zinc-900/10 border border-zinc-900/40 rounded-xl text-center p-6">
          <Users className="h-10 w-10 text-zinc-600 mb-2.5" />
          <p className="text-xs text-zinc-300 font-bold">No Users Found</p>
          <p className="text-[11px] text-zinc-500 max-w-sm mt-1">
            Try adjusting your query or filters. Ensure the correct student search terms are applied.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-900 bg-zinc-900/10">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-zinc-950 text-zinc-400 font-semibold border-b border-zinc-900">
                <th className="p-4 w-12 text-center">S.No</th>
                <th className="p-4">User</th>
                <th className="p-4">Email</th>
                <th className="p-4">Roll Number</th>
                <th className="p-4">Department</th>
                <th className="p-4">Current Role</th>
                <th className="p-4">Assigned Club</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {filteredUsers.map((u, index) => {
                const isSelf = u.id === user?.id;
                const isUpdating = updatingUserId === u.id;

                return (
                  <tr key={u.id} className={`hover:bg-zinc-900/20 transition-all ${isSelf ? 'bg-[#f26522]/5' : ''}`}>
                    
                    {/* S.No */}
                    <td className="p-4 text-center font-mono text-zinc-500 w-12 border-r border-zinc-900/40">
                      {index}
                    </td>
                    
                    {/* User Info block (Avatar and Name) */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {u.profilePic ? (
                          <img
                            src={u.profilePic}
                            alt={u.name}
                            className="h-8 w-8 rounded-full object-cover border border-zinc-800 shrink-0 bg-zinc-900"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700 flex items-center justify-center font-bold text-[10px] text-zinc-300 uppercase shrink-0">
                            {u.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                          </div>
                        )}
                        <span className="font-semibold text-zinc-100 flex items-center gap-1.5">
                          {u.name}
                          {isSelf && (
                            <span className="text-[9px] bg-[#f26522]/10 text-[#f26522] px-1.5 py-0.5 rounded font-extrabold uppercase tracking-wider">
                              You
                            </span>
                          )}
                        </span>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="p-4 text-zinc-400">
                      {u.email}
                    </td>

                    {/* Roll Number */}
                    <td className="p-4 text-zinc-400 font-mono uppercase">
                      {u.rollNumber || "—"}
                    </td>

                    {/* Department */}
                    <td className="p-4 text-zinc-350">
                      {u.department || "—"}
                    </td>

                    {/* Current Role (Display specifically styled badge) */}
                    <td className="p-4">
                      {u.role === "super_admin" ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-1 text-[10px] font-bold text-red-400 border border-red-500/10">
                          <Shield className="h-3 w-3" />
                          Super Admin
                        </span>
                      ) : u.role === "club_admin" ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f26522]/10 px-2.5 py-1 text-[10px] font-bold text-[#f26522] border border-[#f26522]/10">
                          <Sparkles className="h-3 w-3" />
                          {approvedClubs.find(c => c.id === u.clubId)?.name ? `${approvedClubs.find(c => c.id === u.clubId)?.name} Admin` : "Club Admin"}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2.5 py-1 text-[10px] font-bold text-blue-400 border border-blue-500/10">
                          <GraduationCap className="h-3 w-3" />
                          Student
                        </span>
                      )}
                    </td>

                    {/* Assigned Club */}
                    <td className="p-4 text-zinc-350 font-medium">
                      {u.role === "club_admin" ? (approvedClubs.find(c => c.id === u.clubId)?.name || "Unassigned Club") : "—"}
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        {isUpdating && (
                          <RefreshCw className="h-3.5 w-3.5 text-[#f26522] animate-spin" />
                        )}
                        <select
                          disabled={isSelf || isUpdating}
                          value={getSelectValue(u)}
                          onChange={(e) => handleDropdownChange(u.id, e.target.value)}
                          className="rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 px-2 py-1.5 focus:border-[#f26522] focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                        >
                          <option value="student">Student</option>
                          <option value="super_admin">Super Admin</option>
                          {approvedClubs.map(club => (
                            <option key={club.id} value={`club_admin_${club.id}`}>
                              {club.name} Admin
                            </option>
                          ))}
                        </select>

                        <button
                          onClick={() => !isSelf && setUserToDelete(u)}
                          disabled={isSelf}
                          title={isSelf ? "You cannot delete your own account." : "Delete user"}
                          className={`p-1.5 rounded-lg border transition-all ${
                            isSelf 
                              ? "bg-zinc-900 border-zinc-850 text-zinc-700 cursor-not-allowed" 
                              : "bg-red-500/10 border-red-500/15 text-red-400 hover:bg-red-500/20 hover:text-red-300 cursor-pointer"
                          }`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {userToDelete && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in">
          <div className="bg-zinc-950 border border-zinc-850 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-500/10 text-red-500 rounded-lg">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Delete User?</h3>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Are you sure you want to permanently delete <span className="text-zinc-200 font-semibold">{userToDelete.name}</span> ({userToDelete.email})? This action cannot be undone and will revoke all access.
                </p>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 text-xs">
              <button
                onClick={() => setUserToDelete(null)}
                disabled={deletingUserId !== null}
                className="px-3.5 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-850 cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteUser(userToDelete.id)}
                disabled={deletingUserId !== null}
                className="px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {deletingUserId ? (
                  <>
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete User</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
