import * as React from "react";
import { cn } from "@/lib/utils";
export function Input({ className, ...props }: React.ComponentProps<"input">) { return <input className={cn("h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-50", className)} {...props} />; }
export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) { return <textarea className={cn("min-h-28 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15", className)} {...props} />; }
