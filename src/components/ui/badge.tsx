import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

const badgeVariants = cva(
  "group/badge inline-flex h-7 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border-2 border-ink px-3 text-xs font-bold whitespace-nowrap [&>svg]:pointer-events-none [&>svg]:size-3.5!",
  {
    variants: {
      variant: {
        default: "bg-sun text-[#1e1b2e]",
        secondary: "bg-subtle text-foreground",
        outline: "bg-card text-foreground",
        destructive: "bg-destructive text-white",
        coral: "bg-coral text-[#1e1b2e]",
        mint: "bg-mint text-[#1e1b2e]",
        sky: "bg-sky-pop text-[#1e1b2e]",
        lilac: "bg-lilac text-[#1e1b2e]",
        ghost: "border-transparent bg-transparent",
        link: "border-transparent text-link underline underline-offset-4",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props,
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  });
}

export { Badge, badgeVariants };
