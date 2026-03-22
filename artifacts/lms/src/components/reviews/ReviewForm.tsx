import { useState } from "react";
import { RatingStars } from "./RatingStars";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useLmsSubmitReview, useLmsMyReview } from "@/hooks/use-api";
import { Loader2, Star } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { Link } from "wouter";

interface ReviewFormProps {
  subjectId: number;
}

export function ReviewForm({ subjectId }: ReviewFormProps) {
  const { user } = useAuthStore();
  const { data: myReviewData, isLoading } = useLmsMyReview(subjectId);
  const submitReview = useLmsSubmitReview(subjectId);

  const existing = myReviewData?.review;
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [hoveredRating, setHoveredRating] = useState<number | undefined>();
  const [reviewText, setReviewText] = useState(existing?.reviewText ?? "");
  const [submitted, setSubmitted] = useState(false);

  // Sync state when existing review loads
  if (existing && !submitted && rating === 0 && existing.rating > 0) {
    setRating(existing.rating);
    setReviewText(existing.reviewText ?? "");
  }

  if (!user) {
    return (
      <div className="rounded-xl border bg-slate-50 p-5 text-center text-sm text-muted-foreground">
        <Link href="/auth/login" className="text-primary font-medium hover:underline">Log in</Link> to leave a review
      </div>
    );
  }

  if (isLoading) {
    return <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) return;
    await submitReview.mutateAsync({ rating, review_text: reviewText.trim() || undefined });
    setSubmitted(true);
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border bg-card p-5 space-y-4">
      <h4 className="font-semibold text-sm">{existing ? "Edit your review" : "Leave a review"}</h4>

      <div className="space-y-1">
        <label className="text-xs text-muted-foreground font-medium">Your rating</label>
        <RatingStars
          rating={rating}
          size="lg"
          interactive
          hoveredRating={hoveredRating}
          onRate={(r) => setRating(r)}
          onHover={(r) => setHoveredRating(r)}
          onHoverLeave={() => setHoveredRating(undefined)}
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs text-muted-foreground font-medium">Review (optional)</label>
        <Textarea
          placeholder="Share your experience with this course..."
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          rows={3}
          className="resize-none text-sm"
        />
      </div>

      {submitReview.isSuccess && (
        <p className="text-sm text-green-600 font-medium">
          ✓ Review {existing ? "updated" : "submitted"} successfully!
        </p>
      )}

      <Button
        type="submit"
        size="sm"
        disabled={rating === 0 || submitReview.isPending}
        className="gap-2"
      >
        {submitReview.isPending ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
        ) : (
          <><Star className="w-4 h-4" /> {existing ? "Update Review" : "Submit Review"}</>
        )}
      </Button>
    </form>
  );
}
