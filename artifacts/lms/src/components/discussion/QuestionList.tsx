import { useState } from "react";
import { useLmsVideoQuestions } from "@/hooks/use-api";
import { useAuthStore } from "@/store/auth-store";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AnswerForm } from "./AnswerForm";
import { CornerDownRight, MessageCircle, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export function QuestionList({ videoId }: { videoId: number }) {
  const { data, isLoading } = useLmsVideoQuestions(videoId);
  const { user } = useAuthStore();
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [expandedAnswers, setExpandedAnswers] = useState<Record<number, boolean>>({});

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const questions = data?.questions ?? [];

  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed rounded-xl bg-slate-50">
        <MessageCircle className="w-8 h-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">No questions yet. Start the discussion!</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {questions.map((q) => {
        const hasAnswers = q.answers.length > 0;
        const isExpanded = expandedAnswers[q.id] ?? false;
        const visibleAnswers = isExpanded ? q.answers : q.answers.slice(0, 2);

        return (
          <div key={q.id} className="rounded-xl border bg-card overflow-hidden">
            {/* Question */}
            <div className="p-4 flex gap-3">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="text-xs font-bold bg-blue-100 text-blue-700">
                  {q.userName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold">{q.userName}</span>
                  <span className="text-xs text-muted-foreground">{timeAgo(q.createdAt)}</span>
                  {q.userId === user?.id && (
                    <span className="text-xs bg-blue-100 text-blue-700 rounded px-1.5 py-0.5 font-medium">You</span>
                  )}
                </div>
                <p className="text-sm mt-1 leading-relaxed">{q.questionText}</p>
                <div className="mt-2 flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-primary gap-1"
                    onClick={() => setReplyingTo(replyingTo === q.id ? null : q.id)}
                  >
                    <CornerDownRight className="w-3.5 h-3.5" />
                    {replyingTo === q.id ? "Cancel" : "Reply"}
                  </Button>
                  {hasAnswers && (
                    <span className="text-xs text-muted-foreground">
                      {q.answers.length} {q.answers.length === 1 ? "answer" : "answers"}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Answers */}
            {hasAnswers && (
              <div className="border-t bg-slate-50/80 px-4 py-3 space-y-3">
                {visibleAnswers.map((a) => (
                  <div key={a.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-4 h-4 flex items-center justify-center mt-1">
                        <CornerDownRight className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </div>
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarFallback className="text-xs font-bold bg-green-100 text-green-700">
                        {a.userName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{a.userName}</span>
                        <span className="text-xs text-muted-foreground">{timeAgo(a.createdAt)}</span>
                        {a.userId === user?.id && (
                          <span className="text-xs bg-green-100 text-green-700 rounded px-1.5 py-0.5 font-medium">You</span>
                        )}
                      </div>
                      <p className="text-sm mt-0.5 leading-relaxed">{a.answerText}</p>
                    </div>
                  </div>
                ))}

                {q.answers.length > 2 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
                    onClick={() => setExpandedAnswers((p) => ({ ...p, [q.id]: !p[q.id] }))}
                  >
                    {isExpanded ? (
                      <><ChevronUp className="w-3.5 h-3.5" /> Show less</>
                    ) : (
                      <><ChevronDown className="w-3.5 h-3.5" /> Show {q.answers.length - 2} more answers</>
                    )}
                  </Button>
                )}
              </div>
            )}

            {/* Answer form */}
            {replyingTo === q.id && (
              <div className="border-t p-4">
                <AnswerForm
                  videoId={videoId}
                  questionId={q.id}
                  onCancel={() => setReplyingTo(null)}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
