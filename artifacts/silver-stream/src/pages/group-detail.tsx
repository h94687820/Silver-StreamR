import { useState } from "react";
import { useRoute, Redirect } from "wouter";
import {
  useGetGroup, getGetGroupQueryKey,
  useGetGroupMembers, getGetGroupMembersQueryKey,
  useJoinGroup, useLeaveGroup, useDeleteGroup,
  getGetGroupsQueryKey, getGetMyGroupsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Crown, Users, Trash2 } from "lucide-react";

export default function GroupDetail() {
  const [, params] = useRoute("/groups/:groupId");
  const groupId = params?.groupId || "";
  const queryClient = useQueryClient();

  const { data: group, isLoading } = useGetGroup(groupId, {
    query: { enabled: !!groupId, queryKey: getGetGroupQueryKey(groupId) }
  });

  const { data: membersPage } = useGetGroupMembers(groupId, undefined, {
    query: { enabled: !!groupId, queryKey: getGetGroupMembersQueryKey(groupId) }
  });

  const joinMutation = useJoinGroup();
  const leaveMutation = useLeaveGroup();
  const deleteMutation = useDeleteGroup();

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: getGetGroupQueryKey(groupId) });
    queryClient.invalidateQueries({ queryKey: getGetGroupMembersQueryKey(groupId) });
    queryClient.invalidateQueries({ queryKey: getGetGroupsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetMyGroupsQueryKey() });
  };

  const handleJoin = () => joinMutation.mutate({ groupId }, { onSuccess: invalidateAll });
  const handleLeave = () => leaveMutation.mutate({ groupId }, { onSuccess: invalidateAll });

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
      </div>

      <div className="p-4 space-y-4">
        {group.description && (
          <p className="text-sm text-foreground/90 bg-secondary/30 rounded-2xl p-4 whitespace-pre-wrap">
            {group.description}
          </p>
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
          <Button
            onClick={group.isMember ? handleLeave : handleJoin}
            className={`w-full rounded-xl ${group.isMember ? "bg-secondary text-foreground hover:bg-destructive/10 hover:text-destructive" : "silver-shimmer"}`}
          >
            {group.isMember ? "Leave Group" : "Join Group"}
          </Button>
        )}

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
      </div>
    </div>
  );
}
