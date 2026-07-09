import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Mail, Lock } from "lucide-react";
import { BrandLogo } from "../components/BrandLogo";
import { AuthInput } from "../components/AuthInput";

interface LoginProps {
  onRegisterClick: () => void;
  onForgotPasswordClick: () => void;
}

export default function Login({ onRegisterClick, onForgotPasswordClick }: LoginProps) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      await login(email, password);
    } catch (err: any) {
      console.error("Firebase Login Auth error occurred:", err);
      let displayError = "Failed to log in. Please check your credentials.";
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
        displayError = "Failed to log in. Please check your credentials.";
      }
      setError(displayError);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-12 sm:px-6 lg:px-8 overflow-hidden font-sans">
      {/* Background visual cues */}
      <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-[#f26522]/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-[#9a1c1f]/5 blur-[120px] pointer-events-none" />

      <div className="relative w-full max-w-md space-y-6 bg-[#121212] p-8 rounded-2xl border border-zinc-800 shadow-2xl animate-in fade-in zoom-in duration-300">
        <div className="text-center flex flex-col items-center">
          {/* Centered Brand Name and Logo */}
          <div className="mb-4 w-full flex justify-center">
            <BrandLogo size="login" />
          </div>
          <p className="text-xs text-zinc-400 font-medium text-center">
            Manage your college clubs and events
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-3.5 text-xs font-semibold text-rose-400 animate-in fade-in">
            {error}
          </div>
        )}

        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Email field */}
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-bold text-zinc-400 mb-2"
              >
                Email
              </label>
              <AuthInput
                id="email"
                type="email"
                required
                autoComplete="email"
                placeholder="Enter your email"
                icon={Mail}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* Password field */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="password"
                  className="block text-xs font-bold text-zinc-400"
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={onForgotPasswordClick}
                  className="text-xs font-bold text-[#f26522] hover:text-[#ea580c] bg-transparent border-0 cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
              <AuthInput
                id="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="Enter your password"
                icon={Lock}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full justify-center rounded-lg bg-[#f26522] hover:bg-[#ea580c] px-4 py-3 text-sm font-bold text-white shadow-md transition-all disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? "Signing in..." : "Login"}
            </button>
          </div>
        </form>

        <p className="text-center text-xs text-zinc-400 pt-2">
          Don't have an account?{" "}
          <button
            onClick={onRegisterClick}
            className="font-bold text-[#f26522] hover:text-[#ea580c] bg-transparent border-0 cursor-pointer hover:underline"
          >
            Register
          </button>
        </p>
      </div>
    </div>
  );
}
