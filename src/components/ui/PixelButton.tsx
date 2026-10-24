import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "success" | "reward" | "ghost";

const VARIANT_CLASS: Record<Variant, string> = {
  primary: "bg-navy-700 text-paper",
  success: "bg-lime-400 text-navy-900",
  reward: "bg-yellow-400 text-navy-900",
  ghost: "bg-paper text-navy-900",
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: "md" | "sm";
};

/** DESIGN.md 6장 PixelButton: hover 2px 위로, 누르면 4px 아래로 꾹. */
export function PixelButton({ variant = "primary", size = "md", className = "", ...props }: Props) {
  return (
    <button
      {...props}
      className={[
        "inline-flex items-center justify-center px-6 font-pixel font-bold",
        "border-3 border-navy-900 shadow-pixel-md transition-[translate,box-shadow] duration-[80ms]",
        "hover:-translate-y-0.5 hover:shadow-pixel-lg",
        "active:translate-y-1 active:shadow-none",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:translate-y-0 disabled:shadow-pixel-md",
        size === "md" ? "h-12 text-body" : "h-10 text-small",
        VARIANT_CLASS[variant],
        className,
      ].join(" ")}
    />
  );
}
