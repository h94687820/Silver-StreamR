import { useGetVideoFeed, getGetVideoFeedQueryKey, useReactToPost } from "@workspace/api-client-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, Share2 } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

export default function Videos() {
  const { data: videoFeed, isLoading } = useGetVideoFeed(undefined, {
    query: { queryKey: getGetVideoFeedQueryKey() }
  });
  const reactMutation = useReactToPost();
  const queryClient = useQueryClient();

  if (isLoading) return <div className="w-full h-full bg-black animate-pulse" />;

  const hasVideos = videoFeed?.items && videoFeed.items.length > 0;

  return (
    <div className="w-full h-full bg-black overflow-y-auto snap-y snap-mandatory" style={{ scrollbarWidth: "none" }}>
      {!hasVideos ? (
        <div className="flex items-center justify-center h-full text-white/50">
          No videos available yet.
        </div>
      ) : (
        videoFeed!.items.map((post) => (
          <div key={post.id} className="relative w-full h-full snap-start bg-black flex items-center justify-center">
            {/* Video Player */}
            <video 
              src={post.mediaUrls?.[0]} 
              className="w-full h-full object-cover"
              loop
              playsInline
              autoPlay
              muted // Auto-play usually requires muted
            />
            
            {/* Overlay Gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/80 pointer-events-none" />

            {/* Sidebar Actions */}
            <div className="absolute right-4 bottom-24 flex flex-col items-center gap-6 z-10">
              <Link href={`/profile/${post.author.username}`}>
                <Avatar className="w-12 h-12 border-2 border-white shadow-lg">
                  <AvatarImage src={post.author.avatarUrl || undefined} />
                  <AvatarFallback className="bg-white/20 text-white">{post.author.username[0]}</AvatarFallback>
                </Avatar>
              </Link>
              
              <button 
                onClick={() => {
                  reactMutation.mutate({ postId: post.id, data: { type: 'like' } }, {
                    onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetVideoFeedQueryKey() })
                  });
                }}
                className="flex flex-col items-center gap-1 text-white drop-shadow-md"
              >
                <div className={cn("p-3 rounded-full bg-black/20 backdrop-blur-md", post.myReaction === 'like' && "bg-destructive/20")}>
                  <Heart className={cn("w-7 h-7", post.myReaction === 'like' && "fill-destructive text-destructive")} />
                </div>
                <span className="text-xs font-semibold">{post.likesCount}</span>
              </button>

              <button className="flex flex-col items-center gap-1 text-white drop-shadow-md">
                <div className="p-3 rounded-full bg-black/20 backdrop-blur-md">
                  <MessageCircle className="w-7 h-7" />
                </div>
                <span className="text-xs font-semibold">{post.commentsCount}</span>
              </button>

              <button className="flex flex-col items-center gap-1 text-white drop-shadow-md">
                <div className="p-3 rounded-full bg-black/20 backdrop-blur-md">
                  <Share2 className="w-7 h-7" />
                </div>
                <span className="text-xs font-semibold">Share</span>
              </button>
            </div>

            {/* Bottom Info */}
            <div className="absolute left-4 bottom-24 right-20 z-10 text-white drop-shadow-md">
              <h3 className="font-bold text-lg mb-1">@{post.author.username}</h3>
              {post.content && (
                <p className="text-sm line-clamp-2 text-white/90">{post.content}</p>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
