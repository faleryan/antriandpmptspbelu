import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSettings } from '../context/Settings.jsx'
import { useQueue } from '../hooks/useQueue'
import { agencyOf, groupServices } from '../lib/agency'
import { Brand } from '../components/PublicLayout.jsx'
import TicketView from '../components/TicketView.jsx'
import AgencyLogo from '../components/AgencyLogo.jsx'
import { fmtDateTime, waitingAhead } from '../lib/util'

const IDLE_MS = 45000 // kembali ke layar awal bila dibiarkan

// Kiosk antrian offline: pilih instansi → pilih layanan → tiket tercetak.
export default function Kiosk() {
  const { settings: s } = useSettings()
  const { tickets, services, agencies } = useQueue()
  const [agencyId, setAgencyId] = useState('')
  const [ticket, setTicket] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const timer = useRef()

  // Kelas body dipakai CSS cetak agar hanya karcis yang tercetak di halaman ini.
  useEffect(() => {
    document.body.classList.add('kiosk-mode')
    return () => { document.body.classList.remove('kiosk-mode'); clearTimeout(timer.current) }
  }, [])

  const groups = groupServices(agencies, services)
  const single = groups.length === 1
  const group = single ? groups[0] : groups.find((g) => g.agency.id === agencyId)

  const resetLater = (ms) => { clearTimeout(timer.current); timer.current = setTimeout(reset, ms) }
  const reset = () => { clearTimeout(timer.current); setTicket(null); setAgencyId(''); setErr('') }

  const pickAgency = (id) => { setAgencyId(id); setErr(''); resetLater(IDLE_MS) }

  const take = async (svc) => {
    setBusy(true); setErr('')
    const { data, error } = await supabase.rpc('take_ticket', {
      p_service_id: svc.id, p_name: null, p_phone: null, p_source: 'offline',
    })
    setBusy(false)
    if (error) return setErr(error.message)
    setTicket({ ...data, svc, agency: agencyOf(svc, agencies) })
    setTimeout(() => window.print(), 400)
    resetLater(15000)
  }

  const waitingOf = (id) => tickets.filter((t) => t.service_id === id && t.status === 'waiting').length
  const ahead = ticket ? waitingAhead(ticket, tickets) : 0
  const ghost = { color: '#fff', borderColor: '#3b536a' }

  return (
    <div className="kiosk">
      <div className="kiosk-head">
        <Brand settings={s} light />
        <Link className="btn btn-ghost" style={ghost} to="/buku-tamu?src=offline">Isi buku tamu</Link>
      </div>

      {ticket ? (
        <div className="kiosk-done">
          <h1>Silakan ambil tiket Anda</h1>
          <TicketView ticket={ticket} service={ticket.svc} agency={ticket.agency} tickets={tickets} showLink={false} />
          <p style={{ color: '#9fb4c6' }}>Tunggu hingga nomor Anda dipanggil di layar.</p>
          <div className="row">
            <button className="btn btn-ghost" style={ghost} onClick={() => window.print()}>Cetak ulang</button>
            <button className="btn btn-amber" onClick={reset}>Selesai</button>
          </div>
          <div className="print-area">
            {ticket.agency.logo_url && <img className="pa-logo" src={ticket.agency.logo_url} alt="" />}
            <h4>{ticket.agency.name}</h4>
            <p>{ticket.svc.name}</p>
            <hr />
            <div className="pa-code">{ticket.code}</div>
            <hr />
            <p>{s.org_name}</p>
            <p>{fmtDateTime(ticket.created_at)}</p>
            <p>Menunggu di depan Anda: {ahead} nomor</p>
            <p>Terima kasih atas kesabaran Anda</p>
          </div>
        </div>
      ) : !group ? (
        <>
          <h1>Pilih instansi tujuan Anda</h1>
          {err && <div className="alert err">{err}</div>}
          <div className="kiosk-grid">
            {groups.map(({ agency, services: list }) => (
              <button key={agency.id} className="kiosk-btn kiosk-ag" onClick={() => pickAgency(agency.id)}>
                <AgencyLogo agency={agency} size={96} />
                <h2>{agency.name}</h2>
                <span>{list.length} layanan · {list.reduce((n, x) => n + waitingOf(x.id), 0)} menunggu</span>
              </button>
            ))}
            {groups.length === 0 && <p style={{ color: '#9fb4c6' }}>Belum ada layanan aktif.</p>}
          </div>
        </>
      ) : (
        <>
          <div className="kiosk-ag-head">
            {!single && <button className="btn btn-ghost btn-lg" style={ghost} onClick={reset}>← Kembali</button>}
            <AgencyLogo agency={group.agency} size={72} />
            <div><h1>{group.agency.name}</h1><span style={{ color: '#9fb4c6' }}>Pilih jenis layanan untuk mengambil nomor</span></div>
          </div>
          {err && <div className="alert err">{err}</div>}
          <div className="kiosk-grid">
            {group.services.map((x) => (
              <button key={x.id} className="kiosk-btn" disabled={busy} onClick={() => take(x)}>
                <span className="svc-code">{x.code}</span>
                <h2>{x.name}</h2>
                <span>{waitingOf(x.id)} menunggu · ±{x.est_minutes} menit/orang</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
