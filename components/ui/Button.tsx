"use client";

import { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "ghost" | "soft" | "danger";
type Size = "sm" | "md" | "lg";

/**
 * Button chuẩn "Cyan Modern": radius 10–12px, hover -1px, active scale .97,
 * focus-visible ring cyan (toàn cục trong globals), đủ 6 trạng thái.
 */
const VARIANTS: Record<Variant, string> = {
  primary: "btn-primary shadow-cta",
  ghost: "border border-line bg-surface text-ink shadow-card hover:border-teal hover:text-teal-ink dark:hover:text-teal-200",
  soft: "bg-teal-soft text-teal-ink hover:bg-aqua-mist dark:bg-[#083344] dark:text-teal-200",
  danger: "bg-rose text-white shadow-[0_6px_16px_-8px_rgba(239,68,68,.6)] hover:brightness-105 active:brightness-95",
};

const SIZES: Record<Size, string> = {
  sm: "px-3.5 py-1.5 text-[.83rem] gap-1.5 rounded-[10px]",
  md: "px-[18px] py-2.5 text-[.925rem] gap-2 rounded-[12px]",
  lg: "px-6 py-3 text-base gap-2 rounded-[12px]",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, disabled, className, children, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex min-h-[40px] select-none items-center justify-center whitespace-nowrap font-semibold leading-tight transition duration-150",
        "active:scale-[.97] disabled:pointer-events-none disabled:opacity-50",
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {children}
    </button>
  );
});
