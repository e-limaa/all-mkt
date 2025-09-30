'use client';

import Frame1000005813 from '@/imports/Frame1000005813';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/components/ui/utils';

type AuthShellProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  contentClassName?: string;
};

export function AuthShell({
  title,
  description,
  children,
  footer,
  className,
  contentClassName,
}: AuthShellProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className={cn('w-full max-w-md space-y-8', className)}>
        <div className="flex justify-center">
          <Frame1000005813 />
        </div>

        <Card className="border border-border/60 bg-card/95 shadow-lg shadow-primary/5 backdrop-blur">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-semibold text-foreground">{title}</CardTitle>
            {description ? (
              <CardDescription className="text-sm text-muted-foreground">
                {description}
              </CardDescription>
            ) : null}
          </CardHeader>
          <CardContent className={cn('space-y-6', contentClassName)}>{children}</CardContent>
          {footer ? <CardFooter className="flex flex-col gap-3 pt-0 text-sm text-muted-foreground">{footer}</CardFooter> : null}
        </Card>
      </div>
    </div>
  );
}
