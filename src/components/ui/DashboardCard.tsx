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
    <div className={`bg-vgd-card border border-white/[0.07] rounded-lg overflow-hidden ${className}`} style={style}>
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2.5">
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
      <div className="h-px bg-white/[0.07]" />

      {/* Body slot — participates in parent flex-col so children can flex-grow.
          overflow-y-auto so a card given a fixed/constrained height (e.g. the
          Home page's split predictor column) scrolls its own content instead
          of silently clipping whatever doesn't fit. */}
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">{children}</div>
    </div>
  );
}
