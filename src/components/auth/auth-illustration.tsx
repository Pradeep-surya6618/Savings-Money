type Slot = "wallet" | "shield" | "lock";

/** Hand-built, brand-green SVG illustrations for the auth brand panel. They have no
 *  background, so they blend onto the mint panel and scale to any container size. */
export function AuthIllustration({ slot, className }: { slot: Slot; className?: string }) {
  if (slot === "shield") return <Shield className={className} />;
  if (slot === "lock") return <Lock className={className} />;
  return <Wallet className={className} />;
}

function Wallet({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 200" fill="none" className={className} role="img" aria-hidden>
      <circle cx="110" cy="94" r="74" fill="#4ade80" fillOpacity="0.14" />
      <ellipse cx="110" cy="180" rx="82" ry="12" fill="#16a34a" fillOpacity="0.10" />
      {/* leaves */}
      <path d="M150 56c14-4 26 2 30 14-14 4-26-2-30-14Z" fill="#86efac" fillOpacity="0.7" />
      <path d="M66 64c-13-5-25 0-30 12 13 5 25 0 30-12Z" fill="#86efac" fillOpacity="0.7" />
      {/* cash notes */}
      <g transform="rotate(-9 110 70)">
        <rect x="62" y="42" width="96" height="54" rx="8" fill="#bbf7d0" stroke="#86efac" strokeWidth="2" />
        <circle cx="110" cy="69" r="13" fill="#22c55e" />
        <text x="110" y="75" textAnchor="middle" fontSize="15" fontWeight="700" fill="#ffffff">₹</text>
      </g>
      {/* wallet body */}
      <rect x="42" y="86" width="136" height="86" rx="18" fill="#166534" />
      <rect x="42" y="86" width="136" height="46" rx="18" fill="#15803d" />
      {/* pocket flap */}
      <path d="M58 118h120v38a16 16 0 0 1-16 16H58a16 16 0 0 1-16-16v-22a16 16 0 0 1 16-16Z" fill="#16a34a" />
      {/* card-slot tab + clasp */}
      <rect x="120" y="120" width="58" height="34" rx="10" fill="#22c55e" />
      <circle cx="150" cy="137" r="8" fill="#fde047" />
      {/* coin stack */}
      <ellipse cx="158" cy="172" rx="23" ry="8" fill="#ca8a04" />
      <ellipse cx="158" cy="165" rx="23" ry="8" fill="#eab308" />
      <ellipse cx="158" cy="158" rx="23" ry="8" fill="#facc15" />
      <text x="158" y="163" textAnchor="middle" fontSize="11" fontWeight="700" fill="#a16207">₹</text>
    </svg>
  );
}

function Shield({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 200" fill="none" className={className} role="img" aria-hidden>
      <circle cx="110" cy="96" r="74" fill="#4ade80" fillOpacity="0.14" />
      <ellipse cx="110" cy="184" rx="64" ry="10" fill="#16a34a" fillOpacity="0.10" />
      <path d="M110 30 168 50v42c0 40-28 60-58 74-30-14-58-34-58-74V50Z" fill="#16a34a" />
      <path d="M110 30 168 50v42c0 40-28 60-58 74V30Z" fill="#15803d" />
      <path d="M86 100l16 16 32-36" stroke="#ffffff" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Lock({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 200" fill="none" className={className} role="img" aria-hidden>
      <circle cx="104" cy="96" r="74" fill="#4ade80" fillOpacity="0.14" />
      <ellipse cx="104" cy="184" rx="60" ry="10" fill="#16a34a" fillOpacity="0.10" />
      {/* shackle */}
      <path d="M74 96V74a30 30 0 0 1 60 0v22" stroke="#15803d" strokeWidth="13" strokeLinecap="round" />
      {/* body */}
      <rect x="56" y="92" width="96" height="82" rx="18" fill="#16a34a" />
      <rect x="56" y="92" width="96" height="82" rx="18" fill="#15803d" fillOpacity="0.18" />
      {/* keyhole (rupee-tinted) */}
      <circle cx="104" cy="124" r="11" fill="#dcfce7" />
      <rect x="99" y="130" width="10" height="22" rx="5" fill="#dcfce7" />
      {/* key */}
      <circle cx="172" cy="150" r="13" fill="none" stroke="#eab308" strokeWidth="6" />
      <rect x="150" y="147" width="22" height="6" rx="3" fill="#eab308" />
      <rect x="152" y="153" width="6" height="9" rx="2" fill="#eab308" />
    </svg>
  );
}
