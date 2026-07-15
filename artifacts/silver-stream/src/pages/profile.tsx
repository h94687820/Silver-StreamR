import { useRoute, Link } from "wouter";
import { useGetUserByUsername, useGetUserPosts, useFollowUser, useUnfollowUser, useBlockUser, useUnblockUser, useGetMe, getGetUserByUsernameQueryKey, getGetUserPostsQueryKey, useGetSavedPosts, useGetUserSavedPosts, getGetSavedPostsQueryKey, getGetUserSavedPostsQueryKey } from "@workspace/api-client-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PostCard } from "@/components/post-card";
import { MentionText } from "@/components/mention-text";
import { Grid, Video, Bookmark, Edit3, ShieldOff, Shield } from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { EditProfileDialog } from "@/components/edit-profile-dialog";
import { useTranslation } from "@/lib/i18n";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

function SavedPostsTab({ username, isMe }: { username: string; isMe: boolean }) {
  const { data: me } = useGetMe();
  const { t } = useTranslation();

  // Own saved posts (always accessible)
  const { data: mySaved, isLoading: myLoading } = useGetSavedPosts(undefined, {
    query: { enabled: isMe, queryKey: getGetSavedPostsQueryKey() }
  });

  // Another user's public saved posts
  const { data: otherSaved, isLoading: otherLoading } = useGetUserSavedPosts(username, undefined, {
    query: { enabled: !isMe, queryKey: getGetUserSavedPostsQueryKey(username) }
  });

  const posts = isMe ? mySaved?.items : otherSaved?.items;
  const isLoading = isMe ? myLoading : otherLoading;

  if (isLoading) {
    return (
      <div className="space-y-4 mt-4">
        {[1, 2].map(i => (
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
    );
  }

  if (!posts || posts.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground bg-secondary/20 rounded-2xl border border-border/50 mt-4">
        <p>{t("saved_empty")}</p>
        <p className="text-sm mt-1">{t("saved_empty_desc")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-0 mt-4">
      {posts.map(post => (
        <PostCard key={post.id} post={post} currentUserId={me?.id} />
      ))}
    </div>
  );
}

export default function Profile() {
  const [match, params] = useRoute("/profile/:username");
  const username = params?.username;
  const { data: me } = useGetMe();
  const { t } = useTranslation();
  
  const isMe = username === "me" || username === me?.username;
  const targetUsername = isMe ? (me?.username || "") : (username || "");

  const { data: profile, isLoading } = useGetUserByUsername(targetUsername, {
    query: { enabled: !!targetUsername, queryKey: getGetUserByUsernameQueryKey(targetUsername) }
  });

  const { data: postsPage } = useGetUserPosts(targetUsername, undefined, {
    query: { enabled: !!targetUsername, queryKey: getGetUserPostsQueryKey(targetUsername) }
  });

  const [tab, setTab] = useState<"posts" | "reels" | "saved">("posts");
  const [editOpen, setEditOpen] = useState(false);
  const queryClient = useQueryClient();
  const followMutation = useFollowUser();
  const unfollowMutation = useUnfollowUser();
  const blockMutation = useBlockUser();
  const unblockMutation = useUnblockUser();

  const handleFollowToggle = () => {
    if (!profile) return;
    if (profile.isFollowing) {
      unfollowMutation.mutate({ userId: profile.id }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetUserByUsernameQueryKey(targetUsername) })
      });
    } else {
      followMutation.mutate({ userId: profile.id }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetUserByUsernameQueryKey(targetUsername) })
      });
    }
  };

  const handleBlock = () => {
    if (!profile) return;
    if (profile.isBlocked) {
      unblockMutation.mutate({ userId: profile.id }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetUserByUsernameQueryKey(targetUsername) })
      });
    } else {
      if (confirm(t("profile_block_confirm"))) {
        blockMutation.mutate({ userId: profile.id }, {
          onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetUserByUsernameQueryKey(targetUsername) })
        });
      }
    }
  };

  // Show saved tab if it's the current user OR if the other user has public favorites
  const showSavedTab = isMe || !!(profile as any)?.savedPostsPublic;

  if (isLoading) return <div className="p-8 text-center">{t("profile_loading")}</div>;
  if (!profile) return <div className="p-8 text-center text-destructive">{t("profile_not_found")}</div>;

  return (
    <div className="w-full bg-background min-h-screen">
      {/* Cover / Top */}
      <div className="h-32 sm:h-48 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 w-full relative silver-shimmer overflow-hidden">
        {(profile as any).coverUrl && (
          <img src={(profile as any).coverUrl} alt="" className="w-full h-full object-cover" />
        )}
      </div>

      <div className="px-4 pb-4">
        {/* Avatar & Actions Row */}
        <div className="flex justify-between items-end -mt-12 mb-4 relative z-10">
          <Avatar className="w-24 h-24 border-4 border-background shadow-xl">
            <AvatarImage src={profile.avatarUrl || undefined} className="object-cover" />
            <AvatarFallback className="text-2xl">{profile.displayName?.[0] || profile.username[0]}</AvatarFallback>
          </Avatar>
          
          <div className="mb-2 flex items-center gap-2">
            {isMe ? (
              <Button
                variant="outline"
                size="sm"
                className="rounded-full font-semibold border-border bg-background/50 backdrop-blur-md"
                onClick={() => setEditOpen(true)}
              >
                <Edit3 className="w-4 h-4 me-2" />
                {t("profile_edit")}
              </Button>
            ) : (
              <>
                <Button 
                  onClick={handleFollowToggle}
                  disabled={followMutation.isPending || unfollowMutation.isPending}
                  className={`rounded-full font-semibold px-6 shadow-md ${profile.isFollowing ? 'bg-secondary text-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive border' : 'bg-primary text-primary-foreground silver-shimmer'}`}
                >
                  {profile.isFollowing ? t("profile_following") : t("profile_follow")}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="rounded-full px-2 border-border">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={handleBlock}
                      className={profile.isBlocked ? "text-foreground" : "text-destructive focus:text-destructive"}
                      disabled={blockMutation.isPending || unblockMutation.isPending}
                    >
                      {profile.isBlocked ? (
                        <><Shield className="w-4 h-4 me-2" />{t("profile_unblock")}</>
                      ) : (
                        <><ShieldOff className="w-4 h-4 me-2" />{t("profile_block")}</>
                      )}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="space-y-1 mb-6">
          <h1 className="text-2xl font-bold text-foreground leading-tight flex items-center gap-2">
            {/* Name display emoji */}
            {(profile as any).nameDisplayEmojiUrl && (
              <img
                src={(profile as any).nameDisplayEmojiUrl}
                alt="emoji"
                className="w-6 h-6 rounded-md object-cover inline-block"
              />
            )}
            {profile.displayName || profile.username}
            {/* Profile badge emoji */}
            {(profile as any).profileBadgeEmojiUrl && (
              <img
                src={(profile as any).profileBadgeEmojiUrl}
                alt="badge"
                className="w-6 h-6 rounded-md object-cover border border-border/40 shadow-sm"
              />
            )}
          </h1>
          <p className="text-muted-foreground text-sm">@{profile.username}</p>
          {profile.bio && (
             <MentionText content={profile.bio} className="text-sm mt-2 text-foreground/90 whitespace-pre-wrap block" />
          )}
        </div>

        {/* Stats */}
        <div className="flex gap-6 mb-8 border-y border-border/50 py-3">
          <div className="flex flex-col">
            <span className="font-bold text-foreground text-lg">{profile.postsCount}</span>
            <span className="text-xs text-muted-foreground">{t("profile_posts")}</span>
          </div>
          <Link href={`/profile/${profile.username}/followers`} className="flex flex-col hover:opacity-70 transition-opacity">
            <span className="font-bold text-foreground text-lg">{profile.followersCount}</span>
            <span className="text-xs text-muted-foreground">{t("profile_followers")}</span>
          </Link>
          <Link href={`/profile/${profile.username}/following`} className="flex flex-col hover:opacity-70 transition-opacity">
            <span className="font-bold text-foreground text-lg">{profile.followingCount}</span>
            <span className="text-xs text-muted-foreground">{t("profile_following_count")}</span>
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border/50">
          <button 
            onClick={() => setTab("posts")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 border-b-2 transition-colors ${tab === "posts" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            <Grid className="w-4 h-4" />
            <span className="text-sm font-semibold uppercase tracking-wider hidden sm:inline">{t("profile_tab_posts")}</span>
          </button>
          <button 
            onClick={() => setTab("reels")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 border-b-2 transition-colors ${tab === "reels" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            <Video className="w-4 h-4" />
            <span className="text-sm font-semibold uppercase tracking-wider hidden sm:inline">{t("profile_tab_reels")}</span>
          </button>
          {showSavedTab && (
            <button 
              onClick={() => setTab("saved")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 border-b-2 transition-colors ${tab === "saved" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              <Bookmark className="w-4 h-4" />
              <span className="text-sm font-semibold uppercase tracking-wider hidden sm:inline">{t("profile_tab_saved")}</span>
            </button>
          )}
        </div>

        {/* Content */}
        <div className="mt-4">
          {tab === "posts" && (
            <div className="space-y-0">
              {postsPage?.items.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground bg-secondary/20 rounded-2xl border border-border/50">
                  {t("profile_no_posts")}
                </div>
              ) : (
                postsPage?.items.map(post => (
                  <PostCard key={post.id} post={post} currentUserId={me?.id} />
                ))
              )}
            </div>
          )}
          {tab === "reels" && (
            <div className="py-12 text-center text-muted-foreground bg-secondary/20 rounded-2xl border border-border/50">
              {t("profile_reels_soon")}
            </div>
          )}
          {tab === "saved" && showSavedTab && (
            <SavedPostsTab username={targetUsername} isMe={isMe} />
          )}
        </div>
      </div>

      {isMe && (
        <EditProfileDialog open={editOpen} onOpenChange={setEditOpen} profile={profile} />
      )}
    </div>
  );
}
