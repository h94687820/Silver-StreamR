import { useState, useRef } from "react";
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
import { cn } from "@/lib/utils";
import type { Post } from "@workspace/api-client-react";
import { 
  useReactToPost, 
  useRemoveReaction, 
  useSavePost, 
  useUnsavePost,
  useDeletePost,
  useUpdatePost
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

interface PostCardProps {
  post: Post;
  currentUserId?: string;
}

export function PostCard({ post, currentUserId }: PostCardProps) {
  const queryClient = useQueryClient();
  const isOwner = currentUserId === post.authorId;
  const [showMenu, setShowMenu] = useState(false);
  
  const reactMutation = useReactToPost();
  const removeReactionMutation = useRemoveReaction();
  const saveMutation = useSavePost();
  const unsaveMutation = useUnsavePost();
  const deleteMutation = useDeletePost();
  const updateMutation = useUpdatePost();

  const handleLike = () => {
    if (post.myReaction === 'like') {
      removeReactionMutation.mutate({ postId: post.id }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/feed"] })
      });
    } else {
      reactMutation.mutate({ postId: post.id, data: { type: 'like' } }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/feed"] })
      });
    }
  };

  const handleDislike = () => {
    if (post.myReaction === 'dislike') {
      removeReactionMutation.mutate({ postId: post.id }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/feed"] })
      });
    } else {
      reactMutation.mutate({ postId: post.id, data: { type: 'dislike' } }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/feed"] })
      });
    }
  };

  const handleSave = () => {
    if (post.isSaved) {
      unsaveMutation.mutate({ postId: post.id }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/feed"] })
      });
    } else {
      saveMutation.mutate({ postId: post.id }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/feed"] })
      });
    }
  };

  const handleDelete = () => {
    if (confirm("Delete this post?")) {
      deleteMutation.mutate({ postId: post.id }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/feed"] })
      });
    }
  };

  const togglePrivacy = () => {
    updateMutation.mutate({ postId: post.id, data: { isPrivate: !post.isPrivate } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/feed"] })
    });
  };

  return (
    <div className="bg-card border-b border-border/50 py-4 px-4 sm:px-0 sm:border sm:rounded-2xl sm:my-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <Link href={`/profile/${post.author.username}`} className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={post.author.avatarUrl || undefined} />
            <AvatarFallback>{post.author.displayName?.[0] || post.author.username[0]}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-sm leading-tight flex items-center gap-1">
              {post.author.displayName || post.author.username}
              {post.isPrivate && <Lock className="w-3 h-3 text-muted-foreground ml-1" />}
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
            <div className="absolute right-0 top-full mt-1 w-48 bg-popover border border-popover-border shadow-lg rounded-xl overflow-hidden z-10 animate-in fade-in zoom-in-95">
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
          <p className="text-sm whitespace-pre-wrap break-words">{post.content}</p>
        )}
      </div>

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
          <button onClick={handleLike} className={cn("flex items-center gap-1.5 p-2 rounded-full transition-colors", post.myReaction === 'like' ? "text-destructive" : "hover:text-foreground hover:bg-secondary")}>
            <Heart className={cn("w-5 h-5", post.myReaction === 'like' && "fill-current")} />
            <span className="text-xs font-medium">{post.likesCount > 0 && post.likesCount}</span>
          </button>
          
          <button onClick={handleDislike} className={cn("flex items-center gap-1.5 p-2 rounded-full transition-colors", post.myReaction === 'dislike' ? "text-accent" : "hover:text-foreground hover:bg-secondary")}>
            <HeartCrack className={cn("w-5 h-5", post.myReaction === 'dislike' && "fill-current")} />
            <span className="text-xs font-medium">{post.dislikesCount > 0 && post.dislikesCount}</span>
          </button>

          <Link href={`/post/${post.id}`} className="flex items-center gap-1.5 p-2 rounded-full hover:text-foreground hover:bg-secondary transition-colors">
            <MessageCircle className="w-5 h-5" />
            <span className="text-xs font-medium">{post.commentsCount > 0 && post.commentsCount}</span>
          </Link>
        </div>

        <div className="flex items-center gap-1">
          <button onClick={handleSave} className={cn("p-2 rounded-full transition-colors", post.isSaved ? "text-accent" : "hover:text-foreground hover:bg-secondary")}>
            <Bookmark className={cn("w-5 h-5", post.isSaved && "fill-current")} />
          </button>
        </div>
      </div>
    </div>
  );
}
