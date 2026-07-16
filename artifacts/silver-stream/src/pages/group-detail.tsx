import { useState } from "react";
import { useRoute, Redirect, Link } from "wouter";
import {
  useGetGroup, getGetGroupQueryKey,
  useGetGroupMembers, getGetGroupMembersQueryKey,
  useGetGroupPosts, getGetGroupPostsQueryKey,
  useJoinGroup, useLeaveGroup, useDeleteGroup,
  useCreateGroupPost,
  useGetMe,
  getGetGroupsQueryKey, getGetMyGroupsQueryKey,
} from "@workspace/api-client-react";
import { uploadFileAndGetUrl } from "@/lib/upload";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PostCard } from "@/components/post-card";
import { MentionTextarea } from "@/components/mention-textarea";
import { MentionText } from "@/components/mention-text";
import { EditGroupDialog } from "@/components/edit-group-dialog";
import { Crown, Users, Trash2, Pencil, Send, ImagePlus, Video, X, Flag } from "lucide-react";
import { ReportDialog } from "@/components/report-dialog";

export default function GroupDetail() {
  const [, params] = useRoute("/groups/:groupId");
  const groupId = params?.groupId || "";
  const queryClient = useQueryClient();
  const { data: me } = useGetMe();

  const [tab, setTab] = useState<"posts" | "members">("posts");
  const [editOpen, setEditOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [postContent, setPostContent] = useState("");
  const [postFile, setPostFile] = useState<File | null>(null);
  const [postPreview, setPostPreview] = useState<string | null>(null);
  const [isUploadingPost, setIsUploadingPost] = useState(false);

  const { data: group, isLoading } = useGetGroup(groupId, {
    query: { enabled: !!groupId, queryKey: getGetGroupQueryKey(groupId) }
  });

  const { data: membersPage } = useGetGroupMembers(groupId, undefined, {
    query: { enabled: !!groupId, queryKey: getGetGroupMembersQueryKey(groupId) }
  });

  const { data: postsPage, isLoading: postsLoading } = useGetGroupPosts(groupId, undefined, {
    query: { enabled: !!groupId, queryKey: getGetGroupPostsQueryKey(groupId) }
  });

  const joinMutation = useJoinGroup();
  const leaveMutation = useLeaveGroup();
  const deleteMutation = useDeleteGroup();
  const createPostMutation = useCreateGroupPost();

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: getGetGroupQueryKey(groupId) });
    queryClient.invalidateQueries({ queryKey: getGetGroupMembersQueryKey(groupId) });
    queryClient.invalidateQueries({ queryKey: getGetGroupsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetMyGroupsQueryKey() });
  };

  const handleJoin = () => joinMutation.mutate({ groupId }, { onSuccess: invalidateAll });
  const handleLeave = () => leaveMutation.mutate({ groupId }, { onSuccess: invalidateAll });

  const handlePostFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setPostFile(f);
    setPostPreview(URL.createObjectURL(f));
  };

  const removePostFile = () => {
    setPostFile(null);
    setPostPreview(null);
  };

  const handlePost = async () => {
    if (!postContent.trim() && !postFile) return;
    try {
      let mediaUrls: string[] | undefined;
      let mediaType: "image" | "video" | undefined;

      if (postFile) {
        setIsUploadingPost(true);
        mediaType = postFile.type.startsWith("video") ? "video" : "image";
        mediaUrls = [await uploadFileAndGetUrl(postFile)];
      }

      await createPostMutation.mutateAsync({
        groupId,
        data: { content: postContent, mediaUrls, mediaType },
      });
      setPostContent("");
      removePostFile();
      queryClient.invalidateQueries({ queryKey: getGetGroupPostsQueryKey(groupId) });
    } catch (e) {
      console.error(e);
      alert("Failed to publish post. Please try again.");
    } finally {
      setIsUploadingPost(false);
    }
  };

  const [shouldRedirect, setShouldRedirect] = useState(false);
  const handleDelete = () => {
    if (!confirm("Delete this group? This cannot be undone.")) return;
    deleteMutation.mutate({ groupId }, {
      onSuccess: () => {
        invalidateAll();
        setShouldRedirect(true);
      }
    });
  };

  if (shouldRedirect) return <Redirect to="/groups" />;
  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading group...</div>;
  if (!group) return <div className="p-8 text-center text-destructive">Group not found</div>;

  return (
    <div className="w-full min-h-screen">
      <div className="p-6 pb-4 border-b border-border/50 flex items-start gap-4">
        <Avatar className="w-16 h-16 border-2 border-border/50">
          <AvatarImage src={group.avatarUrl || undefined} />
          <AvatarFallback className="text-xl">{group.name[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold truncate">{group.name}</h1>
            {group.isOwner && <Crown className="w-4 h-4 text-accent shrink-0" />}
          </div>
          <p className="text-sm text-muted-foreground">
            {group.membersCount} {group.membersCount === 1 ? "member" : "members"} &middot; Created by @{group.owner.username}
          </p>
        </div>
        {group.isOwner && (
          <Button variant="outline" size="icon" className="rounded-full shrink-0" onClick={() => setEditOpen(true)}>
            <Pencil className="w-4 h-4" />
          </Button>
        )}
      </div>

      <div className="p-4 space-y-4">
        {group.description && (
          <MentionText
            content={group.description}
            className="text-sm text-foreground/90 bg-secondary/30 rounded-2xl p-4 whitespace-pre-wrap block"
          />
        )}

        {group.isOwner ? (
          <Button
            variant="outline"
            onClick={handleDelete}
            className="w-full rounded-xl text-destructive border-destructive/30 hover:bg-destructive/10"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Group
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              onClick={group.isMember ? handleLeave : handleJoin}
              className={`flex-1 rounded-xl ${group.isMember ? "bg-secondary text-foreground hover:bg-destructive/10 hover:text-destructive" : "silver-shimmer"}`}
            >
              {group.isMember ? "Leave Group" : "Join Group"}
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10 shrink-0"
              onClick={() => setReportOpen(true)}
              title="Report Group"
            >
              <Flag className="w-4 h-4" />
            </Button>
          </div>
        )}

        <div className="flex bg-secondary p-1 rounded-lg">
          <button
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${tab === "posts" ? "bg-background shadow text-foreground" : "text-muted-foreground"}`}
            onClick={() => setTab("posts")}
          >
            Posts
          </button>
          <button
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${tab === "members" ? "bg-background shadow text-foreground" : "text-muted-foreground"}`}
            onClick={() => setTab("members")}
          >
            Members
          </button>
        </div>

        {tab === "posts" && (
          <section className="space-y-4">
            {group.isMember && (
              <div className="bg-card border border-border/50 rounded-2xl p-3 space-y-2">
                <MentionTextarea
                  value={postContent}
                  onChange={setPostContent}
                  placeholder={`Share something with ${group.name}... use @ to mention someone`}
                  className="min-h-[70px] resize-none border-none bg-secondary/30 rounded-xl focus-visible:ring-0"
                />

                {postPreview ? (
                  <div className="relative rounded-xl overflow-hidden bg-secondary">
                    <button
                      onClick={removePostFile}
                      className="absolute top-2 right-2 z-10 p-1.5 bg-black/50 text-white rounded-full backdrop-blur-md"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    {postFile?.type.startsWith("video") ? (
                      <video src={postPreview} controls className="w-full max-h-56 object-cover" />
                    ) : (
                      <img src={postPreview} className="w-full max-h-56 object-cover" />
                    )}
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-secondary/50 cursor-pointer transition-colors">
                      <ImagePlus className="w-4 h-4" />
                      Photo
                      <input type="file" accept="image/*" className="hidden" onChange={handlePostFileChange} />
                    </label>
                    <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-secondary/50 cursor-pointer transition-colors">
                      <Video className="w-4 h-4" />
                      Video
                      <input type="file" accept="video/*" className="hidden" onChange={handlePostFileChange} />
                    </label>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button
                    size="sm"
                    className="rounded-full silver-shimmer"
                    disabled={(!postContent.trim() && !postFile) || isUploadingPost || createPostMutation.isPending}
                    onClick={handlePost}
                  >
                    <Send className="w-3.5 h-3.5 mr-1.5 rtl:-scale-x-100" />
                    {isUploadingPost || createPostMutation.isPending ? "Posting..." : "Post"}
                  </Button>
                </div>
              </div>
            )}

            {postsLoading ? (
              <div className="py-12 text-center text-muted-foreground">Loading posts...</div>
            ) : postsPage?.items.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground bg-secondary/20 rounded-2xl border border-border/50">
                No posts in this group yet.
                {!group.isMember && <p className="text-sm mt-1">Join the group to be the first to post.</p>}
              </div>
            ) : (
              <div className="space-y-0 -mx-4 sm:mx-0">
                {postsPage?.items.map(post => (
                  <PostCard key={post.id} post={post} currentUserId={me?.id} />
                ))}
              </div>
            )}
          </section>
        )}

        {tab === "members" && (
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Members
            </h2>
            <div className="space-y-2">
              {membersPage?.items.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-sm">No members yet.</div>
              ) : (
                membersPage?.items.map((member) => (
                  <Link
                    key={member.id}
                    href={`/profile/${member.username}`}
                    className="flex items-center gap-3 bg-card border border-border/50 p-3 rounded-2xl"
                  >
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={member.avatarUrl || undefined} />
                      <AvatarFallback>{member.displayName?.[0] || member.username[0]}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">{member.displayName || member.username}</p>
                      <p className="text-xs text-muted-foreground truncate">@{member.username}</p>
                    </div>
                    {member.id === group.ownerId && <Crown className="w-3.5 h-3.5 text-accent ml-auto shrink-0" />}
                  </Link>
                ))
              )}
            </div>
          </section>
        )}
      </div>

      {group.isOwner && (
        <EditGroupDialog open={editOpen} onOpenChange={setEditOpen} group={group} />
      )}
      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        mode="specific"
        targetType="group"
        targetId={group.id}
        targetUsername={group.owner.username}
      />
    </div>
  );
}
