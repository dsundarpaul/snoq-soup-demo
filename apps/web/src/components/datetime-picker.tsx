"use client";

import * as React from "react";
import { format } from "date-fns";
import type { Matcher } from "react-day-picker";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar, type CalendarProps } from "@/components/ui/calendar";

type SingleCalendarExtras = {
  captionLayout: NonNullable<CalendarProps["captionLayout"]>;
  startMonth?: Date;
  endMonth?: Date;
  reverseYears?: boolean;
  disabled?: Matcher | Matcher[];
  defaultMonth?: Date;
};
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export function toDatetimeLocalString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day}T${h}:${min}`;
}

export function parseDatetimeLocalString(s: string): Date | undefined {
  if (!s?.trim()) return undefined;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export interface DatetimePickerProps {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  showLabel?: boolean;
  showMonthYearDropdowns?: boolean;
  captionLayout?: CalendarProps["captionLayout"];
  startMonth?: Date;
  endMonth?: Date;
  reverseYears?: boolean;
  disabledDays?: Matcher | Matcher[];
  defaultMonth?: Date;
  "data-testid"?: string;
}

function captionUsesDropdowns(
  layout: CalendarProps["captionLayout"]
): boolean {
  return (
    layout === "dropdown" ||
    layout === "dropdown-months" ||
    layout === "dropdown-years"
  );
}

export function DatetimePicker({
  id,
  label,
  value,
  onChange,
  disabled,
  className,
  showLabel = true,
  showMonthYearDropdowns = true,
  captionLayout: captionLayoutProp,
  startMonth: startMonthProp,
  endMonth: endMonthProp,
  reverseYears,
  disabledDays,
  defaultMonth,
  "data-testid": testId,
}: DatetimePickerProps) {
  const parsed = parseDatetimeLocalString(value);
  const [open, setOpen] = React.useState(false);
  const display = parsed ? format(parsed, "PPp") : "Pick date & time";
  const ariaLabel = `${label}: ${display}`;

  const calendarYear = new Date().getFullYear();
  const scheduleBounds = React.useMemo(
    () => ({
      startMonth: new Date(calendarYear - 2, 0, 1),
      endMonth: new Date(calendarYear + 10, 11, 1),
    }),
    [calendarYear]
  );

  const captionLayout =
    captionLayoutProp ??
    (showMonthYearDropdowns ? "dropdown" : "label");

  const calendarNav = React.useMemo((): SingleCalendarExtras => {
    const out: SingleCalendarExtras = { captionLayout };
    if (captionUsesDropdowns(captionLayout)) {
      out.startMonth = startMonthProp ?? scheduleBounds.startMonth;
      out.endMonth = endMonthProp ?? scheduleBounds.endMonth;
    } else {
      if (startMonthProp != null) out.startMonth = startMonthProp;
      if (endMonthProp != null) out.endMonth = endMonthProp;
    }
    if (reverseYears != null) out.reverseYears = reverseYears;
    if (disabledDays != null) out.disabled = disabledDays;
    if (defaultMonth != null) out.defaultMonth = defaultMonth;
    return out;
  }, [
    captionLayout,
    startMonthProp,
    endMonthProp,
    scheduleBounds.startMonth,
    scheduleBounds.endMonth,
    reverseYears,
    disabledDays,
    defaultMonth,
  ]);

  const popoverWiden = captionUsesDropdowns(calendarNav.captionLayout);

  const timeStr = React.useMemo(() => {
    if (!parsed) return "12:00";
    return `${String(parsed.getHours()).padStart(2, "0")}:${String(
      parsed.getMinutes()
    ).padStart(2, "0")}`;
  }, [parsed]);

  const applyDate = (date: Date | undefined) => {
    if (!date) return;
    const [h, m] = timeStr.split(":").map((x) => parseInt(x, 10));
    const next = new Date(date);
    next.setHours(Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0, 0, 0);
    onChange(toDatetimeLocalString(next));
  };

  const applyTime = (e: React.ChangeEvent<HTMLInputElement>) => {
    const [h, m] = e.target.value.split(":").map((x) => parseInt(x, 10));
    const base = parsed ? new Date(parsed) : new Date();
    base.setHours(Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0, 0, 0);
    onChange(toDatetimeLocalString(base));
  };

  const body = (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground"
          )}
          disabled={disabled}
          type="button"
          data-testid={testId}
          aria-label={showLabel ? undefined : ariaLabel}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          <span className="truncate">{display}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn(
          "w-auto overflow-hidden rounded-xl border-border/80 p-0 shadow-lg"
          // popoverWiden && "min-w-[19rem] sm:min-w-[21rem]"
        )}
        align="start"
      >
        <Calendar
          mode="single"
          selected={parsed}
          onSelect={(d) => {
            applyDate(d);
          }}
          autoFocus
          captionLayout={calendarNav.captionLayout}
          startMonth={calendarNav.startMonth}
          endMonth={calendarNav.endMonth}
          reverseYears={calendarNav.reverseYears}
          disabled={calendarNav.disabled}
          defaultMonth={calendarNav.defaultMonth}
        />
        <div className="border-t p-3 flex items-center gap-2">
          <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            type="time"
            value={timeStr}
            onChange={applyTime}
            className="flex-1"
          />
        </div>
      </PopoverContent>
    </Popover>
  );

  if (!showLabel) {
    return <div className={cn(className)}>{body}</div>;
  }

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      {body}
    </div>
  );
}
