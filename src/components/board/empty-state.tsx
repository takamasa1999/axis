import type { ReactNode } from "react";

/** 空の状態。小さなイラスト（SVG）と「次にやること」 */
export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="pop-card flex flex-col items-center gap-3 p-8 text-center">
      <svg width="96" height="72" viewBox="0 0 96 72" aria-hidden="true" className="text-ink">
        <title>イラスト</title>
        <rect
          x="14"
          y="10"
          width="68"
          height="52"
          rx="8"
          fill="var(--ax-sun-soft)"
          stroke="currentColor"
          strokeWidth="3"
        />
        <rect
          x="24"
          y="4"
          width="20"
          height="12"
          rx="3"
          fill="var(--ax-coral)"
          stroke="currentColor"
          strokeWidth="3"
          transform="rotate(-8 34 10)"
        />
        <circle cx="38" cy="36" r="4" fill="currentColor" />
        <circle cx="58" cy="36" r="4" fill="currentColor" />
        <path
          d="M38 48 q10 8 20 0"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      <p className="text-lg font-bold">{title}</p>
      {children && <div className="text-sm text-muted-foreground">{children}</div>}
      {action}
    </div>
  );
}
