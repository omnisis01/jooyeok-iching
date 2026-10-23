// 넓은 화면(가로 태블릿, 데스크톱)의 배경: 로고와 같은 하늘. 다크는 노을 진 밤하늘(북두칠성, 초승달, 구름), 라이트는 맑은 낮하늘(해, 구름)
// 장식일 뿐이라 클릭을 막지 않고, 좁은 화면에서는 그리지 않는다
export default function SkyBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 hidden overflow-hidden lg:block">
      {/* 밤하늘 */}
      <div className="sky-night absolute inset-0">
        <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1600 900">
          <defs>
            <linearGradient id="skyN" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#0b0f2e" />
              <stop offset="0.55" stopColor="#3b2452" />
              <stop offset="1" stopColor="#b86a34" />
            </linearGradient>
            <radialGradient id="glowN" cx="0.78" cy="0.22" r="0.25">
              <stop offset="0" stopColor="#f2c94c" stopOpacity="0.35" />
              <stop offset="1" stopColor="#f2c94c" stopOpacity="0" />
            </radialGradient>
            <symbol id="cl" viewBox="0 0 160 110">
              <path d="M20 70 a22 22 0 0 1 22-22 a28 28 0 0 1 54-6 a24 24 0 0 1 36 20 a18 18 0 0 1 -2 36 H38 a18 18 0 0 1 -18-28z" />
            </symbol>
          </defs>
          <rect width="1600" height="900" fill="url(#skyN)" />
          <rect width="1600" height="900" fill="url(#glowN)" />
          {/* 별 */}
          <g fill="#f1e9da" opacity="0.8">
            {[
              [120, 90, 1.6], [310, 140, 1.2], [520, 60, 1.4], [700, 180, 1.1], [900, 90, 1.5], [1100, 150, 1.2], [1380, 70, 1.6], [1500, 200, 1.1], [240, 300, 1.2], [640, 320, 1], [1000, 300, 1.3], [1450, 330, 1], [420, 420, 1.1], [1250, 420, 1.2],
            ].map(([x, y, r], i) => (
              <circle key={i} cx={x} cy={y} r={r} />
            ))}
          </g>
          {/* 북두칠성 */}
          <g transform="translate(140 150) scale(2.2)" opacity="0.95">
            <polyline points="0,38 16,26 32,22 48,24 72,16 74,40 50,46 48,24" fill="none" stroke="#f1e9da" strokeWidth="0.8" opacity="0.5" />
            <g fill="#f1e9da">
              {[[0, 38, 2.6], [16, 26, 2.1], [32, 22, 2.1], [48, 24, 2.1], [72, 16, 2.6], [74, 40, 2.6], [50, 46, 2.1]].map(([x, y, r], i) => (
                <circle key={i} cx={x} cy={y} r={r} />
              ))}
            </g>
          </g>
          {/* 초승달 */}
          <circle cx="1250" cy="200" r="70" fill="#f2c94c" />
          <circle cx="1278" cy="180" r="62" fill="#1a1d4a" />
          {/* 구름: 아래쪽에 천천히 흐른다 */}
          <g className="sky-drift" fill="#5a3a52" opacity="0.9">
            <use href="#cl" x="-60" y="700" width="420" height="290" />
            <use href="#cl" x="300" y="760" width="360" height="250" />
            <use href="#cl" x="900" y="740" width="400" height="275" />
            <use href="#cl" x="1300" y="790" width="380" height="260" />
          </g>
          <g className="sky-drift-slow" fill="#6b4458" opacity="0.95">
            <use href="#cl" x="120" y="800" width="360" height="250" />
            <use href="#cl" x="620" y="820" width="330" height="230" />
            <use href="#cl" x="1120" y="830" width="420" height="290" />
          </g>
        </svg>
      </div>
      {/* 낮하늘 */}
      <div className="sky-day absolute inset-0">
        <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1600 900">
          <defs>
            <linearGradient id="skyD" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#9fcbea" />
              <stop offset="0.6" stopColor="#dbeaf5" />
              <stop offset="1" stopColor="#f5f0e8" />
            </linearGradient>
            <radialGradient id="sunD" cx="0.8" cy="0.18" r="0.3">
              <stop offset="0" stopColor="#ffe9a8" stopOpacity="0.9" />
              <stop offset="1" stopColor="#ffe9a8" stopOpacity="0" />
            </radialGradient>
            <symbol id="cld" viewBox="0 0 160 110">
              <path d="M20 70 a22 22 0 0 1 22-22 a28 28 0 0 1 54-6 a24 24 0 0 1 36 20 a18 18 0 0 1 -2 36 H38 a18 18 0 0 1 -18-28z" />
            </symbol>
          </defs>
          <rect width="1600" height="900" fill="url(#skyD)" />
          <rect width="1600" height="900" fill="url(#sunD)" />
          <circle cx="1280" cy="160" r="54" fill="#f6c35a" opacity="0.95" />
          <g className="sky-drift" fill="#ffffff" opacity="0.9">
            <use href="#cld" x="-40" y="120" width="380" height="260" />
            <use href="#cld" x="520" y="60" width="300" height="205" />
            <use href="#cld" x="980" y="260" width="340" height="235" />
          </g>
          <g className="sky-drift-slow" fill="#ffffff" opacity="0.85">
            <use href="#cld" x="-80" y="700" width="460" height="315" />
            <use href="#cld" x="420" y="760" width="380" height="260" />
            <use href="#cld" x="900" y="730" width="420" height="290" />
            <use href="#cld" x="1300" y="780" width="400" height="275" />
          </g>
        </svg>
      </div>
    </div>
  );
}
