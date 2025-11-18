import { Button } from "@/components/ui/button";
import { BarChart3, TrendingUp, Users, Award } from "lucide-react";
import { motion } from "framer-motion";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto text-center space-y-8"
        >
          {/* Logo/Icon */}
          <div className="flex justify-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2, type: "spring" }}
              className="relative"
            >
              <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
              <div className="relative flex items-center justify-center w-24 h-24 rounded-2xl bg-gradient-to-br from-primary to-accent shadow-2xl">
                <BarChart3 className="w-12 h-12 text-primary-foreground" />
              </div>
            </motion.div>
          </div>

          {/* Heading */}
          <div className="space-y-4">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
              AI Performance <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Mirror</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
              Real-time employee performance tracking and analytics with intelligent insights
            </p>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8">
            {[
              { icon: TrendingUp, title: "Performance Scoring", desc: "AI-driven insights" },
              { icon: Users, title: "Team Analytics", desc: "Comprehensive dashboards" },
              { icon: Award, title: "Feedback System", desc: "Continuous improvement" },
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 + i * 0.1 }}
                className="p-6 rounded-xl bg-card/50 backdrop-blur-sm border border-card-border hover-elevate"
              >
                <feature.icon className="w-8 h-8 mb-3 text-primary mx-auto" />
                <h3 className="font-semibold mb-1">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="pt-8 space-y-6"
          >
            <div className="space-y-4">
              <Button
                size="lg"
                onClick={() => window.location.href = '/auth/zoho/login'}
                data-testid="button-zoho-login"
                className="text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-shadow w-full md:w-auto"
              >
                Sign in with Zoho
              </Button>
              <div className="flex items-center gap-4 justify-center">
                <div className="h-px bg-border flex-1 max-w-[100px]" />
                <span className="text-sm text-muted-foreground">or</span>
                <div className="h-px bg-border flex-1 max-w-[100px]" />
              </div>
              <Button
                size="lg"
                variant="outline"
                onClick={() => window.location.href = '/api/login'}
                data-testid="button-demo-login"
                className="text-lg px-8 py-6 w-full md:w-auto"
              >
                Try Demo Mode
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Track, analyze, and improve team performance
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
