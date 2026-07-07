import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useNavigate } from "react-router-dom";
import { BrandLogo } from "./BrandLogo";
import { 
  Search, 
  User as UserIcon, 
  LogOut, 
  Settings, 
  Moon, 
  Sun,
  X
} from "lucide-react";

interface NavbarProps {
  onSearch: (query: string) => void;
  searchQuery: string;
}

export default function Navbar({ onSearch, searchQuery }: NavbarProps) {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);

  // Click outside handlers
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav className="sticky top-0 z-40 flex h-20 w-full items-center justify-between px-4 md:px-6 border-b border-[#2A2A2A] bg-[#080808] backdrop-blur-md">
      {/* Brand Logo for Mobile (visible only on mobile) */}
      <div className="flex items-center md:hidden mr-4 shrink-0">
        <BrandLogo size="sm" />
      </div>

      {/* Search Bar */}
      <div className="relative flex-1 max-w-md">
        <div className="pointer-events-none absolute left-[14px] top-1/2 -translate-y-1/2 flex items-center">
          <Search className="h-4 w-4 text-[#7A7A7A]" />
        </div>
        <input
          type="text"
          placeholder="Search events, clubs, departments..."
          className="search-input w-full h-[48px] rounded-[14px] bg-[#151515] border border-[#2B2B2B] text-xs md:text-sm pl-[48px] pr-10 text-white placeholder-[#8A8A8A] focus:outline-none focus:border-[#FF6B00] focus:ring-2 focus:ring-[#FF6B00]/15 transition-all duration-200"
          value={searchQuery}
          onChange={(e) => onSearch(e.target.value)}
        />
        {searchQuery && (
          <button 
            onClick={() => onSearch("")} 
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-[#FF6B00] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Right Side Actions */}
      <div className="hidden md:flex items-center space-x-3 md:space-x-4 ml-4 shrink-0">
        {/* Theme Toggle (Aesthetics) */}
        <button 
          onClick={toggleTheme}
          className="flex h-[48px] w-[48px] items-center justify-center rounded-[14px] bg-[#151515] border border-[#2B2B2B] text-zinc-400 hover:text-white hover:border-[#FF6B00] focus:outline-none transition-all duration-200"
          title="Toggle Theme"
        >
          {isDarkMode ? <Moon className="h-4 w-4 text-[#FF6B00]" /> : <Sun className="h-4 w-4" />}
        </button>

        {/* User Profile Menu */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex h-[48px] items-center space-x-3 rounded-[14px] bg-[#151515] border border-[#2B2B2B] px-3 md:px-4 hover:border-[#FF6B00] focus:outline-none transition-all duration-200 text-left"
          >
            {user?.profilePic ? (
              <img
                src={user.profilePic}
                alt="Profile"
                className="h-7 w-7 rounded-full object-cover border border-[#2B2B2B] bg-[#111111]"
              />
            ) : (
              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-[#FF6B00] to-amber-500 border border-[#2B2B2B] flex items-center justify-center text-[10px] font-bold text-white uppercase shrink-0">
                {user?.name ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) : "??"}
              </div>
            )}
            <div className="hidden md:block">
              <p className="text-xs font-semibold text-zinc-200 leading-tight">{user?.name}</p>
              <p className="text-[9px] text-[#FF6B00] font-black uppercase mt-0.5 tracking-wider">
                {user?.role === "club_admin" ? "Admin" : "Student"}
              </p>
            </div>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-48 rounded-[14px] border border-[#2B2B2B] bg-[#141414] p-2 shadow-2xl ring-1 ring-zinc-800 animate-in fade-in slide-in-from-top-3 duration-200 z-50">
              <div className="px-3 py-2 border-b border-[#2A2A2A]">
                <p className="text-xs font-semibold text-zinc-200 truncate">{user?.name}</p>
                <p className="text-[10px] text-zinc-500 truncate">{user?.email}</p>
              </div>
              <div className="p-1 space-y-0.5">
                <button
                  onClick={() => {
                    navigate("/profile");
                    setShowProfileMenu(false);
                  }}
                  className="flex w-full items-center space-x-2 rounded-lg px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-900 transition-all text-left"
                >
                  <UserIcon className="h-3.5 w-3.5 text-zinc-400" />
                  <span>View Profile</span>
                </button>
                <button
                  onClick={() => {
                    navigate("/profile"); // Map both profile settings options together
                    setShowProfileMenu(false);
                  }}
                  className="flex w-full items-center space-x-2 rounded-lg px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-900 transition-all text-left"
                >
                  <Settings className="h-3.5 w-3.5 text-zinc-400" />
                  <span>Account Settings</span>
                </button>
                <button
                  onClick={() => {
                    logout();
                    setShowProfileMenu(false);
                  }}
                  className="flex w-full items-center space-x-2 rounded-lg px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 transition-all text-left"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
