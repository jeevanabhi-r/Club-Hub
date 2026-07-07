import React, { useState } from "react";
import axios from "axios";
import { Mail, ArrowLeft, Send, Lock, Eye, EyeOff, Key } from "lucide-react";
import { toast } from "react-hot-toast";
import { BrandLogo } from "../components/BrandLogo";

interface ForgotPasswordProps {
  onLoginClick: () => void;
}

type ResetStep = "ENTER_EMAIL" | "VERIFY_OTP" | "CREATE_NEW_PASSWORD";

export default function ForgotPassword({ onLoginClick }: ForgotPasswordProps) {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [step, setStep] = useState<ResetStep>("ENTER_EMAIL");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccessMsg("");

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

    try {
      const response = await axios.post("/api/auth/forgot-password", { email: email.trim() });
      setSuccessMsg(response.data.message || "Verification code sent successfully to your email.");
      toast.success("Verification code sent successfully!");
      setStep("VERIFY_OTP");
    } catch (err: any) {
      const errMsg = err.response?.data?.error || "Server error";
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (!otp.trim() || otp.trim().length !== 6) {
      setError("Please enter a valid 6-digit verification code.");
      setIsLoading(false);
      return;
    }

    try {
      await axios.post("/api/auth/verify-otp", {
        email: email.trim(),
        otp: otp.trim()
      });
      setSuccessMsg("Code verified successfully! Now create a new password.");
      toast.success("Code verified successfully!");
      setStep("CREATE_NEW_PASSWORD");
    } catch (err: any) {
      const errMsg = err.response?.data?.error || "Invalid OTP";
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

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
      await axios.post("/api/auth/update-password", {
        email: email.trim(),
        password,
        confirmPassword
      });
      toast.success("Password changed successfully.");
      setSuccessMsg("Password changed successfully. Redirecting to login...");
      setTimeout(() => {
        onLoginClick();
      }, 1500);
    } catch (err: any) {
      const errMsg = err.response?.data?.error || "Server error";
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
            {step === "ENTER_EMAIL" ? (
              <Mail className="h-6 w-6" />
            ) : step === "VERIFY_OTP" ? (
              <Key className="h-6 w-6" />
            ) : (
              <Lock className="h-6 w-6" />
            )}
          </div>
          <h2 className="mt-4 font-display text-2xl font-bold tracking-tight text-zinc-50">
            {step === "ENTER_EMAIL" && "Forgot Password?"}
            {step === "VERIFY_OTP" && "Verify OTP"}
            {step === "CREATE_NEW_PASSWORD" && "Create New Password"}
          </h2>
          <p className="mt-1 text-xs text-zinc-400">
            {step === "ENTER_EMAIL" && "Enter your registered email below to receive a secure 6-digit password reset code."}
            {step === "VERIFY_OTP" && "Enter the 6-digit OTP code sent to your email to verify your identity."}
            {step === "CREATE_NEW_PASSWORD" && "Fields: New Password and Confirm Password. Setup your new secure credential."}
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-3.5 text-xs font-semibold text-rose-400 animate-in fade-in leading-relaxed">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-xs font-semibold text-emerald-400 animate-in fade-in leading-relaxed">
            {successMsg}
          </div>
        )}

        {step === "ENTER_EMAIL" && (
          <form className="space-y-4" onSubmit={handleRequestCode}>
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Mail className="h-4 w-4 text-zinc-500" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="Enter your registered email"
                  style={{ paddingLeft: "2.5rem" }}
                  className="block w-full rounded-lg bg-zinc-900 py-2.5 pl-10 pr-3 text-sm text-zinc-200 placeholder-zinc-600 border border-zinc-800 focus:border-[#f26522] focus:outline-none focus:ring-1 focus:ring-[#f26522] transition-all"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="group relative flex w-full justify-center rounded-lg bg-[#f26522] hover:bg-[#ea580c] px-3 py-2.5 text-sm font-semibold text-white shadow-xl transition-all disabled:opacity-50 cursor-pointer border-0"
              >
                {isLoading ? "Sending Code..." : "Send Verification Code"}
                {!isLoading && <Send className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />}
              </button>
            </div>
          </form>
        )}

        {step === "VERIFY_OTP" && (
          <form className="space-y-4" onSubmit={handleVerifyOtp}>
            <div>
              <label htmlFor="otp" className="block text-xs font-semibold text-zinc-300 mb-1.5">
                6-Digit OTP Code
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Key className="h-4 w-4 text-zinc-500" />
                </div>
                <input
                  id="otp"
                  type="text"
                  required
                  maxLength={6}
                  placeholder="Enter 6-digit OTP"
                  style={{ paddingLeft: "2.5rem" }}
                  className="block w-full rounded-lg bg-zinc-900 py-2.5 pl-10 pr-3 text-sm text-zinc-200 placeholder-zinc-600 border border-zinc-800 focus:border-[#f26522] focus:outline-none focus:ring-1 focus:ring-[#f26522] transition-all font-mono tracking-[0.25em] text-center"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                />
              </div>
            </div>

            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setStep("ENTER_EMAIL")}
                className="w-1/3 rounded-lg border border-zinc-800 bg-zinc-900/40 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-900 hover:text-white transition-all cursor-pointer"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 rounded-lg bg-[#f26522] hover:bg-[#ea580c] py-2.5 text-xs font-semibold text-white shadow-xl transition-all disabled:opacity-50 cursor-pointer border-0"
              >
                {isLoading ? "Verifying..." : "Verify Code"}
              </button>
            </div>
          </form>
        )}

        {step === "CREATE_NEW_PASSWORD" && (
          <form className="space-y-4" onSubmit={handleResetPassword}>
            {/* New Password */}
            <div>
              <label htmlFor="pass" className="block text-xs font-semibold text-zinc-300 mb-1.5">
                New Password
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-4 w-4 text-zinc-500" />
                </div>
                <input
                  id="pass"
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Enter your new password"
                  style={{ paddingLeft: "2.5rem", paddingRight: "2.5rem" }}
                  className="block w-full rounded-lg bg-zinc-900 py-2.5 pl-10 pr-10 text-sm text-zinc-200 placeholder-zinc-600 border border-zinc-800 focus:border-[#f26522] focus:outline-none focus:ring-1 focus:ring-[#f26522] transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-zinc-300 bg-transparent border-0 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirm-pass" className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-4 w-4 text-zinc-500" />
                </div>
                <input
                  id="confirm-pass"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  placeholder="Confirm your password"
                  style={{ paddingLeft: "2.5rem", paddingRight: "2.5rem" }}
                  className="block w-full rounded-lg bg-zinc-900 py-2.5 pl-10 pr-10 text-sm text-zinc-200 placeholder-zinc-600 border border-zinc-800 focus:border-[#f26522] focus:outline-none focus:ring-1 focus:ring-[#f26522] transition-all"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-zinc-300 bg-transparent border-0 cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-lg bg-[#f26522] hover:bg-[#ea580c] py-2.5 text-xs font-semibold text-white shadow-xl transition-all disabled:opacity-50 cursor-pointer border-0"
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
