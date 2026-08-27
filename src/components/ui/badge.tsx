import { cn } from "@/lib/utils";
export function Badge({ className, variant = "default", ...props }: React.ComponentProps<"span"> & { variant?: "default" | "success" | "outline" | "warning" }) {
  const variants = { default: "bg-primary/10 text-primary", success: "bg-success/12 text-success", outline: "border border-border text-muted-foreground", warning: "bg-warning/15 text-warning-foreground" };
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold", variants[variant], className)} {...props} />;
}
