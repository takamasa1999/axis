import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

// デザインシステム（contracts/design-system.md）：ピル型・2px のふち取り・少しずらした影
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-2 rounded-full border-2 border-ink font-bold whitespace-nowrap outline-none select-none transition-[transform,box-shadow,background-color] duration-150 shadow-pop-sm hover:-translate-x-px hover:-translate-y-px hover:shadow-pop active:translate-x-0.5 active:translate-y-0.5 active:shadow-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-sky-pop disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none motion-reduce:transition-none motion-reduce:hover:translate-0 motion-reduce:active:translate-0 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        default: "bg-sun text-[#1e1b2e]",
        outline: "bg-card text-foreground",
        secondary: "bg-subtle text-foreground",
        mint: "bg-mint text-[#1e1b2e]",
        coral: "bg-coral text-[#1e1b2e]",
        lilac: "bg-lilac text-[#1e1b2e]",
        ghost:
          "border-transparent bg-transparent shadow-none hover:bg-subtle hover:shadow-none hover:translate-0 active:translate-0",
        destructive: "bg-destructive text-white",
        link: "border-transparent bg-transparent text-link underline underline-offset-4 shadow-none hover:shadow-none hover:translate-0 active:translate-0 px-0",
      },
      size: {
        default: "h-12 px-6 text-base",
        xs: "h-8 gap-1 px-3 text-xs [&_svg:not([class*='size-'])]:size-3.5",
        sm: "h-10 px-4 text-sm [&_svg:not([class*='size-'])]:size-4",
        lg: "h-14 px-8 text-lg",
        icon: "size-12",
        "icon-xs": "size-8 [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm": "size-10",
        "icon-lg": "size-14",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
