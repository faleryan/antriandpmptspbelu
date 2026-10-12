import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useSettings } from '../../context/Settings.jsx'
import { useQueue } from '../../hooks/useQueue'
import TicketView from '../../components/TicketView.jsx'

const EMPTY = { name: '', institution: '', phone: '', purpose: '', meet_with: '' }

export default function GuestBook() {
  const { settings: s } = useSettings()
  const { tickets, services } = useQueue()
  const [params] = useSearchParams()
  const source = params.get('src') === 'offline' ? 'offline' : 'online'
  const [f, setF] = useState(EMPTY)
  const [wantTicket, setWantTicket] = useState(true)
  const [sid, setSid] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [result, setResult] = useState(null)

  const active = services.filter((x) => x.active)
  useEffect(() => { if (!sid && active[0]) setSid(active[0].id) }, [active.length])
  const canTicket = (source === 'offline' || s.online_queue_open) && active.length > 0
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setErr('')
    const { data, error } = await supabase.rpc('submit_guest', {
      p_name: f.name, p_institution: f.institution, p_phone: f.phone, p_purpose: f.purpose, p_meet_with: f.meet_with,
      p_service_id: wantTicket && canTicket ? sid : null, p_source: source,
    })
    setBusy(false)
    if (error) return setErr(error.message)
    if (data?.ticket?.code) { try { localStorage.setItem('myTicket', data.ticket.code) } catch { /* abaikan */ } }
    setResult(data)
  }

  if (result) {
    const t = result.ticket
    return (
      <div className="container">
        <div className="page stack">
          <div className="page-head"><h2>Terima kasih, {f.name.split(' ')[0]}</h2><p>Kunjungan Anda sudah tercatat di buku tamu.</p></div>
          {t && <TicketView ticket={t} service={services.find((x) => x.id === t.service_id)} tickets={tickets} />}
          <div className="row" style={{ justifyContent: 'center' }}>
            <button className="btn btn-ghost" onClick={() => { setResult(null); setF(EMPTY) }}>Isi untuk tamu lain</button>
            <Link className="btn btn-ghost" to="/">Ke beranda</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <form className="page stack" onSubmit={submit}>
        <div className="page-head"><h2>Buku tamu</h2><p>Catat kunjungan Anda. Nomor antrian bisa dibuat sekaligus dari formulir ini.</p></div>
        {err && <div className="alert err">{err}</div>}
        <label className="field">Nama lengkap
          <input value={f.name} onChange={set('name')} required maxLength={120} autoComplete="name" />
        </label>
        <label className="field">Instansi / alamat <small>opsional</small>
          <input value={f.institution} onChange={set('institution')} maxLength={160} />
        </label>
        <label className="field">Nomor telepon <small>opsional</small>
          <input value={f.phone} onChange={set('phone')} inputMode="tel" maxLength={40} autoComplete="tel" />
        </label>
        <label className="field">Keperluan
          <textarea value={f.purpose} onChange={set('purpose')} required maxLength={500} rows={3} placeholder="Contoh: mengurus dokumen, konsultasi, audiensi" />
        </label>
        <label className="field">Ingin bertemu <small>opsional</small>
          <input value={f.meet_with} onChange={set('meet_with')} maxLength={120} placeholder="Nama petugas atau bagian" />
        </label>

        {canTicket ? (
          <div className="card stack">
            <label className="row" style={{ fontWeight: 600 }}>
              <input type="checkbox" checked={wantTicket} onChange={(e) => setWantTicket(e.target.checked)} />
              Sekalian ambil nomor antrian
            </label>
            {wantTicket && (
              <select value={sid} onChange={(e) => setSid(e.target.value)} aria-label="Layanan">
                {active.map((x) => <option key={x.id} value={x.id}>{x.code} — {x.name}</option>)}
              </select>
            )}
          </div>
        ) : (
          <div className="alert info">Pembuatan nomor antrian dari buku tamu sedang tidak tersedia.</div>
        )}
        <button className="btn btn-primary btn-lg" disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan kunjungan'}</button>
      </form>
    </div>
  )
}
