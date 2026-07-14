import { useState } from "react";
import { useGetMyEmojis, getGetMyEmojisQueryKey } from "@workspace/api-client-react";
import { Smile, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Link } from "wouter";

interface EmojiPickerProps {
  /** Called when the user taps an emoji */
  onSelect: (emoji: { id: string; imageUrl: string; name: string }) => void;
  /** Render a custom trigger instead of the default smile icon */
  trigger?: React.ReactNode;
  className?: string;
}

export function EmojiPicker({ onSelect, trigger, className }: EmojiPickerProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const { data: myLibrary } = useGetMyEmojis({
    query: { queryKey: getGetMyEmojisQueryKey(), enabled: open }
  });

  const emojis = myLibrary?.items ?? [];

  const handleSelect = (emoji: typeof emojis[number]) => {
    onSelect(emoji);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger ?? (
          <button
            type="button"
            className={cn(
              "p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors",
              className
            )}
            title={t("emoji_picker_title")}
          >
            <Smile className="w-5 h-5" />
          </button>
        )}
      </PopoverTrigger>

      <PopoverContent className="w-64 p-3" align="start" side="top">
        <p className="text-xs font-semibold text-muted-foreground mb-2">{t("emoji_picker_title")}</p>

        {emojis.length === 0 ? (
          <div className="text-center py-4 text-xs text-muted-foreground">
            <Smile className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>{t("emoji_picker_empty")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-1.5 max-h-48 overflow-y-auto">
            {emojis.map(emoji => (
              <button
                key={emoji.id}
                type="button"
                onClick={() => handleSelect(emoji)}
                title={emoji.name}
                className="w-10 h-10 rounded-lg overflow-hidden hover:scale-110 transition-transform border border-border/30 hover:border-primary/50 bg-secondary/30"
              >
                <img
                  src={emoji.imageUrl}
                  alt={emoji.name}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}

        <div className="border-t border-border/50 mt-3 pt-2">
          <Link
            href="/settings/emojis"
            className="flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            <Plus className="w-3.5 h-3.5" />
            {t("emoji_picker_manage")}
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
