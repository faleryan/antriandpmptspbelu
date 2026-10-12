import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useQueue } from '../../hooks/useQueue'
import { TZ, avg, minutesBetween } from '../../lib/util'

const dayKey = (offset) => {
  const d = new Date(Date.now() - offset * 86400000)
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d)
}

export default function Overview() {
  const { tickets, services } = useQueue()
  const [week, setWeek] = useState([])
  const [guestsToday, setGuestsToday] = useState(null)

  useEffect(() => {
    const from = dayKey(6)
    supabase.from('tickets').select('queue_date').gte('queue_date', from).limit(5000)
      .then(({ data }) => setWeek(data || []))
    supabase.from('guests').select('id', { count: 'exact', head: true }).gte('created_at', new Date(dayKey(0) + 'T00:00:00+08:00').toISOString())
      .then(({ count }) => setGuestsToday(count))
  }, [])

  const days = [6, 5, 4, 3, 2, 1, 0].map((o) => dayKey(o))
  const perDay = days.map((d) => week.filter((t) => t.queue_date === d).length)
  const max = Math.max(1, ...perDay)

  const online = tickets.filter((t) => t.source === 'online').length
  const offline = tickets.filter((t) => t.source === 'offline').length
  const waiting = tickets.filter((t) => t.status === 'waiting').length
  const done = tickets.filter((t) => t.status === 'done').length
  const skipped = tickets.filter((t) => t.status === 'skipped').length
  const avgWait = avg(tickets.map((t) => minutesBetween(t.created_at, t.called_at)))

  return (
    <>
      <header><h1 style={{ fontSize: '2.4rem' }}>Ringkasan hari ini</h1><p>Data antrian diperbarui otomatis.</p></header>

      <div className="stats panel">
        <div className="stat"><b>{tickets.length}</b><span>nomor diambil</span></div>
        <div className="stat"><b>{online} / {offline}</b><span>online / offline</span></div>
        <div className="stat"><b>{waiting}</b><span>menunggu</span></div>
        <div className="stat"><b>{done}</b><span>selesai</span></div>
        <div className="stat"><b>{skipped}</b><span>dilewati</span></div>
        <div className="stat"><b>{avgWait != null ? Math.round(avgWait) : '–'}</b><span>menit rata-rata tunggu</span></div>
        <div className="stat"><b>{guestsToday ?? '–'}</b><span>tamu hari ini</span></div>
      </div>

      <div className="panel card">
        <h3>Nomor antrian 7 hari terakhir</h3>
        <div className="bars" role="img" aria-label={`Jumlah nomor per hari: ${perDay.join(', ')}`}>
          {days.map((d, i) => (
            <div className="bar" key={d}>
              <b>{perDay[i]}</b>
              <i style={{ height: `${(perDay[i] / max) * 100}%` }} />
              <span>{new Date(d + 'T12:00:00').toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' })}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <h3>Per layanan hari ini</h3>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>Layanan</th><th>Diambil</th><th>Menunggu</th><th>Selesai</th></tr></thead>
            <tbody>
              {services.map((x) => {
                const ts = tickets.filter((t) => t.service_id === x.id)
                return (
                  <tr key={x.id}>
                    <td><b>{x.code}</b> — {x.name}{!x.active && <span className="badge" style={{ marginLeft: 8 }}>nonaktif</span>}</td>
                    <td>{ts.length}</td>
                    <td>{ts.filter((t) => t.status === 'waiting').length}</td>
                    <td>{ts.filter((t) => t.status === 'done').length}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <h3>Pintasan</h3>
        <div className="row">
          <Link className="btn btn-primary" to="/admin/pengaturan">Atur tampilan situs publik</Link>
          <Link className="btn btn-ghost" to="/admin/media">Kelola media promosi</Link>
          <Link className="btn btn-ghost" to="/admin/berita">Tulis berita</Link>
        </div>
      </div>
    </>
  )
}
