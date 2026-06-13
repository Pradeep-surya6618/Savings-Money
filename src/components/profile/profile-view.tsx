"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { updateProfile, updateAvatar, removeAvatar } from "@/lib/actions/profile";
import { isValidAvatar } from "@/validations/profile";
import { toast } from "@/lib/toast-store";
import { cn } from "@/lib/utils";
import type { ProfileData } from "@/services/profile";

const inputCls =
  "h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none transition focus:border-primary";

export function ProfileView({ profile }: { profile: ProfileData }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(profile.name);
  const [dob, setDob] = useState(profile.dateOfBirth ?? "");
  const [bio, setBio] = useState(profile.bio);
  const [busy, setBusy] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset so the same file can be re-picked after an error
    e.target.value = "";
    if (!isValidAvatar(file.type, file.size)) {
      toast.error("Choose an image up to 3 MB.");
      return;
    }
    // Instant local preview
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setAvatarBusy(true);
    const fd = new FormData();
    fd.append("avatar", file);
    const res = await updateAvatar(fd);
    setAvatarBusy(false);
    if (res.ok) {
      toast.success("Photo updated");
      // Keep preview until refresh completes, then clear
      router.refresh();
      URL.revokeObjectURL(objectUrl);
      setPreview(null);
    } else {
      toast.error(res.error);
      URL.revokeObjectURL(objectUrl);
      setPreview(null);
    }
  }

  async function onRemove() {
    setAvatarBusy(true);
    const res = await removeAvatar();
    setAvatarBusy(false);
    if (res.ok) {
      toast.success("Photo removed");
      router.refresh();
    } else {
      toast.error(res.error);
    }
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await updateProfile({ name, dateOfBirth: dob, bio });
    setBusy(false);
    if (res.ok) {
      toast.success("Profile saved");
      router.refresh();
    } else {
      toast.error(res.error);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your personal information and avatar.</p>
      </div>

      <Card className="space-y-6">
        {/* Avatar block */}
        <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-center sm:gap-6">
          <UserAvatar
            name={name || profile.name}
            imageUrl={preview ?? profile.imageUrl}
            className="h-24 w-24 text-2xl"
          />
          <div className="space-y-2">
            <p className="text-sm font-medium">Profile photo</p>
            <p className="text-xs text-muted-foreground">JPG, PNG or WebP — max 3 MB. Stored at 512&times;512.</p>
            <div className="flex flex-wrap gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onFileChange}
                aria-label="Choose photo"
              />
              <Button
                type="button"
                variant="outline"
                disabled={avatarBusy}
                onClick={() => fileRef.current?.click()}
                className="cursor-pointer"
              >
                {avatarBusy ? "Uploading…" : "Change photo"}
              </Button>
              {profile.hasAvatar && !preview && (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={avatarBusy}
                  onClick={onRemove}
                  className={cn("cursor-pointer text-negative hover:text-negative")}
                >
                  Remove
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Form fields */}
        <form onSubmit={onSave} className="space-y-5">
          {/* Name */}
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
              placeholder="Your name"
              autoComplete="name"
              maxLength={60}
            />
          </label>

          {/* Date of birth */}
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Date of birth</span>
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
              className={inputCls}
            />
          </label>

          {/* Bio */}
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-medium">Bio</span>
              <span className="text-xs text-muted-foreground">{bio.length}/100</span>
            </div>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={100}
              rows={3}
              placeholder="A short description about yourself"
              className="w-full resize-none rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none transition focus:border-primary"
            />
          </div>

          {/* Email — read-only */}
          <div className="space-y-1.5">
            <span className="block text-sm font-medium">Email</span>
            <input
              type="email"
              value={profile.email}
              disabled
              className={cn(inputCls, "cursor-default opacity-60")}
              aria-label="Email address (read-only)"
            />
            <p className="text-xs text-muted-foreground">Your email address cannot be changed here.</p>
          </div>

          <Button
            type="submit"
            disabled={busy || !name.trim()}
            className="w-full cursor-pointer sm:w-auto"
          >
            {busy ? "Saving…" : "Save changes"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
