import type { ReactNode } from "react";

/** Shared page title strip: matches GRISSA Assessment layout (steps 1–4). */
export const GRISSA_TITLE_GRADIENT_CLASS =
  "bg-gradient-to-r from-emerald-600 via-green-600 to-lime-600 bg-clip-text font-bold text-transparent transition-all duration-200 hover:from-emerald-500 hover:via-green-500 hover:to-lime-500";

export type GrissaDescriptionTone = "canvas" | "onLight";

const DESCRIPTION_TONE_CLASS: Record<GrissaDescriptionTone, string> = {
  canvas: "text-sm text-slate-300 sm:text-base",
  onLight: "text-sm text-slate-600 sm:text-base",
};

interface GrissaPageTitleStripProps {
  title: string;
  description: string;
  children?: ReactNode;
  className?: string;
  /**
   * `canvas`: subtitle on slate-900 app background (SAQ).
   * `onLight`: subtitle on white/card (print, PDF chrome, report headers).
   */
  descriptionTone?: GrissaDescriptionTone;
}

/** Title + subtitle only (no semantic wrapper): safe inside other banners. */
export function GrissaPageTitleStrip({
  title,
  description,
  children,
  className = "",
  descriptionTone = "canvas",
}: GrissaPageTitleStripProps) {
  const desc = description.trim();
  return (
    <div className={className}>
      <h1 className="text-3xl font-semibold sm:text-3xl">
        <span className={GRISSA_TITLE_GRADIENT_CLASS}>{title}</span>
      </h1>
      {desc ? (
        <p className={`mt-1 ${DESCRIPTION_TONE_CLASS[descriptionTone]}`}>{desc}</p>
      ) : null}
      {children}
    </div>
  );
}

interface GrissaPageHeaderProps extends GrissaPageTitleStripProps {
  /** Landmark wrapper uses <header>; set false only if nested inside another header. */
  asHeader?: boolean;
}

export function GrissaPageHeader({
  title,
  description,
  children,
  className = "",
  asHeader = true,
  descriptionTone = "canvas",
}: GrissaPageHeaderProps) {
  const strip = (
    <GrissaPageTitleStrip title={title} description={description} descriptionTone={descriptionTone}>
      {children}
    </GrissaPageTitleStrip>
  );

  return asHeader ? (
    <header className={`mb-6 ${className}`}>{strip}</header>
  ) : (
    <div className={`mb-6 ${className}`}>{strip}</div>
  );
}
