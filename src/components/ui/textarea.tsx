import { cn } from "cn";
import type * as React from "react";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-28 w-full rounded-xl border-2 border-ink bg-card px-4 py-3 text-base leading-7 transition-colors outline-none placeholder:text-muted-foreground focus-visible:outline-3 focus-visible:outline-offset-1 focus-visible:outline-sky-pop disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
