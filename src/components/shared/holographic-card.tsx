import * as React from "react";
import { cn } from "@/lib/utils";

interface HolographicCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  /** Subtitle shown next to title (small, dim). */
  subtitle?: string;
  /** 1 = subtle, 2 = strong glow (default 1). */
  glow?: 1 | 2;
  /** Hide the ◆ prefix on the title. */
  bareTitle?: boolean;
  /** Right-aligned header actions. */
  actions?: React.ReactNode;
  /** Body padding override. */
  bodyClassName?: string;
}

/**
 * Presentational wrapper that gives any child the holographic panel look:
 * semi-transparent dark background, cyan border with glow, backdrop blur.
 */
export function HolographicCard({
  title,
  subtitle,
  glow = 1,
  bareTitle = false,
  actions,
  className,
  bodyClassName,
  children,
  ...props
}: HolographicCardProps) {
  return (
    <div
      className={cn(
        glow === 2 ? "hologram-panel-strong" : "hologram-panel",
        "rounded-lg flex flex-col",
        className
      )}
      {...props}
    >
      {(title || actions) && (
        <div className="flex items-start justify-between gap-2 px-3 pt-3 pb-2 border-b border-cyan-400/10">
          {title && (
            <div className="min-w-0">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-eidolon-cyan eidolon-text-glow truncate flex items-center gap-1.5">
                {!bareTitle && <span aria-hidden>◆</span>}
                <span className="truncate">{title}</span>
              </h3>
              {subtitle && (
                <p className="text-[10px] text-eidolon-text/50 mt-0.5 truncate">
                  {subtitle}
                </p>
              )}
            </div>
          )}
          {actions && <div className="shrink-0 flex items-center gap-1">{actions}</div>}
        </div>
      )}
      <div className={cn("flex-1 min-h-0 p-3", bodyClassName)}>{children}</div>
    </div>
  );
}
