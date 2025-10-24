import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScoreCircle } from "@/components/score-circle";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { Score, ScoreComponents, User } from "@shared/schema";
import { motion } from "framer-motion";

interface ScoreDetailsModalProps {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ScoreDetailsData {
  user: User;
  latestScore?: Score & { components: ScoreComponents };
  history: Score[];
}

export function ScoreDetailsModal({ userId, open, onOpenChange }: ScoreDetailsModalProps) {
  const { data, isLoading } = useQuery<ScoreDetailsData>({
    queryKey: ["/api/scores", userId],
    enabled: open,
  });

  const componentLabels = {
    taskCompletion: "Task Completion",
    timeliness: "Timeliness",
    efficiency: "Efficiency",
    velocity: "Sprint Velocity",
    collaboration: "Collaboration",
    feedback: "Feedback Score",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            Performance Breakdown - {data?.user.firstName} {data?.user.lastName}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="py-12 text-center">
            <div className="animate-pulse space-y-4">
              <div className="h-32 bg-muted/20 rounded" />
              <div className="h-64 bg-muted/20 rounded" />
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Overall Score */}
            <div className="flex justify-center py-4">
              <ScoreCircle
                score={data?.latestScore?.scoreValue || 0}
                size="lg"
                showLabel={true}
              />
            </div>

            {/* Score Components Breakdown */}
            {data?.latestScore?.components && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Score Components</h3>
                <div className="space-y-4">
                  {Object.entries(data.latestScore.components).map(([key, value], index) => {
                    if (key === 'weights') return null;
                    const weight = data.latestScore!.components.weights[key as keyof typeof data.latestScore.components.weights];
                    
                    return (
                      <motion.div
                        key={key}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className="space-y-2"
                      >
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">
                            {componentLabels[key as keyof typeof componentLabels]}
                          </span>
                          <span className="text-muted-foreground">
                            {(value as number).toFixed(1)} × {(weight * 100).toFixed(0)}% weight
                          </span>
                        </div>
                        <Progress value={value as number} className="h-2" />
                      </motion.div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* Score History Chart */}
            {data?.history && data.history.length > 1 && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Performance Trend</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={data.history.slice(-30)}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      dataKey="date"
                      className="text-xs"
                      tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis domain={[0, 100]} className="text-xs" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '0.5rem',
                      }}
                      labelFormatter={(date) => new Date(date).toLocaleDateString()}
                      formatter={(value: any) => [value.toFixed(1), 'Score']}
                    />
                    <Line
                      type="monotone"
                      dataKey="scoreValue"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            )}

            {/* Weight Configuration Info */}
            {data?.latestScore?.components.weights && (
              <Card className="p-6 bg-muted/30">
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground">
                  Current Weight Configuration
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  {Object.entries(data.latestScore.components.weights).map(([key, weight]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-muted-foreground">
                        {componentLabels[key as keyof typeof componentLabels]}:
                      </span>
                      <span className="font-medium">{(weight * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
