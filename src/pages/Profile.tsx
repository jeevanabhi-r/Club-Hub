import React, { useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import { Camera, Eye, EyeOff, Trash2, User } from "lucide-react";
import { toast } from "react-hot-toast";
import { ConfirmModal } from "../components/ConfirmModal";

export default function Profile() {
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States matching user profiles (ONLY name, email, profilePic)
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [profilePic, setProfilePic] = useState(user?.profilePic || "");

  React.useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
      setProfilePic(user.profilePic || "");
    }
  }, [user]);

  const [showDeletePicConfirm, setShowDeletePicConfirm] = useState(false);

  // Password States
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isPassLoading, setIsPassLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit for base64 saving in db.json
        toast.error("Image file is too large! Please choose a file smaller than 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePic(reader.result as string);
        toast.success("Profile photo loaded! Click 'Save Profile' to persist changes.");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const updatePayload = {
      name,
      email,
      profilePic
    };

    try {
      const res = await axios.put("/api/users/profile", updatePayload);
      updateUser(res.data.user);
      toast.success("Profile saved successfully!");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to update profile configurations");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) {
      toast.error("Please specify a new password");
      return;
    }
    setIsPassLoading(true);

    try {
      await axios.put("/api/users/profile", {
        password: newPassword
      });
      toast.success("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to update security credentials");
    } finally {
      setIsPassLoading(false);
    }
  };

  const handleDeleteProfilePic = async () => {
    try {
      setProfilePic("");
      const res = await axios.put("/api/users/profile", {
        name,
        email,
        profilePic: ""
      });
      updateUser(res.data.user);
      toast.success("Profile image deleted successfully!");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to delete profile image");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200 text-zinc-200 py-4">
      {/* Header Block */}
      <div>
        <h1 className="font-display text-2xl font-black tracking-tight text-white">
          Profile Settings
        </h1>
      </div>

      <div className="space-y-6">
        {/* PERSONAL INFO CARD */}
        <form onSubmit={handleSaveProfile} className="p-6 rounded-xl bg-[#121212] border border-zinc-800 space-y-6 shadow-xl">
          <h2 className="text-sm font-bold text-white tracking-wide">
            Personal Info
          </h2>

          <div className="flex items-center space-x-6">
            {/* Avatar block */}
            <div className="relative">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer relative shrink-0"
              >
                {profilePic ? (
                  <img
                    src={profilePic}
                    alt="Profile Avatar"
                    className="h-20 w-20 rounded-full object-cover border border-zinc-800 bg-zinc-900 shadow-md"
                  />
                ) : (
                  <div className="h-20 w-20 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 shadow-md select-none">
                    <User className="h-10 w-10" />
                  </div>
                )}
                {/* Camera badge */}
                <div className="absolute bottom-0 right-0 rounded-full bg-[#f26522] p-1.5 border border-[#121212] shadow-md">
                  <Camera className="h-3.5 w-3.5 text-white" />
                </div>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
            </div>

            <div>
              <p className="text-sm font-bold text-white">Profile Photo</p>
              <p className="text-xs text-zinc-500 mt-0.5">Click icon to change or upload photo</p>
              {profilePic && (
                <button
                  type="button"
                  onClick={() => setShowDeletePicConfirm(true)}
                  className="mt-2 flex items-center space-x-1.5 text-xs font-bold text-rose-400 hover:text-rose-300 transition-colors cursor-pointer bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>Delete Profile Image</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-zinc-400 mb-2">
                Full Name
              </label>
              <input
                type="text"
                required
                className="w-full rounded-lg bg-[#18181b] border border-zinc-800 px-3.5 py-2.5 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-[#f26522]"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-zinc-400 mb-2">
                Email Address
              </label>
              <input
                type="email"
                required
                className="w-full rounded-lg bg-[#18181b] border border-zinc-800 px-3.5 py-2.5 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-[#f26522]"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="rounded-lg bg-[#f26522] hover:bg-[#ea580c] px-6 py-2.5 text-xs font-bold text-white shadow-md transition-all disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? "Saving Profile..." : "Save Profile"}
            </button>
          </div>
        </form>

        {/* CHANGE PASSWORD CARD */}
        <form onSubmit={handleUpdatePassword} className="p-6 rounded-xl bg-[#121212] border border-zinc-800 space-y-6 shadow-xl">
          <h2 className="text-sm font-bold text-white tracking-wide">
            Change Password
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Current Password */}
            <div>
              <label className="block text-xs font-bold text-zinc-400 mb-2">
                Current Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full rounded-lg bg-[#18181b] border border-zinc-800 px-3.5 py-2.5 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-[#f26522]"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>

            {/* New Password */}
            <div>
              <label className="block text-xs font-bold text-zinc-400 mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••"
                  className="w-full rounded-lg bg-[#18181b] border border-zinc-800 px-3.5 py-2.5 pr-10 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-[#f26522]"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-zinc-300"
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isPassLoading}
              className="rounded-lg bg-[#374151] hover:bg-[#4b5563] px-6 py-2 text-xs font-bold text-white transition-all disabled:opacity-50 cursor-pointer"
            >
              {isPassLoading ? "Updating..." : "Update Password"}
            </button>
          </div>
        </form>
      </div>

      <ConfirmModal
        isOpen={showDeletePicConfirm}
        onClose={() => setShowDeletePicConfirm(false)}
        onConfirm={handleDeleteProfilePic}
        title="Delete Profile Image?"
        description="Are you sure you want to delete your profile image?"
        confirmText="Delete"
        type="danger"
      />

    </div>
  );
}
