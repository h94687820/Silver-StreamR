import { useGetSavedPosts, getGetSavedPostsQueryKey, useGetMe, useGetSettings, useUpdateSettings, getGetSettingsQueryKey } from "@workspace/api-client-react";
import { PostCard } from "@/components/post-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/lib/i18n";
import { Globe, Lock } from "lucide-react";

export default function Saved() {
  const { t } = useTranslation();
  const { data: me } = useGetMe();
  const queryClient = useQueryClient();
  const { data: settings } = useGetSettings({ query: { queryKey: getGetSettingsQueryKey() } });
  const updateSettingsMutation = useUpdateSettings();

  const { data: savedPage, isLoading } = useGetSavedPosts(undefined, {
    query: {
      queryKey: getGetSavedPostsQueryKey(),
    }
  });

  const isPublic = !!(settings as any)?.savedPostsPublic;

  const handleTogglePublic = (checked: boolean) => {
    updateSettingsMutation.mutate({ data: { savedPostsPublic: checked } as any }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() })
    });
  };

  return (
    <div className="w-full min-h-[100dvh] bg-background">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-xl border-b border-border/50 p-4 space-y-3">
        <h1 className="text-2xl font-bold">{t("saved_title")}</h1>
        <div className="flex items-center justify-between bg-secondary/40 rounded-xl px-3 py-2.5">
          <div className="flex items-center gap-2 text-foreground">
            {isPublic ? <Globe className="w-4 h-4 text-muted-foreground" /> : <Lock className="w-4 h-4 text-muted-foreground" />}
            <div>
              <p className="text-sm font-medium leading-tight">{t("saved_public_toggle")}</p>
              <p className="text-xs text-muted-foreground leading-tight">
                {isPublic ? t("saved_public_on_desc") : t("saved_public_off_desc")}
              </p>
            </div>
          </div>
          <Switch
            checked={isPublic}
            onCheckedChange={handleTogglePublic}
            disabled={updateSettingsMutation.isPending}
          />
        </div>
      </div>

      <div className="p-4 max-w-md mx-auto">
        {isLoading ? (
          <div className="space-y-4">
            {[1,2].map(i => (
              <div key={i} className="space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <Skeleton className="h-48 w-full rounded-xl" />
              </div>
            ))}
          </div>
        ) : (
          <div className="pb-8">
            {savedPage?.items.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground bg-secondary/20 rounded-2xl border border-border/50 mt-4">
                <p>{t("saved_empty")}</p>
                <p className="text-sm mt-1">{t("saved_empty_desc")}</p>
              </div>
            ) : (
              savedPage?.items.map(post => (
                <PostCard key={post.id} post={post} currentUserId={me?.id} />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
