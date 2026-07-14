import { useState, useEffect, useCallback, useRef } from "react";
import { X, Heart, ThumbsDown, Share2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import type { StoryGroup, Story } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

const STORY_DURATION = 5000;

interface StoryViewerProps {
  groups: StoryGroup[];
  initialGroupIndex: number;
  onClose: () => void;
}

type StoryWithReaction = Story & {
  myReaction?: string | null;
  likesCount?: number;
  dislikesCount?: number;
};

export function StoryViewer({ groups, initialGroupIndex, onClose }: StoryViewerProps) {
  const [groupIdx, setGroupIdx] = useState(initialGroupIndex);
  const [storyIdx, setStoryIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reactions, setReactions] = useState<Record<string, string | null>>({});
  const [sharing, setSharing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressKey = useRef(0);

  const currentGroup = groups[groupIdx];
  const currentStory = currentGroup?.stories[storyIdx] as StoryViewerProps extends never ? never : StoryWithReaction | undefined;

  const goNext = useCallback(() => {
    const group = groups[groupIdx];
    if (!group) return;
    if (storyIdx < group.stories.length - 1) {
      setStoryIdx(s => s + 1);
      setProgress(0);
      progressKey.current += 1;
    } else if (groupIdx < groups.length - 1) {
      setGroupIdx(g => g + 1);
      setStoryIdx(0);
      setProgress(0);
      progressKey.current += 1;
    } else {
      onClose();
    }
  }, [storyIdx, groupIdx, groups, onClose]);

  const goPrev = useCallback(() => {
    if (storyIdx > 0) {
      setStoryIdx(s => s - 1);
      setProgress(0);
      progressKey.current += 1;
    } else if (groupIdx > 0) {
      const prevGroup = groups[groupIdx - 1];
      setGroupIdx(g => g - 1);
      setStoryIdx(prevGroup.stories.length - 1);
      setProgress(0);
      progressKey.current += 1;
    }
  }, [storyIdx, groupIdx, groups]);

  // Mark story as viewed
  useEffect(() => {
    if (!currentStory) return;
    fetch(`/api/stories/${currentStory.id}/view`, { method: "POST" }).catch(() => {});
  }, [currentStory?.id]);

  // Progress timer (images only)
  useEffect(() => {
    if (paused || !currentStory || currentStory.mediaType === "video") return;
    const start = Date.now();
    const key = progressKey.current;
    const interval = setInterval(() => {
      if (key !== progressKey.current) { clearInterval(interval); return; }
      const pct = ((Date.now() - start) / STORY_DURATION) * 100;
      if (pct >= 100) {
        clearInterval(interval);
        goNext();
      } else {
        setProgress(pct);
      }
    }, 50);
    return () => clearInterval(interval);
  }, [currentStory?.id, paused, goNext]);

  // Body scroll lock
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleReact = async (type: "like" | "dislike") => {
    if (!currentStory) return;
    const storyId = currentStory.id;
    const current = reactions[storyId] !== undefined
      ? reactions[storyId]
      : (currentStory as StoryWithReaction).myReaction ?? null;
    const next = current === type ? null : type;
    setReactions(r => ({ ...r, [storyId]: next }));
    try {
      if (next) {
        await fetch(`/api/stories/${storyId}/react`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: next }),
        });
      } else {
        await fetch(`/api/stories/${storyId}/react`, { method: "DELETE" });
      }
    } catch {
      setReactions(r => ({ ...r, [storyId]: current }));
    }
  };

  const handleShare = async () => {
    if (!currentGroup) return;
    const url = `${window.location.origin}/profile/${currentGroup.user.username}`;
    setSharing(true);
    try {
      if (navigator.share) {
        await navigator.share({ title: currentGroup.user.displayName || currentGroup.user.username, url });
      } else {
        await navigator.clipboard.writeText(url);
      }
    } catch {}
    setTimeout(() => setSharing(false), 1500);
  };

  if (!currentGroup || !currentStory) return null;

  const story = currentStory as StoryWithReaction;
  const myReaction = reactions[story.id] !== undefined ? reactions[story.id] : story.myReaction ?? null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black flex flex-col select-none"
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      tabIndex={0}
    >
      {/* Progress bars */}
      <div className="flex gap-1 px-3 pt-3 pb-1 safe-top">
        {currentGroup.stories.map((s, i) => (
          <div key={s.id} className="flex-1 h-0.5 bg-white/25 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full"
              style={{
                width: i < storyIdx ? "100%" : i === storyIdx ? `${progress}%` : "0%",
                transition: i === storyIdx ? "none" : undefined,
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-2">
        <Link href={`/profile/${currentGroup.user.username}`} onClick={onClose}>
          <Avatar className="w-9 h-9 border-2 border-white/30">
            <AvatarImage src={currentGroup.user.avatarUrl || undefined} />
            <AvatarFallback className="text-black text-sm bg-white">
              {currentGroup.user.displayName?.[0] || currentGroup.user.username[0]}
            </AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold truncate">
            {currentGroup.user.displayName || currentGroup.user.username}
          </p>
          <p className="text-white/60 text-xs">
            {formatDistanceToNow(new Date(story.createdAt))} ago
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPaused(p => !p)}
            className="text-white/80 hover:text-white p-1 transition-opacity"
          >
            <div className={cn(
              "w-4 h-4 flex items-center justify-center",
            )}>
              {paused ? (
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                </svg>
              )}
            </div>
          </button>
          <button onClick={onClose} className="text-white/80 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Media area */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden">
        {/* Tap zones */}
        <div className="absolute inset-0 flex z-10">
          <div className="w-1/3 h-full" onClick={goPrev} />
          <div className="w-1/3 h-full" onClick={() => setPaused(p => !p)} />
          <div className="w-1/3 h-full" onClick={goNext} />
        </div>

        {story.mediaType === "video" ? (
          <video
            ref={videoRef}
            key={story.id}
            src={story.mediaUrl}
            className="max-h-full max-w-full object-contain"
            autoPlay
            playsInline
            controls={false}
            onEnded={goNext}
            onPlay={() => setProgress(0)}
          />
        ) : (
          <img
            key={story.id}
            src={story.mediaUrl}
            alt=""
            className="max-h-full max-w-full object-contain"
            draggable={false}
          />
        )}
      </div>

      {/* Bottom action bar */}
      <div className="flex items-center justify-around px-8 py-5 safe-bottom">
        {/* Like */}
        <button
          onClick={() => handleReact("like")}
          className="flex flex-col items-center gap-1.5 group"
        >
          <div className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200",
            myReaction === "like"
              ? "bg-red-500/20 scale-110"
              : "bg-white/10 group-hover:bg-white/20"
          )}>
            <Heart className={cn(
              "w-6 h-6 transition-all duration-200",
              myReaction === "like" ? "text-red-400 fill-red-400" : "text-white"
            )} />
          </div>
          <span className="text-white/70 text-xs font-medium">
            {story.likesCount != null ? story.likesCount + (myReaction === "like" && (story.myReaction ?? null) !== "like" ? 1 : myReaction !== "like" && story.myReaction === "like" ? -1 : 0) : ""}
          </span>
        </button>

        {/* Group navigation dots */}
        <div className="flex gap-1.5">
          {groups.map((_, i) => (
            <button
              key={i}
              onClick={() => { setGroupIdx(i); setStoryIdx(0); setProgress(0); progressKey.current++; }}
              className={cn(
                "rounded-full transition-all duration-200",
                i === groupIdx ? "w-4 h-2 bg-white" : "w-2 h-2 bg-white/30"
              )}
            />
          ))}
        </div>

        {/* Dislike */}
        <button
          onClick={() => handleReact("dislike")}
          className="flex flex-col items-center gap-1.5 group"
        >
          <div className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200",
            myReaction === "dislike"
              ? "bg-blue-500/20 scale-110"
              : "bg-white/10 group-hover:bg-white/20"
          )}>
            <ThumbsDown className={cn(
              "w-6 h-6 transition-all duration-200",
              myReaction === "dislike" ? "text-blue-400 fill-blue-400" : "text-white"
            )} />
          </div>
          <span className="text-white/70 text-xs font-medium">
            {story.dislikesCount != null ? story.dislikesCount + (myReaction === "dislike" && (story.myReaction ?? null) !== "dislike" ? 1 : myReaction !== "dislike" && story.myReaction === "dislike" ? -1 : 0) : ""}
          </span>
        </button>
      </div>

      {/* Share button floating */}
      <button
        onClick={handleShare}
        className={cn(
          "absolute bottom-24 right-5 flex flex-col items-center gap-1 transition-all duration-200 z-20",
        )}
      >
        <div className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all duration-200">
          <Share2 className="w-5 h-5 text-white" />
        </div>
        <span className="text-white/60 text-[10px]">
          {sharing ? "Copied!" : "Share"}
        </span>
      </button>
    </div>
  );
}
