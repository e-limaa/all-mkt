import { ReactNode } from "react";
import { LoginHero, type LoginHeroProps } from "./LoginHero";
import { cn } from "../ui/utils";

type AuthSplitLayoutProps = {
  hero: LoginHeroProps;
  children: ReactNode;
  panelClassName?: string;
  panelWrapperClassName?: string;
  brandName: string;
  currentYear: number;
  mobileFooter?: ReactNode;
};

export function AuthSplitLayout({
  hero,
  children,
  panelClassName,
  panelWrapperClassName,
  brandName,
  currentYear,
  mobileFooter,
}: AuthSplitLayoutProps) {
  return (
    <div
      className={cn(
        "grid min-h-dvh grid-cols-1 bg-[#050506] text-white lg:grid-cols-[1.6fr_1fr]",
        panelWrapperClassName,
      )}
    >
      <div className="hidden h-full min-h-full lg:block">
        <LoginHero {...hero} />
      </div>

      <div className="flex h-full w-full items-center justify-center px-5 py-12 sm:px-10 lg:px-16 lg:py-16">
        <div
          className={cn(
            "w-full max-w-md space-y-8 rounded-3xl border border-white/8 bg-[#111114] px-6 py-8 shadow-[0_30px_80px_rgba(0,0,0,0.55)] sm:px-8 sm:py-10",
            panelClassName,
          )}
        >
          {children}
        </div>
      </div>

      <div className="bg-[#050506] px-6 pb-10 text-center text-xs text-white/40 lg:hidden">
        {mobileFooter ?? (
          <p>
            Copyright {currentYear} {brandName} - Construtora Tenda
          </p>
        )}
      </div>
    </div>
  );
}
