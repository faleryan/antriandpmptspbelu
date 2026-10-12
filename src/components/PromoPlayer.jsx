import { useEffect, useState } from 'react'
import { youtubeId } from '../lib/util'

// Memutar daftar media promosi (gambar / video / YouTube) berurutan tanpa henti.
export default function PromoPlayer({ items = [], defaultSeconds = 10, fit = 'cover', showTitle = true }) {
  const [i, setI] = useState(0)
  const n = items.length
  const idx = n ? i % n : 0
  const cur = items[idx]

  useEffect(() => { if (i >= n && n > 0) setI(0) }, [n, i])

  useEffect(() => {
    if (!cur || n === 0) return
    if (cur.kind === 'video') return // lanjut saat video selesai
    if (n === 1 && cur.kind === 'image') return
    const t = setTimeout(() => setI((x) => (x + 1) % n), (cur.duration_sec || defaultSeconds) * 1000)
    return () => clearTimeout(t)
  }, [cur?.id, idx, n, defaultSeconds])

  if (!cur) return <div className="promo promo-empty"><span>Belum ada media promosi</span></div>

  const next = () => setI((x) => (x + 1) % n)
  const yt = cur.kind === 'youtube' ? youtubeId(cur.url) : ''

  return (
    <div className="promo">
      {cur.kind === 'image' && (
        <img key={`${cur.id}-${idx}`} className="promo-media" style={{ objectFit: fit }} src={cur.url} alt={cur.title} />
      )}
      {cur.kind === 'video' && (
        <video
          key={`${cur.id}-${idx}`} className="promo-media" style={{ objectFit: fit }} src={cur.url}
          autoPlay muted playsInline loop={n === 1} onEnded={next} onError={next}
        />
      )}
      {cur.kind === 'youtube' && yt && (
        <iframe
          key={`${cur.id}-${idx}`} className="promo-media" title={cur.title}
          src={`https://www.youtube.com/embed/${yt}?autoplay=1&mute=1&controls=0&rel=0&modestbranding=1&playsinline=1`}
          allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen
        />
      )}
      {showTitle && cur.title && <div className="promo-cap">{cur.title}</div>}
      {n > 1 && (
        <div className="promo-dots" aria-hidden="true">
          {items.map((m, k) => <span key={m.id} className={k === idx ? 'on' : ''} />)}
        </div>
      )}
    </div>
  )
}
