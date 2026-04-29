"use client";

import { useMemo, useState } from "react";

import { PieChart } from "@/components/charts/pie-chart";
import { PieSlice } from "@/components/charts/pie-slice";
import { cn } from "@/lib/utils";

type RingSegmentTone = "accent" | "muted" | "primary" | "secondary" | "strong";

type RingSegment = {
  label: string;
  tone: RingSegmentTone;
  value: number;
};

type DashboardRingChartProps = {
  centerLabel: string;
  centerValue: string;
  className?: string;
  data: RingSegment[];
};

const TONE_COLORS: Record<RingSegmentTone, string> = {
  accent: "var(--chart-accent)",
  muted: "var(--chart-muted)",
  primary: "var(--chart-primary)",
  secondary: "var(--chart-secondary)",
  strong: "var(--chart-strong)",
};

const DashboardRingChart = ({
  centerLabel,
  centerValue,
  className,
  data,
}: DashboardRingChartProps) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const total = useMemo(
    () => data.reduce((sum, item) => sum + item.value, 0),
    [data],
  );

  const pieData = useMemo(() => {
    if (total === 0) {
      return [
        {
          color: "var(--chart-muted)",
          label: "No active submissions",
          value: 1,
        },
      ];
    }

    return data.map((segment) => ({
      color: TONE_COLORS[segment.tone],
      label: segment.label,
      value: segment.value,
    }));
  }, [data, total]);

  const hoveredSegment =
    hoveredIndex != null && total > 0 ? data[hoveredIndex] : null;

  return (
    <div className={cn("grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]", className)}>
      <div className="mx-auto flex size-[220px] items-center justify-center rounded-full border border-border/70 bg-workspace-muted-surface">
        <div className="relative flex size-[176px] items-center justify-center">
          <PieChart
            className="size-[176px]"
            cornerRadius={6}
            data={pieData}
            hoveredIndex={hoveredIndex}
            hoverOffset={6}
            innerRadius={48}
            onHoverChange={setHoveredIndex}
            padAngle={0.018}
            size={176}
          >
            {pieData.map((segment, index) => (
              <PieSlice
                key={`${segment.label}-${index}`}
                color={segment.color}
                hoverEffect="translate"
                index={index}
              />
            ))}
          </PieChart>

          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">
              {hoveredSegment?.label ?? centerLabel}
            </span>
            <span className="mt-2 text-[1.65rem] font-semibold tracking-[-0.05em] text-foreground">
              {hoveredSegment ? hoveredSegment.value : centerValue}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {data.map((segment, index) => (
          <div
            key={segment.label}
            className={cn(
              "flex items-center justify-between gap-3 rounded-[1.1rem] border border-border/70 bg-workspace-muted-surface/70 px-3 py-3 transition-colors",
              hoveredIndex === index && "bg-surface-2",
            )}
          >
            <div className="flex items-center gap-3">
              <span
                className="size-3 rounded-full"
                style={{ backgroundColor: TONE_COLORS[segment.tone] }}
              />
              <span className="text-sm text-foreground">{segment.label}</span>
            </div>
            <span className="text-sm font-medium text-muted-foreground">
              {segment.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export { DashboardRingChart };
