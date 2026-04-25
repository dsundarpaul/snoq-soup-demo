"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Search, Store } from "lucide-react";

export type AdminMerchantOption = {
  id: string;
  businessName: string;
  emailVerified?: boolean;
};

export function AdminMerchantAutocomplete({
  inputId,
  merchants,
  search,
  onSearchChange,
  onSelectMerchant,
}: {
  inputId: string;
  merchants: AdminMerchantOption[];
  search: string;
  onSearchChange: (value: string) => void;
  onSelectMerchant: (id: string) => void;
}) {
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const blurCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const eligible = useMemo(
    () => merchants.filter((m) => m.emailVerified !== false),
    [merchants],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return eligible;
    return eligible.filter((m) =>
      m.businessName.toLowerCase().includes(q),
    );
  }, [eligible, search]);

  useEffect(() => {
    setActiveIndex(0);
  }, [search]);

  const clearBlurTimer = useCallback(() => {
    if (blurCloseTimer.current) {
      clearTimeout(blurCloseTimer.current);
      blurCloseTimer.current = null;
    }
  }, []);

  const scheduleClosePopover = useCallback(() => {
    clearBlurTimer();
    blurCloseTimer.current = setTimeout(() => {
      setPopoverOpen(false);
      blurCloseTimer.current = null;
    }, 150);
  }, [clearBlurTimer]);

  useEffect(() => () => clearBlurTimer(), [clearBlurTimer]);

  const select = useCallback(
    (m: (typeof eligible)[0]) => {
      onSelectMerchant(m.id);
      onSearchChange("");
      setPopoverOpen(false);
    },
    [onSelectMerchant, onSearchChange],
  );

  const activeOptionId =
    popoverOpen && filtered.length > 0 && activeIndex < filtered.length
      ? `merchant-opt-${listboxId}-${filtered[activeIndex]!.id}`
      : undefined;

  return (
    <Popover
      open={popoverOpen}
      onOpenChange={(o) => {
        if (!o) setPopoverOpen(false);
      }}
      modal={false}
    >
      <PopoverAnchor asChild>
        <div className="relative w-full">
          <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            id={inputId}
            type="text"
            autoComplete="off"
            role="combobox"
            aria-expanded={popoverOpen}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={activeOptionId}
            placeholder="Search merchants…"
            className="pl-9"
            value={search}
            onChange={(e) => {
              onSearchChange(e.target.value);
              setPopoverOpen(true);
            }}
            onFocus={() => {
              clearBlurTimer();
              setPopoverOpen(true);
            }}
            onBlur={scheduleClosePopover}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                setPopoverOpen(false);
                return;
              }
              if (e.key === "ArrowDown") {
                e.preventDefault();
                if (filtered.length === 0) return;
                if (!popoverOpen) setPopoverOpen(true);
                setActiveIndex((i) => (i + 1) % filtered.length);
                return;
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                if (filtered.length === 0) return;
                if (!popoverOpen) setPopoverOpen(true);
                setActiveIndex(
                  (i) => (i - 1 + filtered.length) % filtered.length,
                );
                return;
              }
              if (e.key === "Enter") {
                if (
                  popoverOpen &&
                  filtered.length > 0 &&
                  activeIndex >= 0 &&
                  activeIndex < filtered.length
                ) {
                  e.preventDefault();
                  const m = filtered[activeIndex]!;
                  select(m);
                }
              }
            }}
          />
        </div>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={6}
        collisionPadding={16}
        className={cn(
          "z-[300] p-0 shadow-lg",
          "w-[var(--radix-popper-anchor-width)] min-w-[min(100%,18rem)] max-w-[min(calc(100vw-2rem),28rem)]",
        )}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => {
          const t = e.target as Node;
          if (inputRef.current?.contains(t)) e.preventDefault();
        }}
      >
        <ul
          id={listboxId}
          role="listbox"
          className="max-h-[min(16rem,calc(100vh-12rem))] overflow-y-auto py-1"
          aria-label="Merchant matches"
        >
          {filtered.length === 0 ? (
            <li className="list-none" role="presentation">
              <span className="block px-3 py-2 text-sm text-muted-foreground">
                No merchants found
              </span>
            </li>
          ) : (
            filtered.map((m, idx) => (
              <li key={m.id} className="list-none" role="presentation">
                <button
                  type="button"
                  id={`merchant-opt-${listboxId}-${m.id}`}
                  role="option"
                  aria-selected={activeIndex === idx}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm",
                    "hover:bg-accent focus:bg-accent focus:outline-none",
                    activeIndex === idx && "bg-accent text-accent-foreground",
                  )}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => select(m)}
                >
                  <Store className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 break-words leading-snug">
                    {m.businessName}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
