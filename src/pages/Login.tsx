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
  const { login, loginWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setError("");
    try {
      await loginWithGoogle();
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
    try {
      await login(email, password);
    } catch (err: any) {
      console.warn("Login attempt failed:", err);
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
                onChange={(e) => setEmail(e.target.value.toLowerCase())}
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
              disabled={isLoading || isGoogleLoading}
              className="flex w-full justify-center rounded-lg bg-[#f26522] hover:bg-[#ea580c] px-4 py-3 text-sm font-bold text-white shadow-md transition-all disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? "Signing in..." : "Login"}
            </button>
          </div>
        </form>

        <div className="relative my-4 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-800" />
          </div>
          <div className="relative bg-[#121212] px-3 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
            Or continue with
          </div>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isGoogleLoading || isLoading}
          className="flex w-full items-center justify-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm font-bold text-zinc-200 shadow-sm transition-all hover:bg-zinc-800 hover:border-zinc-700 disabled:opacity-50 cursor-pointer"
        >
          <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
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
          {isGoogleLoading ? "Signing in with Google..." : "Sign in with Google"}
        </button>

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
