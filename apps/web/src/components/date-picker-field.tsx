"use client";

import * as React from "react";
import { format, parse } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";

export interface DatePickerFieldProps {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  variant?: "default" | "compact";
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
  "data-testid": testId,
}: DatePickerFieldProps) {
  const parsed = parseYmd(value);
  const [open, setOpen] = React.useState(false);

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
              aria-label={`${label}: ${parsed ? format(parsed, "PPP") : placeholder}`}
            >
              <CalendarIcon className="h-3.5 w-3.5 shrink-0 opacity-70" />
              <span className="truncate">
                {parsed ? format(parsed, "MMM d, yyyy") : placeholder}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={parsed}
              onSelect={(d) => {
                if (d) {
                  onChange(format(d, "yyyy-MM-dd"));
                  setOpen(false);
                }
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>{label}</Label>
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
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {parsed ? format(parsed, "PPP") : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={parsed}
            onSelect={(d) => {
              if (d) {
                onChange(format(d, "yyyy-MM-dd"));
                setOpen(false);
              }
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
