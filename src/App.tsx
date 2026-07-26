import React, { useState } from "react";
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate, NavLink } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import { LogoProvider } from "./context/LogoContext";
import { Toaster } from "react-hot-toast";
import { Calendar, Clock, User, Sliders, LogOut } from "lucide-react";

// Core Components
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import { BrandLogo } from "./components/BrandLogo";

// Page Views
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Events from "./pages/Events";
import Clubs from "./pages/Clubs";
import Announcements from "./pages/Announcements";
import Students from "./pages/Students";
import Profile from "./pages/Profile";
import ClubForm from "./pages/ClubForm";
import EventForm from "./pages/EventForm";
import LogoManagement from "./pages/LogoManagement";
import RoleManagement from "./pages/RoleManagement";

function AppContent() {
  const { user, token, loading, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [authView, setAuthView] = useState<"login" | "register" | "forgot" | "reset">("login");
  const location = useLocation();
  const navigate = useNavigate();

  const handleBackToLogin = () => {
    setAuthView("login");
    navigate("/");
  };

  const lastUserRef = React.useRef<any>(null);

  React.useEffect(() => {
    if (!loading && user && token) {
      if (!lastUserRef.current) {
        navigate("/dashboard", { replace: true });
      }
      lastUserRef.current = user;
    } else if (!user || !token) {
      lastUserRef.current = null;
    }
  }, [user, token, loading, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-400">
        <div className="text-center space-y-6 flex flex-col items-center">
          <BrandLogo size="md" className="mb-2" />
          <div className="h-10 w-10 border-4 border-[#f26522] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold tracking-wider uppercase text-zinc-500">
            Initializing ClubHub Core Security...
          </p>
        </div>
      </div>
    );
  }

  // Auth Protection Flow
  if (!user || !token) {
    if (location.pathname.startsWith("/reset-password") || authView === "reset") {
      return <ResetPassword onLoginClick={handleBackToLogin} />;
    }
    if (authView === "login") {
      return (
        <Login 
          onRegisterClick={() => setAuthView("register")} 
          onForgotPasswordClick={() => setAuthView("forgot")}
        />
      );
    } else if (authView === "forgot") {
      return <ForgotPassword onLoginClick={handleBackToLogin} />;
    } else {
      return <Register onLoginClick={handleBackToLogin} />;
    }
  }

  return (
    <div className="flex h-screen w-full bg-zinc-950 font-sans overflow-hidden text-zinc-200">
      {/* Collapsible Sidebar */}
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      {/* Main Workspace Frame */}
      <div className="flex flex-1 flex-col min-h-0 overflow-hidden relative">
        <Navbar onSearch={setSearchQuery} searchQuery={searchQuery} onMenuClick={() => setIsSidebarOpen(true)} />

        <main className="flex-1 min-h-0 overflow-y-auto p-4 md:p-8 pb-24 md:pb-12">
          <div className="mx-auto max-w-6xl pb-8">
            <Routes>
              <Route 
                path="/dashboard" 
                element={<Dashboard searchQuery={searchQuery} />} 
              />
              
              {/* Club Routes */}
              <Route 
                path="/clubs" 
                element={
                  user?.role === "super_admin" ? (
                    <Navigate to="/dashboard" replace />
                  ) : (
                    <Clubs />
                  )
                } 
              />
              <Route 
                path="/clubs/add" 
                element={
                  user?.role === "super_admin" ? (
                    <Navigate to="/dashboard" replace />
                  ) : (
                    <ClubForm mode="add" />
                  )
                } 
              />
              <Route 
                path="/clubs/edit/:id" 
                element={
                  user?.role === "super_admin" ? (
                    <Navigate to="/dashboard" replace />
                  ) : (
                    <ClubForm mode="edit" />
                  )
                } 
              />

              {/* Event Routes */}
              <Route path="/events" element={<Events filter="all" searchQuery={searchQuery} />} />
              <Route path="/events/add" element={<EventForm mode="add" />} />
              <Route path="/events/edit/:id" element={<EventForm mode="edit" />} />
              
              {/* Student specific submenus */}
              <Route path="/upcoming" element={<Events filter="upcoming" searchQuery={searchQuery} />} />
              <Route path="/past" element={<Events filter="past" searchQuery={searchQuery} />} />
              <Route path="/my-registrations" element={<Events filter="my-registrations" searchQuery={searchQuery} />} />

              {/* Admin & Student Shared/Role-protected routes */}
              <Route path="/registrations" element={<Students />} />
              <Route path="/announcements" element={<Announcements />} />
              <Route path="/profile" element={<Profile />} />

              {/* Super Admin Protected Settings Routes */}
              <Route 
                path="/settings/logo" 
                element={
                  user?.role === "super_admin" ? (
                    <LogoManagement />
                  ) : (
                    <Navigate to="/dashboard" replace />
                  )
                } 
              />

              <Route 
                path="/settings/roles" 
                element={
                  user?.role === "super_admin" ? (
                    <RoleManagement />
                  ) : (
                    <Navigate to="/dashboard" replace />
                  )
                } 
              />


              {/* Redirects */}
              <Route 
                path="*" 
                element={<Navigate to="/dashboard" replace />} 
              />
            </Routes>
          </div>
        </main>

        {/* Mobile bottom navigation bar */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#121212] border-t border-zinc-900 flex items-center justify-around px-2 z-40 shadow-2xl backdrop-blur-md bg-opacity-95">
          <NavLink
            to="/dashboard"
            className={({ isActive }) => {
              const isDashboardActive = isActive || 
                location.pathname === "/dashboard" || 
                location.pathname === "/upcoming" || 
                location.pathname === "/my-registrations" ||
                (user?.role === "super_admin" && (
                  location.pathname === "/events" || 
                  location.pathname === "/events/add" || 
                  location.pathname.startsWith("/events/edit/")
                ));
              return `flex flex-col items-center justify-center flex-1 h-full py-1 transition-colors ${
                isDashboardActive ? "text-[#f26522]" : "text-zinc-500 hover:text-zinc-400"
              }`;
            }}
          >
            <Calendar className="h-4.5 w-4.5 mb-1" />
            <span className="text-[10px] font-bold tracking-wider">
              {user?.role === "super_admin" || user?.role === "club_admin" ? "Manage" : "Events"}
            </span>
          </NavLink>

          <NavLink
            to="/past"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 h-full py-1 transition-colors ${
                isActive ? "text-[#f26522]" : "text-zinc-500 hover:text-zinc-400"
              }`
            }
          >
            <Clock className="h-4.5 w-4.5 mb-1" />
            <span className="text-[10px] font-bold tracking-wider">Past</span>
          </NavLink>

          {user?.role === "super_admin" && (
            <NavLink
              to="/settings/logo"
              className={({ isActive }) =>
                `flex flex-col items-center justify-center flex-1 h-full py-1 transition-colors ${
                  isActive ? "text-[#f26522]" : "text-zinc-500 hover:text-zinc-400"
                }`
              }
            >
              <Sliders className="h-4.5 w-4.5 mb-1" />
              <span className="text-[10px] font-bold tracking-wider">Logo</span>
            </NavLink>
          )}

          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 h-full py-1 transition-colors ${
                isActive ? "text-[#f26522]" : "text-zinc-500 hover:text-zinc-400"
              }`
            }
          >
            <User className="h-4.5 w-4.5 mb-1" />
            <span className="text-[10px] font-bold tracking-wider">Profile</span>
          </NavLink>

          <button
            onClick={logout}
            className="flex flex-col items-center justify-center flex-1 h-full py-1 transition-colors text-rose-500/85 hover:text-rose-400 bg-transparent border-0 cursor-pointer"
          >
            <LogOut className="h-4.5 w-4.5 mb-1" />
            <span className="text-[10px] font-bold tracking-wider">Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <HashRouter>
          <Toaster 
            position="top-right" 
            toastOptions={{
              style: {
                background: "#09090b",
                color: "#fafafa",
                border: "1px solid #27272a",
                fontSize: "12px",
                fontWeight: "500",
                borderRadius: "10px"
              }
            }} 
          />
          <LogoProvider>
            <AppContent />
          </LogoProvider>

        </HashRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
