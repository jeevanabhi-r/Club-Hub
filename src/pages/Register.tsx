import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Sparkles, Lock, Mail, ArrowLeft, User, Image, Compass, Calendar, QrCode, ClipboardList } from "lucide-react";
import { toast } from "react-hot-toast";
import { BrandLogo } from "../components/BrandLogo";
import { AuthInput } from "../components/AuthInput";

interface RegisterProps {
  onLoginClick: () => void;
}

export default function Register({ onLoginClick }: RegisterProps) {
  const { register, loginWithGoogle } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setError("");
    try {
      await loginWithGoogle();
      toast.success("Welcome to ClubHub! Signed in with Google.");
    } catch (err: any) {
      console.error("Google Sign-In error:", err);
      let displayError = "Failed to sign in with Google.";
      if (err) {
        if (typeof err === "string") {
          displayError = err;
        } else if (err.message && typeof err.message === "string") {
          displayError = err.message;
        }
      }
      setError(displayError);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (!name.trim()) {
      setError("Full name is required.");
      setIsLoading(false);
      return;
    }

    if (!email.trim()) {
      setError("Email address is required.");
      setIsLoading(false);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address.");
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setIsLoading(false);
      return;
    }

    const regData = {
      name,
      email,
      password,
      role: "student",
      profilePic: "",
    };

    try {
      await register(regData);
      toast.success("Welcome to ClubHub! Account created successfully.");
    } catch (err: any) {
      console.error("Firebase Registration Auth error occurred:", err);
      let displayError = "Registration failed. Please check inputs.";
      if (err) {
        if (typeof err === "string") {
          displayError = err;
        } else if (err.message && typeof err.message === "string") {
          displayError = err.message;
        } else if (err.error && typeof err.error === "string") {
          displayError = err.error;
        } else {
          try {
            displayError = JSON.stringify(err);
          } catch (_) {
            // fallback
          }
        }
      }
      if (displayError === "[object Object]") {
        displayError = "Registration failed. Please check inputs.";
      }
      setError(displayError);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-12 sm:px-6 lg:px-8 overflow-hidden">
      {/* Aesthetic Background Orbs */}
      <div className="absolute top-1/4 left-1/4 h-80 w-80 rounded-full bg-[#f26522]/5 blur-[100px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 h-80 w-80 rounded-full bg-[#9a1c1f]/5 blur-[100px] pointer-events-none animate-pulse" />

      <div className="relative w-full max-w-4xl grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch bg-[#121212] p-6 md:p-8 rounded-2xl border border-zinc-800 shadow-2xl animate-in fade-in zoom-in duration-300">
        
        {/* Left Column: Account Features */}
        <div className="md:col-span-5 flex flex-col justify-between p-6 rounded-xl bg-zinc-900/60 border border-zinc-850/50">
          <div className="space-y-6">
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f26522] text-white shadow-xl shadow-orange-500/20 mb-3">
                <Sparkles className="h-5 w-5" />
              </div>
              <h2 className="font-display text-xl font-black text-zinc-50 tracking-tight">
                Unlock Campus ClubHub Features
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Join a premium network designed to streamline college events, workshop registries, and notifications.
              </p>
            </div>

            <div className="space-y-4">
              {/* Feature 1 */}
              <div className="flex items-start space-x-3">
                <div className="mt-0.5 rounded-lg bg-[#f26522]/10 p-1.5 text-[#f26522] border border-[#f26522]/10">
                  <Compass className="h-3.5 w-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-zinc-200">Discover College Clubs</h4>
                  <p className="text-[10px] text-zinc-400 mt-0.5">
                    Explore and follow approved departmental clubs, technical societies, and sports groups.
                  </p>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="flex items-start space-x-3">
                <div className="mt-0.5 rounded-lg bg-[#f26522]/10 p-1.5 text-[#f26522] border border-[#f26522]/10">
                  <Calendar className="h-3.5 w-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-zinc-200">Register for Events</h4>
                  <p className="text-[10px] text-zinc-400 mt-0.5">
                    Stay ahead of schedules. Register for tech talks, sports meetups, hackathons, and seminars.
                  </p>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="flex items-start space-x-3">
                <div className="mt-0.5 rounded-lg bg-[#f26522]/10 p-1.5 text-[#f26522] border border-[#f26522]/10">
                  <QrCode className="h-3.5 w-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-zinc-200">QR Attendance Tickets</h4>
                  <p className="text-[10px] text-zinc-400 mt-0.5">
                    Receive direct dynamic QR passes to quickly mark attendance at actual event venues.
                  </p>
                </div>
              </div>

              {/* Feature 4 */}
              <div className="flex items-start space-x-3">
                <div className="mt-0.5 rounded-lg bg-[#f26522]/10 p-1.5 text-[#f26522] border border-[#f26522]/10">
                  <ClipboardList className="h-3.5 w-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-zinc-200">Interactive Activity Portfolio</h4>
                  <p className="text-[10px] text-zinc-400 mt-0.5">
                    Build a history of registered, completed events to highlight your extracurricular participation.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-zinc-850/50 text-[10px] text-zinc-500">
            Powered by ClubHub Database Systems
          </div>
        </div>

        {/* Right Column: Registration Form */}
        <div className="md:col-span-7 flex flex-col justify-center py-2 px-1">
          <div className="flex flex-col items-center mb-6">
            <BrandLogo size="lg" />
          </div>
          <div>
            <h3 className="font-display text-lg font-bold tracking-tight text-zinc-50">
              Create Account
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Please fill in your active credentials below to register.
            </p>
          </div>

          {error && (
            <div className="mt-4 rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-xs font-semibold text-rose-400 animate-in fade-in">
              {error}
            </div>
          )}

          <form className="space-y-4 mt-6" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-4">
              {/* Full Name */}
              <div>
                <label className="block text-[10px] font-bold tracking-wider uppercase text-zinc-400 mb-1.5">
                  Full Name
                </label>
                <AuthInput
                  id="name"
                  type="text"
                  required
                  placeholder="Enter your full name"
                  icon={User}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-[10px] font-bold tracking-wider uppercase text-zinc-400 mb-1.5">
                  Email Address
                </label>
                <AuthInput
                  id="email"
                  type="email"
                  required
                  placeholder="Enter your email"
                  icon={Mail}
                  value={email}
                  onChange={(e) => setEmail(e.target.value.toLowerCase())}
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-[10px] font-bold tracking-wider uppercase text-zinc-400 mb-1.5">
                  Password
                </label>
                <AuthInput
                  id="password"
                  type="password"
                  required
                  placeholder="Enter your password"
                  icon={Lock}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-[10px] font-bold tracking-wider uppercase text-zinc-400 mb-1.5">
                  Confirm Password
                </label>
                <AuthInput
                  id="confirmPassword"
                  type="password"
                  required
                  placeholder="Confirm your password"
                  icon={Lock}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || isGoogleLoading}
              className="w-full rounded-lg bg-[#f26522] hover:bg-[#ea580c] py-2.5 text-xs font-semibold text-white shadow-xl transition-all disabled:opacity-50 cursor-pointer mt-4"
            >
              {isLoading ? "Creating account..." : "Submit Registration"}
            </button>
          </form>

          <div className="relative my-4 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-800" />
            </div>
            <div className="relative bg-[#121212] px-3 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
              Or sign up with
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading || isLoading}
            className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-xs font-bold text-zinc-200 shadow-sm transition-all hover:bg-zinc-800 hover:border-zinc-700 disabled:opacity-50 cursor-pointer"
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.2 9 5 12 5z"
              />
              <path
                fill="#4285F4"
                d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
              />
              <path
                fill="#FBBC05"
                d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15s.7 5.3 1.9 7.7l3.7-2.9c-.3-.8-.5-1.7-.5-2.6z"
              />
              <path
                fill="#34A853"
                d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.2-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z"
              />
            </svg>
            {isGoogleLoading ? "Signing in with Google..." : "Sign up with Google"}
          </button>

          <p className="text-center text-xs text-zinc-400 border-t border-zinc-850 pt-4 mt-6">
            <button
              onClick={onLoginClick}
              className="inline-flex items-center space-x-1.5 font-semibold text-[#f26522] hover:text-[#ea580c] hover:underline bg-transparent border-0 cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Sign In</span>
            </button>
          </p>
        </div>

      </div>
    </div>
  );
}
