import React, { useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import { Camera, Trash2, User, RefreshCw, Mail, Lock, Phone, Layers } from "lucide-react";
import { toast } from "react-hot-toast";
import { ConfirmModal } from "../components/ConfirmModal";
import { getClubAdminRole } from "../types";
import { auth } from "../firebase";
import { AuthInput } from "../components/AuthInput";
import { 
  EmailAuthProvider, 
  reauthenticateWithCredential, 
  updatePassword, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from "firebase/auth";

export default function Profile() {
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States matching user profiles (name, email, profilePic, phone, section)
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [profilePic, setProfilePic] = useState(user?.profilePic || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [section, setSection] = useState(user?.section || "");

  React.useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
      setProfilePic(user.profilePic || "");
      setPhone(user.phone || "");
      setSection(user.section || "");
    }
  }, [user]);

  const [showDeletePicConfirm, setShowDeletePicConfirm] = useState(false);

  // Password States
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

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
      phone,
      section,
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
    
    // 2. Validate New Password
    if (!currentPassword) {
      toast.error("Please enter your current password.");
      return;
    }
    if (!newPassword) {
      toast.error("Please enter a new password.");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters long.");
      return;
    }
    if (newPassword === currentPassword) {
      toast.error("New password cannot be the same as the current password.");
      return;
    }

    // 4. Loading State
    setIsPassLoading(true);

    try {
      // 1. Verify Current Password
      let currentUser = auth.currentUser;
      const emailToUse = user?.email || "";

      let firebaseSuccess = false;
      try {
        if (!currentUser) {
          try {
            // Attempt sign-in to populate auth.currentUser
            const userCredential = await signInWithEmailAndPassword(auth, emailToUse, currentPassword);
            currentUser = userCredential.user;
          } catch (signInErr: any) {
            // If the user does not exist in Firebase Auth yet, we can create them
            if (signInErr.code === "auth/user-not-found" || signInErr.message?.includes("user-not-found")) {
              const userCredential = await createUserWithEmailAndPassword(auth, emailToUse, currentPassword);
              currentUser = userCredential.user;
            } else {
              throw signInErr;
            }
          }
        } else {
          // If already signed in, re-authenticate using the credentials
          const credential = EmailAuthProvider.credential(emailToUse, currentPassword);
          await reauthenticateWithCredential(currentUser, credential);
        }

        // 3. Update Password
        if (!currentUser) {
          throw new Error("auth/user-not-found");
        }

        await updatePassword(currentUser, newPassword);
        firebaseSuccess = true;
      } catch (fbErr: any) {
        console.warn("Firebase Auth operation failed/unsupported. Attempting backend auth fallback...", fbErr);
        const isUnsupported = 
          fbErr.code === "auth/operation-not-allowed" || 
          fbErr.message?.includes("operation-not-allowed") ||
          fbErr.code === "auth/configuration-not-found" ||
          fbErr.message?.includes("configuration-not-found");

        if (isUnsupported) {
          // Verify current password by making an auth request to our login endpoint
          try {
            await axios.post("/api/auth/login", { email: emailToUse, password: currentPassword });
          } catch (loginErr: any) {
            // If backend login fails, then the current password is wrong
            throw { code: "auth/wrong-password", message: "Current password is incorrect." };
          }
        } else {
          // Re-throw other authentic validation errors (e.g. wrong-password)
          throw fbErr;
        }
      }

      // Keep backend json database in sync as well
      await axios.put("/api/users/profile", {
        password: newPassword
      });

      toast.success("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err: any) {
      console.error("Firebase Authentication password change error:", err);
      
      const errorCode = err.code || "";
      const errorMessage = err.message || "";

      if (
        errorCode === "auth/wrong-password" ||
        errorCode === "auth/invalid-credential" ||
        errorMessage.includes("wrong-password") ||
        errorMessage.includes("invalid-credential")
      ) {
        toast.error("Current password is incorrect.");
      } else if (
        errorCode === "auth/too-many-requests" ||
        errorMessage.includes("too-many-requests")
      ) {
        toast.error("Too many attempts. Please try again later.");
      } else if (
        errorCode === "auth/requires-recent-login" ||
        errorMessage.includes("requires-recent-login")
      ) {
        toast.error("Please login again.");
      } else if (
        errorCode === "auth/network-request-failed" ||
        errorMessage.includes("network-request-failed")
      ) {
        toast.error("Check your internet connection.");
      } else {
        toast.error("Something went wrong.");
      }
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
        phone,
        section,
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
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl font-black tracking-tight text-white">
            Profile Settings
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Manage your personal credentials, contact info, and workspace preferences.
          </p>
        </div>
        {/* Profile Badge */}
        <div className="rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-xs font-bold text-[#f26522] tracking-wide uppercase">
          {user?.role === "super_admin" 
            ? "Super Admin" 
            : user?.role === "club_admin" 
              ? getClubAdminRole(user?.clubId || user?.assignedClubId || "", user?.clubName || user?.assignedClubName)
              : "Student"}
        </div>
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

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-zinc-400 mb-2">
                Email Address
              </label>
              <AuthInput
                id="email"
                type="email"
                required
                placeholder="Enter your email address"
                icon={Mail}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-bold text-zinc-400 mb-2">
                Phone Number
              </label>
              <AuthInput
                id="phone"
                type="tel"
                placeholder="Enter your phone number"
                icon={Phone}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            {/* Section */}
            <div>
              <label className="block text-xs font-bold text-zinc-400 mb-2">
                Section
              </label>
              <div className="relative w-full">
                <Layers
                  size={20}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none z-10"
                />
                <select
                  id="section"
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  className="auth-input has-left-icon appearance-none w-full bg-[#18181b] text-zinc-200 border border-[#27272a] rounded-lg h-[48px] py-3 pl-14 pr-10 text-sm focus:outline-none focus:border-[#f26522] focus:ring-1 focus:ring-[#f26522] transition-all"
                >
                  <option value="">No Section</option>
                  <option value="S1">S1</option>
                  <option value="S2">S2</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-500">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                  </svg>
                </div>
              </div>
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
              <AuthInput
                id="currentPassword"
                type="password"
                required
                placeholder="••••••••"
                icon={Lock}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>

            {/* New Password */}
            <div>
              <label className="block text-xs font-bold text-zinc-400 mb-2">
                New Password
              </label>
              <AuthInput
                id="newPassword"
                type="password"
                required
                placeholder="••••••••"
                icon={Lock}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isPassLoading}
              className="flex items-center gap-2 rounded-lg bg-[#374151] hover:bg-[#4b5563] px-6 py-2 text-xs font-bold text-white transition-all disabled:opacity-50 cursor-pointer"
            >
              {isPassLoading && <RefreshCw className="h-3 w-3 animate-spin" />}
              <span>{isPassLoading ? "Updating..." : "Update Password"}</span>
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
