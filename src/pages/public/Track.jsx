import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQueue } from '../../hooks/useQueue'
import { STATUS, fmtTime, waitingAhead } from '../../lib/util'
import { agencyOf } from '../../lib/agency'
import AgencyLogo from '../../components/AgencyLogo.jsx'

// "a1", "A 1", "A-001" -> "A-001"
const normalize = (v = '') => {
  const m = v.toUpperCase().replace(/\s+/g, '').match(/^([A-Z]{1,3})-?(\d{1,4})$/)
  return m ? `${m[1]}-${m[2].padStart(3, '0')}` : v.toUpperCase().trim()
}

export default function Track() {
  const { code: param } = useParams()
  const nav = useNavigate()
  const { tickets, services, counters, agencies, loading } = useQueue()
  const [input, setInput] = useState(() => {
    if (param) return param
    try { return localStorage.getItem('myTicket') || '' } catch { return '' }
  })

  const code = param ? normalize(param) : ''
  const t = code ? tickets.find((x) => x.code === code) : null
  const svc = t && services.find((x) => x.id === t.service_id)
  const counter = t?.counter_id && counters.find((c) => c.id === t.counter_id)
  const ahead = t ? waitingAhead(t, tickets) : 0
  const nowServing = t
    ? tickets.filter((x) => x.service_id === t.service_id && ['called', 'serving'].includes(x.status)).at(-1)
    : null

  const message = !t ? '' : {
    waiting: `Menunggu giliran. Ada ${ahead} nomor di depan Anda.`,
    called: `Nomor Anda dipanggil. Silakan menuju ${counter?.name || 'loket'}.`,
    serving: `Sedang dilayani di ${counter?.name || 'loket'}.`,
    done: 'Layanan selesai. Terima kasih.',
    skipped: 'Nomor Anda terlewat karena tidak hadir saat dipanggil. Ambil nomor baru atau tanyakan ke petugas.',
    cancelled: 'Nomor ini dibatalkan.',
  }[t.status]

  return (
    <div className="container">
      <div className="page stack">
        <div className="page-head"><h2>Cek status antrian</h2><p>Masukkan nomor antrian Anda, misalnya A-012. Halaman ini diperbarui otomatis.</p></div>
        <form className="row" onSubmit={(e) => { e.preventDefault(); if (input.trim()) nav(`/status/${normalize(input)}`) }}>
          <input style={{ flex: 1, minWidth: 160 }} value={input} onChange={(e) => setInput(e.target.value)} placeholder="Nomor antrian" aria-label="Nomor antrian" />
          <button className="btn btn-primary">Cek</button>
        </form>

        {code && !loading && !t && (
          <div className="alert err">Nomor {code} tidak ditemukan di antrian hari ini. Periksa kembali nomornya.</div>
        )}

        {t && (
          <div className="card stack" aria-live="polite">
            <div className="row" style={{ flexWrap: 'nowrap' }}>
              <AgencyLogo agency={agencyOf(svc, agencies)} size={44} />
              <div style={{ flex: 1 }}>
                <b>{agencyOf(svc, agencies).name}</b><br />
                <span className="muted">{svc?.name}</span>
              </div>
              <span className={`badge badge-${t.status}`}>{STATUS[t.status]}</span>
            </div>
            <div className="ticket-code" style={{ textAlign: 'center' }}>{t.code}</div>
            <p style={{ textAlign: 'center', fontWeight: 600 }}>{message}</p>
            <div className="ticket-bottom">
              <div><b>{nowServing ? nowServing.code : '—'}</b><small>sedang dipanggil</small></div>
              <div><b>{t.status === 'waiting' && svc ? `±${ahead * svc.est_minutes}` : '–'}</b><small>menit perkiraan</small></div>
            </div>
            <p className="muted" style={{ textAlign: 'center' }}>Diambil pukul {fmtTime(t.created_at)}</p>
          </div>
        )}
        <p className="muted">Belum punya nomor? <Link to="/antrian">Ambil antrian online</Link>.</p>
      </div>
    </div>
  )
}
