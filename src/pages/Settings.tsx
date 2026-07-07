import { useState } from "react";
import { Settings as SettingsIcon, Sliders, Palette, Shield, Info, Sparkles } from "lucide-react";
import { toast } from "react-hot-toast";

export default function Settings() {
  const [appTheme, setAppTheme] = useState("dark");
  const [sessionPersist, setSessionPersist] = useState(true);
  const [notifSound, setNotifSound] = useState(false);

  const handleSave = () => {
    toast.success("System configurations successfully saved!");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="border-b border-slate-900 pb-5">
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
          System Preferences <SettingsIcon className="h-5 w-5 text-emerald-400" />
        </h1>
        <p className="text-xs text-slate-400">Configure visual themes, notification behaviors, and administrative toggles</p>
      </div>

      <div className="space-y-6 text-xs text-slate-300">
        
        {/* Appearance Block */}
        <div className="p-6 rounded-xl bg-slate-900/30 border border-slate-850 space-y-4">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5 mb-2">
            <Palette className="h-4 w-4 text-emerald-400" /> Visual Theme Settings
          </h3>
          <p className="text-[11px] text-slate-400 leading-normal">
            Select the interface color presets. Dark themed layouts reduce glare and power usage.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-1">
            <button
              onClick={() => {
                setAppTheme("dark");
                toast.success("Cosmic Dark preset applied!");
              }}
              className={`p-4 rounded-xl border text-left transition-all ${
                appTheme === "dark" 
                  ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400" 
                  : "bg-slate-950 border-slate-900 text-slate-400 hover:text-slate-200"
              }`}
            >
              <p className="font-bold">Cosmic Dark Theme</p>
              <p className="text-[10px] text-slate-500 mt-1">Sleek midnight black and emerald highlights.</p>
            </button>

            <button
              onClick={() => {
                setAppTheme("light");
                toast.error("Light theme preset is a premium feature!");
              }}
              className={`p-4 rounded-xl border text-left transition-all ${
                appTheme === "light" 
                  ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400" 
                  : "bg-slate-950 border-slate-900 text-slate-400 hover:text-slate-200"
              }`}
            >
              <p className="font-bold">Ice Light Theme</p>
              <p className="text-[10px] text-slate-500 mt-1">High-contrast bright design grids.</p>
            </button>
          </div>
        </div>

        {/* Configurations Toggles */}
        <div className="p-6 rounded-xl bg-slate-900/30 border border-slate-850 space-y-4">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5 mb-2">
            <Sliders className="h-4 w-4 text-emerald-400" /> Operation & Notifications
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-200">Remember Account (Session Persistence)</p>
                <p className="text-[10px] text-slate-500">Enable automatic secure login upon visiting the platform.</p>
              </div>
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-800 bg-slate-950/60 text-emerald-500 focus:ring-emerald-500"
                checked={sessionPersist}
                onChange={(e) => setSessionPersist(e.target.checked)}
              />
            </div>

            <div className="flex items-center justify-between border-t border-slate-900/40 pt-4">
              <div>
                <p className="font-semibold text-slate-200">Sound Alarms & Pop-ups</p>
                <p className="text-[10px] text-slate-500">Play standard bell alarm sounds upon getting registration notifications.</p>
              </div>
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-800 bg-slate-950/60 text-emerald-500 focus:ring-emerald-500"
                checked={notifSound}
                onChange={(e) => setNotifSound(e.target.checked)}
              />
            </div>
          </div>
        </div>

        {/* Security / About */}
        <div className="p-6 rounded-xl bg-slate-900/30 border border-slate-850 space-y-3">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <Shield className="h-4 w-4 text-emerald-400" /> Administrative Security
          </h3>
          <p className="text-[11px] text-slate-400 leading-normal">
            ClubHub is built utilizing safe JSON transmission protocols, local encryption layers, and full session protection systems. Report issues or account claims to student coordinator directories.
          </p>
        </div>

        {/* Submit */}
        <button
          onClick={handleSave}
          className="w-full rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 py-2.5 font-semibold text-white shadow-xl hover:from-emerald-400 hover:to-teal-500 transition-all"
        >
          Save Preferred Configurations
        </button>

      </div>

    </div>
  );
}
