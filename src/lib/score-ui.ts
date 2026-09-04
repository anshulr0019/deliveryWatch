import type { CheckStatus } from "@/lib/dns-check";

export function scoreColor(score: number): string {
  if (score >= 85) return "#C8A96E";
  if (score >= 70) return "#4ADE80";
  if (score >= 55) return "#FBBF24";
  if (score >= 40) return "#FB923C";
  return "#F87171";
}

export function scoreLabel(score: number): string {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 55) return "Needs Improvement";
  if (score >= 40) return "Poor";
  return "Critical";
}

export function statusColor(status: CheckStatus | string): string {
  switch (status) {
    case "pass":
      return "#4ADE80";
    case "warn":
      return "#FBBF24";
    case "fail":
      return "#F87171";
    default:
      return "#94A3B8";
  }
}

export function statusLabel(status: CheckStatus | string): string {
  switch (status) {
    case "pass":
      return "Pass";
    case "warn":
      return "Warning";
    case "fail":
      return "Fail";
    default:
      return "Unknown";
  }
}

export function severityColor(severity: string): string {
  switch (severity) {
    case "critical":
      return "#F87171";
    case "warning":
      return "#FBBF24";
    default:
      return "#C8A96E";
  }
}
