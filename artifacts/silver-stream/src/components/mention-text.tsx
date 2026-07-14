import { Link } from "wouter";
import { Fragment } from "react";

// Matches an @mention, a #hashtag, or an embedded custom-emoji token
// (Unicode-aware so Arabic hashtags work too). Custom emojis are embedded
// as `{{emoji:<imageUrl>}}` when the user picks one from their emoji library.
const TOKEN_REGEX = /(@[a-zA-Z0-9_]{2,30})|(#[\p{L}\p{N}_]{2,50})|(\{\{emoji:[^{}]+\}\})/gu;

/**
 * Renders text content, turning any @username token into a link to that user's
 * profile, any #hashtag token into a link to the hashtag's search results, and
 * any `{{emoji:<url>}}` token into an inline custom emoji image.
 */
export function MentionText({ content, className }: { content: string; className?: string }) {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const regex = new RegExp(TOKEN_REGEX);

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<Fragment key={`t-${lastIndex}`}>{content.slice(lastIndex, match.index)}</Fragment>);
    }
    const token = match[0];
    if (token.startsWith("{{emoji:")) {
      const url = token.slice("{{emoji:".length, -2);
      parts.push(
        <img
          key={`e-${match.index}`}
          src={url}
          alt="emoji"
          className="inline-block w-5 h-5 rounded-md object-cover align-text-bottom mx-0.5"
        />
      );
    } else if (token.startsWith("@")) {
      const username = token.slice(1);
      parts.push(
        <Link
          key={`m-${match.index}`}
          href={`/profile/${username}`}
          className="text-accent font-medium hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          @{username}
        </Link>
      );
    } else {
      const tag = token.slice(1);
      parts.push(
        <Link
          key={`h-${match.index}`}
          href={`/search/results?q=${encodeURIComponent("#" + tag)}&tab=posts`}
          className="text-accent font-medium hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          #{tag}
        </Link>
      );
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) {
    parts.push(<Fragment key={`t-${lastIndex}`}>{content.slice(lastIndex)}</Fragment>);
  }

  return <span className={className}>{parts}</span>;
}
