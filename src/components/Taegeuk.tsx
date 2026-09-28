// 음양(태극) 문양 SVG
type Props = {
  size?: number;
  className?: string;
  light?: string;
  dark?: string;
};

export default function Taegeuk({
  size = 160,
  className,
  light = "var(--paper)",
  dark = "var(--ink)",
}: Props) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} role="img" aria-label="태극 문양">
      <circle cx="50" cy="50" r="49" fill={light} />
      {/* 왼쪽 절반(음) — 위에서 왼쪽 호를 따라 내려온 뒤 작은 두 호로 S자 경계를 만든다 */}
      <path d="M50 1 A49 49 0 0 0 50 99 A24.5 24.5 0 0 0 50 50 A24.5 24.5 0 0 1 50 1 Z" fill={dark} />
      <circle cx="50" cy="25.5" r="8" fill={dark} />
      <circle cx="50" cy="74.5" r="8" fill={light} />
      <circle cx="50" cy="50" r="49" fill="none" stroke="var(--gold)" strokeWidth="1.5" />
    </svg>
  );
}
