import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** 入力欄の共通の枠：見出し・必須の印・例や説明・エラー */
export function FormField({
  id,
  label,
  required,
  hint,
  error,
  children,
  className,
}: {
  id: string;
  label: ReactNode;
  required?: boolean;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="flex flex-wrap items-center gap-2 font-bold">
        {label}
        {required && (
          <span className="rounded-full border-2 border-ink bg-coral px-2 text-[11px] leading-5 text-[#1e1b2e]">
            必須
          </span>
        )}
      </label>
      {hint && <p className="text-xs leading-5 text-muted-foreground">{hint}</p>}
      {children}
      {error && (
        <p role="alert" className="text-sm font-bold text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/** ネイティブの select をデザインに合わせたもの（スマートフォンで使いやすい） */
export function Select({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "h-12 w-full rounded-xl border-2 border-ink bg-card px-3 text-base focus-visible:outline-3 focus-visible:outline-offset-1 focus-visible:outline-sky-pop",
        className,
      )}
      {...props}
    />
  );
}
