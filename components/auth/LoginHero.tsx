import Image from "next/image";
import { cn } from "../ui/utils";
import Frame1000005813 from "../../imports/Frame1000005813";

type Alignment = "top" | "center" | "bottom";

const BASE_LOGO_WIDTH = 112.9;

export type LoginHeroLayout = {
  padding: string;
  align: Alignment;
  offsetY: number | string;
  maxWidth: string;
  gap: string;
  logoWidth: number;
};

export const defaultLoginHeroLayout: LoginHeroLayout = {
  padding: "px-8 py-12 lg:px-16 lg:py-14",
  align: "center",
  offsetY: 0,
  maxWidth: "max-w-xl",
  gap: "space-y-6 lg:space-y-16",
  logoWidth: 220,
};

const alignmentClass: Record<Alignment, string> = {
  top: "justify-start",
  center: "justify-center",
  bottom: "justify-end",
};

export type LoginHeroProps = {
  brandName: string;
  currentYear: number;
  title: string;
  description: string;
  imageSrc?: string;
  imageAlt?: string;
  layout?: Partial<LoginHeroLayout>;
};

export function LoginHero({
  brandName,
  currentYear,
  title,
  description,
  imageSrc = "/images/login-hero.jpg",
  imageAlt = "Fachada de predios corporativos vista de baixo",
  layout,
}: LoginHeroProps) {
  const resolvedLayout = {
    ...defaultLoginHeroLayout,
    ...layout,
  };

  return (
    <div className="relative hidden overflow-hidden lg:flex">
      <Image
        src={imageSrc}
        alt={imageAlt}
        fill
        sizes="(min-width: 1024px) 58vw, 100vw"
        className="object-cover"
        priority
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(228,0,43,0.18),transparent_55%)]" />
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-black/50" />

      <div
        className={cn(
          "relative z-10 flex h-full w-full flex-col",
          resolvedLayout.padding
        )}
      >
        <div
          className={cn(
            "flex flex-1 flex-col",
            alignmentClass[resolvedLayout.align]
          )}
        >
          <div
            className={cn(resolvedLayout.maxWidth, resolvedLayout.gap)}
            style={
              resolvedLayout.offsetY
                ? { marginTop: resolvedLayout.offsetY }
                : undefined
            }
          >
            <div
              className="inline-flex origin-left"
              style={{ width: resolvedLayout.logoWidth }}
            >
              <div
                className="inline-flex origin-left"
                style={{
                  transform: `scale(${
                    resolvedLayout.logoWidth / BASE_LOGO_WIDTH
                  })`,
                  transformOrigin: "left center",
                }}
              >
                <Frame1000005813 />
              </div>
            </div>
            <div className="space-y-4">
              <h1 className="text-4xl font-semibold leading-tight text-white">
                {title}
              </h1>
              <p className="text-base text-white/70">{description}</p>
            </div>
          </div>
        </div>

        <div className="space-y-1 text-sm text-white/40">
          <p>
            Copyright {currentYear} {brandName} - Construtora Tenda
          </p>
          <p>Transformando o marketing digital dos seus empreendimentos.</p>
        </div>
      </div>
    </div>
  );
}
