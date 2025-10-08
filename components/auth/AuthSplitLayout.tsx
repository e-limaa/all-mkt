import { ReactNode } from "react";
import { LoginHero, type LoginHeroProps } from "./LoginHero";
import Frame1000005813 from "../../imports/Frame1000005813";
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
        "grid min-h-screen grid-cols-1 bg-[#050506] text-white lg:grid-cols-[1.6fr_1fr]",
        panelWrapperClassName
      )}
    >
      <LoginHero {...hero} />

      <div className="flex h-full w-full items-center justify-center px-6 py-16 sm:px-12 lg:px-16">
        <div
          className={cn(
            "w-full max-w-md space-y-8 rounded-3xl border border-white/5 bg-[#111114] p-10",
            panelClassName
          )}
        >
          {children}
        </div>
      </div>

      <div className="bg-[#050506] px-6 pb-8 text-center text-xs text-white/40 lg:hidden">
        <div className="mx-auto flex items-center justify-center py-6">
          <Frame1000005813 />
        </div>
        {mobileFooter ?? (
          <p>
            Copyright {currentYear} {brandName} - Construtora Tenda
          </p>
        )}
      </div>
    </div>
  );
}
