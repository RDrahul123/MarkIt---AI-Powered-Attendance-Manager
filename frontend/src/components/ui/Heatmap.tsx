import { useMemo } from "react";
import { format, parseISO, eachDayOfInterval, startOfMonth, endOfMonth } from "date-fns";
import { cn } from "@/lib/utils";
import type { HeatmapData as HeatmapDataType } from "@/types";

interface HeatmapProps {
  data: HeatmapDataType["data"];
  className?: string;
}
export function Heatmap({ data, className }: HeatmapProps) {
  const { startDate, endDate, days } = useMemo(() => {
    if (data.length === 0) {
      const today = new Date();
      const start = startOfMonth(today);
      const end = endOfMonth(today);
      return { startDate: start, endDate: end, days: [] };
    }

    const dates = data.map((d) => parseISO(d.date));
    const start = new Date(Math.min(...dates.map((d) => d.getTime())));
    const end = new Date(Math.max(...dates.map((d) => d.getTime())));
    return { startDate: start, endDate: end, days: dates };
  }, [data]);

  const allDays = useMemo(() => {
    if (days.length > 0) return days;
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [days, startDate, endDate]);

const dataMap = useMemo(() => {
    const map = new Map<string, HeatmapDataType["data"][number]>();
    for (const d of data) map.set(d.date, d);
    return map;
  }, [data]);

  const getColor = (day: Date) => {
    const dayStr = format(day, "yyyy-MM-dd");
    const dayData = dataMap.get(dayStr);
    if (!dayData) return "bg-gray-100";
    const total = dayData.present + dayData.absent + dayData.late + dayData.excused;
    if (total === 0) return "bg-gray-100";
    const rate = (dayData.present + dayData.late) / total;
    if (rate >= 0.9) return "bg-green-400";
    if (rate >= 0.75) return "bg-yellow-400";
    return "bg-red-400";
  };

  const weekRows = [];
  let currentWeek: Date[] = [];

  for (let i = 0; i < allDays.length; i++) {
    const day = allDays[i];
    if (day.getDay() === 0 && currentWeek.length > 0) {
      weekRows.push(currentWeek);
      currentWeek = [];
    }
    currentWeek.push(day);
  }
  if (currentWeek.length > 0) weekRows.push(currentWeek);

  return (
    <div className={className}>
      <div className="mb-2 text-xs text-gray-500">
        {format(startDate, "MMM d")} – {format(endDate, "MMM d")}
      </div>
      <div className="grid grid-cols-7 gap-px text-center text-xs text-gray-400">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px">
        {weekRows.map((week) =>
          week.map((day) => {
            const dayStr = format(day, "yyyy-MM-dd");
            const dayData = dataMap.get(dayStr);
            const total = dayData
              ? dayData.present + dayData.absent + dayData.late + dayData.excused
              : 0;
            return (
              <div key={dayStr} className="relative p-0.5">
                <div
                  className={cn(
                    "aspect-square w-full rounded-sm transition-colors",
                    total > 0 ? getColor(day) : "bg-gray-100"
                  )}
                  title={
                    dayData
                      ? `${format(day, "MMM d")}: P${dayData.present} A${dayData.absent} L${dayData.late} E${dayData.excused}`
                      : format(day, "MMM d")
                  }
                />
                <span className="absolute bottom-0 left-0.5 text-xs text-gray-400">
                  {format(day, "d")}
                </span>
              </div>
            );
          })
        )}
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
        <span>Less</span>
        <div className="flex gap-1">
          {["bg-gray-100", "bg-red-400", "bg-yellow-400", "bg-green-400"].map((c) => (
            <div key={c} className={`h-3 w-3 rounded-sm ${c}`} />
          ))}
        </div>
        <span>More</span>
      </div>
    </div>
  );
}
