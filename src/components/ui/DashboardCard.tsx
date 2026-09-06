import type { ReactNode } from 'react';
import React from 'react';

interface DashboardCardProps {
  title: React.ReactNode;
  metadataTag?: ReactNode;
  headerExtra?: ReactNode;
  statusDotColor?: string;
  children?: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function DashboardCard({
  title,
  metadataTag,
  headerExtra,
  statusDotColor = '#FF8200',
  children,
  className = '',
  style,
}: DashboardCardProps) {
  return (
    <div className={`bg-vgd-card border border-white/[0.07] rounded-lg overflow-hidden flex flex-col ${className}`} style={style}>
      {/* Header bar — flex-shrink-0 so a constrained-height card (see body
          slot below) never squeezes this instead of the scrollable body. */}
      <div className="flex items-center justify-between px-4 py-2.5 flex-shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: statusDotColor }}
          />
          <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-white/90 truncate">
            {title}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
          {headerExtra}
          {metadataTag && (
            <span className="text-[11px] font-medium text-vgd-muted flex-shrink-0">
              {metadataTag}
            </span>
          )}
        </div>
      </div>

      {/* Hairline divider */}
      <div className="h-px bg-white/[0.07] flex-shrink-0" />

      {/* Body slot — flex-1 + min-h-0 only actually clamp to "remaining
          space" when the root above is itself a flex column (fixed above:
          it wasn't, so this never shrank and overflow-y-auto never had
          anything to do — the root's own overflow-hidden was silently
          clipping instead). overflow-y-auto scrolls a card given a fixed/
          constrained height (e.g. the Home page's split predictor column)
          instead of clipping whatever doesn't fit. */}
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">{children}</div>
    </div>
  );
}
