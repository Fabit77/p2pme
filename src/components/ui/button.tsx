import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva("inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50", {
  variants: {
    variant: { default: "bg-primary text-primary-foreground hover:bg-primary/90", outline: "border border-border bg-background hover:bg-muted", ghost: "hover:bg-muted", destructive: "bg-destructive text-white" },
    size: { default: "h-11 px-5", sm: "h-9 rounded-lg px-3", lg: "h-12 px-6 text-base", icon: "size-10" },
  }, defaultVariants: { variant: "default", size: "default" },
});

export function Button({ className, variant, size, asChild, ...props }: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
