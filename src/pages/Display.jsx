import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useSettings } from '../context/Settings.jsx'
import { useQueue } from '../hooks/useQueue'
import PromoPlayer from '../components/PromoPlayer.jsx'
import { Brand } from '../components/PublicLayout.jsx'
import { TZ } from '../lib/util'

const speak = (text) => new Promise((resolve) => {
  if (!('speechSynthesis' in window)) return resolve()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'id-ID'; u.rate = 0.9
  const v = speechSynthesis.getVoices().find((x) => x.lang?.toLowerCase().startsWith('id'))
  if (v) u.voice = v
  u.onend = resolve; u.onerror = resolve
  setTimeout(resolve, 9000)
  speechSynthesis.speak(u)
})

const chime = (ctx) => new Promise((resolve) => {
  if (!ctx) return resolve()
  const t = ctx.currentTime
  ;[[880, 0], [660, 0.28]].forEach(([freq, d]) => {
    const o = ctx.createOscillator(); const g = ctx.createGain()
    o.frequency.value = freq; o.connect(g); g.connect(ctx.destination)
    g.gain.setValueAtTime(0.0001, t + d)
    g.gain.exponentialRampToValueAtTime(0.35, t + d + 0.03)
    g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.5)
    o.start(t + d); o.stop(t + d + 0.55)
  })
  setTimeout(resolve, 900)
})

// Layar antrian untuk TV/komputer loket (promoOnly = hanya promosi, bisa dibuka online).
export default function Display({ promoOnly = false }) {
  const { settings: s } = useSettings()
  const { tickets, counters, loading } = useQueue()
  const [promo, setPromo] = useState([])
  const [sound, setSound] = useState(false)
  const [now, setNow] = useState(new Date())
  const [flash, setFlash] = useState(0)
  const ctxRef = useRef(null)
  const chain = useRef(Promise.resolve())
  const seen = useRef(null)

  useEffect(() => {
    const load = () => supabase.from('promo_media').select('*').eq('active', true).order('sort').then(({ data }) => setPromo(data || []))
    load()
    const ch = supabase.channel('promo-' + Math.random().toString(36).slice(2))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'promo_media' }, load).subscribe()
    const iv = setInterval(load, 60000)
    return () => { clearInterval(iv); supabase.removeChannel(ch) }
  }, [])

  useEffect(() => { const i = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(i) }, [])

  // Umumkan nomor yang baru dipanggil / dipanggil ulang.
  useEffect(() => {
    if (promoOnly || loading) return
    const sig = {}
    tickets.forEach((t) => { if (t.called_at) sig[t.id] = `${t.called_at}|${t.call_count}` })
    if (seen.current === null) { seen.current = sig; return } // data pertama = acuan, jangan diumumkan
    const changed = tickets.filter((t) => t.status === 'called' && seen.current[t.id] !== sig[t.id])
    seen.current = sig
    if (!changed.length) return
    setFlash((f) => f + 1)
    if (!sound) return
    changed.forEach((t) => {
      const c = counters.find((x) => x.id === t.counter_id)
      const letters = t.code.split('-')[0].split('').join(' ')
      const text = `Nomor antrian ${letters} ${t.seq}, silakan menuju ${c?.name || 'loket'}`
      chain.current = chain.current.then(() => chime(ctxRef.current)).then(() => speak(text))
    })
  }, [tickets, loading])

  const enableSound = () => {
    const AC = window.AudioContext || window.webkitAudioContext
    if (AC) { ctxRef.current = new AC(); ctxRef.current.resume() }
    speechSynthesis?.getVoices()
    setSound(true)
    chain.current = chain.current.then(() => speak('Suara antrian aktif'))
  }
  const fullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen()
    else document.documentElement.requestFullscreen?.()
  }

  const activeCounters = counters.filter((c) => c.active)
  const calling = tickets.filter((t) => ['called', 'serving'].includes(t.status))
    .sort((a, b) => new Date(b.called_at) - new Date(a.called_at))
  const latest = calling[0]
  const latestCounter = latest && counters.find((c) => c.id === latest.counter_id)
  const waiting = tickets.filter((t) => t.status === 'waiting')
  const current = (c) => calling.find((t) => t.counter_id === c.id)

  return (
    <div className="tv">
      <header className="tv-head">
        <Brand settings={s} light />
        <div className="tv-clock">
          <b>{now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: TZ })}</b>
          <span>{now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: TZ })}</span>
        </div>
      </header>

      <main className={'tv-main' + (promoOnly ? ' promo-only' : '')}>
        {!promoOnly && (
          <section className="tv-queue" aria-live="polite">
            <div key={flash} className={'tv-now' + (flash ? ' flash' : '')}>
              <small>Nomor dipanggil</small>
              <div className="tv-now-code">{latest ? latest.code : '—'}</div>
              <div className="tv-now-counter">{latest ? (latestCounter?.name || 'Loket') : 'Menunggu panggilan'}</div>
            </div>
            <div className="tv-counters">
              {activeCounters.map((c) => {
                const t = current(c)
                return (
                  <div className="tv-counter" key={c.id}>
                    <small>{c.name}</small>
                    <b className={t ? '' : 'idle'}>{t ? t.code : '—'}</b>
                  </div>
                )
              })}
            </div>
            <div className="tv-next">
              <small>Antrian berikutnya · {waiting.length} menunggu</small>
              <div className="tv-next-list">
                {waiting.slice(0, 10).map((t) => <span key={t.id}>{t.code}</span>)}
                {waiting.length === 0 && <span style={{ color: '#7f93a5' }}>Tidak ada antrian</span>}
              </div>
            </div>
          </section>
        )}
        <section className="tv-promo">
          <PromoPlayer items={promo} defaultSeconds={s.promo_default_seconds || 10} />
        </section>
      </main>

      <footer className="tv-foot">{s.running_text ? <span>{s.running_text}</span> : <span>&nbsp;</span>}</footer>

      <div className="tv-tools"><button className="btn btn-sm btn-ghost" style={{ color: '#fff', borderColor: '#3b536a' }} onClick={fullscreen}>Layar penuh</button></div>
      {!promoOnly && !sound && (
        <button className="btn btn-amber tv-sound" onClick={enableSound}>🔊 Aktifkan suara panggilan</button>
      )}
    </div>
  )
}
