import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useUpdateMe,
  useCheckUsername,
  useRequestUploadUrl,
  getGetMeQueryKey,
  getGetUserByUsernameQueryKey,
  type UserProfile,
} from "@workspace/api-client-react";
import { useDebounce } from "@/lib/use-debounce";

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: UserProfile;
}

export function EditProfileDialog({ open, onOpenChange, profile }: EditProfileDialogProps) {
  const [displayName, setDisplayName] = useState(profile.displayName || "");
  const [username, setUsername] = useState(profile.username);
  const [bio, setBio] = useState(profile.bio || "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl || "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDisplayName(profile.displayName || "");
      setUsername(profile.username);
      setBio(profile.bio || "");
      setAvatarUrl(profile.avatarUrl || "");
      setAvatarFile(null);
      setAvatarPreview(null);
      setError(null);
    }
  }, [open, profile]);

  const debouncedUsername = useDebounce(username, 400);
  const usernameChanged = debouncedUsername.toLowerCase() !== profile.username.toLowerCase();

  const { data: checkResult, isFetching: isChecking } = useCheckUsername(
    { username: debouncedUsername },
    {
      query: {
        enabled: usernameChanged && debouncedUsername.length >= 3,
        queryKey: ["checkUsername", debouncedUsername],
      },
    }
  );

  const isUsernameAvailable = !usernameChanged || checkResult?.available;
  const showUsernameStatus = usernameChanged && debouncedUsername.length >= 3 && !isChecking;

  const requestUrlMutation = useRequestUploadUrl();
  const updateMeMutation = useUpdateMe();
  const queryClient = useQueryClient();

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setAvatarFile(f);
    setAvatarPreview(URL.createObjectURL(f));
  };

  const handleSave = async () => {
    setError(null);

    if (username.length < 3) {
      setError("Username must be at least 3 characters.");
      return;
    }
    if (usernameChanged && !isUsernameAvailable) {
      setError("This username is already taken.");
      return;
    }

    try {
      let finalAvatarUrl = avatarUrl;

      if (avatarFile) {
        setIsUploadingAvatar(true);
        const urlRes = await requestUrlMutation.mutateAsync({
          data: { name: avatarFile.name, size: avatarFile.size, contentType: avatarFile.type },
        });
        await fetch(urlRes.uploadURL, {
          method: "PUT",
          headers: { "Content-Type": avatarFile.type },
          body: avatarFile,
        });
        finalAvatarUrl = `/api/storage${urlRes.objectPath}`;
        setIsUploadingAvatar(false);
      }

      await updateMeMutation.mutateAsync({
        data: {
          username: username.toLowerCase().trim(),
          displayName,
          bio,
          avatarUrl: finalAvatarUrl,
        },
      });

      await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      await queryClient.invalidateQueries({ queryKey: getGetUserByUsernameQueryKey(profile.username) });
      if (usernameChanged) {
        await queryClient.invalidateQueries({ queryKey: getGetUserByUsernameQueryKey(username.toLowerCase().trim()) });
      }

      onOpenChange(false);
    } catch (e: any) {
      setIsUploadingAvatar(false);
      setError(e?.message || "Failed to save changes. Please try again.");
    }
  };

  const isSaving = isUploadingAvatar || updateMeMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="flex flex-col items-center gap-3">
            <label className="relative cursor-pointer group">
              <Avatar className="w-24 h-24 border-2 border-border">
                <AvatarImage src={avatarPreview || avatarUrl || undefined} className="object-cover" />
                <AvatarFallback className="text-2xl">
                  {displayName?.[0] || username[0]}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-6 h-6 text-white" />
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </label>
            <span className="text-xs text-muted-foreground">Tap to change photo</span>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Username</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                className="pl-8 h-11 rounded-xl"
              />
            </div>
            {showUsernameStatus && (
              <p className={`text-xs ${isUsernameAvailable ? "text-green-600 dark:text-green-400" : "text-destructive"}`}>
                {isUsernameAvailable ? "Username is available." : "Username is taken."}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Display Name</label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="h-11 rounded-xl"
              placeholder="Your name"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Bio</label>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="rounded-xl resize-none min-h-[80px]"
              placeholder="Tell people about yourself"
              maxLength={160}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            className="rounded-xl"
            onClick={handleSave}
            disabled={isSaving || username.length < 3 || (usernameChanged && !isUsernameAvailable)}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
