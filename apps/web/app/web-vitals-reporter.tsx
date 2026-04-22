"use client";

import { useReportWebVitals } from "next/web-vitals";
import { metricsDistribution } from "@/lib/observability";

export function WebVitalsReporter() {
  useReportWebVitals((metric) => {
    const attributes: Record<string, string> = {
      name: metric.name,
      id: metric.id,
      rating: metric.rating,
    };
    if ("navigationType" in metric && metric.navigationType != null) {
      attributes.navigationType = String(
        (metric as { navigationType?: string }).navigationType
      );
    }
    metricsDistribution("next.web_vitals", metric.value, {
      attributes,
      unit: metric.name === "CLS" ? undefined : "millisecond",
    });
  });
  return null;
}
