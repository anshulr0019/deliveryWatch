"use client";

import { useRef, type ComponentType } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useReducedMotion,
  type MotionValue,
} from "motion/react";
import {
  Activity,
  GitCompareArrows,
  ShieldAlert,
  Bell,
  LineChart,
  Layers,
  RefreshCw,
  Zap,
} from "lucide-react";
import { SpotlightCard } from "@/components/mailscore/SpotlightCard";

export interface FeatureItem {
  icon: ComponentType<{ className?: string }>;
  title: string;
  body: string;
}

const DEFAULT_FEATURES: FeatureItem[] = [
  {
    icon: Activity,
    title: "24/7 Automated Monitoring",
    body: "Every domain is re-probed continuously every 15 minutes across SPF, DKIM, DMARC, MX records and 8 blacklists.",
  },
  {
    icon: GitCompareArrows,
    title: "DNS Change & Drift Diffing",
    body: "The instant a teammate edits an SPF include, rotates keys, or sets p=none, our diff engine catches the drift and alerts you.",
  },
  {
    icon: ShieldAlert,
    title: "8-Database Blacklist Watchdog",
    body: "Spamhaus, Barracuda, SpamCop, SORBS, UCEPROTECT, PSBL, DroneBL & CBL scanned around the clock with instant escalation.",
  },
  {
    icon: Bell,
    title: "WhatsApp, Slack & Email Alerts",
    body: "Receive urgent pings directly inside your team's channels before campaigns send to the spam folder.",
  },
  {
    icon: LineChart,
    title: "Historical Deliverability Trends",
    body: "Track your domain deliverability scores over 7, 30 and 90 days. Detect slow degradation before it impacts replies.",
  },
  {
    icon: Layers,
    title: "Domain Isolation Safeguards",
    body: "Keep secondary cold sending domains strictly separated from your core business inbox to eliminate domain burning.",
  },
  {
    icon: RefreshCw,
    title: "Automated Selector Probing",
    body: "Intelligent discovery algorithms check Google Workspace, Microsoft 365, Mailgun, Postmark and SendGrid DKIM keys.",
  },
  {
    icon: Zap,
    title: "100% Free Forever",
    body: "Unlimited domains, unlimited history, zero credit card required. Our open monitoring infrastructure is built for teams.",
  },
];

function Card3DItem({
  feature,
  index,
  progress,
  isReducedMotion,
}: {
  feature: FeatureItem;
  index: number;
  progress: MotionValue<number>;
  isReducedMotion: boolean | null;
}) {
  const row = Math.floor(index / 4);
  const col = index % 4;

  // Diagonal ripple wave across 4 columns & 2 rows
  const diag = (row * 1.5 + col) / 4.5;
  const start = diag * 0.32;
  const end = Math.min(1, start + 0.64);

  // 3D Perspective transforms
  const rotateX = useTransform(progress, [start, end], [18, 0], { clamp: true });
  const translateY = useTransform(progress, [start, end], [48, 0], { clamp: true });
  const translateZ = useTransform(progress, [start, end], [-60, 0], { clamp: true });
  const scale = useTransform(progress, [start, end], [0.92, 1], { clamp: true });
  const opacity = useTransform(progress, [start, end], [0.35, 1], { clamp: true });

  const Icon = feature.icon;

  if (isReducedMotion) {
    return (
      <div className="h-full">
        <SpotlightCard className="h-full tilt-card" innerClassName="p-6 border border-slate-200/80">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-[#0F372E] shadow-sm">
            <Icon className="h-5 w-5" />
          </div>
          <h3 className="font-display mt-5 text-base font-bold text-[#0B1311]">{feature.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">{feature.body}</p>
        </SpotlightCard>
      </div>
    );
  }

  return (
    <motion.div
      style={{
        rotateX,
        translateY,
        translateZ,
        scale,
        opacity,
        transformStyle: "preserve-3d",
        transformOrigin: "center bottom",
      }}
      className="h-full will-change-transform"
    >
      <SpotlightCard className="h-full tilt-card" innerClassName="p-6 border border-slate-200/80">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-[#0F372E] shadow-sm">
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="font-display mt-5 text-base font-bold text-[#0B1311]">{feature.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{feature.body}</p>
      </SpotlightCard>
    </motion.div>
  );
}

export function PerspectiveGrid({ features = DEFAULT_FEATURES }: { features?: FeatureItem[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isReducedMotion = useReducedMotion();

  // Track scroll position of the grid section
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 92%", "center 52%"],
  });

  // Inertial spring for buttery fluid response with Lenis smooth-scroll
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 140,
    damping: 24,
    restDelta: 0.001,
  });

  return (
    <div
      ref={containerRef}
      style={{
        perspective: "1200px",
        perspectiveOrigin: "50% 20%",
        transformStyle: "preserve-3d",
      }}
      className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
    >
      {features.map((feature, i) => (
        <Card3DItem
          key={feature.title}
          feature={feature}
          index={i}
          progress={smoothProgress}
          isReducedMotion={isReducedMotion}
        />
      ))}
    </div>
  );
}
