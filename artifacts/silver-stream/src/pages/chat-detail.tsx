import { useState, useRef, useEffect } from "react";
import { useRoute } from "wouter";
import { useGetMessages, getGetMessagesQueryKey, useSendMessage } from "@workspace/api-client-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";

export default function ChatDetail() {
  const [match, params] = useRoute("/chat/:id");
  const id = params?.id || "";
  const [message, setMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const queryClient = useQueryClient();
  const { data: messagesPage, isLoading } = useGetMessages(id, undefined, {
    query: { enabled: !!id, queryKey: getGetMessagesQueryKey(id), refetchInterval: 5000 }
  });

  const sendMutation = useSendMessage();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messagesPage?.items]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    sendMutation.mutate({ conversationId: id, data: { content: message } }, {
      onSuccess: () => {
        setMessage("");
        queryClient.invalidateQueries({ queryKey: getGetMessagesQueryKey(id) });
      }
    });
  };

  const otherParticipant = messagesPage?.items.find(m => !m.isMe)?.sender;

  return (
    <div className="flex flex-col h-[calc(100dvh-56px)] bg-background">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-xl border-b border-border/50 p-3 flex items-center gap-3">
        <Link href="/chat" className="p-2 -ml-2 rounded-full hover:bg-secondary">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        {otherParticipant ? (
          <div className="flex items-center gap-3 flex-1">
            <Avatar className="w-10 h-10">
              <AvatarImage src={otherParticipant.avatarUrl || undefined} />
              <AvatarFallback>{otherParticipant.username[0]}</AvatarFallback>
            </Avatar>
            <p className="font-semibold text-foreground">
              {otherParticipant.displayName || otherParticipant.username}
            </p>
          </div>
        ) : (
          <div className="flex-1 font-semibold">Conversation</div>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="text-center text-muted-foreground p-8">Loading messages...</div>
        ) : (
          [...(messagesPage?.items || [])].reverse().map(msg => (
            <div key={msg.id} className={`flex ${msg.isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] px-4 py-2 rounded-2xl ${msg.isMe ? 'bg-gradient-to-tr from-accent to-accent/80 text-accent-foreground rounded-tr-sm silver-shimmer shadow-md' : 'bg-secondary text-foreground rounded-tl-sm'}`}>
                <p className="text-sm">{msg.content}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSend} className="p-3 border-t border-border/50 bg-background flex gap-2 items-center">
        <Input 
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Message..."
          className="flex-1 rounded-full h-11 bg-secondary/50 border-transparent focus-visible:bg-background"
        />
        <Button 
          type="submit" 
          size="icon" 
          disabled={!message.trim() || sendMutation.isPending}
          className="h-11 w-11 rounded-full silver-shimmer"
        >
          <Send className="w-5 h-5" />
        </Button>
      </form>
    </div>
  );
}
