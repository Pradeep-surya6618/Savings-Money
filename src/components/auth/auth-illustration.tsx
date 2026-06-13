import Image from "next/image";

type Slot = "wallet" | "shield" | "lock";
const POS: Record<Slot, string> = { wallet: "left center", shield: "center center", lock: "right center" };

export function AuthIllustration({ slot, className }: { slot: Slot; className?: string }) {
  return (
    <div className={className} style={{ position: "relative", overflow: "hidden" }}>
      <Image
        src="/UI/FuFi-PNG.png"
        alt=""
        aria-hidden
        fill
        sizes="320px"
        priority
        style={{ objectFit: "cover", objectPosition: POS[slot], transform: "scale(2.9)" }}
      />
    </div>
  );
}
