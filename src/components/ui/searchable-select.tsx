"use client";

import * as React from "react";
import { useState, useRef, useEffect, useMemo } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchableSelectOption {
  value: string;
  label: string;
  description?: string;
}

export interface SearchableSelectProps {
  id?: string;
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
}

export function SearchableSelect({
  id,
  options,
  value,
  onChange,
  placeholder = "-- Select --",
  searchPlaceholder = "Search options...",
  emptyMessage = "No results found.",
  disabled = false,
  className,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase().trim();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.description && opt.description.toLowerCase().includes(q))
    );
  }, [options, searchQuery]);

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger Button */}
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => {
          if (!disabled) setIsOpen((prev) => !prev);
        }}
        className={cn(
          "flex h-8 w-full items-center justify-between rounded-lg border border-input bg-background px-2.5 py-1 text-xs text-foreground transition-colors outline-none select-none",
          "hover:bg-muted/30 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          "disabled:cursor-not-allowed disabled:opacity-50",
          isOpen && "border-ring ring-3 ring-ring/50",
          className
        )}
      >
        <span className={cn("truncate text-left", !selectedOption && "text-muted-foreground")}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={cn(
            "size-3.5 text-muted-foreground transition-transform duration-200 shrink-0 ml-1.5",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-lg border border-border bg-popover text-popover-foreground shadow-lg animate-in fade-in-0 zoom-in-95 overflow-hidden">
          {/* Search Box */}
          <div className="p-1.5 border-b border-border/60 bg-muted/20">
            <div className="relative flex items-center">
              <Search className="size-3.5 text-muted-foreground absolute left-2 pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="h-7 w-full rounded-md border border-input bg-background pl-7 pr-7 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                onClick={(e) => e.stopPropagation()}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSearchQuery("");
                    inputRef.current?.focus();
                  }}
                  className="absolute right-2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>
          </div>

          {/* Scrollable List */}
          <div className="max-h-56 overflow-y-auto p-1 space-y-0.5 overscroll-contain">
            {filteredOptions.length === 0 ? (
              <div className="py-4 text-center text-xs text-muted-foreground">
                {emptyMessage}
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <div
                    key={opt.value}
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs cursor-pointer select-none transition-colors",
                      isSelected
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-foreground hover:bg-muted/80 dark:hover:bg-muted/50"
                    )}
                  >
                    <div className="flex flex-col truncate pr-2">
                      <span className="truncate">{opt.label}</span>
                      {opt.description && (
                        <span className="text-[10px] text-muted-foreground truncate">
                          {opt.description}
                        </span>
                      )}
                    </div>
                    {isSelected && <Check className="size-3.5 text-primary shrink-0 ml-1" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
