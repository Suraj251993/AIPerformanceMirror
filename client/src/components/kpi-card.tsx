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
      whileHover={{ 
        y: -8,
        transition: { duration: 0.2 }
      }}
      style={{
        transformStyle: 'preserve-3d',
      }}
    >
      <motion.div
        whileHover={{ 
          rotateY: 2,
          rotateX: -2,
        }}
        transition={{ duration: 0.2 }}
        style={{
          transformStyle: 'preserve-3d',
        }}
      >
        <Card 
          className="p-6 backdrop-blur-sm bg-card/95 border-card-border relative overflow-hidden"
          style={{
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 10px 15px -3px rgba(0, 0, 0, 0.05)',
          }}
        >
          {/* 3D extruded layers */}
          <div 
            className="absolute inset-0 -z-10 rounded-xl border border-card-border/50"
            style={{
              transform: 'translateZ(-4px) translateY(4px)',
              background: 'linear-gradient(145deg, rgba(var(--card-rgb), 0.4), rgba(var(--card-rgb), 0.2))',
            }}
          />
          <div 
            className="absolute inset-0 -z-20 rounded-xl border border-card-border/30"
            style={{
              transform: 'translateZ(-8px) translateY(8px)',
              background: 'linear-gradient(145deg, rgba(var(--card-rgb), 0.2), rgba(var(--card-rgb), 0.1))',
            }}
          />

          {/* Subtle gradient overlay */}
          <div 
            className="absolute inset-0 opacity-30 pointer-events-none"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, transparent 50%, rgba(0, 0, 0, 0.05) 100%)',
            }}
          />

          {/* Content */}
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-4">
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              {icon && (
                <motion.div 
                  className="text-primary"
                  whileHover={{ 
                    scale: 1.1,
                    rotate: 5,
                  }}
                  transition={{ duration: 0.2 }}
                  style={{
                    filter: 'drop-shadow(0 0 8px rgba(var(--primary-rgb), 0.3))',
                  }}
                >
                  {icon}
                </motion.div>
              )}
            </div>
            <div className="space-y-2">
              <motion.p 
                className="text-4xl font-bold text-card-foreground tabular-nums"
                style={{
                  textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                }}
              >
                {value}
              </motion.p>
              {change !== undefined && (
                <motion.div 
                  className={`flex items-center gap-1 text-sm font-medium ${getTrendColor()}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: delay + 0.3, duration: 0.3 }}
                >
                  <motion.div
                    animate={{ 
                      y: trend === 'up' ? [-2, 0] : trend === 'down' ? [2, 0] : [0, 0]
                    }}
                    transition={{ 
                      repeat: Infinity, 
                      duration: 1, 
                      repeatType: "reverse" 
                    }}
                  >
                    {getTrendIcon()}
                  </motion.div>
                  <span>{Math.abs(change)}%</span>
                  <span className="text-xs text-muted-foreground">vs last period</span>
                </motion.div>
              )}
            </div>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}
