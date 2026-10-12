import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useSettings } from '../../context/Settings.jsx'
import { useQueue } from '../../hooks/useQueue'
import { groupServices } from '../../lib/agency'
import { fmtDate } from '../../lib/util'
import AgencyLogo from '../../components/AgencyLogo.jsx'
import { BuildingArt, CardArt } from '../../components/Illustrations.jsx'

// Efek mengetik: kata diketik huruf demi huruf, ditahan, lalu dihapus dan berganti kata berikutnya.
function useTyped(words) {
  const [text, setText] = useState(words[0] || '')
  const key = words.join('|')
  useEffect(() => {
    if (!words.length) return setText('')
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    let i = 0, n = 0, deleting = false, timer
    if (reduce) {
      setText(words[0])
      if (words.length < 2) return
      timer = setInterval(() => { i = (i + 1) % words.length; setText(words[i]) }, 2800)
      return () => clearInterval(timer)
    }
    const tick = () => {
      const w = words[i]
      if (!deleting) {
        n++
        setText(w.slice(0, n))
        if (n === w.length) { deleting = words.length > 1; timer = setTimeout(tick, 1800); return }
      } else {
        n--
        setText(w.slice(0, n))
        if (n === 0) { deleting = false; i = (i + 1) % words.length; timer = setTimeout(tick, 350); return }
      }
      timer = setTimeout(tick, deleting ? 45 : 95)
    }
    setText(''); timer = setTimeout(tick, 400)
    return () => clearTimeout(timer)
  }, [key])
  return text
}

function CardLink({ to, className, style, children }) {
  if (/^https?:\/\//.test(to || '')) return <a className={className} style={style} href={to} target="_blank" rel="noreferrer">{children}</a>
  return <Link className={className} style={style} to={to || '/'}>{children}</Link>
}

export default function Landing() {
  const { settings: s } = useSettings()
  const { services, agencies } = useQueue()
  const [posts, setPosts] = useState([])
  const words = (s.hero_words || '').split(',').map((w) => w.trim()).filter(Boolean)
  const typed = useTyped(words)
  const groups = groupServices(agencies, services).filter((g) => g.agency.id !== 'none')
  const cards = (s.landing_cards || []).filter((c) => c.title)

  useEffect(() => {
    supabase.from('posts').select('id,title,slug,category,excerpt,cover_url,published_at')
      .eq('published', true).order('published_at', { ascending: false }).limit(3)
      .then(({ data }) => setPosts(data || []))
  }, [])

  const heroStyle = { '--hero-bg': s.hero_bg_color || '#0a1140' }
  if (s.hero_bg_image) {
    const dim = Math.min(90, Math.max(0, Number(s.hero_bg_dim ?? 55))) / 100
    heroStyle.backgroundImage = `linear-gradient(rgba(5,10,40,${dim}), rgba(5,10,40,${dim})), url("${s.hero_bg_image}")`
  }

  return (
    <>
      <section className={'lp-hero' + (s.hero_pattern && !s.hero_bg_image ? ' dotted' : '')} style={heroStyle}>
        <span className="lp-dots lp-dots-l" aria-hidden="true" />
        <span className="lp-dots lp-dots-r" aria-hidden="true" />
        <div className="container lp-hero-in">
          <span className="lp-label">{s.hero_label || s.org_name}</span>
          <h1 className="lp-title">
            {s.hero_prefix}{' '}
            {words.length > 0 && (
              <span className="lp-typed">
                <span className="sr-only">{words.join(', ')}</span>
                <span aria-hidden="true">{typed}</span>
                <span className="lp-caret" aria-hidden="true" />
              </span>
            )}
          </h1>
          {s.hero_tagline && <p className="lp-tagline">{s.hero_tagline}</p>}
          <div className={'lp-visual' + (s.hero_image ? ' has-img' : '')}>
            {s.hero_image
              ? <img src={s.hero_image} alt={`Gedung ${s.org_name}`} />
              : <BuildingArt name={s.org_name} />}
          </div>
        </div>
      </section>

      {cards.length > 0 && (
        <section className="container lp-cards" style={{ '--cols': Math.min(cards.length, 4) }}>
          {cards.map((c, i) => (
            <article className="lp-card" key={i}>
              <div className="lp-card-art">
                {c.image ? <img src={c.image} alt="" /> : <CardArt kind={c.art || 'antrian'} color={c.color} />}
              </div>
              <h2>{c.title}</h2>
              {c.text && <p>{c.text}</p>}
              <CardLink to={c.link} className="lp-card-btn" style={{ '--c': c.color || 'var(--primary)' }}>{c.button || 'Kunjungi'}</CardLink>
            </article>
          ))}
        </section>
      )}

      <div className="container">
        {s.sections.agencies && groups.length > 0 && (
          <section className="section">
            <div className="section-head"><h2>Instansi yang melayani</h2><Link to="/dashboard">Lihat antrian hari ini →</Link></div>
            <div className="lp-agencies">
              {groups.map(({ agency, services: list }) => (
                <Link key={agency.id} className="lp-agency" to={`/antrian?instansi=${agency.id}`}>
                  <AgencyLogo agency={agency} size={64} />
                  <b>{agency.name}</b>
                  <small>{list.length} layanan</small>
                </Link>
              ))}
            </div>
          </section>
        )}

        {s.sections.news && posts.length > 0 && (
          <section className="section">
            <div className="section-head"><h2>Berita & pengumuman</h2><Link to="/berita">Semua berita →</Link></div>
            <div className="news-grid">
              {posts.map((p) => (
                <Link key={p.id} className="card news-card" to={`/berita/${p.slug}`}>
                  <div className="news-cover" style={p.cover_url ? { backgroundImage: `url(${p.cover_url})` } : undefined} />
                  <div className="news-body">
                    <span className="news-meta">{p.category} · {fmtDate(p.published_at)}</span>
                    <h3>{p.title}</h3>
                    {p.excerpt && <p className="muted">{p.excerpt}</p>}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  )
}
