type Slot = "wallet" | "shield" | "lock";

// FuFi-PNG.png is one wide image of three illustrations (wallet | shield | lock).
// background-size 300% makes the image 3× the box width so each third fills the box;
// the x-position picks which one. Use an aspect-[3/5] box to keep it undistorted.
const POS: Record<Slot, string> = { wallet: "0% center", shield: "50% center", lock: "100% center" };

export function AuthIllustration({ slot, className }: { slot: Slot; className?: string }) {
  return (
    <div
      aria-hidden
      className={className}
      style={{
        backgroundImage: "url(/UI/FuFi-PNG.png)",
        backgroundSize: "300% 100%",
        backgroundPosition: POS[slot],
        backgroundRepeat: "no-repeat",
      }}
    />
  );
}
