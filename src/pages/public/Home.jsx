import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useSettings } from '../../context/Settings.jsx'
import { useQueue } from '../../hooks/useQueue'
import PromoPlayer from '../../components/PromoPlayer.jsx'
import { fmtDate } from '../../lib/util'

export default function Home() {
  const { settings: s } = useSettings()
  const { tickets, services, counters } = useQueue()
  const [posts, setPosts] = useState([])
  const [promo, setPromo] = useState([])

  useEffect(() => {
    supabase.from('posts')
      .select('id,title,slug,category,excerpt,cover_url,published_at')
      .eq('published', true).order('published_at', { ascending: false }).limit(6)
      .then(({ data }) => setPosts(data || []))
    supabase.from('promo_media').select('*').eq('active', true).order('sort')
      .then(({ data }) => setPromo(data || []))
  }, [])

  const sec = s.sections
  const activeCounters = counters.filter((c) => c.active)
  const activeServices = services.filter((x) => x.active)
  const waiting = tickets.filter((t) => t.status === 'waiting').length
  const done = tickets.filter((t) => t.status === 'done').length
  const current = (c) => tickets.find((t) => t.counter_id === c.id && ['called', 'serving'].includes(t.status))

  return (
    <>
      <section className="hero">
        <div className="container hero-in">
          <div className="hero-copy">
            <h1>{s.hero_title}</h1>
            <p>{s.hero_subtitle}</p>
            <div className="hero-actions">
              <Link className="btn btn-amber btn-lg" to="/antrian">Ambil nomor antrian</Link>
              <Link className="btn btn-ghost btn-lg" to="/buku-tamu">Isi buku tamu</Link>
            </div>
            {s.open_hours && <p>Jam layanan: {s.open_hours}</p>}
          </div>

          {sec.queue && (
            <div className="board" aria-live="polite">
              <div className="board-title"><span>Sedang dipanggil</span><span>{fmtDate(new Date())}</span></div>
              {activeCounters.length === 0 && <p className="muted">Belum ada loket aktif.</p>}
              {activeCounters.map((c) => {
                const t = current(c)
                return (
                  <div className="board-row" key={c.id}>
                    <span className="board-counter">{c.name}</span>
                    <span className={'board-code' + (t ? '' : ' idle')}>{t ? t.code : '—'}</span>
                  </div>
                )
              })}
              <div className="board-foot">
                <span><b>{waiting}</b>menunggu</span>
                <span><b>{done}</b>selesai hari ini</span>
              </div>
            </div>
          )}
        </div>
      </section>

      <div className="container">
        {sec.services && activeServices.length > 0 && (
          <section className="section">
            <div className="section-head"><h2>Layanan hari ini</h2><Link to="/antrian">Ambil antrian →</Link></div>
            <div className="svc-grid">
              {activeServices.map((x) => {
                const w = tickets.filter((t) => t.service_id === x.id && t.status === 'waiting').length
                return (
                  <div className="card svc-card" key={x.id}>
                    <div className="svc-top"><span className="svc-code">{x.code}</span><h3>{x.name}</h3></div>
                    {x.description && <p className="muted">{x.description}</p>}
                    <div className="svc-stats"><span><b>{w}</b> menunggu</span><span>±<b>{x.est_minutes}</b> menit/orang</span></div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {sec.info && s.info_cards?.length > 0 && (
          <section className="section">
            <div className="info-grid">
              {s.info_cards.map((c, i) => (
                <div className="card info-card stack" key={i}>
                  {c.icon && <span className="ico" aria-hidden="true">{c.icon}</span>}
                  <h3>{c.title}</h3>
                  <p className="muted">{c.text}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {sec.promo && promo.length > 0 && (
          <section className="section">
            <div className="promo-frame"><PromoPlayer items={promo} defaultSeconds={s.promo_default_seconds || 10} /></div>
          </section>
        )}

        {sec.news && (
          <section className="section">
            <div className="section-head"><h2>Berita & pengumuman</h2><Link to="/berita">Semua berita →</Link></div>
            {posts.length === 0
              ? <div className="card muted">Belum ada berita yang diterbitkan.</div>
              : (
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
              )}
          </section>
        )}

        {sec.contact && (s.address || s.phone || s.email || s.open_hours) && (
          <section className="section">
            <div className="section-head"><h2>Hubungi kami</h2></div>
            <div className="contact-grid">
              {s.address && <div className="card"><b>Alamat</b>{s.address}</div>}
              {s.phone && <div className="card"><b>Telepon</b>{s.phone}</div>}
              {s.email && <div className="card"><b>Email</b>{s.email}</div>}
              {s.open_hours && <div className="card"><b>Jam layanan</b>{s.open_hours}</div>}
            </div>
          </section>
        )}
      </div>
    </>
  )
}
