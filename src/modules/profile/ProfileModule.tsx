"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  User,
  Mail,
  Calendar,
  Lock,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  Trash2,
  Shield,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggleButton } from "@/components/shared/theme-toggle-button";
import { Sun } from "lucide-react";

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  avatar_url?: string | null;
  birthdate?: string | null;
  created_at?: string;
}

export default function ProfileModule({ initial }: { initial?: UserProfile }) {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<UserProfile | null>(initial || null);
  const [loading, setLoading] = useState(!initial);
  const [fullName, setFullName] = useState(initial?.full_name || "");
  const [birthdate, setBirthdate] = useState(initial?.birthdate || "");
  const [avatarUrl, setAvatarUrl] = useState(initial?.avatar_url || "");

  // Password state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status indicators
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [profileSuccessMsg, setProfileSuccessMsg] = useState("");
  const [profileErrorMsg, setProfileErrorMsg] = useState("");
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState("");
  const [passwordErrorMsg, setPasswordErrorMsg] = useState("");

  const loadProfile = async () => {
    try {
      const res = await fetch("/api/profile");
      if (!res.ok) throw new Error("Failed to load profile");
      const data = await res.json();
      if (data.profile) {
        setProfile(data.profile);
        setFullName(data.profile.full_name || "");
        setBirthdate(data.profile.birthdate || "");
        setAvatarUrl(data.profile.avatar_url || "");
      }
    } catch (err: any) {
      setProfileErrorMsg(err.message || "Failed to fetch profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initial) {
      loadProfile();
    }
  }, [initial]);

  // Handle Avatar Upload
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file (PNG, JPG, WEBP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Avatar file size must be less than 5MB.");
      return;
    }

    setUploadingAvatar(true);
    setProfileErrorMsg("");
    setProfileSuccessMsg("");

    try {
      const fileExt = file.name.split(".").pop();
      const safePath = `avatars/${profile.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("ticket-attachments")
        .upload(safePath, file, { cacheControl: "3600", upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("ticket-attachments")
        .getPublicUrl(safePath);

      const newUrl = publicUrlData.publicUrl;
      setAvatarUrl(newUrl);

      // Auto-save avatar_url
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar_url: newUrl }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to update profile picture");
      }

      setProfileSuccessMsg("Profile picture updated successfully!");
      router.refresh();
    } catch (err: any) {
      setProfileErrorMsg(err.message || "Failed to upload image");
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Remove Avatar
  const handleRemoveAvatar = async () => {
    if (!confirm("Are you sure you want to remove your profile picture?")) return;
    setUploadingAvatar(true);
    setProfileErrorMsg("");
    setProfileSuccessMsg("");

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar_url: null }),
      });

      if (!res.ok) throw new Error("Failed to remove avatar");
      setAvatarUrl("");
      setProfileSuccessMsg("Profile picture removed.");
      router.refresh();
    } catch (err: any) {
      setProfileErrorMsg(err.message || "Failed to remove avatar");
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Save Profile Info (Name & Birthdate)
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setProfileErrorMsg("Full name cannot be empty.");
      return;
    }

    setSavingProfile(true);
    setProfileErrorMsg("");
    setProfileSuccessMsg("");

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName.trim(),
          birthdate: birthdate || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update profile");
      }

      setProfile(data.profile);
      setProfileSuccessMsg("Profile information saved successfully!");
      router.refresh();
    } catch (err: any) {
      setProfileErrorMsg(err.message || "Error saving profile");
    } finally {
      setSavingProfile(false);
    }
  };

  // Save New Password
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordErrorMsg("");
    setPasswordSuccessMsg("");

    if (!newPassword) {
      setPasswordErrorMsg("Please enter a new password.");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordErrorMsg("Password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordErrorMsg("Passwords do not match. Please verify.");
      return;
    }

    setSavingPassword(true);

    try {
      const res = await fetch("/api/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to change password");
      }

      setPasswordSuccessMsg("Password changed successfully! Keep it secure.");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPasswordErrorMsg(err.message || "Failed to change password");
    } finally {
      setSavingPassword(false);
    }
  };

  const initials = fullName
    ? fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "US";

  const getRoleBadgeVariant = (role?: string) => {
    switch (role) {
      case "ADMIN":
        return "default";
      case "PM":
        return "secondary";
      case "DEV":
        return "outline";
      default:
        return "outline";
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-muted-foreground gap-2">
        <Loader2 className="size-6 animate-spin text-primary" />
        <span className="text-xs">Loading profile details...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Account Profile</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Manage your personal details, profile picture, and account security.
        </p>
      </div>

      {/* Profile Overview Card */}
      <Card className="border-border shadow-xs overflow-hidden">
        <div className="h-20 bg-linear-to-r from-primary/15 via-primary/5 to-transparent border-b border-border/40" />
        <CardContent className="px-6 pb-6 pt-0 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-10 sm:-mt-12">
            <div className="flex items-end gap-4">
              <div className="relative group">
                <Avatar className="size-20 sm:size-24 rounded-full border-4 border-background shadow-md">
                  <AvatarImage src={avatarUrl || undefined} alt={fullName} />
                  <AvatarFallback className="text-xl font-bold bg-primary/10 text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>

                {/* Hover overlay button to change picture */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute inset-0 rounded-full bg-black/50 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer disabled:opacity-0"
                  aria-label="Upload profile picture"
                >
                  {uploadingAvatar ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : (
                    <>
                      <Camera className="size-5" />
                      <span className="text-[9px] mt-0.5 font-medium">Change</span>
                    </>
                  )}
                </button>
              </div>

              <div className="space-y-1 mb-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold leading-tight">{fullName || "Your Name"}</h2>
                  <Badge variant={getRoleBadgeVariant(profile?.role)} className="text-[10px] uppercase font-semibold">
                    {profile?.role || "CLIENT"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Mail className="size-3 text-muted-foreground/70" />
                  {profile?.email || "No email available"}
                </p>
              </div>
            </div>

            {/* Action buttons for Avatar */}
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="text-xs"
              >
                {uploadingAvatar ? (
                  <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Camera className="size-3.5 mr-1.5 text-primary" />
                )}
                Change Photo
              </Button>

              {avatarUrl && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRemoveAvatar}
                  disabled={uploadingAvatar}
                  className="text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="size-3.5 mr-1" />
                  Remove
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Personal Details Section */}
        <Card className="border-border shadow-xs flex flex-col">
          <CardHeader className="pb-3 border-b border-border/70">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <User className="size-4 text-primary" />
              Personal Information
            </CardTitle>
            <CardDescription className="text-xs">
              Update your public display name and birthdate.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSaveProfile} className="flex-1 flex flex-col justify-between">
            <CardContent className="p-5 space-y-4">
              {profileSuccessMsg && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>{profileSuccessMsg}</span>
                </div>
              )}

              {profileErrorMsg && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{profileErrorMsg}</span>
                </div>
              )}

              {/* Full Name */}
              <div className="space-y-1.5">
                <Label htmlFor="full-name" className="text-xs font-semibold">
                  Full Name
                </Label>
                <div className="relative">
                  <Input
                    id="full-name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className="text-xs h-9"
                    required
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Your full name is visible to teammates, PMs, and support staff.
                </p>
              </div>

              {/* View-Only Email */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="profile-email" className="text-xs font-semibold">
                    Email Address
                  </Label>
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-muted-foreground flex items-center gap-1">
                    <Lock className="size-2.5" /> View Only
                  </Badge>
                </div>
                <div className="relative">
                  <Input
                    id="profile-email"
                    type="email"
                    value={profile?.email || ""}
                    readOnly
                    disabled
                    className="text-xs h-9 bg-muted/40 cursor-not-allowed text-muted-foreground"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Email address is linked to your authentication account and cannot be modified directly.
                </p>
              </div>

              {/* Birthdate */}
              <div className="space-y-1.5">
                <Label htmlFor="birthdate" className="text-xs font-semibold flex items-center gap-1.5">
                  <Calendar className="size-3.5 text-primary" />
                  Birthdate
                </Label>
                <Input
                  id="birthdate"
                  type="date"
                  value={birthdate || ""}
                  onChange={(e) => setBirthdate(e.target.value)}
                  className="text-xs h-9"
                />
                <p className="text-[11px] text-muted-foreground">
                  Your birthdate is stored confidentially for profile verification.
                </p>
              </div>
            </CardContent>

            <CardFooter className="border-t border-border/70 p-4 bg-muted/15 flex justify-end">
              <Button type="submit" size="sm" disabled={savingProfile} className="text-xs">
                {savingProfile ? (
                  <>
                    <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Change Password Section */}
        <Card className="border-border shadow-xs flex flex-col">
          <CardHeader className="pb-3 border-b border-border/70">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <KeyRound className="size-4 text-primary" />
              Security & Password
            </CardTitle>
            <CardDescription className="text-xs">
              Change your login password with confirmation.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSavePassword} className="flex-1 flex flex-col justify-between">
            <CardContent className="p-5 space-y-4">
              {passwordSuccessMsg && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>{passwordSuccessMsg}</span>
                </div>
              )}

              {passwordErrorMsg && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{passwordErrorMsg}</span>
                </div>
              )}

              {/* New Password */}
              <div className="space-y-1.5">
                <Label htmlFor="new-password" className="text-xs font-semibold">
                  New Password
                </Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter at least 6 characters"
                    className="text-xs h-9 pr-9"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <Label htmlFor="confirm-password" className="text-xs font-semibold">
                  Confirm New Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your new password"
                    className="text-xs h-9 pr-9"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5"
                    aria-label="Toggle confirm password visibility"
                  >
                    {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>

                {/* Password match feedback */}
                {confirmPassword && (
                  <div className="pt-1">
                    {newPassword === confirmPassword ? (
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                        <CheckCircle2 className="size-3" /> Passwords match
                      </p>
                    ) : (
                      <p className="text-[11px] text-destructive flex items-center gap-1 font-medium">
                        <AlertCircle className="size-3" /> Passwords do not match
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Security Hint */}
              <div className="rounded-lg bg-muted/40 p-3 text-[11px] text-muted-foreground border border-border/50 space-y-1">
                <div className="font-semibold text-foreground flex items-center gap-1">
                  <Shield className="size-3.5 text-primary" />
                  Password Security Requirements
                </div>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li>Minimum 6 characters in length</li>
                  <li>Use a combination of letters, numbers, and symbols</li>
                </ul>
              </div>
            </CardContent>

            <CardFooter className="border-t border-border/70 p-4 bg-muted/15 flex justify-end">
              <Button
                type="submit"
                size="sm"
                disabled={savingPassword || !newPassword || newPassword !== confirmPassword}
                className="text-xs"
              >
                {savingPassword ? (
                  <>
                    <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                    Updating Password...
                  </>
                ) : (
                  "Update Password"
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Appearance & Theme Card */}
        <Card className="border-border shadow-xs md:col-span-2">
          <CardHeader className="p-4 sm:p-5 flex flex-row items-center justify-between">
            <div className="space-y-0.5">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Sun className="size-4 text-primary" />
                Theme & Interface Appearance
              </CardTitle>
              <CardDescription className="text-xs">
                Switch between Light and Dark mode across the workspace.
              </CardDescription>
            </div>
            <ThemeToggleButton showLabel={true} />
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
