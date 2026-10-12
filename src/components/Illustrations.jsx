// Ilustrasi bawaan (dipakai bila admin belum mengunggah gambar sendiri).

const WALL = '#eef1f5'
const WALL_D = '#d5dbe3'
const GLASS = '#2f86c9'
const GLASS_D = '#1b5d92'
const STONE = '#8e979f'

function Windows({ x, y, cols, rows, w = 54, h = 44, gx = 18, gy = 34 }) {
  const out = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const px = x + c * (w + gx), py = y + r * (h + gy)
      out.push(
        <g key={`${r}-${c}`}>
          <rect x={px - 3} y={py - 3} width={w + 6} height={h + 6} fill={WALL_D} />
          <rect x={px} y={py} width={w} height={h} fill={GLASS} />
          <rect x={px} y={py} width={w} height={h * 0.38} fill="#5aa6dd" />
          <rect x={px + w / 2 - 1.5} y={py} width={3} height={h} fill={WALL} />
        </g>,
      )
    }
  }
  return <>{out}</>
}

// Gedung kantor pelayanan generik. Papan nama memakai nama instansi dari pengaturan.
export function BuildingArt({ name = '', accent = '#d8323c' }) {
  const label = (name || 'Layanan Terpadu').toUpperCase()
  const fs = label.length > 26 ? 20 : 26
  return (
    <svg className="bld-art" viewBox="0 0 1200 650" role="img" aria-label={`Ilustrasi gedung ${name}`}>
      {/* pelataran & tangga (bagian ini yang tertutup kartu pintasan) */}
      <rect x="0" y="524" width="1200" height="126" fill="#1c2b5c" />
      <rect x="20" y="524" width="1160" height="16" fill="#c9d0d9" />
      <rect x="0" y="540" width="1200" height="18" fill="#aab3bf" />
      <rect x="0" y="558" width="1200" height="92" fill="#27366b" />
      {/* sayap kiri & kanan */}
      {[60, 740].map((x) => (
        <g key={x}>
          <rect x={x - 22} y="168" width="444" height="22" fill={accent} />
          <rect x={x - 10} y="190" width="420" height="8" fill={WALL_D} />
          <rect x={x} y="198" width="400" height="230" fill={WALL} />
          <rect x={x - 22} y="300" width="444" height="10" fill={WALL_D} />
          <rect x={x} y="198" width="56" height="230" fill={accent} />
          <rect x={x + 344} y="198" width="56" height="230" fill={accent} opacity=".92" />
          <Windows x={x + 78} y={222} cols={4} rows={2} w={50} h={46} gx={20} gy={42} />
        </g>
      ))}
      {/* blok tengah */}
      <rect x="452" y="70" width="296" height="16" fill={WALL_D} />
      <rect x="470" y="86" width="260" height="70" fill={WALL} />
      {[490, 545, 600, 655, 705].map((x) => <rect key={x} x={x} y="86" width="8" height="70" fill={WALL_D} />)}
      <rect x="430" y="150" width="340" height="20" fill={WALL_D} />
      <rect x="440" y="170" width="320" height="260" fill={accent} />
      <rect x="500" y="200" width="200" height="200" fill={STONE} />
      <rect x="500" y="200" width="200" height="200" fill="url(#stone)" opacity=".35" />
      <circle cx="600" cy="262" r="38" fill="#f4f6f8" />
      <path d="M600 236 l20 34 h-40 z" fill={accent} />
      <rect x="582" y="276" width="36" height="8" fill="#9aa3ab" />
      {/* lantai dasar kaca */}
      <rect x="40" y="428" width="1120" height="12" fill={WALL_D} />
      <rect x="60" y="440" width="1080" height="84" fill={GLASS_D} />
      {Array.from({ length: 28 }, (_, i) => <rect key={i} x={60 + i * 40} y="440" width="3" height="84" fill="#9cc3e3" opacity=".7" />)}
      <rect x="60" y="440" width="1080" height="20" fill="#4c9bd6" opacity=".55" />
      {/* papan nama */}
      <rect x="380" y="396" width="440" height="50" rx="4" fill="#1d2733" />
      <text x="600" y={428 + (26 - fs) / 3} textAnchor="middle" fontFamily="'Public Sans', Arial, sans-serif" fontWeight="800"
        fontSize={fs} letterSpacing="2" fill="#f2f4f7">{label.length > 34 ? label.slice(0, 33) + '…' : label}</text>
      <rect x="520" y="470" width="160" height="54" fill="#123e63" />
      <rect x="598" y="470" width="4" height="54" fill="#9cc3e3" />
      <defs>
        <pattern id="stone" width="40" height="20" patternUnits="userSpaceOnUse">
          <path d="M0 20h40M20 0v20" stroke="#5f676e" strokeWidth="1" />
        </pattern>
      </defs>
    </svg>
  )
}

// Ilustrasi kartu pintasan
export function CardArt({ kind = 'antrian', color = '#0b6bcb' }) {
  const skin = '#f2c19c', hair = '#6b3f22', ink = '#28324a'
  if (kind === 'status') {
    return (
      <svg viewBox="0 0 160 130" className="card-art" aria-hidden="true">
        <rect x="30" y="10" width="62" height="110" rx="9" fill={ink} />
        <rect x="35" y="20" width="52" height="88" rx="3" fill="#fff" />
        <rect x="42" y="28" width="38" height="12" rx="2" fill="#f6c94b" />
        {[48, 64, 80].map((y, i) => (
          <g key={y}>
            <rect x="42" y={y} width="10" height="10" rx="2" fill={['#7bb6f0', '#e5484d', '#7bb6f0'][i]} />
            <rect x="56" y={y + 2} width="24" height="3" rx="1.5" fill="#c9d2de" />
            <rect x="56" y={y + 7} width="16" height="3" rx="1.5" fill="#dfe5ec" />
          </g>
        ))}
        <circle cx="122" cy="34" r="12" fill={hair} />
        <circle cx="122" cy="40" r="10" fill={skin} />
        <path d="M104 66 q18 -16 36 0 v52 h-36z" fill="#f6c94b" />
        <rect x="108" y="118" width="12" height="8" fill={ink} /><rect x="126" y="118" width="12" height="8" fill={ink} />
        <path d="M106 72 l-22 6" stroke={skin} strokeWidth="7" strokeLinecap="round" />
        <rect x="80" y="70" width="14" height="18" rx="2" fill={color} />
      </svg>
    )
  }
  if (kind === 'survei' || kind === 'bukutamu') {
    const book = kind === 'bukutamu'
    return (
      <svg viewBox="0 0 160 130" className="card-art" aria-hidden="true">
        <rect x="36" y="8" width="88" height="114" rx="8" fill="#e8ecf7" />
        <rect x="36" y="8" width="88" height="16" rx="8" fill="#5b6488" />
        <circle cx="46" cy="16" r="2.5" fill="#fff" /><circle cx="54" cy="16" r="2.5" fill="#fff" /><circle cx="62" cy="16" r="2.5" fill="#fff" />
        {[34, 60, 86].map((y, i) => (
          <g key={y}>
            <rect x="46" y={y} width="16" height="16" rx="3" fill={book ? color : ['#2fa35a', '#e5484d', '#4c8dea'][i]} />
            <path d={`M50 ${y + 8} l3 3 l6 -7`} stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <rect x="68" y={y + 2} width="44" height="4" rx="2" fill="#b9c3d6" />
            <rect x="68" y={y + 10} width="30" height="4" rx="2" fill="#d3dae6" />
          </g>
        ))}
        <g transform="rotate(35 128 70)">
          <rect x="122" y="40" width="12" height="62" rx="3" fill="#e5484d" />
          <path d="M122 102 l6 12 l6 -12z" fill="#f2c19c" />
          <rect x="122" y="36" width="12" height="8" rx="3" fill="#5b6488" />
        </g>
      </svg>
    )
  }
  // antrian
  return (
    <svg viewBox="0 0 160 130" className="card-art" aria-hidden="true">
      {[18, 38, 58].map((y, i) => (
        <g key={y}>
          <rect x="96" y={y} width="12" height="12" rx="2" fill={['#e5484d', '#4c8dea', '#2fa35a'][i]} />
          <path d={`M99 ${y + 6} l2.5 2.5 l4.5 -5`} stroke="#fff" strokeWidth="2" fill="none" />
          <rect x="114" y={y + 2} width="30" height="3.5" rx="1.75" fill="#b9c3d6" />
          <rect x="114" y={y + 8} width="20" height="3.5" rx="1.75" fill="#d3dae6" />
        </g>
      ))}
      <circle cx="50" cy="40" r="20" fill={hair} />
      <circle cx="50" cy="48" r="17" fill={skin} />
      <circle cx="44" cy="47" r="2" fill={ink} /><circle cx="56" cy="47" r="2" fill={ink} />
      <path d="M44 56 q6 5 12 0" stroke={ink} strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M18 128 q4 -50 32 -52 q28 2 32 52z" fill="#e5484d" />
      <rect x="64" y="80" width="66" height="44" rx="5" fill="#5b6488" />
      <rect x="58" y="120" width="80" height="6" rx="3" fill={ink} />
      <circle cx="97" cy="102" r="5" fill="#fff" />
    </svg>
  )
}
