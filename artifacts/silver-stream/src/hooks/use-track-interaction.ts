import { useCallback, useRef } from "react";

/**
 * Session-level set — prevents firing duplicate "view" events for the same
 * post within a single page session (the server also deduplicates by hour).
 */
const sessionViewed = new Set<string>();

export type InteractionAction = "view" | "like" | "dislike" | "comment" | "save";

export function useTrackInteraction() {
  const inFlight = useRef(new Set<string>());

  const track = useCallback(async (postId: string, action: InteractionAction) => {
    // Client-side deduplicate views inside the same session
    if (action === "view") {
      if (sessionViewed.has(postId)) return;
      sessionViewed.add(postId);
    }

    const key = `${postId}:${action}`;
    if (inFlight.current.has(key)) return;
    inFlight.current.add(key);

    try {
      await fetch("/api/interactions/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ postId, action }),
      });
    } catch {
      // Silent — tracking must never break the UI
    } finally {
      inFlight.current.delete(key);
    }
  }, []);

  return track;
}
