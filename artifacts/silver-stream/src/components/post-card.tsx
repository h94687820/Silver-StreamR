import { useState, useRef, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { 
  Heart, 
  HeartCrack, 
  MessageCircle, 
  Bookmark, 
  Share2, 
  MoreHorizontal,
  Trash2,
  Lock,
  Globe,
  Edit2
} from "lucide-react";
import { Link } from "wouter";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MentionText } from "@/components/mention-text";
import { cn } from "@/lib/utils";
import type { Post } from "@workspace/api-client-react";
import { 
  useReactToPost, 
  useRemoveReaction, 
  useSavePost, 
  useUnsavePost,
  useDeletePost,
  useUpdatePost,
  getGetFeedQueryKey,
  getGetSavedPostsQueryKey,
  getGetPrivatePostsQueryKey,
  getGetPostQueryKey,
  getGetUserPostsQueryKey,
  getGetUserByUsernameQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

interface PostCardProps {
  post: Post;
  currentUserId?: string;
}

function syncQueries(queryClient: ReturnType<typeof useQueryClient>, post: Post) {
  queryClient.invalidateQueries({ queryKey: getGetFeedQueryKey() });
  queryClient.invalidateQueries({ queryKey: getGetSavedPostsQueryKey() });
  queryClient.invalidateQueries({ queryKey: getGetPrivatePostsQueryKey() });
  queryClient.invalidateQueries({ queryKey: getGetPostQueryKey(post.id) });
  queryClient.invalidateQueries({ queryKey: getGetUserPostsQueryKey(post.author.username) });
}

export function PostCard({ post, currentUserId }: PostCardProps) {
  const queryClient = useQueryClient();
  const isOwner = currentUserId === post.authorId;
  const [showMenu, setShowMenu] = useState(false);

  // Local optimistic overrides so likes/dislikes/saves reflect instantly on
  // click instead of waiting on the mutation + cache-invalidation round trip.
  const [local, setLocal] = useState({
    myReaction: post.myReaction,
    likesCount: post.likesCount,
    dislikesCount: post.dislikesCount,
    isSaved: post.isSaved,
  });

  useEffect(() => {
    setLocal({
      myReaction: post.myReaction,
      likesCount: post.likesCount,
      dislikesCount: post.dislikesCount,
      isSaved: post.isSaved,
    });
  }, [post.id, post.myReaction, post.likesCount, post.dislikesCount, post.isSaved]);

  const reactMutation = useReactToPost();
  const removeReactionMutation = useRemoveReaction();
  const saveMutation = useSavePost();
  const unsaveMutation = useUnsavePost();
  const deleteMutation = useDeletePost();
  const updateMutation = useUpdatePost();

  const handleLike = () => {
    const prev = local;
    const wasLiked = prev.myReaction === 'like';
    const wasDisliked = prev.myReaction === 'dislike';

    setLocal({
      myReaction: wasLiked ? null : 'like',
      likesCount: prev.likesCount + (wasLiked ? -1 : 1),
      dislikesCount: wasDisliked ? prev.dislikesCount - 1 : prev.dislikesCount,
      isSaved: prev.isSaved,
    });

    const onError = () => setLocal(prev);
    const onSuccess = () => syncQueries(queryClient, post);

    if (wasLiked) {
      removeReactionMutation.mutate({ postId: post.id }, { onSuccess, onError });
    } else {
      reactMutation.mutate({ postId: post.id, data: { type: 'like' } }, { onSuccess, onError });
    }
  };

  const handleDislike = () => {
    const prev = local;
    const wasDisliked = prev.myReaction === 'dislike';
    const wasLiked = prev.myReaction === 'like';

    setLocal({
      myReaction: wasDisliked ? null : 'dislike',
      dislikesCount: prev.dislikesCount + (wasDisliked ? -1 : 1),
      likesCount: wasLiked ? prev.likesCount - 1 : prev.likesCount,
      isSaved: prev.isSaved,
    });

    const onError = () => setLocal(prev);
    const onSuccess = () => syncQueries(queryClient, post);

    if (wasDisliked) {
      removeReactionMutation.mutate({ postId: post.id }, { onSuccess, onError });
    } else {
      reactMutation.mutate({ postId: post.id, data: { type: 'dislike' } }, { onSuccess, onError });
    }
  };

  const handleSave = () => {
    const prev = local;
    setLocal({ ...prev, isSaved: !prev.isSaved });

    const onError = () => setLocal(prev);
    const onSuccess = () => syncQueries(queryClient, post);

    if (prev.isSaved) {
      unsaveMutation.mutate({ postId: post.id }, { onSuccess, onError });
    } else {
      saveMutation.mutate({ postId: post.id }, { onSuccess, onError });
    }
  };

  const handleDelete = () => {
    if (!confirm("Delete this post?")) return;

    const username = post.author.username;
    const postsKey = getGetUserPostsQueryKey(username);
    const profileKey = getGetUserByUsernameQueryKey(username);

    // ── Optimistic: remove post from list immediately ─────────────────────
    const prevPosts = queryClient.getQueryData(postsKey);
    queryClient.setQueryData(postsKey, (old: any) => {
      if (!old) return old;
      return { ...old, items: old.items.filter((p: any) => p.id !== post.id) };
    });

    // ── Optimistic: decrement postsCount in profile ───────────────────────
    const prevProfile = queryClient.getQueryData(profileKey);
    queryClient.setQueryData(profileKey, (old: any) => {
      if (!old) return old;
      return { ...old, postsCount: Math.max(0, (old.postsCount ?? 1) - 1) };
    });

    deleteMutation.mutate({ postId: post.id }, {
      onSuccess: () => syncQueries(queryClient, post),
      onError: () => {
        // Roll back optimistic updates on failure
        queryClient.setQueryData(postsKey, prevPosts);
        queryClient.setQueryData(profileKey, prevProfile);
      },
    });
  };

  const togglePrivacy = () => {
    updateMutation.mutate({ postId: post.id, data: { isPrivate: !post.isPrivate } }, {
      onSuccess: () => syncQueries(queryClient, post)
    });
  };

  return (
    <div className="bg-card border-b border-border/50 py-4 px-4 sm:px-0 sm:border sm:rounded-2xl sm:my-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <Link href={`/profile/${post.author.username}`} className="flex items-center gap-3">
          <div className="relative">
            <Avatar>
              <AvatarImage src={post.author.avatarUrl || undefined} />
              <AvatarFallback>{post.author.displayName?.[0] || post.author.username[0]}</AvatarFallback>
            </Avatar>
            {/* Profile badge emoji */}
            {(post.author as any).profileBadgeEmojiUrl && (
              <img
                src={(post.author as any).profileBadgeEmojiUrl}
                alt="badge"
                className="absolute -bottom-1 -end-1 w-5 h-5 rounded-md object-cover border border-background shadow-sm"
              />
            )}
          </div>
          <div>
            <p className="font-semibold text-sm leading-tight flex items-center gap-1.5">
              {/* Name display emoji */}
              {(post.author as any).nameDisplayEmojiUrl && (
                <img
                  src={(post.author as any).nameDisplayEmojiUrl}
                  alt="emoji"
                  className="w-4 h-4 rounded-sm object-cover inline-block"
                />
              )}
              {post.author.displayName || post.author.username}
              {post.isPrivate && <Lock className="w-3 h-3 text-muted-foreground" />}
            </p>
            <p className="text-xs text-muted-foreground">
              @{post.author.username} • {formatDistanceToNow(new Date(post.createdAt))} ago
            </p>
          </div>
        </Link>

        <div className="relative">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground rounded-full" onClick={() => setShowMenu(!showMenu)}>
            <MoreHorizontal className="w-5 h-5" />
          </Button>
          
          {showMenu && (
            <div className="absolute end-0 top-full mt-1 w-48 max-w-[calc(100vw-2rem)] bg-popover border border-popover-border shadow-lg rounded-xl overflow-hidden z-10 animate-in fade-in zoom-in-95">
              {isOwner && (
                <>
                  <button onClick={() => { setShowMenu(false); togglePrivacy(); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-secondary transition-colors">
                    {post.isPrivate ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    {post.isPrivate ? "Make Public" : "Make Private"}
                  </button>
                  <button onClick={() => { setShowMenu(false); handleDelete(); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-destructive hover:bg-destructive/10 transition-colors">
                    <Trash2 className="w-4 h-4" /> Delete Post
                  </button>
                </>
              )}
              <button onClick={() => { setShowMenu(false); navigator.share?.({ url: `${window.location.origin}/post/${post.id}` }); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-secondary transition-colors">
                <Share2 className="w-4 h-4" /> Share Link
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="mb-3">
        {post.content && (
          <MentionText content={post.content} className="text-sm whitespace-pre-wrap break-words" />
        )}
      </div>

      {/* Post stamp emoji */}
      {(post.author as any).postStampEmojiUrl && (
        <div className="flex justify-end mb-2">
          <div className="relative inline-block">
            <img
              src={(post.author as any).postStampEmojiUrl}
              alt="stamp"
              className="w-10 h-10 rounded-xl object-cover border-2 border-border/40 shadow opacity-80"
              style={{ transform: "rotate(-8deg)" }}
            />
          </div>
        </div>
      )}

      {/* Media */}
      {post.mediaUrls && post.mediaUrls.length > 0 && (
        <div className="rounded-xl overflow-hidden mb-3 bg-secondary">
          {post.mediaType === 'video' ? (
            <video src={post.mediaUrls[0]} controls className="w-full h-auto max-h-[60vh] object-cover" />
          ) : (
            <img src={post.mediaUrls[0]} alt="Post media" className="w-full h-auto max-h-[60vh] object-cover" />
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-1 text-muted-foreground border-t border-border/30 mt-2">
        <div className="flex items-center gap-4">
          <button onClick={handleLike} className={cn("flex items-center gap-1.5 p-2 rounded-full transition-colors", local.myReaction === 'like' ? "text-destructive" : "hover:text-foreground hover:bg-secondary")}>
            <Heart className={cn("w-5 h-5", local.myReaction === 'like' && "fill-current")} />
            <span className="text-xs font-medium">{local.likesCount > 0 && local.likesCount}</span>
          </button>
          
          <button onClick={handleDislike} className={cn("flex items-center gap-1.5 p-2 rounded-full transition-colors", local.myReaction === 'dislike' ? "text-accent" : "hover:text-foreground hover:bg-secondary")}>
            <HeartCrack className={cn("w-5 h-5", local.myReaction === 'dislike' && "fill-current")} />
            <span className="text-xs font-medium">{local.dislikesCount > 0 && local.dislikesCount}</span>
          </button>

          <Link href={`/post/${post.id}`} className="flex items-center gap-1.5 p-2 rounded-full hover:text-foreground hover:bg-secondary transition-colors">
            <MessageCircle className="w-5 h-5" />
            <span className="text-xs font-medium">{post.commentsCount > 0 && post.commentsCount}</span>
          </Link>
        </div>

        <div className="flex items-center gap-1">
          <button onClick={handleSave} className={cn("p-2 rounded-full transition-colors", local.isSaved ? "text-accent" : "hover:text-foreground hover:bg-secondary")}>
            <Bookmark className={cn("w-5 h-5", local.isSaved && "fill-current")} />
          </button>
        </div>
      </div>
    </div>
  );
}
