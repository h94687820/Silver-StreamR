import { useRef, useState } from "react";
import { useSearchUsers } from "@workspace/api-client-react";
import { useDebounce } from "@/lib/use-debounce";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";

interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  rows?: number;
}

/**
 * A textarea that shows a @mention autocomplete dropdown while typing "@username".
 */
export function MentionTextarea({ value, onChange, placeholder, className, rows }: MentionTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const debouncedQuery = useDebounce(mentionQuery ?? "", 200);

  const { data: suggestions } = useSearchUsers(
    { q: debouncedQuery },
    { query: { enabled: !!debouncedQuery, queryKey: ["mention-search", debouncedQuery] } }
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    const cursor = e.target.selectionStart ?? text.length;
    onChange(text);

    const upToCursor = text.slice(0, cursor);
    const match = /(?:^|\s)@([a-zA-Z0-9_]{0,30})$/.exec(upToCursor);
    if (match) {
      setMentionQuery(match[1]);
      setMentionStart(cursor - match[1].length - 1);
    } else {
      setMentionQuery(null);
      setMentionStart(null);
    }
  };

  const applyMention = (username: string) => {
    if (mentionStart === null) return;
    const textarea = textareaRef.current;
    const cursor = textarea?.selectionStart ?? value.length;
    const before = value.slice(0, mentionStart);
    const after = value.slice(cursor);
    const next = `${before}@${username} ${after}`;
    onChange(next);
    setMentionQuery(null);
    setMentionStart(null);
    requestAnimationFrame(() => {
      const pos = before.length + username.length + 2;
      textarea?.focus();
      textarea?.setSelectionRange(pos, pos);
    });
  };

  const showDropdown = mentionQuery !== null && !!suggestions?.length;

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className={className}
        rows={rows}
      />
      {showDropdown && (
        <div className="absolute z-20 bottom-full mb-1 left-0 right-0 bg-popover border border-popover-border rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto">
          {suggestions!.slice(0, 6).map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => applyMention(u.username)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary transition-colors text-left"
            >
              <Avatar className="w-6 h-6">
                <AvatarImage src={u.avatarUrl || undefined} />
                <AvatarFallback>{u.username[0]}</AvatarFallback>
              </Avatar>
              <span className="font-medium">{u.displayName || u.username}</span>
              <span className="text-muted-foreground">@{u.username}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
