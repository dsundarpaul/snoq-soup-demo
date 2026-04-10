"use client";

import * as React from "react";
import { format, parse } from "date-fns";
import { CalendarIcon } from "lucide-react";
import type { Matcher } from "react-day-picker";
import { cn } from "@/lib/utils";
import { isDisallowedHunterDobCalendarDay } from "@/lib/hunter-dob";
import { Button } from "@/components/ui/button";
import { Calendar, type CalendarProps } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";

type SingleCalendarExtras = {
  captionLayout: NonNullable<CalendarProps["captionLayout"]>;
  startMonth?: Date;
  endMonth?: Date;
  reverseYears?: boolean;
  disabled?: Matcher | Matcher[];
  defaultMonth?: Date;
};

export type DatePickerPreset = "birth-date" | "future-only";

type PresetNavConfig = {
  captionLayout: NonNullable<CalendarProps["captionLayout"]>;
  startMonth?: Date;
  endMonth?: Date;
  reverseYears?: boolean;
  disabled?: Matcher | Matcher[];
  defaultMonthWhenEmpty?: Date;
};

function getPresetNavConfig(
  preset: DatePickerPreset,
  now: Date
): PresetNavConfig {
  if (preset === "birth-date") {
    return {
      captionLayout: "dropdown",
      startMonth: new Date(now.getFullYear() - 120, 0, 1),
      endMonth: new Date(now.getFullYear(), now.getMonth(), 1),
      reverseYears: true,
      disabled: (d: Date) => isDisallowedHunterDobCalendarDay(d, now),
      defaultMonthWhenEmpty: new Date(now.getFullYear() - 25, now.getMonth(), 1),
    };
  }
  return {
    captionLayout: "dropdown",
    startMonth: new Date(now.getFullYear(), now.getMonth(), 1),
    endMonth: new Date(now.getFullYear() + 25, 11, 1),
    reverseYears: false,
    defaultMonthWhenEmpty: new Date(now.getFullYear(), now.getMonth(), 1),
  };
}

function buildCalendarNavProps(opts: {
  preset?: DatePickerPreset;
  showMonthYearDropdowns?: boolean;
  captionLayout?: CalendarProps["captionLayout"];
  startMonth?: Date;
  endMonth?: Date;
  reverseYears?: boolean;
  disabled?: Matcher | Matcher[];
  defaultMonth?: Date;
  hasSelectedDate: boolean;
}): SingleCalendarExtras {
  const now = new Date();
  const presetNav = opts.preset ? getPresetNavConfig(opts.preset, now) : null;

  const captionLayout =
    opts.captionLayout ??
    presetNav?.captionLayout ??
    (opts.showMonthYearDropdowns ? "dropdown" : "label");

  const startMonth = opts.startMonth ?? presetNav?.startMonth;
  const endMonth = opts.endMonth ?? presetNav?.endMonth;
  const reverseYears = opts.reverseYears ?? presetNav?.reverseYears;
  const disabled = opts.disabled ?? presetNav?.disabled;

  const defaultMonth =
    opts.defaultMonth ??
    (!opts.hasSelectedDate && presetNav?.defaultMonthWhenEmpty
      ? presetNav.defaultMonthWhenEmpty
      : undefined);

  const out: SingleCalendarExtras = { captionLayout };
  if (startMonth != null) out.startMonth = startMonth;
  if (endMonth != null) out.endMonth = endMonth;
  if (reverseYears != null) out.reverseYears = reverseYears;
  if (disabled != null) out.disabled = disabled;
  if (defaultMonth != null) out.defaultMonth = defaultMonth;
  return out;
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

export interface DatePickerFieldProps {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  variant?: "default" | "compact";
  showLabel?: boolean;
  preset?: DatePickerPreset;
  showMonthYearDropdowns?: boolean;
  captionLayout?: CalendarProps["captionLayout"];
  startMonth?: Date;
  endMonth?: Date;
  reverseYears?: boolean;
  disabledDays?: Matcher | Matcher[];
  defaultMonth?: Date;
  "data-testid"?: string;
}

function parseYmd(s: string): Date | undefined {
  if (!s?.trim()) return undefined;
  try {
    const d = parse(s, "yyyy-MM-dd", new Date());
    return Number.isNaN(d.getTime()) ? undefined : d;
  } catch {
    return undefined;
  }
}

export function DatePickerField({
  id,
  label,
  value,
  onChange,
  disabled,
  className,
  placeholder = "Pick a date",
  variant = "default",
  showLabel = true,
  preset,
  showMonthYearDropdowns,
  captionLayout,
  startMonth,
  endMonth,
  reverseYears,
  disabledDays,
  defaultMonth,
  "data-testid": testId,
}: DatePickerFieldProps) {
  const parsed = parseYmd(value);
  const [open, setOpen] = React.useState(false);
  const ariaLabel = `${label}: ${parsed ? format(parsed, "PPP") : placeholder}`;

  const calendarNav = React.useMemo(() => {
    const selected = parseYmd(value);
    return buildCalendarNavProps({
      preset,
      showMonthYearDropdowns,
      captionLayout,
      startMonth,
      endMonth,
      reverseYears,
      disabled: disabledDays,
      defaultMonth,
      hasSelectedDate: Boolean(value?.trim() && selected),
    });
  }, [
    value,
    preset,
    showMonthYearDropdowns,
    captionLayout,
    startMonth,
    endMonth,
    reverseYears,
    disabledDays,
    defaultMonth,
  ]);

  const popoverWiden = captionUsesDropdowns(calendarNav.captionLayout);

  const calendar = (
    <Calendar
      mode="single"
      selected={parsed}
      onSelect={(d) => {
        if (d) {
          onChange(format(d, "yyyy-MM-dd"));
          setOpen(false);
        }
      }}
      autoFocus
      captionLayout={calendarNav.captionLayout}
      startMonth={calendarNav.startMonth}
      endMonth={calendarNav.endMonth}
      reverseYears={calendarNav.reverseYears}
      disabled={calendarNav.disabled}
      defaultMonth={calendarNav.defaultMonth}
    />
  );

  if (variant === "compact") {
    return (
      <div
        className={cn("flex items-center gap-1.5 min-w-0", className)}
        title={`${label}: ${parsed ? format(parsed, "PPP") : placeholder}`}
      >
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground shrink-0 leading-none">
          {label}
        </span>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              id={id}
              variant="outline"
              type="button"
              size="sm"
              className={cn(
                "h-8 shrink-0 px-2 text-xs font-normal tabular-nums justify-start gap-1.5 min-w-[6.75rem] max-w-[9.5rem]",
                !parsed && "text-muted-foreground"
              )}
              disabled={disabled}
              data-testid={testId}
              aria-label={ariaLabel}
            >
              <CalendarIcon className="h-3.5 w-3.5 shrink-0 opacity-70" />
              <span className="truncate">
                {parsed ? format(parsed, "MMM d, yyyy") : placeholder}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className={cn(
              "w-auto overflow-hidden rounded-xl border-border/80 p-0 shadow-lg",
              popoverWiden && "min-w-[19rem] sm:min-w-[21rem]"
            )}
            align="end"
          >
            {calendar}
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  const trigger = (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          type="button"
          className={cn(
            "w-full justify-start text-left font-normal",
            !parsed && "text-muted-foreground"
          )}
          disabled={disabled}
          data-testid={testId}
          aria-label={showLabel ? undefined : ariaLabel}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {parsed ? format(parsed, "PPP") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn(
          "w-auto overflow-hidden rounded-xl border-border/80 p-0 shadow-lg",
          popoverWiden && "min-w-[19rem] sm:min-w-[21rem]"
        )}
        align="start"
      >
        {calendar}
      </PopoverContent>
    </Popover>
  );

  if (!showLabel) {
    return <div className={cn(className)}>{trigger}</div>;
  }

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      {trigger}
    </div>
  );
}
