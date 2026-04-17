"use client"

import * as React from "react"
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { DayButton, DayPicker, getDefaultClassNames } from "react-day-picker"

import { type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: NonNullable<VariantProps<typeof buttonVariants>["variant"]>
}

function captionUsesDropdown(
  layout: CalendarProps["captionLayout"]
): boolean {
  return (
    layout === "dropdown" ||
    layout === "dropdown-months" ||
    layout === "dropdown-years"
  )
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  buttonVariant = "ghost",
  captionLayout = "label",
  navLayout: navLayoutProp,
  formatters,
  components,
  ...props
}: CalendarProps) {
  const defaultClassNames = getDefaultClassNames()
  const captionIsDropdown = captionUsesDropdown(captionLayout)
  const navLayout =
    navLayoutProp ?? (captionIsDropdown ? "around" : undefined)
  const useAroundDropdownNav = captionIsDropdown && navLayout === "around"

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("rounded-none bg-transparent p-0", className)}
      captionLayout={captionLayout}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString("default", { month: "short" }),
        ...formatters,
      }}
      classNames={{
        root: cn("w-fit", defaultClassNames.root),
        months: cn(
          "relative flex flex-col gap-4 md:flex-row",
          defaultClassNames.months
        ),
        month: cn(
          "flex w-full flex-col gap-3",
          useAroundDropdownNav &&
            "grid grid-cols-[auto_minmax(0,1fr)_auto] grid-rows-[auto_auto] items-center gap-x-2 gap-y-3",
          defaultClassNames.month
        ),
        month_caption: cn(
          "flex w-full items-center justify-center",
          captionLayout === "label"
            ? "h-8 px-8"
            : "min-h-10 min-w-0 flex-wrap gap-y-1 px-0 py-1 sm:px-0.5",
          useAroundDropdownNav && "row-start-1",
          defaultClassNames.month_caption
        ),
        month_grid: cn(
          "w-full border-collapse",
          useAroundDropdownNav && "col-span-3 row-start-2 min-w-0",
          defaultClassNames.month_grid
        ),
        nav: cn(
          captionLayout === "label"
            ? "absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1"
            : "relative mt-1 flex w-full items-center justify-between gap-1",
          defaultClassNames.nav
        ),
        button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          "h-8 w-8 shrink-0 p-0 select-none aria-disabled:opacity-50",
          useAroundDropdownNav && "row-start-1",
          defaultClassNames.button_previous
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          "h-8 w-8 shrink-0 p-0 select-none aria-disabled:opacity-50",
          useAroundDropdownNav && "row-start-1",
          defaultClassNames.button_next
        ),
        caption_label: cn(
          "select-none text-sm font-medium",
          captionLayout === "label"
            ? ""
            : "flex h-8 items-center gap-1 rounded-md pl-2 pr-1 [&>svg]:size-3.5 [&>svg]:text-muted-foreground",
          defaultClassNames.caption_label
        ),
        dropdowns: cn(
          "flex w-full text-sm font-medium mt-1",
          captionLayout === "label"
            ? "h-8 items-center justify-center gap-1.5"
            : "min-h-9 min-w-0 gap-2 py-0.5",
          defaultClassNames.dropdowns
        ),
        months_dropdown: cn(
          "w-full min-w-0",
          defaultClassNames.months_dropdown
        ),
        years_dropdown: cn("w-full min-w-0", defaultClassNames.years_dropdown),
        dropdown_root: cn(
          "relative h-9 w-full min-w-0 rounded-md border border-input bg-muted/50 text-sm shadow-xs transition-colors hover:bg-muted focus-within:border-ring focus-within:bg-background focus-within:ring-[3px] focus-within:ring-ring/40",
          defaultClassNames.dropdown_root
        ),
        dropdown: cn("absolute inset-0 opacity-0", defaultClassNames.dropdown),
        table: "w-full border-collapse",
        weekdays: cn("flex", defaultClassNames.weekdays),
        weekday: cn(
          "flex-1 select-none text-[0.7rem] font-medium uppercase tracking-wider text-muted-foreground",
          defaultClassNames.weekday
        ),
        week: cn("mt-1.5 flex w-full", defaultClassNames.week),
        week_number_header: cn(
          "w-8 select-none",
          defaultClassNames.week_number_header
        ),
        week_number: cn(
          "select-none text-[0.8rem] text-muted-foreground",
          defaultClassNames.week_number
        ),
        day: cn(
          "group/day relative aspect-square h-full w-full select-none p-0 text-center [&:first-child[data-selected=true]_button]:rounded-l-md [&:last-child[data-selected=true]_button]:rounded-r-md",
          defaultClassNames.day
        ),
        range_start: cn(
          "rounded-l-md bg-accent",
          defaultClassNames.range_start
        ),
        range_middle: cn("rounded-none", defaultClassNames.range_middle),
        range_end: cn("rounded-r-md bg-accent", defaultClassNames.range_end),
        today: cn(
          "rounded-md bg-accent text-accent-foreground data-[selected=true]:rounded-none",
          defaultClassNames.today
        ),
        outside: cn(
          "text-muted-foreground aria-selected:text-muted-foreground",
          defaultClassNames.outside
        ),
        disabled: cn(
          "cursor-not-allowed text-muted-foreground opacity-45",
          defaultClassNames.disabled
        ),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, style, ...rootProps }) => (
          <div
            ref={rootRef}
            data-slot="calendar"
            className={cn(
              "rounded-xl border border-border/80 bg-card p-3 shadow-sm",
              className
            )}
            style={
              {
                ...style,
                "--cell-size": "2.5rem",
              } as React.CSSProperties
            }
            {...rootProps}
          />
        ),
        Chevron: ({ className, orientation, ...chevronProps }) => {
          const iconClass = cn("size-4", className);
          if (orientation === "left") {
            return <ChevronLeft className={iconClass} {...chevronProps} />;
          }
          if (orientation === "right") {
            return <ChevronRight className={iconClass} {...chevronProps} />;
          }
          return <ChevronDown className={iconClass} {...chevronProps} />;
        },
        DayButton: CalendarDayButton,
        ...components,
      }}
      {...props}
      navLayout={navLayout}
    />
  );
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...buttonProps
}: React.ComponentProps<typeof DayButton>) {
  const defaultClassNames = getDefaultClassNames()
  const ref = React.useRef<HTMLButtonElement>(null)

  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  return (
    <button
      ref={ref}
      type="button"
      data-day={day.date.toLocaleDateString()}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        buttonVariants({ variant: "ghost" }),
        "flex aspect-square h-[--cell-size] w-[--cell-size] flex-col gap-1 rounded-lg font-normal leading-none transition-colors duration-150",
        "data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground data-[selected-single=true]:hover:bg-primary data-[selected-single=true]:hover:text-primary-foreground",
        "data-[range-middle=true]:bg-accent data-[range-middle=true]:text-accent-foreground",
        "data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground",
        "group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:border-ring group-data-[focused=true]/day:ring-[3px] group-data-[focused=true]/day:ring-ring/50",
        defaultClassNames.day,
        className
      )}
      {...buttonProps}
    />
  )
}

Calendar.displayName = "Calendar"

export { Calendar, CalendarDayButton }
