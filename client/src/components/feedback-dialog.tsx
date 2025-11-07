import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Star } from "lucide-react";
import type { User, InsertFeedback } from "@shared/schema";
import { isUnauthorizedError } from "@/lib/authUtils";

interface FeedbackDialogProps {
  toUserId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FeedbackDialog({ toUserId, open, onOpenChange }: FeedbackDialogProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [categories, setCategories] = useState<Array<'communication' | 'delivery' | 'collaboration'>>([]);
  const [comment, setComment] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: toUser } = useQuery<User>({
    queryKey: ["/api/users", toUserId],
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: async (data: InsertFeedback) => {
      return await apiRequest('POST', '/api/feedback', data);
    },
    onSuccess: () => {
      toast({
        title: "Feedback submitted",
        description: "Your feedback has been recorded successfully.",
      });
      // Invalidate all dashboard queries to refresh feedback display
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/hr"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/employee"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/manager"] });
      queryClient.invalidateQueries({ queryKey: ["/api/feedback"] });
      onOpenChange(false);
      resetForm();
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to submit feedback",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setRating(0);
    setCategories([]);
    setComment('');
  };

  const toggleCategory = (cat: 'communication' | 'delivery' | 'collaboration') => {
    setCategories(prev => 
      prev.includes(cat) 
        ? prev.filter(c => c !== cat)
        : [...prev, cat]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating === 0) {
      toast({
        title: "Rating required",
        description: "Please select a rating before submitting.",
        variant: "destructive",
      });
      return;
    }

    if (comment.length < 10) {
      toast({
        title: "Comment too short",
        description: "Please provide at least 10 characters of feedback.",
        variant: "destructive",
      });
      return;
    }

    if (categories.length === 0) {
      toast({
        title: "Category required",
        description: "Please select at least one category.",
        variant: "destructive",
      });
      return;
    }

    mutation.mutate({
      toUserId,
      rating,
      category: categories,
      comment,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Give Feedback to {toUser?.firstName} {toUser?.lastName}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Rating */}
          <div className="space-y-2">
            <Label>Rating</Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  onMouseEnter={() => setHoveredRating(value)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transition-transform hover:scale-110"
                  data-testid={`button-rating-${value}`}
                >
                  <Star
                    className={`w-8 h-8 ${
                      value <= (hoveredRating || rating)
                        ? 'fill-primary text-primary'
                        : 'text-muted'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Category - Multiple Selection */}
          <div className="space-y-2">
            <Label>Categories (select one or more)</Label>
            <div className="grid grid-cols-3 gap-2">
              {(['communication', 'delivery', 'collaboration'] as const).map((cat) => (
                <Button
                  key={cat}
                  type="button"
                  variant={categories.includes(cat) ? 'default' : 'outline'}
                  onClick={() => toggleCategory(cat)}
                  className="capitalize"
                  data-testid={`button-category-${cat}`}
                >
                  {cat}
                </Button>
              ))}
            </div>
            {categories.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {categories.length} {categories.length === 1 ? 'category' : 'categories'} selected
              </p>
            )}
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <Label htmlFor="comment">Comment</Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your feedback..."
              rows={5}
              className="resize-none"
              data-testid="input-feedback-comment"
            />
            <p className="text-xs text-muted-foreground">
              {comment.length}/500 characters
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel-feedback"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending || rating === 0 || comment.length < 10 || categories.length === 0}
              data-testid="button-submit-feedback"
            >
              {mutation.isPending ? "Submitting..." : "Submit Feedback"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
