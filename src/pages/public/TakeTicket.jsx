import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useSettings } from '../../context/Settings.jsx'
import { useQueue } from '../../hooks/useQueue'
import { agencyOf, groupServices } from '../../lib/agency'
import TicketView from '../../components/TicketView.jsx'
import AgencyLogo from '../../components/AgencyLogo.jsx'

// Alur: pilih instansi → pilih layanan & isi nama → nomor antrian.
export default function TakeTicket() {
  const { settings: s } = useSettings()
  const { tickets, services, agencies, loading } = useQueue()
  const [agencyId, setAgencyId] = useState('')
  const [sid, setSid] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [ticket, setTicket] = useState(null)

  const groups = groupServices(agencies, services)
  const single = groups.length === 1
  const group = single ? groups[0] : groups.find((g) => g.agency.id === agencyId)
  const waitingOf = (id) => tickets.filter((t) => t.service_id === id && t.status === 'waiting').length
  const chosen = group && (sid && group.services.some((x) => x.id === sid) ? sid : group.services[0]?.id)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setErr('')
    const { data, error } = await supabase.rpc('take_ticket', {
      p_service_id: chosen, p_name: name, p_phone: phone, p_source: 'online',
    })
    setBusy(false)
    if (error) return setErr(error.message)
    try { localStorage.setItem('myTicket', data.code) } catch { /* abaikan */ }
    setTicket(data)
  }
  const restart = () => { setTicket(null); setAgencyId(''); setSid(''); setName(''); setPhone('') }

  if (ticket) {
    const svc = services.find((x) => x.id === ticket.service_id)
    return (
      <div className="container">
        <div className="page stack">
          <div className="page-head"><h2>Nomor antrian Anda</h2><p>Simpan halaman ini atau catat nomornya. Datanglah mendekati giliran Anda.</p></div>
          <TicketView ticket={ticket} service={svc} agency={agencyOf(svc, agencies)} tickets={tickets} />
          <div className="row" style={{ justifyContent: 'center' }}>
            <button className="btn btn-ghost" onClick={restart}>Ambil nomor lain</button>
            <Link className="btn btn-ghost" to="/buku-tamu">Isi buku tamu</Link>
          </div>
        </div>
      </div>
    )
  }

  const closed = !s.online_queue_open

  // Langkah 1 — pilih instansi
  if (!group) {
    return (
      <div className="container">
        <div className="page wide stack">
          <div className="page-head"><h2>Ambil antrian online</h2><p>Pilih instansi tujuan Anda terlebih dahulu.</p></div>
          {closed && <div className="alert err">Antrian online sedang ditutup. Silakan ambil nomor langsung di kiosk loket.</div>}
          {!loading && groups.length === 0 && <div className="card muted">Belum ada layanan yang dibuka.</div>}
          <div className="ag-grid">
            {groups.map(({ agency, services: list }) => (
              <button key={agency.id} type="button" className="ag-card" disabled={closed} onClick={() => { setAgencyId(agency.id); setSid(list[0]?.id || '') }}>
                <AgencyLogo agency={agency} size={72} />
                <span className="ag-card-name">{agency.name}</span>
                <span className="muted">{list.length} layanan · {list.reduce((n, x) => n + waitingOf(x.id), 0)} menunggu</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Langkah 2 — pilih layanan dan isi data
  return (
    <div className="container">
      <form className="page stack" onSubmit={submit}>
        {!single && <button type="button" className="link-back" onClick={() => { setAgencyId(''); setErr('') }}>← Pilih instansi lain</button>}
        <div className="ag-head">
          <AgencyLogo agency={group.agency} size={56} />
          <div><h2>{group.agency.name}</h2><p className="muted">Pilih jenis layanan, lalu isi nama Anda.</p></div>
        </div>

        {closed && <div className="alert err">Antrian online sedang ditutup. Silakan ambil nomor langsung di kiosk loket.</div>}
        {err && <div className="alert err">{err}</div>}

        <fieldset className="svc-pick" style={{ border: 0, padding: 0, margin: 0 }} disabled={closed}>
          <legend style={{ fontWeight: 600, fontSize: '.9rem', marginBottom: 8 }}>Jenis layanan</legend>
          {group.services.map((x) => (
            <label key={x.id}>
              <input type="radio" name="svc" value={x.id} checked={chosen === x.id} onChange={() => setSid(x.id)} />
              <span className="svc-code">{x.code}</span>
              <span style={{ flex: 1 }}>
                <b>{x.name}</b><br />
                <small className="muted">{x.description ? `${x.description} · ` : ''}{waitingOf(x.id)} menunggu · ±{x.est_minutes} menit/orang</small>
              </span>
            </label>
          ))}
        </fieldset>

        <label className="field">Nama
          <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} placeholder="Nama lengkap" />
        </label>
        <label className="field">Nomor telepon <small>opsional, untuk informasi bila ada perubahan</small>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" maxLength={40} placeholder="08xxxxxxxxxx" />
        </label>
        <button className="btn btn-primary btn-lg" disabled={busy || !chosen || closed}>
          {busy ? 'Memproses…' : 'Ambil nomor'}
        </button>
        <p className="muted">Ingin sekalian mengisi buku tamu? Gunakan <Link to="/buku-tamu">formulir buku tamu</Link> — nomor antrian dibuat otomatis.</p>
      </form>
    </div>
  )
}
