import { useState } from "react";
import { useRoute, Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, Send, Trash2, Pencil, X, Check, CornerDownRight, ChevronDown, ChevronUp } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetPost, getGetPostQueryKey,
  useGetComments, getGetCommentsQueryKey,
  useCreateComment, useDeleteComment, useUpdateComment,
  useGetReplies, getGetRepliesQueryKey, useCreateReply,
  useGetMe,
} from "@workspace/api-client-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PostCard } from "@/components/post-card";
import { MentionText } from "@/components/mention-text";
import { MentionTextarea } from "@/components/mention-textarea";

/* ── Replies list ─────────────────────────────────────────── */
function CommentReplies({ commentId, postId }: { commentId: string; postId: string }) {
  const queryClient = useQueryClient();
  const { data: repliesPage, isLoading } = useGetReplies(commentId, {
    query: { queryKey: getGetRepliesQueryKey(commentId) },
  });
  const deleteMutation = useDeleteComment();
  const updateMutation = useUpdateComment();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [replyingToReply, setReplyingToReply] = useState<{ id: string; username: string } | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getGetRepliesQueryKey(commentId) });
    queryClient.invalidateQueries({ queryKey: getGetCommentsQueryKey(postId) });
  };

  if (isLoading) {
    return <p className="ml-11 mt-1 text-xs text-muted-foreground animate-pulse">Loading replies…</p>;
  }
  if (!repliesPage?.items.length) return null;

  return (
    <div className="ml-11 mt-2 space-y-2 border-l-2 border-border/40 pl-3">
      {repliesPage.items.map(reply => (
        <div key={reply.id}>
          <div className="flex items-start gap-2">
            <Link href={`/profile/${reply.author.username}`}>
              <Avatar className="w-6 h-6 shrink-0">
                <AvatarImage src={reply.author.avatarUrl || undefined} />
                <AvatarFallback className="text-[10px]">
                  {reply.author.displayName?.[0] || reply.author.username[0]}
                </AvatarFallback>
              </Avatar>
            </Link>
            <div className="flex-1 bg-secondary/40 rounded-xl px-2.5 py-1.5 min-w-0">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <Link href={`/profile/${reply.author.username}`} className="font-semibold text-xs hover:underline">
                  {reply.author.displayName || reply.author.username}
                </Link>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(reply.createdAt))} ago
                    {reply.updatedAt && " · edited"}
                  </span>
                  {reply.author?.isMe && editingId !== reply.id && (
                    <>
                      <button
                        onClick={() => { setEditingId(reply.id); setEditContent(reply.content); }}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => {
                          if (!confirm("Delete this reply?")) return;
                          deleteMutation.mutate({ commentId: reply.id }, { onSuccess: invalidate });
                        }}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {editingId === reply.id ? (
                <div className="mt-1 space-y-1">
                  <MentionTextarea
                    value={editContent}
                    onChange={setEditContent}
                    className="min-h-[44px] text-xs bg-background rounded-lg resize-none"
                  />
                  <div className="flex gap-1 justify-end">
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setEditingId(null)}>
                      <X className="w-3 h-3 mr-1" /> Cancel
                    </Button>
                    <Button
                      size="sm" className="h-6 px-2 text-xs"
                      disabled={!editContent.trim() || updateMutation.isPending}
                      onClick={() => updateMutation.mutate(
                        { commentId: reply.id, data: { content: editContent } },
                        { onSuccess: () => { setEditingId(null); invalidate(); } }
                      )}
                    >
                      <Check className="w-3 h-3 mr-1" /> Save
                    </Button>
                  </div>
                </div>
              ) : (
                <MentionText content={reply.content} className="text-xs mt-0.5 whitespace-pre-wrap break-words" />
              )}
            </div>
          </div>

          {/* Reply-to-reply action */}
          <div className="ml-8 mt-0.5">
            <button
              onClick={() => setReplyingToReply(
                replyingToReply?.id === reply.id
                  ? null
                  : { id: reply.id, username: reply.author.username }
              )}
              className="text-[11px] text-muted-foreground hover:text-foreground font-medium transition-colors flex items-center gap-1"
            >
              <CornerDownRight className="w-2.5 h-2.5" />
              {replyingToReply?.id === reply.id ? "Cancel" : "Reply"}
            </button>
          </div>

          {/* Inline input for reply-to-reply */}
          {replyingToReply?.id === reply.id && (
            <ReplyInput
              commentId={commentId}
              postId={postId}
              prefill={`@${replyingToReply.username} `}
              onDone={() => setReplyingToReply(null)}
            />
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Inline reply input ───────────────────────────────────── */
function ReplyInput({
  commentId, postId, prefill = "", onDone,
}: {
  commentId: string; postId: string; prefill?: string; onDone: () => void;
}) {
  const [text, setText] = useState(prefill);
  const queryClient = useQueryClient();
  const createReply = useCreateReply();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    createReply.mutate(
      { commentId, data: { content: text } },
      {
        onSuccess: () => {
          setText("");
          queryClient.invalidateQueries({ queryKey: getGetRepliesQueryKey(commentId) });
          queryClient.invalidateQueries({ queryKey: getGetCommentsQueryKey(postId) });
          onDone();
        },
      }
    );
  };

  return (
    <form onSubmit={submit} className="ml-11 mt-1.5 flex gap-1.5 items-end">
      <MentionTextarea
        value={text}
        onChange={setText}
        placeholder="Write a reply… use @ to mention"
        className="flex-1 min-h-[36px] max-h-24 rounded-xl bg-secondary/50 border-transparent focus-visible:bg-background resize-none py-2 text-sm"
        rows={1}
      />
      <Button
        type="submit" size="icon"
        disabled={!text.trim() || createReply.isPending}
        className="h-8 w-8 rounded-full shrink-0"
      >
        <Send className="w-3.5 h-3.5 rtl:-scale-x-100" />
      </Button>
    </form>
  );
}

/* ── Main page ────────────────────────────────────────────── */
export default function PostDetail() {
  const [, params] = useRoute("/post/:id");
  const postId = params?.id || "";
  const [content, setContent] = useState("");
  const queryClient = useQueryClient();

  const { data: me } = useGetMe();
  const { data: post, isLoading: postLoading } = useGetPost(postId, {
    query: { enabled: !!postId, queryKey: getGetPostQueryKey(postId) },
  });
  const { data: commentsPage, isLoading: commentsLoading } = useGetComments(postId, undefined, {
    query: { enabled: !!postId, queryKey: getGetCommentsQueryKey(postId) },
  });

  const createMutation = useCreateComment();
  const deleteMutation = useDeleteComment();
  const updateMutation = useUpdateComment();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getGetCommentsQueryKey(postId) });
    queryClient.invalidateQueries({ queryKey: getGetPostQueryKey(postId) });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    createMutation.mutate({ postId, data: { content } }, {
      onSuccess: () => { setContent(""); invalidate(); },
    });
  };

  const toggleReplies = (commentId: string) => {
    setExpandedReplies(prev => {
      const next = new Set(prev);
      next.has(commentId) ? next.delete(commentId) : next.add(commentId);
      return next;
    });
  };

  return (
    <div className="flex flex-col min-h-[calc(100dvh-56px)] bg-background">
      {/* Header */}
      <div className="sticky top-14 z-30 bg-background/95 backdrop-blur-xl border-b border-border/50 p-3 flex items-center gap-3">
        <Link href="/feed" className="p-2 -ml-2 rtl:-ml-0 rtl:-mr-2 rounded-full hover:bg-secondary">
          <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
        </Link>
        <p className="font-semibold text-foreground">Post</p>
      </div>

      {/* Post */}
      {postLoading ? (
        <div className="text-center text-muted-foreground p-8">Loading post…</div>
      ) : post ? (
        <PostCard post={post} currentUserId={me?.id} />
      ) : (
        <div className="text-center text-muted-foreground p-8">Post not found.</div>
      )}

      {/* Comments list */}
      <div className="flex-1 px-4 py-3 space-y-5 pb-6">
        {commentsLoading ? (
          <div className="text-center text-muted-foreground p-8">Loading comments…</div>
        ) : !commentsPage?.items.length ? (
          <div className="text-center text-muted-foreground py-8 text-sm">
            No comments yet. Be the first to comment.
          </div>
        ) : (
          commentsPage.items.map(comment => (
            <div key={comment.id}>
              {/* Comment bubble */}
              <div className="flex items-start gap-3">
                <Link href={`/profile/${comment.author.username}`}>
                  <Avatar className="w-8 h-8 shrink-0">
                    <AvatarImage src={comment.author.avatarUrl || undefined} />
                    <AvatarFallback>
                      {comment.author.displayName?.[0] || comment.author.username[0]}
                    </AvatarFallback>
                  </Avatar>
                </Link>
                <div className="flex-1 bg-secondary/50 rounded-2xl px-3 py-2 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <Link href={`/profile/${comment.author.username}`} className="font-semibold text-sm hover:underline">
                      {comment.author.displayName || comment.author.username}
                    </Link>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.createdAt))} ago
                        {comment.updatedAt && " · edited"}
                      </span>
                      {comment.author?.isMe && editingId !== comment.id && (
                        <>
                          <button
                            onClick={() => { setEditingId(comment.id); setEditContent(comment.content); }}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (!confirm("Delete this comment?")) return;
                              deleteMutation.mutate({ commentId: comment.id }, { onSuccess: invalidate });
                            }}
                            className="text-muted-foreground hover:text-destructive transition-colors"
                          >
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
                        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditingId(null)}>
                          <X className="w-3.5 h-3.5 mr-1" /> Cancel
                        </Button>
                        <Button
                          size="sm" className="h-7 px-2"
                          disabled={!editContent.trim() || updateMutation.isPending}
                          onClick={() => updateMutation.mutate(
                            { commentId: comment.id, data: { content: editContent } },
                            { onSuccess: () => { setEditingId(null); invalidate(); } }
                          )}
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

              {/* Action row: Reply + Show replies */}
              <div className="ml-11 mt-1 flex items-center gap-4">
                <button
                  onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                  className="text-xs text-muted-foreground hover:text-foreground font-medium transition-colors flex items-center gap-1"
                >
                  <CornerDownRight className="w-3 h-3" />
                  {replyingTo === comment.id ? "Cancel" : "Reply"}
                </button>

                {(comment.repliesCount ?? 0) > 0 && (
                  <button
                    onClick={() => toggleReplies(comment.id)}
                    className="text-xs text-accent font-semibold transition-colors flex items-center gap-1"
                  >
                    {expandedReplies.has(comment.id) ? (
                      <><ChevronUp className="w-3.5 h-3.5" /> Hide replies</>
                    ) : (
                      <><ChevronDown className="w-3.5 h-3.5" /> Show replies ({comment.repliesCount})</>
                    )}
                  </button>
                )}
              </div>

              {/* Inline reply textarea */}
              {replyingTo === comment.id && (
                <ReplyInput
                  commentId={comment.id}
                  postId={postId}
                  onDone={() => {
                    setReplyingTo(null);
                    // Auto-expand to show the new reply
                    setExpandedReplies(prev => new Set([...prev, comment.id]));
                  }}
                />
              )}

              {/* Expanded replies */}
              {expandedReplies.has(comment.id) && (
                <CommentReplies commentId={comment.id} postId={postId} />
              )}
            </div>
          ))
        )}
      </div>

      {/* New comment input */}
      <form
        onSubmit={handleSubmit}
        className="p-3 border-t border-border/50 bg-background flex gap-2 items-end sticky bottom-0"
      >
        <div className="flex-1">
          <MentionTextarea
            value={content}
            onChange={setContent}
            placeholder="Add a comment… use @ to mention"
            className="min-h-[44px] max-h-32 rounded-2xl bg-secondary/50 border-transparent focus-visible:bg-background resize-none py-2.5"
            rows={1}
          />
        </div>
        <Button
          type="submit" size="icon"
          disabled={!content.trim() || createMutation.isPending}
          className="h-11 w-11 rounded-full silver-shimmer shrink-0"
        >
          <Send className="w-5 h-5 rtl:-scale-x-100" />
        </Button>
      </form>
    </div>
  );
}
