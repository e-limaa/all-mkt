import { ArrowLeft } from "lucide-react";
import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

import { Button } from "./ui/button";
import { cn } from "./ui/utils";

type BackAction = {
  label?: string;
  onClick: () => void;
};

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  backAction?: BackAction;
  className?: string;
  children?: ReactNode;
}

export function PageHeader({
  icon: Icon,
  title,
  description,
  action,
  backAction,
  className,
  children,
}: PageHeaderProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            {backAction && (
              <Button
                variant="ghost"
                size="sm"
                onClick={backAction.onClick}
                className="flex w-full items-center gap-2 rounded-xl text-muted-foreground hover:text-foreground sm:w-auto"
              >
                <ArrowLeft className="h-4 w-4" />
                {backAction.label ?? "Voltar"}
              </Button>
            )}
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Icon className="h-6 w-6" />
              </span>
              <div className="flex flex-col gap-1">
                <h1 className="text-xl font-semibold leading-tight text-foreground sm:text-2xl">
                  {title}
                </h1>
                <p className="text-sm text-muted-foreground sm:text-base">{description}</p>
              </div>
            </div>
          </div>
          {children}
        </div>
        {action ? (
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-none sm:items-end">
            {action}
          </div>
        ) : null}
      </div>
    </div>
  );
}
