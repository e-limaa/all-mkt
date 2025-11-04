'use client';

import React from "react";
import { usePermissions } from "../contexts/hooks/usePermissions";
import { buildNavigationItems, NavigationItem } from "../lib/navigation";
import { Permission } from "../types/enums";
import { cn } from "./ui/utils";

interface MobileNavBarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
}

export function MobileNavBar({ currentPage, onPageChange }: MobileNavBarProps) {
  const { hasPermission } = usePermissions();

  const mobileItems = React.useMemo<NavigationItem[]>(() => {
    const items = buildNavigationItems(hasPermission);
    const whitelistedIds = new Set(["dashboard", "materials", "campaigns", "projects", "shared", "users"]);
    return items.filter((item) => whitelistedIds.has(item.id));
  }, [hasPermission]);

  return (
    <nav className="lg:hidden fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex w-full max-w-3xl items-stretch justify-between gap-1 overflow-hidden px-2 py-2">
        {mobileItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.href;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onPageChange(item.href)}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2.5 text-[0.75rem] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm",
                isActive
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-muted/40",
              )}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon
                className={cn(
                  "h-5 w-5",
                  isActive ? "text-primary" : "text-muted-foreground",
                )}
              />
              <span className="leading-none">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
