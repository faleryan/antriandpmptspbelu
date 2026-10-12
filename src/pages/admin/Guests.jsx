import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { downloadCsv, fmtDateTime, todayStr } from '../../lib/util'

export default function Guests() {
  const [rows, setRows] = useState([])
  const [from, setFrom] = useState(todayStr())
  const [to, setTo] = useState(todayStr())
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    let query = supabase.from('guests').select('*, tickets(code)').order('created_at', { ascending: false }).limit(1000)
    if (from) query = query.gte('created_at', new Date(from + 'T00:00:00+08:00').toISOString())
    if (to) query = query.lte('created_at', new Date(to + 'T23:59:59+08:00').toISOString())
    const { data } = await query
    setRows(data || [])
    setLoading(false)
  }, [from, to])
  useEffect(() => { load() }, [load])

  const shown = rows.filter((r) => {
    const t = q.trim().toLowerCase()
    return !t || [r.visitor_name, r.institution, r.purpose, r.meet_with, r.phone].some((x) => (x || '').toLowerCase().includes(t))
  })
  const codeOf = (r) => (Array.isArray(r.tickets) ? r.tickets[0]?.code : r.tickets?.code) || ''

  const del = async (r) => {
    if (!confirm(`Hapus catatan ${r.visitor_name}?`)) return
    const { error } = await supabase.from('guests').delete().eq('id', r.id)
    if (error) alert(error.message)
    load()
  }
  const exportCsv = () => downloadCsv(`buku-tamu-${from || 'awal'}_${to || 'akhir'}.csv`, [
    ['Waktu', 'Nama', 'Instansi', 'Telepon', 'Keperluan', 'Bertemu', 'Sumber', 'Nomor antrian'],
    ...shown.map((r) => [fmtDateTime(r.created_at), r.visitor_name, r.institution, r.phone, r.purpose, r.meet_with, r.source, codeOf(r)]),
  ])

  return (
    <>
      <header><h1 style={{ fontSize: '2.4rem' }}>Buku tamu</h1><p>Catatan kunjungan dari formulir online dan kiosk.</p></header>
      <div className="row panel">
        <label className="field" style={{ width: 170 }}>Dari<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="field" style={{ width: 170 }}>Sampai<input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        <label className="field" style={{ flex: 1, minWidth: 200 }}>Cari<input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nama, instansi, keperluan…" /></label>
        <button className="btn btn-ghost" style={{ alignSelf: 'end' }} onClick={exportCsv} disabled={!shown.length}>Unduh CSV</button>
      </div>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th>Waktu</th><th>Nama</th><th>Instansi</th><th>Keperluan</th><th>Bertemu</th><th>Antrian</th><th /></tr></thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="muted">Memuat…</td></tr>}
            {!loading && shown.length === 0 && <tr><td colSpan={7} className="muted">Tidak ada catatan pada rentang ini.</td></tr>}
            {shown.map((r) => (
              <tr key={r.id}>
                <td style={{ whiteSpace: 'nowrap' }}>{fmtDateTime(r.created_at)}</td>
                <td><b>{r.visitor_name}</b><br /><small className="muted">{r.phone}</small></td>
                <td>{r.institution}</td>
                <td>{r.purpose}</td>
                <td>{r.meet_with}</td>
                <td>{codeOf(r) && <><b>{codeOf(r)}</b> <span className={`badge badge-${r.source}`}>{r.source}</span></>}</td>
                <td><button className="btn btn-sm btn-danger-ghost" onClick={() => del(r)}>Hapus</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted" style={{ marginTop: 10 }}>{shown.length} catatan</p>
    </>
  )
}
