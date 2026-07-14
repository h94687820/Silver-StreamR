import { useState } from "react";
import { useRoute, Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, Send, Trash2, Pencil, X, Check } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetPost, getGetPostQueryKey,
  useGetComments, getGetCommentsQueryKey,
  useCreateComment, useDeleteComment, useUpdateComment,
  useGetMe,
} from "@workspace/api-client-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PostCard } from "@/components/post-card";
import { MentionText } from "@/components/mention-text";
import { MentionTextarea } from "@/components/mention-textarea";

export default function PostDetail() {
  const [, params] = useRoute("/post/:id");
  const postId = params?.id || "";
  const [content, setContent] = useState("");
  const queryClient = useQueryClient();

  const { data: me } = useGetMe();

  const { data: post, isLoading: postLoading } = useGetPost(postId, {
    query: { enabled: !!postId, queryKey: getGetPostQueryKey(postId) }
  });

  const { data: commentsPage, isLoading: commentsLoading } = useGetComments(postId, undefined, {
    query: { enabled: !!postId, queryKey: getGetCommentsQueryKey(postId) }
  });

  const createMutation = useCreateComment();
  const deleteMutation = useDeleteComment();
  const updateMutation = useUpdateComment();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getGetCommentsQueryKey(postId) });
    queryClient.invalidateQueries({ queryKey: getGetPostQueryKey(postId) });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    createMutation.mutate({ postId, data: { content } }, {
      onSuccess: () => {
        setContent("");
        invalidate();
      }
    });
  };

  const handleDelete = (commentId: string) => {
    if (!confirm("Delete this comment?")) return;
    deleteMutation.mutate({ commentId }, { onSuccess: invalidate });
  };

  const startEdit = (commentId: string, currentContent: string) => {
    setEditingId(commentId);
    setEditContent(currentContent);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditContent("");
  };

  const saveEdit = (commentId: string) => {
    if (!editContent.trim()) return;
    updateMutation.mutate({ commentId, data: { content: editContent } }, {
      onSuccess: () => {
        cancelEdit();
        invalidate();
      }
    });
  };

  return (
    <div className="flex flex-col min-h-[calc(100dvh-56px)] bg-background">
      <div className="sticky top-14 z-30 bg-background/95 backdrop-blur-xl border-b border-border/50 p-3 flex items-center gap-3">
        <Link href="/feed" className="p-2 -ml-2 rtl:-ml-0 rtl:-mr-2 rounded-full hover:bg-secondary">
          <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
        </Link>
        <p className="font-semibold text-foreground">Post</p>
      </div>

      {postLoading ? (
        <div className="text-center text-muted-foreground p-8">Loading post...</div>
      ) : post ? (
        <PostCard post={post} currentUserId={me?.id} />
      ) : (
        <div className="text-center text-muted-foreground p-8">Post not found.</div>
      )}

      <div className="flex-1 px-4 py-2 space-y-4">
        {commentsLoading ? (
          <div className="text-center text-muted-foreground p-8">Loading comments...</div>
        ) : commentsPage?.items.length === 0 ? (
          <div className="text-center text-muted-foreground py-8 text-sm">
            No comments yet. Be the first to comment.
          </div>
        ) : (
          commentsPage?.items.map(comment => (
            <div key={comment.id} className="flex items-start gap-3">
              <Link href={`/profile/${comment.author.username}`}>
                <Avatar className="w-8 h-8">
                  <AvatarImage src={comment.author.avatarUrl || undefined} />
                  <AvatarFallback>{comment.author.displayName?.[0] || comment.author.username[0]}</AvatarFallback>
                </Avatar>
              </Link>
              <div className="flex-1 bg-secondary/50 rounded-2xl px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <Link href={`/profile/${comment.author.username}`} className="font-semibold text-sm hover:underline">
                    {comment.author.displayName || comment.author.username}
                  </Link>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.createdAt))} ago
                      {comment.updatedAt && " · edited"}
                    </span>
                    {comment.author?.isMe && editingId !== comment.id && (
                      <>
                        <button onClick={() => startEdit(comment.id, comment.content)} className="text-muted-foreground hover:text-foreground transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(comment.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {editingId === comment.id ? (
                  <div className="mt-1 space-y-2">
                    <MentionTextarea
                      value={editContent}
                      onChange={setEditContent}
                      className="min-h-[60px] text-sm bg-background rounded-xl resize-none"
                    />
                    <div className="flex items-center gap-2 justify-end">
                      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={cancelEdit}>
                        <X className="w-3.5 h-3.5 mr-1" /> Cancel
                      </Button>
                      <Button
                        size="sm"
                        className="h-7 px-2"
                        disabled={!editContent.trim() || updateMutation.isPending}
                        onClick={() => saveEdit(comment.id)}
                      >
                        <Check className="w-3.5 h-3.5 mr-1" /> Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <MentionText content={comment.content} className="text-sm mt-0.5 whitespace-pre-wrap break-words" />
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-3 border-t border-border/50 bg-background flex gap-2 items-end sticky bottom-0">
        <div className="flex-1">
          <MentionTextarea
            value={content}
            onChange={setContent}
            placeholder="Add a comment... use @ to mention someone"
            className="min-h-[44px] max-h-32 rounded-2xl bg-secondary/50 border-transparent focus-visible:bg-background resize-none py-2.5"
            rows={1}
          />
        </div>
        <Button
          type="submit"
          size="icon"
          disabled={!content.trim() || createMutation.isPending}
          className="h-11 w-11 rounded-full silver-shimmer shrink-0"
        >
          <Send className="w-5 h-5 rtl:-scale-x-100" />
        </Button>
      </form>
    </div>
  );
}
