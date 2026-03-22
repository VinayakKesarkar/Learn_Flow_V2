import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useLmsAskQuestion } from "@/hooks/use-api";
import { Loader2, Send } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { Link } from "wouter";

export function QuestionForm({ videoId }: { videoId: number }) {
  const { user } = useAuthStore();
  const [text, setText] = useState("");
  const ask = useLmsAskQuestion(videoId);

  if (!user) {
    return (
      <div className="rounded-lg border bg-slate-50 p-4 text-center text-sm text-muted-foreground">
        <Link href="/auth/login" className="text-primary font-medium hover:underline">Log in</Link> to ask questions
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    await ask.mutateAsync(text.trim());
    setText("");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <Textarea
        placeholder="Ask a question about this lesson..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        className="resize-none text-sm"
      />
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={!text.trim() || ask.isPending} className="gap-2">
          {ask.isPending ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Posting...</>
          ) : (
            <><Send className="w-4 h-4" /> Post Question</>
          )}
        </Button>
      </div>
    </form>
  );
}
