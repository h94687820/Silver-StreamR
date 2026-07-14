import { useState } from "react";
import { useGetStories, getGetStoriesQueryKey } from "@workspace/api-client-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus } from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { StoryViewer } from "@/components/story-viewer";

export function StoryBar() {
  const { data: stories, isLoading } = useGetStories({
    query: {
      queryKey: getGetStoriesQueryKey(),
    }
  });

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerGroupIndex, setViewerGroupIndex] = useState(0);

  const openViewer = (index: number) => {
    setViewerGroupIndex(index);
    setViewerOpen(true);
  };

  return (
    <>
      <div className="w-full bg-background border-b border-border/50 py-4 px-2">
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide px-2 items-center">

          {/* Create Story Button */}
          <Link href="/create?type=story" className="flex flex-col items-center gap-1 shrink-0">
            <div className="relative w-16 h-16 rounded-full border border-border p-1">
              <div className="w-full h-full rounded-full bg-secondary flex items-center justify-center text-muted-foreground">
                <Plus className="w-6 h-6" />
              </div>
              <div className="absolute bottom-0 right-0 bg-accent text-accent-foreground rounded-full p-0.5 border-2 border-background">
                <Plus className="w-3 h-3" />
              </div>
            </div>
            <span className="text-[10px] font-medium text-foreground">Add Story</span>
          </Link>

          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-1 shrink-0">
                <Skeleton className="w-16 h-16 rounded-full" />
                <Skeleton className="w-12 h-3" />
              </div>
            ))
          ) : (
            stories?.map((group, index) => (
              <button
                key={group.user.id}
                onClick={() => openViewer(index)}
                className="flex flex-col items-center gap-1 shrink-0 focus:outline-none"
              >
                <div className={cn(
                  "relative w-16 h-16 rounded-full p-1",
                  group.hasUnviewed
                    ? "bg-gradient-to-tr from-gray-300 via-gray-100 to-gray-400 silver-shimmer"
                    : "bg-border"
                )}>
                  <div className="w-full h-full rounded-full border-2 border-background overflow-hidden">
                    <Avatar className="w-full h-full">
                      <AvatarImage src={group.user.avatarUrl || undefined} />
                      <AvatarFallback>{group.user.displayName?.[0] || group.user.username[0]}</AvatarFallback>
                    </Avatar>
                  </div>
                  {group.hasUnviewed && (
                    <div className="absolute bottom-0 right-0 w-4 h-4 bg-accent rounded-full border-2 border-background" />
                  )}
                </div>
                <span className="text-[10px] font-medium text-foreground max-w-[64px] truncate">
                  {group.user.displayName || group.user.username}
                </span>
              </button>
            ))
          )}

        </div>
      </div>

      {viewerOpen && stories && stories.length > 0 && (
        <StoryViewer
          groups={stories as any}
          initialGroupIndex={viewerGroupIndex}
          onClose={() => setViewerOpen(false)}
        />
      )}
    </>
  );
}
