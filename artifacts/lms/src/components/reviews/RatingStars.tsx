import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface RatingStarsProps {
  rating: number;
  max?: number;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  onRate?: (rating: number) => void;
  hoveredRating?: number;
  onHover?: (rating: number) => void;
  onHoverLeave?: () => void;
}

const sizeMap = { sm: "h-3.5 w-3.5", md: "h-5 w-5", lg: "h-7 w-7" };

export function RatingStars({
  rating,
  max = 5,
  size = "md",
  interactive = false,
  onRate,
  hoveredRating,
  onHover,
  onHoverLeave,
}: RatingStarsProps) {
  const activeRating = hoveredRating !== undefined ? hoveredRating : rating;

  return (
    <div className="flex gap-0.5" onMouseLeave={onHoverLeave}>
      {Array.from({ length: max }).map((_, i) => {
        const filled = i < activeRating;
        return (
          <Star
            key={i}
            className={cn(
              sizeMap[size],
              filled ? "fill-amber-400 text-amber-400" : "fill-none text-slate-300",
              interactive && "cursor-pointer transition-colors hover:fill-amber-300 hover:text-amber-300",
            )}
            onMouseEnter={() => interactive && onHover?.(i + 1)}
            onClick={() => interactive && onRate?.(i + 1)}
          />
        );
      })}
    </div>
  );
}

export function RatingDisplay({
  average,
  total,
  size = "sm",
}: {
  average: number | null;
  total: number;
  size?: "sm" | "md" | "lg";
}) {
  if (!average && total === 0) {
    return <span className="text-sm text-muted-foreground">No reviews yet</span>;
  }
  return (
    <div className="flex items-center gap-2">
      <RatingStars rating={Math.round(average ?? 0)} size={size} />
      <span className="font-semibold text-foreground">{average?.toFixed(1)}</span>
      <span className="text-muted-foreground text-sm">({total} {total === 1 ? "review" : "reviews"})</span>
    </div>
  );
}
