import { cn } from "@/lib/utils";

export function UserAvatar({
  name,
  imageUrl,
  className,
}: {
  name: string;
  imageUrl?: string | null;
  className?: string;
}) {
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={imageUrl} alt={name} className={cn("shrink-0 rounded-full object-cover", className)} />
    );
  }
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary",
        className,
      )}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
