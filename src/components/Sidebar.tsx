import React, { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { 
  Calendar, 
  Clock, 
  User, 
  LogOut, 
  Menu,
  X,
  Sliders,
  Moon,
  Sun
} from "lucide-react";
import { BrandLogo } from "./BrandLogo";

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const location = useLocation();

  const role = user?.role; // 'club_admin' represents Admin in backend db

  const handleLinkClick = () => {
    setIsOpen(false); // Close mobile menu when a link is clicked
  };

  return (
    <aside
      className="hidden md:flex w-64 flex-col border-r border-zinc-900 bg-[#121212] p-5 md:static shrink-0"
    >
      {/* Brand Header: ClubHub Title */}
      <div className="flex items-center justify-center mb-6 px-1 shrink-0 w-full">
        <BrandLogo size="sidebar" />
      </div>

        {/* User Profile Info Card */}
        <div className="flex items-center gap-3 px-1 py-4 mb-6 border-y border-zinc-900">
          {user?.profilePic ? (
            <img
              src={user.profilePic}
              alt="Profile"
              className="h-10 w-10 rounded-full object-cover border border-zinc-800 bg-zinc-900"
            />
          ) : (
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#f26522] to-amber-500 border border-zinc-800 flex items-center justify-center text-xs font-bold text-white uppercase shrink-0">
              {user?.name ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) : "??"}
            </div>
          )}
          <div>
            <p className="text-xs font-bold text-white leading-tight">{user?.name || "Jeevan abhi"}</p>
            <p className="text-[10px] text-[#f26522] font-extrabold uppercase mt-1 tracking-wider">
              {role === "super_admin" ? "Super Admin" : role === "club_admin" ? "Admin" : "Student"}
            </p>
          </div>
        </div>

        {/* Menu Navigation */}
        <nav className="flex-1 space-y-2 overflow-y-auto pr-1">
          {role === "super_admin" ? (
            <>
              {/* SUPER ADMIN PRIMARY LINKS */}
              <NavLink
                to="/dashboard"
                onClick={handleLinkClick}
                className={({ isActive }) =>
                  `flex items-center space-x-3 rounded-lg px-3 py-2.5 text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-[#f26522] text-white shadow-lg shadow-orange-500/10"
                      : "text-zinc-400 hover:bg-zinc-900/40 hover:text-zinc-200"
                  }`
                }
              >
                <Calendar className="h-4 w-4" />
                <span>Manage Events</span>
              </NavLink>

              <NavLink
                to="/past"
                onClick={handleLinkClick}
                className={({ isActive }) =>
                  `flex items-center space-x-3 rounded-lg px-3 py-2.5 text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-[#f26522] text-white shadow-lg shadow-orange-500/10"
                      : "text-zinc-400 hover:bg-zinc-900/40 hover:text-zinc-200"
                  }`
                }
              >
                <Clock className="h-4 w-4" />
                <span>Past Events</span>
              </NavLink>

              <NavLink
                to="/profile"
                onClick={handleLinkClick}
                className={({ isActive }) =>
                  `flex items-center space-x-3 rounded-lg px-3 py-2.5 text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-[#f26522] text-white shadow-lg shadow-orange-500/10"
                      : "text-zinc-400 hover:bg-zinc-900/40 hover:text-zinc-200"
                  }`
                }
              >
                <User className="h-4 w-4" />
                <span>My Profile</span>
              </NavLink>

              {/* WEBSITE SETTINGS HEADER & LOGO MANAGEMENT */}
              <div className="pt-4 pb-1">
                <p className="px-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                  Website Settings
                </p>
              </div>

              <NavLink
                to="/settings/logo"
                onClick={handleLinkClick}
                className={({ isActive }) =>
                  `flex items-center space-x-3 rounded-lg px-3 py-2.5 text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-[#f26522] text-white shadow-lg shadow-orange-500/10"
                      : "text-zinc-400 hover:bg-zinc-900/40 hover:text-zinc-200"
                  }`
                }
              >
                <Sliders className="h-4 w-4" />
                <span>Logo Management</span>
              </NavLink>
            </>
          ) : role === "club_admin" ? (

            <>
              {/* ADMIN PRIMARY LINKS */}
              <NavLink
                to="/dashboard"
                onClick={handleLinkClick}
                className={({ isActive }) =>
                  `flex items-center space-x-3 rounded-lg px-3 py-2.5 text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-[#f26522] text-white shadow-lg shadow-orange-500/10"
                      : "text-zinc-400 hover:bg-zinc-900/40 hover:text-zinc-200"
                  }`
                }
              >
                <Calendar className="h-4 w-4" />
                <span>Manage Events</span>
              </NavLink>

              <NavLink
                to="/past"
                onClick={handleLinkClick}
                className={({ isActive }) =>
                  `flex items-center space-x-3 rounded-lg px-3 py-2.5 text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-[#f26522] text-white shadow-lg shadow-orange-500/10"
                      : "text-zinc-400 hover:bg-zinc-900/40 hover:text-zinc-200"
                  }`
                }
              >
                <Clock className="h-4 w-4" />
                <span>Past Events</span>
              </NavLink>

              <NavLink
                to="/profile"
                onClick={handleLinkClick}
                className={({ isActive }) =>
                  `flex items-center space-x-3 rounded-lg px-3 py-2.5 text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-[#f26522] text-white shadow-lg shadow-orange-500/10"
                      : "text-zinc-400 hover:bg-zinc-900/40 hover:text-zinc-200"
                  }`
                }
              >
                <User className="h-4 w-4" />
                <span>My Profile</span>
              </NavLink>
            </>
          ) : (
            <>
              {/* STUDENT VIEWS */}
              <NavLink
                to="/dashboard"
                onClick={handleLinkClick}
                className={({ isActive }) =>
                  `flex items-center space-x-3 rounded-lg px-3 py-2.5 text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-[#f26522] text-white shadow-lg shadow-orange-500/10"
                      : "text-zinc-400 hover:bg-zinc-900/40 hover:text-zinc-200"
                  }`
                }
              >
                <Calendar className="h-4 w-4" />
                <span>All Events</span>
              </NavLink>

              <NavLink
                to="/past"
                onClick={handleLinkClick}
                className={({ isActive }) =>
                  `flex items-center space-x-3 rounded-lg px-3 py-2.5 text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-[#f26522] text-white shadow-lg shadow-orange-500/10"
                      : "text-zinc-400 hover:bg-zinc-900/40 hover:text-zinc-200"
                  }`
                }
              >
                <Clock className="h-4 w-4" />
                <span>Past Events</span>
              </NavLink>

              <NavLink
                to="/profile"
                onClick={handleLinkClick}
                className={({ isActive }) =>
                  `flex items-center space-x-3 rounded-lg px-3 py-2.5 text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-[#f26522] text-white shadow-lg shadow-orange-500/10"
                      : "text-zinc-400 hover:bg-zinc-900/40 hover:text-zinc-200"
                  }`
                }
              >
                <User className="h-4 w-4" />
                <span>My Profile</span>
              </NavLink>
            </>
          )}
        </nav>

        {/* Footer Account Info & Logout */}
        <div className="mt-auto border-t border-zinc-900 pt-4 space-y-1.5">
          {/* Mobile Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="flex md:hidden w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold text-zinc-400 hover:bg-zinc-900/40 transition-all text-left border-0 bg-transparent cursor-pointer"
          >
            <span className="flex items-center space-x-3">
              {isDarkMode ? <Moon className="h-4 w-4 text-[#f26522]" /> : <Sun className="h-4 w-4 text-zinc-450" />}
              <span>Theme: {isDarkMode ? "Dark" : "Light"}</span>
            </span>
            <span className="text-[9px] text-[#f26522] font-bold uppercase tracking-wider">Change</span>
          </button>

          <button
            onClick={logout}
            className="flex w-full items-center space-x-3 rounded-lg px-3 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/5 transition-all text-left"
          >
            <LogOut className="h-4 w-4 text-rose-500" />
            <span>Logout</span>
          </button>
        </div>
    </aside>
  );
}
