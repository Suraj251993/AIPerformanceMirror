import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface ScoreCircleProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  animated?: boolean;
}

export function ScoreCircle({ score, size = 'md', showLabel = true, animated = true }: ScoreCircleProps) {
  const [displayScore, setDisplayScore] = useState(animated ? 0 : score);

  const sizes = {
    sm: { width: 80, height: 80, strokeWidth: 6, fontSize: 'text-lg' },
    md: { width: 140, height: 140, strokeWidth: 10, fontSize: 'text-4xl' },
    lg: { width: 200, height: 200, strokeWidth: 12, fontSize: 'text-5xl' },
  };

  const config = sizes[size];
  const radius = (config.width - config.strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (displayScore / 100) * circumference;

  useEffect(() => {
    if (!animated) return;
    const duration = 1000;
    const steps = 60;
    const increment = score / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= score) {
        setDisplayScore(score);
        clearInterval(timer);
      } else {
        setDisplayScore(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [score, animated]);

  const getScoreColor = () => {
    if (score >= 90) return 'hsl(142, 72%, 60%)'; // Excellent - green
    if (score >= 75) return 'hsl(208, 82%, 50%)'; // Good - blue
    if (score >= 60) return 'hsl(38, 90%, 65%)'; // Fair - amber
    return 'hsl(0, 68%, 50%)'; // Needs attention - red
  };

  const getScoreLabel = () => {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Good';
    if (score >= 60) return 'Fair';
    return 'Needs Attention';
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: config.width, height: config.height }}>
        <svg
          width={config.width}
          height={config.height}
          className="transform -rotate-90"
        >
          {/* Background circle */}
          <circle
            cx={config.width / 2}
            cy={config.height / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={config.strokeWidth}
            fill="none"
            className="text-muted/20"
          />
          {/* Progress circle */}
          <motion.circle
            cx={config.width / 2}
            cy={config.height / 2}
            r={radius}
            stroke={getScoreColor()}
            strokeWidth={config.strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: "easeOut" }}
            style={{ filter: 'drop-shadow(0 0 8px currentColor)' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className={`${config.fontSize} font-bold tabular-nums`}
            style={{ color: getScoreColor() }}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            {Math.round(displayScore)}
          </motion.span>
          <span className="text-xs text-muted-foreground">/ 100</span>
        </div>
      </div>
      {showLabel && (
        <div className="text-center">
          <p className="text-sm font-semibold" style={{ color: getScoreColor() }}>
            {getScoreLabel()}
          </p>
        </div>
      )}
    </div>
  );
}
