"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
  "data-testid"?: string;
}

export function DatetimePicker({
  id,
  label,
  value,
  onChange,
  disabled,
  className,
  "data-testid": testId,
}: DatetimePickerProps) {
  const parsed = parseDatetimeLocalString(value);
  const [open, setOpen] = React.useState(false);

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

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>{label}</Label>
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
          >
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
            <span className="truncate">
              {parsed ? format(parsed, "PPp") : "Pick date & time"}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={parsed}
            onSelect={(d) => {
              applyDate(d);
            }}
            initialFocus
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
    </div>
  );
}
