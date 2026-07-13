import { useGetFeed, getGetFeedQueryKey, useGetMe } from "@workspace/api-client-react";
import { StoryBar } from "@/components/story-bar";
import { PostCard } from "@/components/post-card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Feed() {
  const { data: me } = useGetMe();
  const { data: feedPage, isLoading } = useGetFeed(undefined, {
    query: {
      queryKey: getGetFeedQueryKey(),
    }
  });

  return (
    <div className="w-full">
      <StoryBar />
      
      <div className="max-w-md mx-auto">
        {isLoading ? (
          <div className="space-y-4 p-4">
            {[1,2,3].map(i => (
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
        ) : (
          <div className="pb-8">
            {feedPage?.items.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <p>Your feed is empty.</p>
                <p className="text-sm mt-2">Follow some users to see their posts here!</p>
              </div>
            ) : (
              feedPage?.items.map(post => (
                <PostCard key={post.id} post={post} currentUserId={me?.id} />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
