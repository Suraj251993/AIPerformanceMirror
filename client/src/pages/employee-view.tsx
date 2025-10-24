import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { ScoreCircle } from "@/components/score-circle";
import { ActivityTimeline } from "@/components/activity-timeline";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageSquare, TrendingUp, Target, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { ScoreDetailsModal } from "@/components/score-details-modal";
import { formatDistanceToNow } from "date-fns";
import type { ActivityEvent, Feedback, Score, ScoreComponents } from "@shared/schema";

interface EmployeeData {
  latestScore?: Score & { components: ScoreComponents };
  activities: ActivityEvent[];
  feedbackReceived: (Feedback & { fromUser: { firstName: string; lastName: string } })[];
  suggestions: string[];
}

export default function EmployeeView() {
  const { user } = useAuth();
  const [showScoreDetails, setShowScoreDetails] = useState(false);

  const { data, isLoading } = useQuery<EmployeeData>({
    queryKey: ["/api/dashboard/employee"],
  });

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'communication': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'delivery': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'collaboration': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse space-y-4 text-center">
          <div className="w-32 h-32 rounded-full bg-muted/20 mx-auto" />
          <div className="h-6 w-48 bg-muted/20 rounded mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-foreground">My Performance</h1>
        <p className="text-muted-foreground">Track your progress and achievements</p>
      </div>

      {/* Score Hero */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="flex justify-center"
      >
        <Card className="p-8 max-w-md w-full text-center backdrop-blur-sm bg-gradient-to-br from-card/95 to-primary/5">
          <h2 className="text-lg font-semibold mb-6">Current Performance Score</h2>
          <div className="flex justify-center mb-6">
            <ScoreCircle
              score={data?.latestScore?.scoreValue || 0}
              size="lg"
              showLabel={true}
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setShowScoreDetails(true)}
            data-testid="button-view-score-breakdown"
          >
            View Detailed Breakdown
          </Button>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Activity Timeline */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card>
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Recent Activity
              </h2>
            </div>
            <div className="p-6">
              <ActivityTimeline activities={data?.activities || []} />
            </div>
          </Card>
        </motion.div>

        {/* Feedback & Suggestions */}
        <div className="space-y-6">
          {/* Feedback Received */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <Card>
              <div className="p-6 border-b border-border">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Recent Feedback
                </h2>
              </div>
              <div className="p-6 space-y-4">
                {data?.feedbackReceived && data.feedbackReceived.length > 0 ? (
                  data.feedbackReceived.slice(0, 3).map((feedback) => (
                    <div key={feedback.id} className="p-4 rounded-lg border border-border">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-sm font-medium">
                            {feedback.fromUser.firstName} {feedback.fromUser.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(feedback.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getCategoryColor(feedback.category)}>
                            {feedback.category}
                          </Badge>
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <div
                                key={i}
                                className={`w-2 h-2 rounded-full ${
                                  i < feedback.rating ? 'bg-primary' : 'bg-muted'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{feedback.comment}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No feedback received yet
                  </p>
                )}
              </div>
            </Card>
          </motion.div>

          {/* Improvement Suggestions */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
          >
            <Card className="border-l-4 border-l-accent">
              <div className="p-6 border-b border-border">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Suggestions for Improvement
                </h2>
              </div>
              <div className="p-6 space-y-3">
                {data?.suggestions && data.suggestions.length > 0 ? (
                  data.suggestions.map((suggestion, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <TrendingUp className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-muted-foreground">{suggestion}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Great job! Keep up the excellent work.
                  </p>
                )}
              </div>
            </Card>
          </motion.div>
        </div>
      </div>

      {user && showScoreDetails && (
        <ScoreDetailsModal
          userId={user.id}
          open={showScoreDetails}
          onOpenChange={setShowScoreDetails}
        />
      )}
    </div>
  );
}
