import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSettings } from '../context/Settings.jsx'
import { useQueue } from '../hooks/useQueue'
import { Brand } from '../components/PublicLayout.jsx'
import TicketView from '../components/TicketView.jsx'
import { fmtDateTime, waitingAhead } from '../lib/util'

// Kiosk antrian offline: pengunjung menyentuh layanan, tiket tercetak otomatis.
export default function Kiosk() {
  const { settings: s } = useSettings()
  const { tickets, services } = useQueue()
  const [ticket, setTicket] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const timer = useRef()

  useEffect(() => () => clearTimeout(timer.current), [])

  const take = async (svc) => {
    setBusy(true); setErr('')
    const { data, error } = await supabase.rpc('take_ticket', {
      p_service_id: svc.id, p_name: null, p_phone: null, p_source: 'offline',
    })
    setBusy(false)
    if (error) return setErr(error.message)
    setTicket({ ...data, svc })
    setTimeout(() => window.print(), 400)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setTicket(null), 15000)
  }
  const reset = () => { clearTimeout(timer.current); setTicket(null) }

  const active = services.filter((x) => x.active)
  const ahead = ticket ? waitingAhead(ticket, tickets) : 0

  return (
    <div className="kiosk">
      <div className="kiosk-head">
        <Brand settings={s} light />
        <Link className="btn btn-ghost" style={{ color: '#fff', borderColor: '#3b536a' }} to="/buku-tamu?src=offline">Isi buku tamu</Link>
      </div>

      {ticket ? (
        <div className="kiosk-done">
          <h1>Silakan ambil tiket Anda</h1>
          <TicketView ticket={ticket} service={ticket.svc} tickets={tickets} showLink={false} />
          <p style={{ color: '#9fb4c6' }}>Tunggu hingga nomor Anda dipanggil di layar.</p>
          <div className="row">
            <button className="btn btn-ghost" style={{ color: '#fff', borderColor: '#3b536a' }} onClick={() => window.print()}>Cetak ulang</button>
            <button className="btn btn-amber" onClick={reset}>Selesai</button>
          </div>
          <div className="print-area">
            <h4>{s.org_name}</h4>
            <p>{ticket.svc.name}</p>
            <hr />
            <div className="pa-code">{ticket.code}</div>
            <hr />
            <p>{fmtDateTime(ticket.created_at)}</p>
            <p>Menunggu di depan Anda: {ahead} nomor</p>
            <p>Terima kasih atas kesabaran Anda</p>
          </div>
        </div>
      ) : (
        <>
          <h1>Pilih layanan untuk mengambil nomor</h1>
          {err && <div className="alert err">{err}</div>}
          <div className="kiosk-grid">
            {active.map((x) => {
              const w = tickets.filter((t) => t.service_id === x.id && t.status === 'waiting').length
              return (
                <button key={x.id} className="kiosk-btn" disabled={busy} onClick={() => take(x)}>
                  <span className="svc-code">{x.code}</span>
                  <h2>{x.name}</h2>
                  <span>{w} menunggu · ±{x.est_minutes} menit/orang</span>
                </button>
              )
            })}
            {active.length === 0 && <p style={{ color: '#9fb4c6' }}>Belum ada layanan aktif.</p>}
          </div>
        </>
      )}
    </div>
  )
}
