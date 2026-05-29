import { cn, initials } from "@/lib/utils";

export function Avatar({
  name,
  color,
  size = 32,
  className,
}: {
  name: string;
  color?: string | null;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white",
        className,
      )}
      style={{
        backgroundColor: color ?? "#6366f1",
        width: size,
        height: size,
        fontSize: size * 0.4,
      }}
      title={name}
      aria-label={name}
    >
      {initials(name)}
    </span>
  );
}
