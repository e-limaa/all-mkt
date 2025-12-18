import React from "react";
import svgPaths from "../imports/svg-feo1wkj7xw";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { cn } from "@/lib/utils";

const badgeBackgroundMap: Record<string, string> = {
  secondary: "#f6b03f",
  default: "#d50037",
  outline: "#3b3b3b",
  destructive: "#d41a3d",
};

function Badge({ label, variant }: { label: string; variant?: string }) {
  const background = badgeBackgroundMap[variant ?? "default"] ?? "#d50037";

  return (
    <div
      className="relative rounded-[100px] shrink-0"
      data-name="Badge"
      style={{ background }}
    >
      <div className="box-border content-stretch flex gap-[8px] items-center justify-center overflow-clip px-[8px] py-[4px] relative rounded-[inherit]">
        <p className="font-medium leading-[14px] not-italic relative shrink-0 text-[12px] text-nowrap text-white tracking-[0.0923px] whitespace-pre">
          {label}
        </p>
      </div>
      <div
        aria-hidden="true"
        className="absolute border border-[rgba(0,0,0,0)] border-solid inset-0 pointer-events-none rounded-[100px]"
      />
    </div>
  );
}

function EmpreendimentoHeader({
  imageUrl,
  badgeLabel,
  badgeVariant,
}: {
  imageUrl: string;
  badgeLabel: string;
  badgeVariant?: string;
}) {
  return (
    <div
      className="h-[165px] relative shrink-0 w-full rounded-t-[14.5px] overflow-hidden"
      data-name="EmpreendimentoManager"
    >
      <ImageWithFallback
        src={imageUrl}
        alt={badgeLabel}
        className="absolute inset-0 max-w-none object-50%-50% object-cover pointer-events-none size-full rounded-t-[14.5px]"
      />
      <div className="overflow-clip rounded-[inherit] size-full">
        <div className="box-border content-stretch flex gap-[8px] h-[165px] items-start px-[8px] py-[9px] relative w-full">
          <Badge label={badgeLabel} variant={badgeVariant} />
        </div>
      </div>
    </div>
  );
}

function Heading({ title }: { title: string }) {
  return (
    <div
      className="h-[24.5px] overflow-clip relative shrink-0 w-full"
      data-name="Heading 3"
    >
      <p className="absolute font-['Tenda:Medium',sans-serif] leading-[24.5px] left-0 not-italic text-[15.75px] text-nowrap text-foreground top-0 tracking-[-0.2922px] whitespace-pre">
        {title}
      </p>
    </div>
  );
}

function LocationIcon() {
  return (
    <div className="relative shrink-0 size-[14px]" data-name="Icon">
      <svg
        className="block size-full"
        fill="none"
        preserveAspectRatio="none"
        viewBox="0 0 14 14"
      >
        <g id="Icon">
          <path
            d={svgPaths.p5dc1140}
            id="Vector"
            stroke="currentColor"
            className="text-muted-foreground"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.16667"
          />
          <path
            d={svgPaths.p37b99980}
            id="Vector_2"
            stroke="currentColor"
            className="text-muted-foreground"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.16667"
          />
        </g>
      </svg>
    </div>
  );
}

function CalendarIcon() {
  return (
    <div className="relative shrink-0 size-[14px]" data-name="Icon">
      <svg
        className="block size-full"
        fill="none"
        preserveAspectRatio="none"
        viewBox="0 0 14 14"
      >
        <g id="Icon">
          <path
            d="M4.66699 1.16675V3.50008"
            id="Vector"
            stroke="currentColor"
            className="text-muted-foreground"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.16667"
          />
          <path
            d="M9.33301 1.16675V3.50008"
            id="Vector_2"
            stroke="currentColor"
            className="text-muted-foreground"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.16667"
          />
          <path
            d={svgPaths.p24a2b500}
            id="Vector_3"
            stroke="currentColor"
            className="text-muted-foreground"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.16667"
          />
          <path
            d="M1.75 5.83333H12.25"
            id="Vector_4"
            stroke="currentColor"
            className="text-muted-foreground"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.16667"
          />
        </g>
      </svg>
    </div>
  );
}

function UserGroupIcon() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="user / group">
      <svg
        className="block size-full"
        fill="none"
        preserveAspectRatio="none"
        viewBox="0 0 16 16"
      >
        <g id="user / group">
          <g id="icon">
            <path d={svgPaths.p81e2000} fill="currentColor" className="text-muted-foreground" />
            <path d={svgPaths.p37e21700} fill="currentColor" className="text-muted-foreground" />
            <path d={svgPaths.p27202380} fill="currentColor" className="text-muted-foreground" />
            <path d={svgPaths.p2a28c680} fill="currentColor" className="text-muted-foreground" />
          </g>
        </g>
      </svg>
    </div>
  );
}

function DetailsIcon() {
  return (
    <div className="relative shrink-0 size-[14px]" data-name="Icon">
      <svg
        className="block size-full"
        fill="none"
        preserveAspectRatio="none"
        viewBox="0 0 14 14"
      >
        <g id="Icon">
          <path
            d={svgPaths.p2e968f80}
            id="Vector"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.16667"
          />
        </g>
      </svg>
    </div>
  );
}

function MenuIcon() {
  return (
    <div className="relative shrink-0 size-[14px]" data-name="Icon">
      <svg
        className="block size-full"
        fill="none"
        preserveAspectRatio="none"
        viewBox="0 0 14 14"
      >
        <g id="Icon">
          <path
            d={svgPaths.p3c37dc0}
            id="Vector"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.16667"
          />
          <path
            d={svgPaths.p255cea00}
            id="Vector_2"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.16667"
          />
          <path
            d={svgPaths.p3d07880}
            id="Vector_3"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.16667"
          />
        </g>
      </svg>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="content-stretch flex gap-[7px] h-[17.5px] items-center relative shrink-0 w-full">
      {icon}
      <p className="font-['Tenda:Regular',sans-serif] leading-[17.5px] not-italic relative shrink-0 text-muted-foreground text-[12.25px] text-nowrap tracking-[-0.0179px] whitespace-pre">
        {label}
      </p>
      <p className="font-['Tenda:Regular',sans-serif] leading-[17.5px] not-italic relative shrink-0 text-[12.25px] text-nowrap text-foreground tracking-[-0.0179px] whitespace-pre">
        {value}
      </p>
    </div>
  );
}

function Frame3({
  title,
  location,
  launchLabel,
  launchDate,
}: {
  title: string;
  location: string;
  launchLabel: string;
  launchDate?: string;
}) {
  return (
    <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full">
      <Heading title={title} />
      <div className="content-stretch flex gap-[7px] h-[17.5px] items-center relative shrink-0 w-full">
        <LocationIcon />
        <div className="h-[17.5px] relative shrink-0 w-[140px]">
          <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border h-[17.5px] relative w-full">
            <p className="absolute font-['Tenda:Regular',sans-serif] leading-[17.5px] left-0 not-italic text-muted-foreground text-[12.25px] text-nowrap top-[0.5px] tracking-[-0.0179px] whitespace-pre">
              {location}
            </p>
          </div>
        </div>
      </div>
      {launchDate && (
        <InfoRow
          icon={<CalendarIcon />}
          label={`${launchLabel}:`}
          value={launchDate}
        />
      )}
    </div>
  );
}

function Frame1({
  createdByLabel,
  createdBy,
  creationLabel,
  creationDate,
}: {
  createdByLabel: string;
  createdBy: string;
  creationLabel: string;
  creationDate: string;
}) {
  return (
    <div className="content-stretch flex gap-[48px] items-start relative shrink-0 w-full">
      <div className="content-stretch flex flex-col gap-[4px] items-start justify-center relative shrink-0">
        <div className="relative shrink-0">
          <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex gap-[7px] items-start relative">
            <UserGroupIcon />
            <p className="font-['Tenda:Regular',sans-serif] leading-[17.5px] not-italic relative shrink-0 text-muted-foreground text-[12.25px] text-nowrap tracking-[-0.0179px] whitespace-pre">
              {createdByLabel}
            </p>
          </div>
        </div>
        <p className="font-['Tenda:Regular',sans-serif] leading-[17.5px] not-italic relative shrink-0 text-[12.25px] text-nowrap text-foreground tracking-[-0.0179px] whitespace-pre">
          {createdBy}
        </p>
      </div>
      <div className="content-stretch flex flex-col gap-[4px] items-start justify-center relative shrink-0">
        <div className="relative shrink-0">
          <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex gap-[7px] items-start relative">
            <CalendarIcon />
            <p className="font-['Tenda:Regular',sans-serif] leading-[17.5px] not-italic relative shrink-0 text-muted-foreground text-[12.25px] text-nowrap tracking-[-0.0179px] whitespace-pre">
              {creationLabel}
            </p>
          </div>
        </div>
        <p className="font-['Tenda:Regular',sans-serif] leading-[17.5px] not-italic relative shrink-0 text-[12.25px] text-nowrap text-foreground tracking-[-0.0179px] whitespace-pre">
          {creationDate}
        </p>
      </div>
    </div>
  );
}

import { Button } from "./ui/button";

function ButtonBrandS({
  count,
  onClick,
  disabled,
}: {
  count: number;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      variant="default"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className="w-full flex-1"
    >
      <DetailsIcon />
      <span>Materiais{count > 0 ? ` (${count})` : ""}</span>
    </Button>
  );
}

function MenuButton({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-secondary relative rounded-[8.5px] self-stretch shrink-0 w-[33.5px]">
      <div
        aria-hidden="true"
        className="absolute border border-border border-solid inset-0 pointer-events-none rounded-[8.5px]"
      />
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex h-full items-center justify-center p-px relative w-[33.5px]">
        {children}
      </div>
    </div>
  );
}

function Container4({
  materialsCount,
  onViewMaterials,
  actions,
}: {
  materialsCount: number;
  onViewMaterials: () => void;
  actions?: React.ReactNode;
}) {
  return (
    <div
      className="content-stretch flex gap-[8px] items-start relative shrink-0 w-full"
      data-name="Container"
    >
      <ButtonBrandS
        count={materialsCount}
        onClick={onViewMaterials}
        disabled={materialsCount === 0}
      />
      {actions && <div>{actions}</div>}
    </div>
  );
}

function EmpreendimentoManager1({
  title,
  location,
  launchLabel,
  launchDate,
  createdByLabel,
  createdBy,
  creationLabel,
  creationDate,
  materialsCount,
  onViewMaterials,
  actions,
}: {
  title: string;
  location: string;
  launchLabel: string;
  launchDate?: string;
  createdByLabel: string;
  createdBy: string;
  creationLabel: string;
  creationDate: string;
  materialsCount: number;
  onViewMaterials: () => void;
  actions?: React.ReactNode;
}) {
  return (
    <div className="relative shrink-0 w-full" data-name="EmpreendimentoManager">
      <div className="size-full">
        <div className="box-border content-stretch flex flex-col gap-[16px] items-start p-[16px] relative w-full">
          <Frame3
            title={title}
            location={location}
            launchLabel={launchLabel}
            launchDate={launchDate}
          />
          <PrimitiveDiv />
          <Frame1
            createdByLabel={createdByLabel}
            createdBy={createdBy}
            creationLabel={creationLabel}
            creationDate={creationDate}
          />
          <Container4
            materialsCount={materialsCount}
            onViewMaterials={onViewMaterials}
            actions={actions}
          />
        </div>
      </div>
    </div>
  );
}

function PrimitiveDiv() {
  return (
    <div
      className="bg-border h-px shrink-0 w-full"
      data-name="Primitive.div"
    />
  );
}

export interface ProjectCardProps {
  title: string;
  imageUrl: string;
  badgeLabel: string;
  badgeVariant?: string;
  location: string;
  launchLabel?: string;
  launchDate?: string;
  createdByLabel?: string;
  createdBy: string;
  creationLabel?: string;
  creationDate: string;
  materialsCount: number;
  onViewMaterials: () => void;
  actions?: React.ReactNode;
  className?: string;
}

export function ProjectCard({
  title,
  imageUrl,
  badgeLabel,
  badgeVariant,
  location,
  launchLabel = "Lançamento",
  launchDate,
  createdByLabel = "Criado por:",
  createdBy,
  creationLabel = "Data criação:",
  creationDate,
  materialsCount,
  onViewMaterials,
  actions,
  className = "",
}: ProjectCardProps) {
  return (
    <div
      className={cn(
        "bg-card relative rounded-[14.5px] size-full border border-border overflow-hidden",
        className
      )}
      data-name="Card"
    >
      <div className="size-full">
        <div className="box-border content-stretch flex flex-col items-start overflow-clip p-px relative size-full">
          <EmpreendimentoHeader
            imageUrl={imageUrl}
            badgeLabel={badgeLabel}
            badgeVariant={badgeVariant}
          />
          <EmpreendimentoManager1
            title={title}
            location={location}
            launchLabel={launchLabel}
            launchDate={launchDate}
            createdByLabel={createdByLabel}
            createdBy={createdBy}
            creationLabel={creationLabel}
            creationDate={creationDate}
            materialsCount={materialsCount}
            onViewMaterials={onViewMaterials}
            actions={actions}
          />
        </div>
      </div>
    </div>
  );
}

