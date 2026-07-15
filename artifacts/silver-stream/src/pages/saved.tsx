import { useGetSavedPosts, getGetSavedPostsQueryKey, useGetMe } from "@workspace/api-client-react";
import { PostCard } from "@/components/post-card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Saved() {
  const { data: me } = useGetMe();
  const { data: savedPage, isLoading } = useGetSavedPosts(undefined, {
    query: {
      queryKey: getGetSavedPostsQueryKey(),
    }
  });

  return (
    <div className="w-full min-h-[100dvh] bg-background">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-xl border-b border-border/50 p-4">
        <h1 className="text-2xl font-bold">Saved Posts</h1>
      </div>

      <div className="p-4 max-w-md mx-auto">
        {isLoading ? (
          <div className="space-y-4">
            {[1,2].map(i => (
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
            {savedPage?.items.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground bg-secondary/20 rounded-2xl border border-border/50 mt-4">
                <p>No saved posts yet.</p>
                <p className="text-sm mt-1">Bookmark posts to find them easily here.</p>
              </div>
            ) : (
              savedPage?.items.map(post => (
                <PostCard key={post.id} post={post} currentUserId={me?.id} />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
