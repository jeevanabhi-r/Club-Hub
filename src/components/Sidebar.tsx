import React, { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { getClubAdminRole } from "../types";
import { 
  Calendar, 
  Clock, 
  User, 
  LogOut, 
  X,
  Sliders,
  Moon,
  Sun,
  UserCheck,
  LayoutDashboard
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

  const getLinkClass = (isActive: boolean) => {
    return `flex items-center space-x-3 rounded-lg px-3 py-2.5 text-xs font-semibold transition-all ${
      isActive
        ? "bg-[#f26522] text-white shadow-lg shadow-orange-500/10"
        : "text-zinc-400 hover:bg-zinc-900/40 hover:text-zinc-200"
    }`;
  };

  return (
    <>
      {/* Mobile Sidebar Drawer Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-zinc-900 bg-[#121212] p-5 transition-transform duration-300 md:static md:translate-x-0 shrink-0 h-full ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } md:flex`}
      >
        {/* Mobile Header Close Button */}
        <div className="flex md:hidden justify-end mb-2">
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 rounded-lg text-zinc-400 hover:text-white bg-transparent border-0 cursor-pointer"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

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
              {role === "super_admin" 
                ? "Super Admin" 
                : role === "club_admin" 
                  ? getClubAdminRole(user?.clubId || user?.assignedClubId || "", user?.clubName || user?.assignedClubName)
                  : "Student"}
            </p>
          </div>
        </div>

        {/* Menu Navigation */}
        <nav className="flex-1 space-y-2 overflow-y-auto pr-1">
          {role === "super_admin" ? (
            <>
              {/* SUPER ADMIN PRIMARY LINKS */}
              <div className="pb-1">
                <p className="px-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                  Core Management
                </p>
              </div>

              <NavLink
                to="/dashboard"
                onClick={handleLinkClick}
                className={getLinkClass(location.pathname === "/dashboard")}
              >
                <LayoutDashboard className="h-4 w-4" />
                <span>Dashboard</span>
              </NavLink>

              <NavLink
                to="/events"
                onClick={handleLinkClick}
                className={getLinkClass(
                  location.pathname === "/events" || 
                  location.pathname === "/events/add" || 
                  location.pathname.startsWith("/events/edit/")
                )}
              >
                <Calendar className="h-4 w-4" />
                <span>Event Management</span>
              </NavLink>

              <NavLink
                to="/past"
                onClick={handleLinkClick}
                className={getLinkClass(location.pathname === "/past")}
              >
                <Clock className="h-4 w-4" />
                <span>Past Events</span>
              </NavLink>

              <NavLink
                to="/profile"
                onClick={handleLinkClick}
                className={getLinkClass(location.pathname === "/profile")}
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
                className={getLinkClass(location.pathname === "/settings/logo")}
              >
                <Sliders className="h-4 w-4" />
                <span>Logo Management</span>
              </NavLink>

              <NavLink
                to="/settings/roles"
                onClick={handleLinkClick}
                className={getLinkClass(location.pathname === "/settings/roles")}
              >
                <UserCheck className="h-4 w-4" />
                <span>Role Management</span>
              </NavLink>
            </>
          ) : role === "club_admin" ? (

            <>
              {/* ADMIN PRIMARY LINKS */}
              <NavLink
                to="/dashboard"
                onClick={handleLinkClick}
                className={getLinkClass(
                  location.pathname === "/dashboard" ||
                  location.pathname === "/events/add" ||
                  location.pathname.startsWith("/events/edit/")
                )}
              >
                <LayoutDashboard className="h-4 w-4" />
                <span>Dashboard</span>
              </NavLink>

              <NavLink
                to="/past"
                onClick={handleLinkClick}
                className={getLinkClass(location.pathname === "/past")}
              >
                <Clock className="h-4 w-4" />
                <span>Past Events</span>
              </NavLink>

              <NavLink
                to="/profile"
                onClick={handleLinkClick}
                className={getLinkClass(location.pathname === "/profile")}
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
                className={getLinkClass(
                  location.pathname === "/dashboard" ||
                  location.pathname === "/upcoming" ||
                  location.pathname === "/my-registrations"
                )}
              >
                <LayoutDashboard className="h-4 w-4" />
                <span>Dashboard</span>
              </NavLink>

              <NavLink
                to="/past"
                onClick={handleLinkClick}
                className={getLinkClass(location.pathname === "/past")}
              >
                <Clock className="h-4 w-4" />
                <span>Past Events</span>
              </NavLink>

              <NavLink
                to="/profile"
                onClick={handleLinkClick}
                className={getLinkClass(location.pathname === "/profile")}
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
    </>
  );
}
