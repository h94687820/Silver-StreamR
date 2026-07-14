import { useGetBlockedUsers, useUnblockUser, getGetBlockedUsersQueryKey } from "@workspace/api-client-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/lib/i18n";
import { ShieldOff } from "lucide-react";

export default function BlockedUsers() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data: blockedPage, isLoading } = useGetBlockedUsers({
    query: { queryKey: getGetBlockedUsersQueryKey() }
  });

  const unblockMutation = useUnblockUser();

  const handleUnblock = (userId: string) => {
    unblockMutation.mutate({ userId }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetBlockedUsersQueryKey() })
    });
  };

  return (
    <div className="w-full">
      <div className="px-4 py-3 border-b border-border/50 sticky top-14 z-30 bg-background/95 backdrop-blur-xl">
        <h1 className="text-lg font-bold">{t("blocked_title")}</h1>
      </div>

      <div className="divide-y divide-border/50">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">{t("loading")}</div>
        ) : blockedPage?.items.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldOff className="w-8 h-8 opacity-50" />
            </div>
            <p>{t("blocked_empty")}</p>
          </div>
        ) : (
          blockedPage?.items.map(user => (
            <div key={user.id} className="flex items-center gap-3 p-4">
              <Avatar className="w-12 h-12">
                <AvatarImage src={user.avatarUrl || undefined} />
                <AvatarFallback>{(user.displayName || user.username)[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">{user.displayName || user.username}</p>
                <p className="text-sm text-muted-foreground truncate">@{user.username}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="rounded-full text-xs px-4 shrink-0 border-destructive/50 text-destructive hover:bg-destructive/10"
                onClick={() => handleUnblock(user.id)}
                disabled={unblockMutation.isPending}
              >
                {t("blocked_unblock")}
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
