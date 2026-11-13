import { ReactNode } from "react";

interface DashboardSectionProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  /** Optional: use "large" for the main overview section to improve hierarchy */
  titleSize?: "default" | "large";
  /**
   * Section headings rendered on the slate-900 SAQ canvas (outside white cards) need light text.
   * Use `card` only if headings sit on a white/light panel.
   */
  headingSurface?: "canvas" | "card";
}

export function DashboardSection({
  title,
  subtitle,
  children,
  className = "",
  titleSize = "default",
  headingSurface = "canvas",
}: DashboardSectionProps) {
  const titleTone =
    headingSurface === "canvas"
      ? titleSize === "large"
        ? "text-xl font-semibold text-slate-100"
        : "text-lg font-semibold text-slate-100"
      : titleSize === "large"
        ? "text-xl font-semibold text-slate-900"
        : "text-lg font-semibold text-slate-900";
  const subtitleTone =
    headingSurface === "canvas" ? "text-sm text-slate-300" : "text-sm text-slate-600";
  return (
    <section className={className}>
      <header className="mb-4">
        <h2 className={titleTone}>{title}</h2>
        {subtitle && <p className={`mt-1 max-w-3xl ${subtitleTone}`}>{subtitle}</p>}
      </header>
      {children}
    </section>
  );
}
