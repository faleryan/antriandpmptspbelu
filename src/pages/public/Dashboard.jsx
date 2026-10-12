import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useSettings } from '../../context/Settings.jsx'
import { useQueue } from '../../hooks/useQueue'
import PromoPlayer from '../../components/PromoPlayer.jsx'
import { fmtDate } from '../../lib/util'
import { groupServices } from '../../lib/agency'
import AgencyLogo from '../../components/AgencyLogo.jsx'

// Dashboard publik: papan antrian live, layanan per instansi, kartu info, dan promosi.
export default function Dashboard() {
  const { settings: s } = useSettings()
  const { tickets, services, counters, agencies } = useQueue()
  const [promo, setPromo] = useState([])

  useEffect(() => {
    supabase.from('promo_media').select('*').eq('active', true).order('sort')
      .then(({ data }) => setPromo(data || []))
  }, [])

  const sec = s.sections
  const activeCounters = counters.filter((c) => c.active)
  const groups = groupServices(agencies, services)
  const waiting = tickets.filter((t) => t.status === 'waiting').length
  const done = tickets.filter((t) => t.status === 'done').length
  const current = (c) => tickets.find((t) => t.counter_id === c.id && ['called', 'serving'].includes(t.status))

  return (
    <>
      {s.running_text && (
        <div className="ticker" aria-label="Pengumuman">
          <div className="ticker-in"><span>{s.running_text}</span></div>
        </div>
      )}
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
        {sec.services && groups.length > 0 && (
          <section className="section">
            <div className="section-head"><h2>Instansi & layanan hari ini</h2><Link to="/antrian">Ambil antrian →</Link></div>
            <div className="ag-sections">
              {groups.map(({ agency, services: list }) => (
                <div className="card ag-block" key={agency.id}>
                  <div className="ag-head">
                    <AgencyLogo agency={agency} size={52} />
                    <h3>{agency.name}</h3>
                  </div>
                  <ul className="ag-svc-list">
                    {list.map((x) => {
                      const w = tickets.filter((t) => t.service_id === x.id && t.status === 'waiting').length
                      return (
                        <li key={x.id}>
                          <span className="svc-code">{x.code}</span>
                          <span className="ag-svc-name"><b>{x.name}</b>{x.description && <small className="muted">{x.description}</small>}</span>
                          <span className="ag-svc-wait"><b>{w}</b><small>menunggu</small></span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
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

      </div>
    </>
  )
}
