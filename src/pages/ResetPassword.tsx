import React, { useState } from "react";
import axios from "axios";
import { Lock, ArrowLeft, Key, Mail } from "lucide-react";
import { toast } from "react-hot-toast";
import { BrandLogo } from "../components/BrandLogo";
import { AuthInput } from "../components/AuthInput";

interface ResetPasswordProps {
  onLoginClick: () => void;
}

export default function ResetPassword({ onLoginClick }: ResetPasswordProps) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (!email.trim()) {
      setError("Email address is required.");
      setIsLoading(false);
      return;
    }

    if (!code.trim() || code.trim().length !== 6) {
      setError("Please enter a valid 6-digit verification code.");
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Weak password");
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Password mismatch");
      setIsLoading(false);
      return;
    }

    try {
      // Step 1: Verify OTP
      await axios.post("/api/auth/verify-otp", {
        email: email.trim(),
        otp: code.trim()
      });

      // Step 2: Update Password
      await axios.post("/api/auth/update-password", {
        email: email.trim(),
        password,
        confirmPassword
      });

      toast.success("Password changed successfully.");
      setSuccessMsg("Password changed successfully. Redirecting you to sign in...");
      setTimeout(() => {
        window.location.hash = "#/";
        onLoginClick();
      }, 1500);
    } catch (err: any) {
      const errMsg = err.response?.data?.error || "Invalid OTP or expired code.";
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-12 sm:px-6 lg:px-8 overflow-hidden">
      {/* Aesthetic Background Orbs */}
      <div className="absolute top-1/4 left-1/4 h-80 w-80 rounded-full bg-[#f26522]/5 blur-[100px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 h-80 w-80 rounded-full bg-[#9a1c1f]/5 blur-[100px] pointer-events-none animate-pulse" />

      <div className="relative w-full max-w-md space-y-6 bg-[#121212] p-8 rounded-2xl border border-zinc-800 shadow-2xl animate-in fade-in zoom-in duration-300">
        <div className="text-center flex flex-col items-center">
          <BrandLogo size="lg" className="mb-4" />
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#f26522] text-white shadow-xl shadow-orange-500/20">
            <Lock className="h-6 w-6" />
          </div>
          <h2 className="mt-4 font-display text-2xl font-bold tracking-tight text-zinc-50">
            Reset Your Password
          </h2>
          <p className="mt-1 text-xs text-zinc-400">
            Please enter your registered email, the 6-digit verification code, and confirm your new secure password.
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-3.5 text-xs font-semibold text-rose-400 animate-in fade-in leading-relaxed">
            {error}
          </div>
        )}

        {successMsg ? (
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-xs font-semibold text-emerald-400 animate-in fade-in leading-relaxed">
            {successMsg}
          </div>
        ) : (
          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            {/* Email Address */}
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Email Address
              </label>
              <AuthInput
                id="email"
                type="email"
                required
                placeholder="Enter your registered email"
                icon={Mail}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* Verification Code */}
            <div>
              <label htmlFor="code" className="block text-xs font-semibold text-zinc-300 mb-1.5">
                6-Digit Verification Code
              </label>
              <AuthInput
                id="code"
                type="text"
                required
                maxLength={6}
                placeholder="Enter 6-digit code"
                icon={Key}
                className="font-mono tracking-widest text-center"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              />
            </div>

            {/* New Password */}
            <div>
              <label htmlFor="pass" className="block text-xs font-semibold text-zinc-300 mb-1.5">
                New Password
              </label>
              <AuthInput
                id="pass"
                type="password"
                required
                placeholder="Enter your new password"
                icon={Lock}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirm-pass" className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Confirm Password
              </label>
              <AuthInput
                id="confirm-pass"
                type="password"
                required
                placeholder="Confirm your new password"
                icon={Lock}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-lg bg-[#f26522] hover:bg-[#ea580c] py-2.5 text-sm font-semibold text-white shadow-xl transition-all disabled:opacity-50 cursor-pointer border-0"
              >
                {isLoading ? "Updating..." : "Update Password"}
              </button>
            </div>
          </form>
        )}

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
  );
}
