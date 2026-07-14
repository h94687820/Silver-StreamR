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
  useUpdateGroup,
  getGetGroupQueryKey,
  getGetGroupsQueryKey,
  getGetMyGroupsQueryKey,
  type Group,
} from "@workspace/api-client-react";
import { uploadFileAndGetUrl } from "@/lib/upload";

interface EditGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: Group;
}

export function EditGroupDialog({ open, onOpenChange, group }: EditGroupDialogProps) {
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description || "");
  const [avatarUrl, setAvatarUrl] = useState(group.avatarUrl || "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(group.name);
      setDescription(group.description || "");
      setAvatarUrl(group.avatarUrl || "");
      setAvatarFile(null);
      setAvatarPreview(null);
      setError(null);
    }
  }, [open, group]);

  const updateGroupMutation = useUpdateGroup();
  const queryClient = useQueryClient();

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setAvatarFile(f);
    setAvatarPreview(URL.createObjectURL(f));
  };

  const handleSave = async () => {
    setError(null);
    if (!name.trim()) {
      setError("Group name is required.");
      return;
    }

    try {
      let finalAvatarUrl = avatarUrl;

      if (avatarFile) {
        setIsUploadingAvatar(true);
        finalAvatarUrl = await uploadFileAndGetUrl(avatarFile);
        setIsUploadingAvatar(false);
      }

      await updateGroupMutation.mutateAsync({
        groupId: group.id,
        data: {
          name: name.trim(),
          description: description.trim(),
          avatarUrl: finalAvatarUrl,
        },
      });

      await queryClient.invalidateQueries({ queryKey: getGetGroupQueryKey(group.id) });
      await queryClient.invalidateQueries({ queryKey: getGetGroupsQueryKey() });
      await queryClient.invalidateQueries({ queryKey: getGetMyGroupsQueryKey() });

      onOpenChange(false);
    } catch (e: any) {
      setIsUploadingAvatar(false);
      setError(e?.message || "Failed to save changes. Please try again.");
    }
  };

  const isSaving = isUploadingAvatar || updateGroupMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle>Edit Group</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="flex flex-col items-center gap-3">
            <label className="relative cursor-pointer group">
              <Avatar className="w-24 h-24 border-2 border-border">
                <AvatarImage src={avatarPreview || avatarUrl || undefined} className="object-cover" />
                <AvatarFallback className="text-2xl">{name[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-6 h-6 text-white" />
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </label>
            <span className="text-xs text-muted-foreground">Tap to change photo</span>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Group Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11 rounded-xl"
              maxLength={60}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded-xl resize-none min-h-[80px]"
              placeholder="What's this group about?"
              maxLength={280}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button className="rounded-xl" onClick={handleSave} disabled={isSaving || !name.trim()}>
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
