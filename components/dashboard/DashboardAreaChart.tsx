"use client";

import { useMemo } from "react";

import { Area } from "@/components/charts/area";
import { AreaChart } from "@/components/charts/area-chart";
import { Grid } from "@/components/charts/grid";
import { ChartTooltip } from "@/components/charts/tooltip/chart-tooltip";
import { XAxis } from "@/components/charts/x-axis";
import { cn } from "@/lib/utils";

type AreaSeries = {
  color: string;
  dataKey: string;
  label: string;
};

type DashboardAreaChartProps = {
  className?: string;
  data: Array<Record<string, number | string>>;
  series: [AreaSeries, AreaSeries];
};

const addDays = (date: Date, days: number) => {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
};

const DashboardAreaChart = ({
  className,
  data,
  series,
}: DashboardAreaChartProps) => {
  const normalizedData = useMemo(() => {
    const fallbackStart = new Date();
    fallbackStart.setHours(0, 0, 0, 0);
    fallbackStart.setDate(fallbackStart.getDate() - Math.max(data.length - 1, 0));
    const referenceYear = fallbackStart.getFullYear();

    return data.map((item, index) => {
      const label = String(item.label ?? "");
      const parsedDate = new Date(`${label}, ${referenceYear}`);
      const date = Number.isNaN(parsedDate.getTime())
        ? addDays(fallbackStart, index)
        : parsedDate;

      date.setHours(0, 0, 0, 0);

      return {
        ...item,
        date,
      };
    });
  }, [data]);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-wrap items-center gap-3">
        {series.map((entry) => (
          <div key={entry.dataKey} className="inline-flex items-center gap-2">
            <span
              className="size-2.5 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-xs font-medium text-muted-foreground">
              {entry.label}
            </span>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-[1.4rem] border border-border/70 bg-workspace-muted-surface/60 p-3">
        <AreaChart
          aspectRatio="640 / 240"
          className="w-full"
          data={normalizedData}
          margin={{ top: 18, right: 16, bottom: 32, left: 16 }}
          xDataKey="date"
        >
          <Grid
            horizontal
            numTicksRows={4}
            stroke="var(--workspace-divider)"
            strokeDasharray="4,6"
            vertical={false}
          />
          <Area
            dataKey={series[0].dataKey}
            fill={series[0].color}
            fillOpacity={0.22}
            gradientToOpacity={0}
            stroke={series[0].color}
            strokeWidth={3}
          />
          <Area
            dataKey={series[1].dataKey}
            fill={series[1].color}
            fillOpacity={0}
            gradientToOpacity={0}
            stroke={series[1].color}
            strokeWidth={2.5}
          />
          <ChartTooltip
            rows={(point) =>
              series.map((entry) => ({
                color: entry.color,
                label: entry.label,
                value: Number(point[entry.dataKey] ?? 0),
              }))
            }
          />
          <XAxis numTicks={Math.min(Math.max(normalizedData.length, 2), 7)} />
        </AreaChart>
      </div>
    </div>
  );
};

export { DashboardAreaChart };
