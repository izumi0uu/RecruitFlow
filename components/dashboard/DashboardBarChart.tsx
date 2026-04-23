"use client";

import { Bar } from "@/components/charts/bar";
import { BarChart } from "@/components/charts/bar-chart";
import { BarYAxis } from "@/components/charts/bar-y-axis";
import { Grid } from "@/components/charts/grid";
import { ChartTooltip } from "@/components/charts/tooltip/chart-tooltip";
import { cn } from "@/lib/utils";

type DashboardBarDatum = {
  count: number;
  label: string;
  shortLabel?: string;
};

type DashboardBarChartProps = {
  className?: string;
  data: DashboardBarDatum[];
};

const DashboardBarChart = ({ className, data }: DashboardBarChartProps) => {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="overflow-hidden rounded-[1.4rem] border border-border/70 bg-workspace-muted-surface/60 p-3">
        <BarChart
          aspectRatio="1.28 / 1"
          barGap={0.24}
          className="w-full"
          data={data}
          margin={{ top: 12, right: 18, bottom: 12, left: 132 }}
          orientation="horizontal"
          xDataKey="label"
        >
          <Grid
            horizontal={false}
            numTicksColumns={4}
            stroke="var(--workspace-divider)"
            strokeDasharray="4,6"
            vertical
          />
          <Bar
            dataKey="count"
            fill="var(--chart-primary)"
            lineCap={7}
            stroke="var(--chart-primary)"
          />
          <BarYAxis showAllLabels />
          <ChartTooltip
            showCrosshair={false}
            showDatePill={false}
            rows={(point) => [
              {
                color: "var(--chart-primary)",
                label: "Submissions",
                value: Number(point.count ?? 0),
              },
            ]}
          />
        </BarChart>
      </div>
    </div>
  );
};

export { DashboardBarChart };
