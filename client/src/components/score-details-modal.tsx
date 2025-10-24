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
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
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
                    
                    // Safely get weight, default to 0 if not found
                    const weights = data.latestScore!.components.weights || {};
                    const weight = weights[key as keyof typeof weights] || 0;
                    
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
                            {componentLabels[key as keyof typeof componentLabels] || key}
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
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
              >
                <Card className="p-6 relative overflow-hidden">
                  {/* Subtle glow background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
                  
                  <h3 className="text-lg font-semibold mb-4 relative z-10">Performance Trend</h3>
                  <div className="relative z-10">
                    <ResponsiveContainer width="100%" height={280}>
                      <AreaChart data={data.history.slice(-30)}>
                        <defs>
                          {/* Gradient fill for area */}
                          <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.05}/>
                          </linearGradient>
                          {/* Glow filter for line */}
                          <filter id="lineGlow">
                            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                            <feMerge>
                              <feMergeNode in="coloredBlur"/>
                              <feMergeNode in="SourceGraphic"/>
                            </feMerge>
                          </filter>
                        </defs>
                        <CartesianGrid 
                          strokeDasharray="3 3" 
                          className="stroke-border/30" 
                          vertical={false}
                        />
                        <XAxis
                          dataKey="date"
                          className="text-xs"
                          tickLine={false}
                          axisLine={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }}
                          tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        />
                        <YAxis 
                          domain={[0, 100]} 
                          className="text-xs"
                          tickLine={false}
                          axisLine={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }}
                        />
                        <Tooltip
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              const score = payload[0].value as number;
                              const getScoreColor = () => {
                                if (score >= 90) return 'hsl(142, 72%, 60%)';
                                if (score >= 75) return 'hsl(208, 82%, 50%)';
                                if (score >= 60) return 'hsl(38, 90%, 65%)';
                                return 'hsl(0, 68%, 50%)';
                              };
                              
                              return (
                                <div 
                                  className="backdrop-blur-md bg-card/95 border border-border rounded-lg p-3 shadow-2xl"
                                  style={{
                                    boxShadow: `0 8px 16px -4px ${getScoreColor()}40, 0 0 0 1px ${getScoreColor()}20`,
                                  }}
                                >
                                  <p className="text-xs text-muted-foreground mb-1">
                                    {new Date(label).toLocaleDateString('en-US', { 
                                      month: 'short', 
                                      day: 'numeric',
                                      year: 'numeric'
                                    })}
                                  </p>
                                  <p className="text-lg font-bold" style={{ color: getScoreColor() }}>
                                    {score.toFixed(1)}
                                  </p>
                                  <p className="text-xs text-muted-foreground">Performance Score</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        {/* Area with gradient fill */}
                        <Area
                          type="monotone"
                          dataKey="scoreValue"
                          stroke="none"
                          fill="url(#scoreGradient)"
                          animationDuration={1000}
                          animationBegin={200}
                        />
                        {/* Line with glow effect */}
                        <Line
                          type="monotone"
                          dataKey="scoreValue"
                          stroke="hsl(var(--primary))"
                          strokeWidth={3}
                          dot={{ 
                            fill: 'hsl(var(--card))', 
                            stroke: 'hsl(var(--primary))',
                            strokeWidth: 3,
                            r: 5,
                            style: { filter: 'drop-shadow(0 0 4px hsl(var(--primary)))' }
                          }}
                          activeDot={{ 
                            r: 7, 
                            fill: 'hsl(var(--primary))',
                            stroke: 'hsl(var(--card))',
                            strokeWidth: 2,
                            style: { filter: 'drop-shadow(0 0 8px hsl(var(--primary)))' }
                          }}
                          filter="url(#lineGlow)"
                          animationDuration={1500}
                          animationBegin={0}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </motion.div>
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
