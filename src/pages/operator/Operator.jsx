import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/Auth.jsx'
import { useSettings } from '../../context/Settings.jsx'
import { useQueue } from '../../hooks/useQueue'
import { STATUS, visitorOf, minsAgo, minutesBetween, avg, fmtTime } from '../../lib/util'
import { agencyOf, groupServices } from '../../lib/agency'
import AgencyLogo from '../../components/AgencyLogo.jsx'

export default function Operator() {
  const { profile, role, signOut } = useAuth()
  const { settings: s } = useSettings()
  const { tickets, services, counters, agencies, loading, reload } = useQueue({ staff: true })
  const [counterId, setCounterId] = useState(() => { try { return localStorage.getItem('counterId') || '' } catch { return '' } })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [walk, setWalk] = useState({ sid: '', name: '' })

  const activeCounters = counters.filter((c) => c.active)
  const activeServices = services.filter((x) => x.active)
  const groups = groupServices(agencies, services)

  useEffect(() => {
    if (loading) return
    if (!counterId || !activeCounters.find((c) => c.id === counterId)) {
      const pick = activeCounters.find((c) => c.id === profile?.counter_id) || activeCounters[0]
      if (pick) setCounterId(pick.id)
    }
  }, [loading, counters.length])
  useEffect(() => { try { localStorage.setItem('counterId', counterId) } catch { /* abaikan */ } }, [counterId])
  useEffect(() => { if (!walk.sid && activeServices[0]) setWalk((w) => ({ ...w, sid: activeServices[0].id })) }, [activeServices.length])

  const notify = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3500) }
  const counter = counters.find((c) => c.id === counterId)
  const mine = tickets.find((t) => t.counter_id === counterId && ['called', 'serving'].includes(t.status))
  const mySvc = mine && services.find((x) => x.id === mine.service_id)
  const svcOf = (id) => services.find((x) => x.id === id)
  const svcName = (id) => svcOf(id)?.name || ''
  const agName = (id) => agencies.find((a) => a.id === id)?.short_name || agencies.find((a) => a.id === id)?.name || ''
  const servesTicket = (t) => {
    if (!counter) return true
    if (counter.service_id) return t.service_id === counter.service_id
    if (counter.agency_id) return svcOf(t.service_id)?.agency_id === counter.agency_id
    return true
  }
  const waiting = tickets.filter((t) => t.status === 'waiting' && servesTicket(t))
  const counterLabel = (c) => c.service_id ? svcName(c.service_id) : c.agency_id ? `semua layanan ${agName(c.agency_id)}` : 'semua layanan'
  const myAgency = counter?.agency_id ? agencies.find((a) => a.id === counter.agency_id) : null

  const total = tickets.length
  const waitingAll = tickets.filter((t) => t.status === 'waiting').length
  const done = tickets.filter((t) => t.status === 'done').length
  const avgWait = avg(tickets.map((t) => minutesBetween(t.created_at, t.called_at)))
  const avgServe = avg(tickets.filter((t) => t.status === 'done').map((t) => minutesBetween(t.started_at || t.called_at, t.finished_at)))

  const run = async (fn) => {
    setBusy(true)
    try { await fn() } catch (e) { notify(e.message || String(e)) }
    await reload()
    setBusy(false)
  }
  const upd = async (id, patch) => {
    const { error } = await supabase.from('tickets').update(patch).eq('id', id)
    if (error) throw error
  }
  const nowIso = () => new Date().toISOString()

  const callNext = () => run(async () => {
    const { data, error } = await supabase.rpc('call_next', { p_counter_id: counterId })
    if (error) throw error
    if (!data?.id) notify('Tidak ada antrian yang menunggu')
  })
  const recall = () => run(() => upd(mine.id, { call_count: mine.call_count + 1, called_at: nowIso() }))
  const start = () => run(() => upd(mine.id, { status: 'serving', started_at: nowIso() }))
  const finish = () => run(() => upd(mine.id, { status: 'done', finished_at: nowIso() }))
  const skip = () => run(() => upd(mine.id, { status: 'skipped', finished_at: nowIso() }))
  const callSpecific = (t) => run(async () => {
    if (mine) throw new Error('Selesaikan atau lewati nomor yang sedang aktif terlebih dahulu.')
    await upd(t.id, { status: 'called', counter_id: counterId, called_at: nowIso(), call_count: 1 })
  })
  const cancel = (t) => {
    if (!confirm(`Batalkan nomor ${t.code}?`)) return
    run(() => upd(t.id, { status: 'cancelled', finished_at: nowIso() }))
  }
  const addWalkin = (e) => {
    e.preventDefault()
    run(async () => {
      const { data, error } = await supabase.rpc('take_ticket', { p_service_id: walk.sid, p_name: walk.name, p_phone: '', p_source: 'offline' })
      if (error) throw error
      setWalk({ ...walk, name: '' })
      notify(`Nomor ${data.code} dibuat`)
    })
  }

  const v = mine ? visitorOf(mine) : {}

  return (
    <div className="op">
      <div className="op-bar">
        <b style={{ fontFamily: 'var(--display)', fontSize: '1.4rem' }}>{s.org_name}</b>
        <span className="muted" style={{ color: '#9fb4c6' }}>Operator: {profile?.full_name || profile?.email}</span>
        <span className="spacer" />
        <label className="row" style={{ gap: 6 }}>
          <span style={{ color: '#9fb4c6' }}>Loket</span>
          <select value={counterId} onChange={(e) => setCounterId(e.target.value)} aria-label="Pilih loket">
            {activeCounters.map((c) => <option key={c.id} value={c.id}>{c.name} · {counterLabel(c)}</option>)}
          </select>
        </label>
        <Link className="btn btn-sm btn-ghost" to="/display" target="_blank">Layar antrian</Link>
        {role === 'admin' && <Link className="btn btn-sm btn-ghost" to="/admin">Dashboard admin</Link>}
        <button className="btn btn-sm btn-ghost" onClick={signOut}>Keluar</button>
      </div>

      <div className="op-body">
        <div className="stack">
          <div className="card op-current" aria-live="polite">
            <div className="row" style={{ justifyContent: 'center' }}>
              {(mine || myAgency) && <AgencyLogo agency={mine ? agencyOf(mySvc, agencies) : myAgency} size={36} />}
              <span className="muted">{counter ? `${counter.name} · ${counterLabel(counter)}` : 'Pilih loket terlebih dahulu'}</span>
            </div>
            <div className={'op-code' + (mine ? '' : ' idle')}>{mine ? mine.code : '—'}</div>
            {mine ? (
              <>
                <div className="row" style={{ justifyContent: 'center' }}>
                  <span className={`badge badge-${mine.status}`}>{STATUS[mine.status]}</span>
                  <span className="muted">{mySvc?.name} · dipanggil {fmtTime(mine.called_at)}{mine.call_count > 1 ? ` (${mine.call_count}×)` : ''}</span>
                </div>
                {(v.visitor_name || v.phone) && <p><b>{v.visitor_name || 'Tanpa nama'}</b>{v.phone ? ` · ${v.phone}` : ''}</p>}
                <div className="op-actions">
                  {mine.status === 'called' ? (
                    <>
                      <button className="btn btn-ghost" disabled={busy} onClick={recall}>Panggil ulang</button>
                      <button className="btn btn-primary" disabled={busy} onClick={start}>Mulai layani</button>
                      <button className="btn btn-ghost" disabled={busy} onClick={skip}>Tidak hadir (lewati)</button>
                      <button className="btn btn-amber" disabled={busy} onClick={callNext}>Lewati & panggil berikutnya</button>
                    </>
                  ) : (
                    <>
                      <button className="btn btn-primary" disabled={busy} onClick={finish}>Selesai</button>
                      <button className="btn btn-amber" disabled={busy} onClick={callNext}>Selesai & panggil berikutnya</button>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="op-actions">
                <button className="btn btn-amber btn-lg wide" disabled={busy || !counterId || waiting.length === 0} onClick={callNext}>
                  {waiting.length ? `Panggil berikutnya (${waiting.length} menunggu)` : 'Tidak ada antrian menunggu'}
                </button>
              </div>
            )}
          </div>

          <div className="stats">
            <div className="stat"><b>{total}</b><span>nomor hari ini</span></div>
            <div className="stat"><b>{waitingAll}</b><span>menunggu</span></div>
            <div className="stat"><b>{done}</b><span>selesai</span></div>
            <div className="stat"><b>{avgWait != null ? Math.round(avgWait) : '–'}</b><span>menit rata-rata tunggu</span></div>
            <div className="stat"><b>{avgServe != null ? Math.round(avgServe) : '–'}</b><span>menit rata-rata layanan</span></div>
          </div>

          <form className="card stack" onSubmit={addWalkin}>
            <h3>Tambah nomor untuk tamu langsung</h3>
            <div className="row">
              <select style={{ flex: 1, minWidth: 140 }} value={walk.sid} onChange={(e) => setWalk({ ...walk, sid: e.target.value })} aria-label="Layanan">
                {groups.map((g) => (
                  <optgroup key={g.agency.id} label={g.agency.name}>
                    {g.services.map((x) => <option key={x.id} value={x.id}>{x.code} — {x.name}</option>)}
                  </optgroup>
                ))}
              </select>
              <input style={{ flex: 1, minWidth: 140 }} value={walk.name} onChange={(e) => setWalk({ ...walk, name: e.target.value })} placeholder="Nama (opsional)" aria-label="Nama tamu" />
              <button className="btn btn-primary" disabled={busy || !walk.sid}>Buat nomor</button>
            </div>
          </form>
        </div>

        <div className="card stack">
          <div className="row"><h3>Antrian menunggu</h3><span className="spacer" /><span className="muted">{waiting.length} nomor</span></div>
          <div className="queue-list">
            {waiting.length === 0 && <p className="muted">Tidak ada nomor yang menunggu.</p>}
            {waiting.map((t) => {
              const vv = visitorOf(t)
              return (
                <div className="queue-item" key={t.id}>
                  <span className="qc">{t.code}</span>
                  <div>
                    <b>{vv.visitor_name || 'Tanpa nama'}</b>
                    <small>{agencyOf(svcOf(t.service_id), agencies).short_name || agencyOf(svcOf(t.service_id), agencies).name} · {svcName(t.service_id)} · {minsAgo(t.created_at)} menit lalu · <span className={`badge badge-${t.source}`}>{t.source}</span></small>
                  </div>
                  <div className="row" style={{ gap: 4 }}>
                    <button className="btn btn-sm btn-ghost" disabled={busy || !!mine || !counterId} onClick={() => callSpecific(t)}>Panggil</button>
                    <button className="btn btn-sm btn-danger-ghost" disabled={busy} onClick={() => cancel(t)}>Batal</button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
      {msg && <div className="toast" role="status">{msg}</div>}
    </div>
  )
}
