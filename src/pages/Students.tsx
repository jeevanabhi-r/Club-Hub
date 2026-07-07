import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import { 
  Users, 
  Search, 
  Check, 
  X, 
  Download, 
  QrCode,
  UserCheck,
  Building,
  Mail,
  GraduationCap
} from "lucide-react";
import { Registration, User } from "../types";
import { toast } from "react-hot-toast";

export default function Students() {
  const { user } = useAuth();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const [activeRegQr, setActiveRegQr] = useState<Registration | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const regsRes = await axios.get("/api/registrations");
      setRegistrations(regsRes.data);
    } catch (err) {
      console.error("Failed to fetch registrations lists", err);
      toast.error("Failed to load records list");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  // Approve/Reject Registration
  const handleUpdateStatus = async (regId: string, status: "Approved" | "Rejected") => {
    try {
      await axios.put(`/api/registrations/${regId}/status`, { status });
      toast.success(`Registration marked as ${status}`);
      setRegistrations(prev => prev.map(r => r.id === regId ? { ...r, status } : r));
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  // Toggle QR Attendance
  const handleToggleAttendance = async (regId: string) => {
    try {
      const res = await axios.post(`/api/registrations/${regId}/attendance`);
      toast.success(res.data.message);
      setRegistrations(prev => prev.map(r => r.id === regId ? { ...r, attendanceMarked: !r.attendanceMarked } : r));
    } catch (err) {
      toast.error("Failed to register attendance scan");
    }
  };

  // Export Roster to CSV
  const handleExportCSV = () => {
    const rows = [
      ["Student Name", "Email", "Department", "Roll Number", "Event Title", "Registration Status", "Attendance Marked"],
      ...registrations.map(r => [
        r.studentName,
        r.studentEmail,
        r.studentDepartment,
        r.studentRollNumber,
        r.eventTitle,
        r.status,
        r.attendanceMarked ? "Yes" : "No"
      ])
    ];

    const csvContent = "data:text/csv;charset=utf-8," 
      + rows.map(e => e.map(val => `"${val}"`).join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${user?.role}_roster_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Roster downloaded successfully as CSV!");
  };

  const filteredRegistrations = registrations.filter(r => 
    r.studentName.toLowerCase().includes(query.toLowerCase()) ||
    r.eventTitle.toLowerCase().includes(query.toLowerCase()) ||
    r.studentRollNumber.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-900 pb-5">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            Rosters & Check-ins <Users className="h-5 w-5 text-emerald-400" />
          </h1>
          <p className="text-xs text-slate-400">
            Approve event attendees, track checklists, and mark QR Code attendance scan
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center space-x-1.5 rounded-lg bg-slate-900 border border-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-850 transition-all shadow-lg"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Export Roster CSV</span>
        </button>
      </div>

      {/* Filter strip */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/20 p-4 rounded-xl border border-slate-800/60">
        <div className="relative flex-1 max-w-sm">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-4 w-4 text-slate-500" />
          </div>
          <input
            type="text"
            placeholder="Search registered students or events..."
            className="w-full rounded-lg bg-slate-950/60 py-1.5 pl-9 pr-3 text-xs text-slate-200 placeholder-slate-600 border border-slate-800 focus:border-emerald-500 focus:outline-none"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Database listings or Event roster mappings depending on roles */}
      {loading ? (
        <div className="p-8 rounded-xl bg-slate-900/40 border border-slate-800 animate-pulse h-48" />
      ) : (
        // Club Admin/Representative: active participant registrations list
        <div className="overflow-x-auto rounded-xl border border-slate-850 bg-slate-900/10">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-850">
                <th className="p-4">Student</th>
                <th className="p-4">Event Requested</th>
                <th className="p-4">Roll/Dept</th>
                <th className="p-4">Attendance Check</th>
                <th className="p-4">Registration Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850 text-slate-300">
              {filteredRegistrations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    No active rosters found matching parameters
                  </td>
                </tr>
              ) : (
                filteredRegistrations.map(reg => (
                  <tr key={reg.id} className="hover:bg-slate-900/20 transition-all">
                    <td className="p-4">
                      <div>
                        <p className="font-semibold text-slate-200">{reg.studentName}</p>
                        <p className="text-[10px] text-slate-500">{reg.studentEmail}</p>
                      </div>
                    </td>
                    <td className="p-4 font-semibold text-slate-200">{reg.eventTitle}</td>
                    <td className="p-4">
                      <p className="text-slate-300">{reg.studentDepartment}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{reg.studentRollNumber}</p>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleAttendance(reg.id)}
                          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-all ${
                            reg.attendanceMarked
                              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                              : "bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          <UserCheck className="h-3.5 w-3.5" />
                          <span>{reg.attendanceMarked ? "Checked-in" : "Mark Present"}</span>
                        </button>
                        
                        <button
                          onClick={() => setActiveRegQr(reg)}
                          className="p-1.5 rounded-lg bg-slate-950 border border-slate-850 hover:bg-slate-900 text-slate-400 hover:text-slate-200 transition-all"
                          title="Generate QR Attendance Ticket"
                        >
                          <QrCode className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold capitalize ${
                        reg.status === "Approved" 
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                          : reg.status === "Rejected"
                          ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}>
                        {reg.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}


      {/* --- QR CODE ATTENDANCE TICKET MODAL --- */}
      {activeRegQr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl animate-in fade-in zoom-in duration-200 text-center">
            <div className="flex justify-between items-center border-b border-slate-900 pb-3 mb-4">
              <h3 className="font-display font-semibold text-slate-200 text-xs">QR Attendance Pass</h3>
              <button onClick={() => setActiveRegQr(null)} className="text-slate-500 hover:text-slate-200 text-xs">
                Close
              </button>
            </div>

            <div className="p-5 bg-white rounded-xl inline-block mb-4 shadow-inner">
              {/* Perfect simulated QR block */}
              <div className="h-40 w-40 bg-slate-950 rounded border-4 border-slate-950 flex flex-wrap p-1">
                {[...Array(16)].map((_, i) => (
                  <div 
                    key={i} 
                    className={`h-10 w-10 border border-white ${
                      (i % 3 === 0 || i % 5 === 1) ? "bg-slate-950" : "bg-white"
                    }`} 
                  />
                ))}
              </div>
            </div>

            <h4 className="font-semibold text-slate-200 text-sm">{activeRegQr.studentName}</h4>
            <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-wider">{activeRegQr.eventTitle}</p>
            <p className="text-[10px] text-slate-500 font-mono mt-1">Roll No: {activeRegQr.studentRollNumber}</p>
            
            <div className="border-t border-slate-900 pt-4 mt-5">
              <button
                onClick={() => {
                  handleToggleAttendance(activeRegQr.id);
                  setActiveRegQr(null);
                }}
                className="w-full rounded-lg bg-emerald-500 py-2 text-xs font-semibold text-white hover:bg-emerald-400 transition-all"
              >
                Scan Ticket (Mark Present)
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
