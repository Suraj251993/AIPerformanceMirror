import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { motion } from "framer-motion";

interface KPICardProps {
  title: string;
  value: string | number;
  change?: number;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  delay?: number;
}

export function KPICard({ title, value, change, icon, trend = 'neutral', delay = 0 }: KPICardProps) {
  const getTrendIcon = () => {
    if (trend === 'up') return <TrendingUp className="w-3 h-3" />;
    if (trend === 'down') return <TrendingDown className="w-3 h-3" />;
    return <Minus className="w-3 h-3" />;
  };

  const getTrendColor = () => {
    if (trend === 'up') return 'text-green-500';
    if (trend === 'down') return 'text-red-500';
    return 'text-muted-foreground';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
    >
      <Card className="p-6 hover-elevate backdrop-blur-sm bg-card/95 border-card-border">
        <div className="flex items-start justify-between mb-4">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {icon && <div className="text-primary">{icon}</div>}
        </div>
        <div className="space-y-2">
          <p className="text-4xl font-bold text-card-foreground tabular-nums">{value}</p>
          {change !== undefined && (
            <div className={`flex items-center gap-1 text-sm font-medium ${getTrendColor()}`}>
              {getTrendIcon()}
              <span>{Math.abs(change)}%</span>
              <span className="text-xs text-muted-foreground">vs last period</span>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
