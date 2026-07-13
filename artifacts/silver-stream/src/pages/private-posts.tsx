import { Link } from "wouter";
import { useGetPrivatePosts, getGetPrivatePostsQueryKey, useGetMe } from "@workspace/api-client-react";
import { PostCard } from "@/components/post-card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, Lock } from "lucide-react";

export default function PrivatePosts() {
  const { data: me } = useGetMe();
  const { data: page, isLoading } = useGetPrivatePosts(undefined, {
    query: { queryKey: getGetPrivatePostsQueryKey() }
  });

  return (
    <div className="w-full min-h-[100dvh] bg-background">
      <div className="sticky top-14 z-30 bg-background/95 backdrop-blur-xl border-b border-border/50 p-4 flex items-center gap-3">
        <Link href="/settings" className="p-1 -ml-1 rounded-full hover:bg-secondary/50 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Lock className="w-4 h-4 text-muted-foreground" />
            Private Posts
          </h1>
          <p className="text-xs text-muted-foreground">Only visible to you</p>
        </div>
      </div>

      <div className="p-4 max-w-md mx-auto">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
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
            {page?.items.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground bg-secondary/20 rounded-2xl border border-border/50 mt-4">
                <p>No private posts yet.</p>
                <p className="text-sm mt-1">Mark a post as private when creating it to see it here.</p>
              </div>
            ) : (
              page?.items.map((post) => (
                <PostCard key={post.id} post={post} currentUserId={me?.id} />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
