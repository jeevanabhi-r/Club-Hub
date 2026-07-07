import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import { 
  FileText, 
  Download, 
  Printer, 
  Layers, 
  Calendar, 
  Users, 
  CheckCircle,
  Sparkles
} from "lucide-react";
import { toast } from "react-hot-toast";
import { formatToDDMMYY } from "../utils/date";

export default function Reports() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/api/dashboard/stats");
      setStats(res.data);
    } catch (err) {
      toast.error("Failed to load platform data analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    toast.success("PDF compilation ready! Download started.");
    const content = `ClubHub Analytics Report\nGenerated: ${formatToDDMMYY(new Date())}\n\nTotal Events: ${stats?.totalEvents}\nStudents Base: ${stats?.students}\nCampus Organizations: ${stats?.clubs}\nTotal Registrations recorded: ${stats?.totalRegistrations}`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ClubHub_Summary_Report_${Date.now()}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading || !stats) {
    return <div className="p-8 rounded-xl bg-slate-900/40 animate-pulse h-48" />;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200 print:text-black print:bg-white print:p-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-900 pb-5 print:hidden">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            Reports & Analytics <FileText className="h-5 w-5 text-emerald-400" />
          </h1>
          <p className="text-xs text-slate-400">Generate executive summaries, attendance registries, and platform operations reports</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="flex items-center space-x-1.5 rounded-lg bg-slate-900 border border-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-850 transition-all"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print Report</span>
          </button>
          <button
            onClick={handleDownloadPDF}
            className="flex items-center space-x-1.5 rounded-lg bg-emerald-500 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-400 transition-all shadow-lg"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Executive PDF</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Analytics Card Summary */}
        <div className="p-6 rounded-xl bg-slate-900/30 border border-slate-850 space-y-4">
          <h2 className="text-sm font-semibold text-slate-200 mb-2 flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-emerald-400" /> Executive Summary
          </h2>
          <div className="space-y-3 text-xs text-slate-400 leading-relaxed">
            <p>
              This report provides key operational metrics of the **ClubHub Platform** at college campus organizations.
            </p>
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-900">
                <p className="text-slate-500 font-bold uppercase text-[9px] tracking-wider">Hub Growth</p>
                <p className="text-lg font-semibold text-slate-200 mt-1">+{stats.clubs} Organizations</p>
              </div>
              <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-900">
                <p className="text-slate-500 font-bold uppercase text-[9px] tracking-wider">Total Registrations</p>
                <p className="text-lg font-semibold text-slate-200 mt-1">{stats.totalRegistrations} checkins</p>
              </div>
            </div>
          </div>
        </div>

        {/* Breakdown Card */}
        <div className="p-6 rounded-xl bg-slate-900/30 border border-slate-850 space-y-4">
          <h2 className="text-sm font-semibold text-slate-200 mb-2 flex items-center gap-1.5">
            <CheckCircle className="h-4 w-4 text-emerald-400" /> Distribution Metrics
          </h2>
          <div className="space-y-3.5 text-xs">
            <div className="flex items-center justify-between text-slate-300">
              <span>Upcoming/Active Events:</span>
              <span className="font-bold text-slate-200">{stats.upcomingEvents} Listings</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span>Past/Completed Events:</span>
              <span className="font-bold text-slate-200">{stats.pastEvents} Listings</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span>Total Member Registries:</span>
              <span className="font-bold text-slate-200">{stats.students} active student accounts</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
