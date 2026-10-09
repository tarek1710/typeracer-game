/** Top-down race car facing right. Used for the player (PlayerCar) and AI opponents. */
export function CarSprite({ color, isPlayer = false }: { color: string; isPlayer?: boolean }) {
  return (
    <svg viewBox="0 0 80 36" width="72" height="32" className="car-glow" style={{ ['--car' as string]: color }} aria-hidden="true">
      <ellipse cx="40" cy="31" rx="34" ry="3" fill="rgba(0,0,0,.45)" />
      <rect x="14" y="3" width="14" height="6" rx="2" fill="#0b1220" />
      <rect x="52" y="3" width="14" height="6" rx="2" fill="#0b1220" />
      <rect x="14" y="27" width="14" height="6" rx="2" fill="#0b1220" />
      <rect x="52" y="27" width="14" height="6" rx="2" fill="#0b1220" />
      <rect x="2" y="8" width="5" height="20" rx="1.5" fill={color} opacity=".85" />
      <rect x="5" y="8" width="70" height="20" rx="10" fill={color} />
      <rect x="22" y="11" width="26" height="14" rx="5" fill="#0b1220" opacity=".85" />
      <polygon points="46,11 56,13.5 56,22.5 46,25" fill="#7dd3fc" opacity=".75" />
      <rect x="58" y="13" width="16" height="3" rx="1.5" fill="#fff" opacity=".35" />
      <rect x="58" y="20" width="16" height="3" rx="1.5" fill="#fff" opacity=".35" />
      <circle cx="73" cy="12" r="2.2" fill="#fef08a" />
      <circle cx="73" cy="24" r="2.2" fill="#fef08a" />
      {isPlayer && <path d="M30 18h12" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity=".9" />}
    </svg>
  );
}
