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
    sm: { width: 80, height: 80, strokeWidth: 6, fontSize: 'text-lg', glowSize: 8 },
    md: { width: 140, height: 140, strokeWidth: 10, fontSize: 'text-4xl', glowSize: 12 },
    lg: { width: 200, height: 200, strokeWidth: 12, fontSize: 'text-5xl', glowSize: 16 },
  };

  const config = sizes[size];
  const radius = (config.width - config.strokeWidth) / 2;
  const outerRadius = radius + 8;
  const innerRadius = radius - 12;
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

  const getScoreColorDarker = () => {
    if (score >= 90) return 'hsl(142, 72%, 40%)';
    if (score >= 75) return 'hsl(208, 82%, 35%)';
    if (score >= 60) return 'hsl(38, 90%, 45%)';
    return 'hsl(0, 68%, 35%)';
  };

  const getScoreLabel = () => {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Good';
    if (score >= 60) return 'Fair';
    return 'Needs Attention';
  };

  const isHighPerforming = score >= 90;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: config.width + 20, height: config.height + 20 }}>
        {/* Glow effect background */}
        <motion.div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle, ${getScoreColor().replace('hsl(', 'hsla(').replace(')', ', 0.2)')} 0%, transparent 70%)`,
            filter: 'blur(20px)',
          }}
          animate={{
            opacity: [0.3, 0.6, 0.3],
            scale: [0.95, 1.05, 0.95],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Celebration particles for high scores */}
        {isHighPerforming && (
          <>
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1.5 h-1.5 rounded-full"
                style={{
                  background: getScoreColor(),
                  top: '50%',
                  left: '50%',
                }}
                animate={{
                  x: [0, Math.cos((i / 6) * Math.PI * 2) * 60],
                  y: [0, Math.sin((i / 6) * Math.PI * 2) * 60],
                  opacity: [0, 1, 0],
                  scale: [0, 1.5, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.3,
                  ease: "easeOut",
                }}
              />
            ))}
          </>
        )}

        <svg
          width={config.width + 20}
          height={config.height + 20}
          className="transform -rotate-90 relative z-10"
          style={{ left: 10, top: 10 }}
        >
          {/* Define gradient */}
          <defs>
            <linearGradient id={`scoreGradient-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={getScoreColor()} stopOpacity="1" />
              <stop offset="100%" stopColor={getScoreColorDarker()} stopOpacity="1" />
            </linearGradient>
            
            {/* Glow filter */}
            <filter id={`glow-${size}`}>
              <feGaussianBlur stdDeviation={config.glowSize / 2} result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Outer decorative ring */}
          <motion.circle
            cx={config.width / 2}
            cy={config.height / 2}
            r={outerRadius}
            stroke={getScoreColor()}
            strokeWidth="1"
            fill="none"
            opacity="0.2"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.8, delay: 0.1 }}
          />

          {/* Background circle with subtle gradient */}
          <circle
            cx={config.width / 2}
            cy={config.height / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={config.strokeWidth}
            fill="none"
            className="text-muted/10"
          />

          {/* Inner shadow circle */}
          <circle
            cx={config.width / 2}
            cy={config.height / 2}
            r={innerRadius}
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            className="text-muted/5"
          />

          {/* Main progress circle with gradient and glow */}
          <motion.circle
            cx={config.width / 2}
            cy={config.height / 2}
            r={radius}
            stroke={`url(#scoreGradient-${size})`}
            strokeWidth={config.strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: "easeOut" }}
            filter={`url(#glow-${size})`}
          />

          {/* Highlight overlay for 3D effect */}
          <motion.circle
            cx={config.width / 2}
            cy={config.height / 2}
            r={radius}
            stroke="white"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            opacity="0.3"
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: "easeOut" }}
            style={{ 
              strokeDashoffset: offset - 5,
              transform: 'translate(-2px, -2px)',
            }}
          />
        </svg>

        {/* Score number */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className={`${config.fontSize} font-bold tabular-nums`}
            style={{ 
              color: getScoreColor(),
              filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))',
              textShadow: `0 0 ${config.glowSize}px ${getScoreColor()}40`,
            }}
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
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
        >
          <p 
            className="text-sm font-semibold" 
            style={{ 
              color: getScoreColor(),
              textShadow: `0 0 ${config.glowSize / 2}px ${getScoreColor()}30`,
            }}
          >
            {getScoreLabel()}
          </p>
        </motion.div>
      )}
    </div>
  );
}
