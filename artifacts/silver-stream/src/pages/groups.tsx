import { useState } from "react";
import { Link } from "wouter";
import {
  useGetGroups, getGetGroupsQueryKey,
  useGetMyGroups, getGetMyGroupsQueryKey,
  useCreateGroup,
  useJoinGroup, useLeaveGroup,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { useDebounce } from "@/lib/use-debounce";
import { Users, Plus, Search as SearchIcon, Crown } from "lucide-react";

export default function Groups() {
  const [tab, setTab] = useState<"discover" | "mine">("discover");
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const queryClient = useQueryClient();

  const { data: discoverPage, isLoading: discoverLoading } = useGetGroups(
    { q: debouncedQuery || undefined },
    { query: { enabled: tab === "discover", queryKey: [...getGetGroupsQueryKey(), debouncedQuery] } }
  );

  const { data: minePage, isLoading: mineLoading } = useGetMyGroups(undefined, {
    query: { enabled: tab === "mine", queryKey: getGetMyGroupsQueryKey() }
  });

  const createMutation = useCreateGroup();
  const joinMutation = useJoinGroup();
  const leaveMutation = useLeaveGroup();

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: getGetGroupsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetMyGroupsQueryKey() });
  };

  const handleCreate = () => {
    if (!name.trim()) return;
    createMutation.mutate(
      { data: { name: name.trim(), description: description.trim() || undefined } },
      {
        onSuccess: () => {
          setName("");
          setDescription("");
          setCreateOpen(false);
          setTab("mine");
          invalidateAll();
        },
      }
    );
  };

  const handleJoin = (groupId: string) => {
    joinMutation.mutate({ groupId }, { onSuccess: invalidateAll });
  };

  const handleLeave = (groupId: string) => {
    leaveMutation.mutate({ groupId }, { onSuccess: invalidateAll });
  };

  const list = tab === "discover" ? discoverPage?.items : minePage?.items;
  const isLoading = tab === "discover" ? discoverLoading : mineLoading;

  return (
    <div className="w-full min-h-screen">
      <div className="sticky top-14 z-30 bg-background/95 backdrop-blur-xl border-b border-border/50 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Groups</h1>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="rounded-full silver-shimmer">
                <Plus className="w-4 h-4 mr-1" />
                Create
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl">
              <DialogHeader>
                <DialogTitle>Create a public group</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <Input
                  placeholder="Group name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={60}
                />
                <Textarea
                  placeholder="What's this group about? (optional)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[90px] resize-none"
                  maxLength={280}
                />
              </div>
              <DialogFooter>
                <Button
                  onClick={handleCreate}
                  disabled={!name.trim() || createMutation.isPending}
                  className="w-full rounded-xl silver-shimmer"
                >
                  {createMutation.isPending ? "Creating..." : "Create group"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex bg-secondary p-1 rounded-lg">
          <button
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${tab === "discover" ? "bg-background shadow text-foreground" : "text-muted-foreground"}`}
            onClick={() => setTab("discover")}
          >
            Discover
          </button>
          <button
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${tab === "mine" ? "bg-background shadow text-foreground" : "text-muted-foreground"}`}
            onClick={() => setTab("mine")}
          >
            My Groups
          </button>
        </div>

        {tab === "discover" && (
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search groups..."
              className="pl-9 h-10 rounded-xl bg-secondary/50 border-none focus-visible:ring-1 focus-visible:bg-secondary"
            />
          </div>
        )}
      </div>

      <div className="p-4 space-y-3">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : list?.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground bg-secondary/20 rounded-2xl border border-border/50">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>{tab === "discover" ? "No groups found." : "You haven't joined any groups yet."}</p>
            {tab === "mine" && (
              <p className="text-sm mt-1">Discover public groups and join the conversation.</p>
            )}
          </div>
        ) : (
          list?.map((group) => (
            <div
              key={group.id}
              className="flex items-center gap-3 bg-card border border-border/50 p-4 rounded-2xl"
            >
              <Link href={`/groups/${group.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                <Avatar className="w-12 h-12 shrink-0">
                  <AvatarImage src={group.avatarUrl || undefined} />
                  <AvatarFallback>{group.name[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold text-foreground truncate">{group.name}</p>
                    {group.isOwner && <Crown className="w-3.5 h-3.5 text-accent shrink-0" />}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {group.membersCount} {group.membersCount === 1 ? "member" : "members"}
                  </p>
                </div>
              </Link>
              {!group.isOwner && (
                <Button
                  size="sm"
                  variant={group.isMember ? "outline" : "default"}
                  className="rounded-full shrink-0"
                  onClick={() => (group.isMember ? handleLeave(group.id) : handleJoin(group.id))}
                >
                  {group.isMember ? "Joined" : "Join"}
                </Button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
