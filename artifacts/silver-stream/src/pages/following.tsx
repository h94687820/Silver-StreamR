import { useRoute } from "wouter";
import { useGetFollowing, useGetMe, useGetUserByUsername, useFollowUser, useUnfollowUser, getGetFollowingQueryKey, getGetUserByUsernameQueryKey } from "@workspace/api-client-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { useTranslation } from "@/lib/i18n";

export default function Following() {
  const { t } = useTranslation();
  const [, params] = useRoute("/profile/:username/following");
  const { data: me } = useGetMe();

  const isMe = !params?.username || params.username === "me" || params.username === me?.username;
  const targetUsername = isMe ? (me?.username || "") : params!.username;

  const { data: targetProfile } = useGetUserByUsername(targetUsername, {
    query: { enabled: !!targetUsername && !isMe, queryKey: getGetUserByUsernameQueryKey(targetUsername) }
  });
  const targetUserId = isMe ? me?.id : targetProfile?.id;

  const queryClient = useQueryClient();

  const { data: followingPage, isLoading } = useGetFollowing(targetUserId ?? "", undefined, {
    query: { enabled: !!targetUserId, queryKey: getGetFollowingQueryKey(targetUserId ?? "") }
  });

  const followMutation = useFollowUser();
  const unfollowMutation = useUnfollowUser();

  const handleFollowToggle = (userId: string, isFollowing: boolean) => {
    if (isFollowing) {
      unfollowMutation.mutate({ userId }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetFollowingQueryKey(targetUserId ?? "") })
      });
    } else {
      followMutation.mutate({ userId }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetFollowingQueryKey(targetUserId ?? "") })
      });
    }
  };

  return (
    <div className="w-full">
      <div className="px-4 py-3 border-b border-border/50 sticky top-0 z-30 bg-background/95 backdrop-blur-xl">
        <h1 className="text-lg font-bold">
          {isMe ? t("following_title") : t("following_title_of").replace("{username}", targetUsername)}
        </h1>
      </div>

      <div className="divide-y divide-border/50">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">{t("loading")}</div>
        ) : followingPage?.items.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl opacity-50">👥</span>
            </div>
            <p>{t("following_empty")}</p>
          </div>
        ) : (
          followingPage?.items.map(user => (
            <div key={user.id} className="flex items-center gap-3 p-4">
              <Link href={`/profile/${user.username}`} className="flex items-center gap-3 flex-1">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={user.avatarUrl || undefined} />
                  <AvatarFallback>{(user.displayName || user.username)[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{user.displayName || user.username}</p>
                  <p className="text-sm text-muted-foreground truncate">@{user.username}</p>
                </div>
              </Link>
              {!user.isMe && (
                <Button
                  size="sm"
                  variant={user.isFollowing ? "outline" : "default"}
                  className="rounded-full text-xs px-4 shrink-0"
                  onClick={() => handleFollowToggle(user.id, user.isFollowing)}
                  disabled={followMutation.isPending || unfollowMutation.isPending}
                >
                  {user.isFollowing ? t("profile_following") : t("profile_follow")}
                </Button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
