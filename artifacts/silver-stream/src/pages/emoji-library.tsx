import { useState, useRef } from "react";
import {
  useGetMyEmojis,
  useCreateEmoji,
  useDeleteEmoji,
  useUpdateEmoji,
  useSetActiveEmojis,
  useGetMe,
  getGetMyEmojisQueryKey,
  getGetMeQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTranslation } from "@/lib/i18n";
import { Trash2, Globe, Lock, Upload, Star, User, Stamp, Type } from "lucide-react";
import { cn } from "@/lib/utils";
import { uploadFileAndGetUrl } from "@/lib/upload";

export default function EmojiLibrary() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: me } = useGetMe();
  const { data: library, isLoading } = useGetMyEmojis({
    query: { queryKey: getGetMyEmojisQueryKey() }
  });

  const createMutation  = useCreateEmoji();
  const deleteMutation  = useDeleteEmoji();
  const updateMutation  = useUpdateEmoji();
  const activeMutation  = useSetActiveEmojis();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [newName, setNewName] = useState("");

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: getGetMyEmojisQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !newName.trim()) return;
    setUploading(true);
    try {
      const imageUrl = await uploadFileAndGetUrl(file);
      await createMutation.mutateAsync({ data: { imageUrl, name: newName.trim(), isPublic: false } });
      setNewName("");
      refresh();
    } catch (err) {
      alert(t("emoji_upload_error"));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDelete = (id: string) => {
    if (!confirm(t("emoji_delete_confirm"))) return;
    deleteMutation.mutate({ emojiId: id }, { onSuccess: refresh });
  };

  const handleTogglePublic = (id: string, current: boolean) => {
    updateMutation.mutate({ emojiId: id, data: { isPublic: !current } }, { onSuccess: refresh });
  };

  const setActive = (field: "profileBadgeEmojiId" | "postStampEmojiId" | "nameDisplayEmojiId", id: string | null) => {
    activeMutation.mutate({ data: { [field]: id } }, { onSuccess: refresh });
  };

  const emojis = library?.items ?? [];

  // Derive which emoji IDs are currently active (from me profile)
  // We can't get them directly from UserProfile, so we track via the emoji list + active URLs
  const profileBadgeUrl  = (me as any)?.profileBadgeEmojiUrl  ?? null;
  const postStampUrl     = (me as any)?.postStampEmojiUrl     ?? null;
  const nameDisplayUrl   = (me as any)?.nameDisplayEmojiUrl   ?? null;

  const activeFor = (emoji: typeof emojis[number]) => {
    const labels: string[] = [];
    if (emoji.imageUrl === profileBadgeUrl)  labels.push(t("emoji_active_badge"));
    if (emoji.imageUrl === postStampUrl)     labels.push(t("emoji_active_stamp"));
    if (emoji.imageUrl === nameDisplayUrl)   labels.push(t("emoji_active_name"));
    return labels;
  };

  return (
    <div className="w-full pb-10">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/50 sticky top-14 z-30 bg-background/95 backdrop-blur-xl">
        <h1 className="text-lg font-bold">{t("emoji_library_title")}</h1>
        <p className="text-xs text-muted-foreground mt-0.5">{t("emoji_library_subtitle")}</p>
      </div>

      <div className="p-4 space-y-6">

        {/* Upload new emoji */}
        <section className="bg-card border border-border/50 rounded-2xl p-4 space-y-3">
          <p className="text-sm font-semibold">{t("emoji_add_new")}</p>
          <input
            type="text"
            placeholder={t("emoji_name_placeholder")}
            value={newName}
            onChange={e => setNewName(e.target.value)}
            className="w-full h-10 rounded-xl border border-border bg-secondary/30 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <Button
            className="w-full rounded-xl"
            onClick={() => fileInputRef.current?.click()}
            disabled={!newName.trim() || uploading}
          >
            <Upload className="w-4 h-4 me-2" />
            {uploading ? t("emoji_uploading") : t("emoji_upload_btn")}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <p className="text-xs text-muted-foreground">{t("emoji_upload_hint")}</p>
        </section>

        {/* Active emoji contexts */}
        {emojis.length > 0 && (
          <section className="bg-card border border-border/50 rounded-2xl overflow-hidden divide-y divide-border/50">
            <p className="px-4 py-3 text-sm font-semibold">{t("emoji_active_contexts")}</p>

            {[
              { labelKey: "emoji_active_badge",  icon: User,  field: "profileBadgeEmojiId" as const, activeUrl: profileBadgeUrl },
              { labelKey: "emoji_active_stamp",  icon: Stamp, field: "postStampEmojiId"    as const, activeUrl: postStampUrl    },
              { labelKey: "emoji_active_name",   icon: Type,  field: "nameDisplayEmojiId"  as const, activeUrl: nameDisplayUrl  },
            ].map(ctx => {
              const activeEmoji = emojis.find(e => e.imageUrl === ctx.activeUrl);
              return (
                <div key={ctx.field} className="px-4 py-3 flex items-center gap-3">
                  <ctx.icon className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-sm flex-1">{t(ctx.labelKey as any)}</span>
                  {activeEmoji ? (
                    <div className="flex items-center gap-2">
                      <img src={activeEmoji.imageUrl} alt={activeEmoji.name} className="w-8 h-8 rounded-lg object-cover border border-border/50" />
                      <button
                        className="text-xs text-destructive hover:underline"
                        onClick={() => setActive(ctx.field, null)}
                      >
                        {t("emoji_remove_active")}
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">{t("emoji_none_selected")}</span>
                  )}
                </div>
              );
            })}
          </section>
        )}

        {/* Library grid */}
        <section>
          <p className="text-sm font-semibold mb-3">{t("emoji_library_section")} ({emojis.length})</p>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">{t("loading")}</div>
          ) : emojis.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground bg-secondary/20 rounded-2xl border border-border/50">
              <p className="text-3xl mb-3">🎨</p>
              <p className="text-sm">{t("emoji_library_empty")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {emojis.map(emoji => {
                const active = activeFor(emoji);
                return (
                  <div
                    key={emoji.id}
                    className={cn(
                      "bg-card border rounded-2xl p-3 flex flex-col items-center gap-2 relative",
                      active.length > 0 ? "border-primary/50 shadow-sm" : "border-border/50"
                    )}
                  >
                    {/* Emoji image */}
                    <div className="w-16 h-16 rounded-xl overflow-hidden border border-border/30 bg-secondary/20">
                      <img src={emoji.imageUrl} alt={emoji.name} className="w-full h-full object-cover" />
                    </div>

                    {/* Name */}
                    <p className="text-xs font-medium text-center truncate w-full">{emoji.name}</p>

                    {/* Active labels */}
                    {active.length > 0 && (
                      <div className="flex flex-wrap gap-1 justify-center">
                        {active.map(label => (
                          <span key={label} className="text-[9px] bg-primary/10 text-primary rounded-full px-1.5 py-0.5">{label}</span>
                        ))}
                      </div>
                    )}

                    {/* Actions row */}
                    <div className="flex items-center gap-1.5 w-full">
                      {/* Set as badge */}
                      <button
                        title={t("emoji_set_badge")}
                        onClick={() => setActive("profileBadgeEmojiId", emoji.imageUrl === profileBadgeUrl ? null : emoji.id)}
                        className={cn("flex-1 h-7 rounded-lg text-[10px] font-medium border transition-colors",
                          emoji.imageUrl === profileBadgeUrl
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-secondary/50 text-muted-foreground border-border/50 hover:bg-secondary")}
                      >
                        <User className="w-3 h-3 mx-auto" />
                      </button>
                      {/* Set as stamp */}
                      <button
                        title={t("emoji_set_stamp")}
                        onClick={() => setActive("postStampEmojiId", emoji.imageUrl === postStampUrl ? null : emoji.id)}
                        className={cn("flex-1 h-7 rounded-lg text-[10px] font-medium border transition-colors",
                          emoji.imageUrl === postStampUrl
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-secondary/50 text-muted-foreground border-border/50 hover:bg-secondary")}
                      >
                        <Stamp className="w-3 h-3 mx-auto" />
                      </button>
                      {/* Set as name emoji */}
                      <button
                        title={t("emoji_set_name")}
                        onClick={() => setActive("nameDisplayEmojiId", emoji.imageUrl === nameDisplayUrl ? null : emoji.id)}
                        className={cn("flex-1 h-7 rounded-lg text-[10px] font-medium border transition-colors",
                          emoji.imageUrl === nameDisplayUrl
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-secondary/50 text-muted-foreground border-border/50 hover:bg-secondary")}
                      >
                        <Type className="w-3 h-3 mx-auto" />
                      </button>
                      {/* Toggle public */}
                      <button
                        title={emoji.isPublic ? t("emoji_make_private") : t("emoji_make_public")}
                        onClick={() => handleTogglePublic(emoji.id, emoji.isPublic)}
                        className="flex-1 h-7 rounded-lg border bg-secondary/50 text-muted-foreground border-border/50 hover:bg-secondary transition-colors"
                      >
                        {emoji.isPublic ? <Globe className="w-3 h-3 mx-auto" /> : <Lock className="w-3 h-3 mx-auto" />}
                      </button>
                      {/* Delete */}
                      <button
                        title={t("emoji_delete")}
                        onClick={() => handleDelete(emoji.id)}
                        className="flex-1 h-7 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                      >
                        <Trash2 className="w-3 h-3 mx-auto" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
