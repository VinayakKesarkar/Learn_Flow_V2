import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useLmsPostAnswer } from "@/hooks/use-api";
import { Loader2, CornerDownRight } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";

export function AnswerForm({ videoId, questionId, onCancel }: { videoId: number; questionId: number; onCancel?: () => void }) {
  const { user } = useAuthStore();
  const [text, setText] = useState("");
  const post = useLmsPostAnswer(videoId);

  if (!user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    await post.mutateAsync({ question_id: questionId, answer_text: text.trim() });
    setText("");
    onCancel?.();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2 ml-6 mt-2">
      <Textarea
        placeholder="Write your answer..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        className="resize-none text-sm"
        autoFocus
      />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={!text.trim() || post.isPending} className="gap-2">
          {post.isPending ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Posting...</>
          ) : (
            <><CornerDownRight className="w-4 h-4" /> Post Answer</>
          )}
        </Button>
        {onCancel && (
          <Button type="button" size="sm" variant="ghost" onClick={onCancel} className="text-muted-foreground">Cancel</Button>
        )}
      </div>
    </form>
  );
}
