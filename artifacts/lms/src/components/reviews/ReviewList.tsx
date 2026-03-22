import { RatingStars, RatingDisplay } from "./RatingStars";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useLmsSubjectReviews } from "@/hooks/use-api";
import { MessageSquare } from "lucide-react";

interface ReviewListProps {
  subjectId: number;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}

export function ReviewList({ subjectId }: ReviewListProps) {
  const { data, isLoading } = useLmsSubjectReviews(subjectId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-9 w-9 rounded-full shrink-0" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const reviews = data?.reviews ?? [];

  if (reviews.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed rounded-xl bg-slate-50">
        <MessageSquare className="w-8 h-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">No reviews yet. Be the first to review!</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {reviews.map((review) => (
        <div key={review.id} className="flex gap-3">
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarFallback className="text-sm font-semibold bg-primary/10 text-primary">
              {review.userName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">{review.userName}</span>
              <RatingStars rating={review.rating} size="sm" />
              <span className="text-xs text-muted-foreground">{timeAgo(review.createdAt)}</span>
            </div>
            {review.reviewText && (
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{review.reviewText}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ReviewSummary({ subjectId }: ReviewListProps) {
  const { data } = useLmsSubjectReviews(subjectId);
  return (
    <RatingDisplay
      average={data?.averageRating ?? null}
      total={data?.totalReviews ?? 0}
    />
  );
}
