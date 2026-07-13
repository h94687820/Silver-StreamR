import { Link } from "wouter";
import { Fragment } from "react";

const MENTION_REGEX = /@([a-zA-Z0-9_]{2,30})/g;

/**
 * Renders text content, turning any @username token into a link to that user's profile.
 */
export function MentionText({ content, className }: { content: string; className?: string }) {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const regex = new RegExp(MENTION_REGEX);

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<Fragment key={`t-${lastIndex}`}>{content.slice(lastIndex, match.index)}</Fragment>);
    }
    const username = match[1];
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
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) {
    parts.push(<Fragment key={`t-${lastIndex}`}>{content.slice(lastIndex)}</Fragment>);
  }

  return <span className={className}>{parts}</span>;
}
