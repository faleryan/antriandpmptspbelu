import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useSettings } from '../../context/Settings.jsx'
import { useQueue } from '../../hooks/useQueue'
import TicketView from '../../components/TicketView.jsx'

export default function TakeTicket() {
  const { settings: s } = useSettings()
  const { tickets, services } = useQueue()
  const [sid, setSid] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [ticket, setTicket] = useState(null)

  const active = services.filter((x) => x.active)
  useEffect(() => { if (!sid && active[0]) setSid(active[0].id) }, [active.length])

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setErr('')
    const { data, error } = await supabase.rpc('take_ticket', {
      p_service_id: sid, p_name: name, p_phone: phone, p_source: 'online',
    })
    setBusy(false)
    if (error) return setErr(error.message)
    try { localStorage.setItem('myTicket', data.code) } catch { /* abaikan */ }
    setTicket(data)
  }

  if (ticket) {
    const svc = services.find((x) => x.id === ticket.service_id)
    return (
      <div className="container">
        <div className="page stack">
          <div className="page-head"><h2>Nomor antrian Anda</h2><p>Simpan halaman ini atau catat nomornya. Datanglah mendekati giliran Anda.</p></div>
          <TicketView ticket={ticket} service={svc} tickets={tickets} />
          <div className="row" style={{ justifyContent: 'center' }}>
            <button className="btn btn-ghost" onClick={() => { setTicket(null); setName(''); setPhone('') }}>Ambil nomor lain</button>
            <Link className="btn btn-ghost" to="/buku-tamu">Isi buku tamu</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <form className="page stack" onSubmit={submit}>
        <div className="page-head"><h2>Ambil antrian online</h2><p>Pilih layanan, isi nama, lalu dapatkan nomor tanpa perlu datang lebih awal.</p></div>

        {!s.online_queue_open && <div className="alert err">Antrian online sedang ditutup. Silakan ambil nomor langsung di kiosk loket.</div>}
        {err && <div className="alert err">{err}</div>}

        <fieldset className="svc-pick" style={{ border: 0, padding: 0, margin: 0 }} disabled={!s.online_queue_open}>
          <legend style={{ fontWeight: 600, fontSize: '.9rem', marginBottom: 8 }}>Layanan</legend>
          {active.map((x) => {
            const w = tickets.filter((t) => t.service_id === x.id && t.status === 'waiting').length
            return (
              <label key={x.id}>
                <input type="radio" name="svc" value={x.id} checked={sid === x.id} onChange={() => setSid(x.id)} />
                <span className="svc-code">{x.code}</span>
                <span style={{ flex: 1 }}><b>{x.name}</b><br /><small className="muted">{w} menunggu · ±{x.est_minutes} menit/orang</small></span>
              </label>
            )
          })}
          {active.length === 0 && <p className="muted">Belum ada layanan aktif.</p>}
        </fieldset>

        <label className="field">Nama
          <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} placeholder="Nama lengkap" />
        </label>
        <label className="field">Nomor telepon <small>opsional, untuk informasi bila ada perubahan</small>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" maxLength={40} placeholder="08xxxxxxxxxx" />
        </label>
        <button className="btn btn-primary btn-lg" disabled={busy || !sid || !s.online_queue_open}>{busy ? 'Memproses…' : 'Ambil nomor'}</button>
        <p className="muted">Ingin sekalian mengisi buku tamu? Gunakan <Link to="/buku-tamu">formulir buku tamu</Link> — nomor antrian dibuat otomatis.</p>
      </form>
    </div>
  )
}
