import * as React from "react";
import { cn } from "@/lib/utils";
export function Card({ className, ...props }: React.ComponentProps<"div">) { return <div className={cn("rounded-2xl border border-border bg-card text-card-foreground shadow-[0_1px_2px_rgba(20,30,25,.04)]", className)} {...props} />; }
export function CardHeader({ className, ...props }: React.ComponentProps<"div">) { return <div className={cn("p-5 pb-2", className)} {...props} />; }
export function CardTitle({ className, ...props }: React.ComponentProps<"h3">) { return <h3 className={cn("font-semibold tracking-tight", className)} {...props} />; }
export function CardDescription({ className, ...props }: React.ComponentProps<"p">) { return <p className={cn("text-sm text-muted-foreground", className)} {...props} />; }
export function CardContent({ className, ...props }: React.ComponentProps<"div">) { return <div className={cn("p-5 pt-3", className)} {...props} />; }
