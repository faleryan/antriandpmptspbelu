import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useSettings } from '../../context/Settings.jsx'
import { groupServices } from '../../lib/agency'
import { downloadCsv, fmtDateTime, todayStr } from '../../lib/util'
import AgencyLogo from '../../components/AgencyLogo.jsx'

const PERIODS = [
  ['day', 'Harian'],
  ['month', 'Bulanan'],
  ['quarter', 'Triwulan'],
  ['year', 'Tahunan'],
]
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const MONTHS_LONG = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const QUARTERS = ['Triwulan I', 'Triwulan II', 'Triwulan III', 'Triwulan IV']
const METRICS = [
  ['total', 'Nomor diambil'],
  ['done', 'Selesai dilayani'],
]
const pad = (n) => String(n).padStart(2, '0')
const num = (v) => Number(v || 0)
const fmt1 = (v) => (v == null ? '–' : v.toLocaleString('id-ID', { maximumFractionDigits: 1 }))

// Kolom periode + rentang tanggal yang diminta ke database.
function buildColumns(period, month, year, yearFrom, yearTo) {
  if (period === 'day') {
    const [y, m] = month.split('-').map(Number)
    const last = new Date(y, m, 0).getDate()
    const cols = Array.from({ length: last }, (_, i) => {
      const key = `${y}-${pad(m)}-${pad(i + 1)}`
      const wd = new Date(y, m - 1, i + 1).getDay()
      return { key, label: String(i + 1), long: `${i + 1} ${MONTHS_LONG[m - 1]} ${y}`, weekend: wd === 0 || wd === 6 }
    })
    return { cols, from: cols[0].key, to: cols[last - 1].key, title: `Rekap harian — ${MONTHS_LONG[m - 1]} ${y}` }
  }
  if (period === 'month') {
    const cols = MONTHS.map((l, i) => ({ key: `${year}-${pad(i + 1)}-01`, label: l, long: `${MONTHS_LONG[i]} ${year}` }))
    return { cols, from: `${year}-01-01`, to: `${year}-12-31`, title: `Rekap bulanan — Tahun ${year}` }
  }
  if (period === 'quarter') {
    const cols = QUARTERS.map((l, i) => ({ key: `${year}-${pad(i * 3 + 1)}-01`, label: l.replace('Triwulan ', 'TW '), long: `${l} ${year}` }))
    return { cols, from: `${year}-01-01`, to: `${year}-12-31`, title: `Rekap triwulan — Tahun ${year}` }
  }
  const a = Math.min(yearFrom, yearTo), b = Math.max(yearFrom, yearTo)
  const cols = Array.from({ length: b - a + 1 }, (_, i) => ({ key: `${a + i}-01-01`, label: String(a + i), long: String(a + i) }))
  return { cols, from: `${a}-01-01`, to: `${b}-12-31`, title: a === b ? `Rekap tahunan — ${a}` : `Rekap tahunan — ${a}–${b}` }
}

// Gabungkan beberapa baris rekap (beberapa periode / layanan) menjadi satu ringkasan.
function combine(rows) {
  const o = { total: 0, online: 0, offline: 0, done: 0, skipped: 0, cancelled: 0, called: 0, waitSum: 0, serveSum: 0 }
  rows.forEach((r) => {
    o.total += num(r.total); o.online += num(r.online); o.offline += num(r.offline)
    o.done += num(r.done); o.skipped += num(r.skipped); o.cancelled += num(r.cancelled); o.called += num(r.called)
    if (r.avg_wait_min != null) o.waitSum += Number(r.avg_wait_min) * num(r.called)
    if (r.avg_serve_min != null) o.serveSum += Number(r.avg_serve_min) * num(r.done)
  })
  o.avgWait = o.called ? o.waitSum / o.called : null
  o.avgServe = o.done ? o.serveSum / o.done : null
  o.pctDone = o.total ? (o.done / o.total) * 100 : null
  return o
}

export default function Reports() {
  const { settings: s } = useSettings()
  const today = todayStr()
  const thisYear = Number(today.slice(0, 4))
  const [period, setPeriod] = useState('month')
  const [month, setMonth] = useState(today.slice(0, 7))
  const [year, setYear] = useState(thisYear)
  const [yearFrom, setYearFrom] = useState(thisYear - 4)
  const [yearTo, setYearTo] = useState(thisYear)
  const [agencyFilter, setAgencyFilter] = useState('')
  const [metric, setMetric] = useState('total')
  const [agencies, setAgencies] = useState([])
  const [services, setServices] = useState([])
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  const { cols, from, to, title } = useMemo(
    () => buildColumns(period, month, year, yearFrom, yearTo),
    [period, month, year, yearFrom, yearTo],
  )

  useEffect(() => {
    Promise.all([
      supabase.from('agencies').select('*').order('sort'),
      supabase.from('services').select('*').order('sort'),
    ]).then(([a, sv]) => { setAgencies(a.data || []); setServices(sv.data || []) })
  }, [])

  const load = useCallback(async () => {
    setLoading(true); setErr('')
    const { data, error } = await supabase.rpc('queue_report', { p_period: period, p_from: from, p_to: to })
    if (error) {
      setErr(error.message.includes('queue_report')
        ? 'Fungsi rekap belum ada di database. Jalankan file supabase/update-v2-instansi-rekap.sql di SQL Editor Supabase.'
        : error.message)
      setRows([])
    } else setRows(data || [])
    setLoading(false)
  }, [period, from, to])
  useEffect(() => { load() }, [load])

  // Indeks: layanan → periode → baris
  const index = useMemo(() => {
    const m = {}
    rows.forEach((r) => { (m[r.service_id] ||= {})[String(r.period_start).slice(0, 10)] = r })
    return m
  }, [rows])

  const groups = groupServices(agencies, services, { activeOnly: false })
    .filter((g) => !agencyFilter || g.agency.id === agencyFilter)
    .map((g) => ({ ...g, services: g.services.filter((x) => x.active || index[x.id]) }))
    .filter((g) => g.services.length)

  const cell = (svcIds, key) => svcIds.reduce((n, id) => n + num(index[id]?.[key]?.[metric]), 0)
  const rowsOf = (svcIds) => svcIds.flatMap((id) => Object.values(index[id] || {}))
  const allIds = groups.flatMap((g) => g.services.map((x) => x.id))
  const grand = combine(rowsOf(allIds))
  const busiest = groups.flatMap((g) => g.services.map((x) => ({ x, g, n: combine(rowsOf([x.id])).total })))
    .sort((a, b) => b.n - a.n)[0]
  const peakCol = cols.map((c) => ({ c, n: allIds.reduce((n, id) => n + num(index[id]?.[c.key]?.total), 0) }))
    .sort((a, b) => b.n - a.n)[0]
  const agencyName = agencyFilter ? agencies.find((a) => a.id === agencyFilter)?.name : 'Semua instansi'
  const metricLabel = METRICS.find(([k]) => k === metric)[1]

  const shift = (dir) => {
    if (period === 'day') {
      const [y, m] = month.split('-').map(Number)
      const d = new Date(y, m - 1 + dir, 1)
      setMonth(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`)
    } else if (period === 'year') { setYearFrom(yearFrom + dir); setYearTo(yearTo + dir) } else setYear(year + dir)
  }

  const exportCsv = () => {
    const out = [[title], [`Instansi: ${agencyName}`], [`Angka: ${metricLabel}`], []]
    out.push(['Instansi', 'Kode', 'Layanan', ...cols.map((c) => c.long), 'Jumlah'])
    groups.forEach((g) => {
      const ids = g.services.map((x) => x.id)
      g.services.forEach((x) => out.push([g.agency.name, x.code, x.name, ...cols.map((c) => cell([x.id], c.key)), cols.reduce((n, c) => n + cell([x.id], c.key), 0)]))
      out.push([g.agency.name, '', 'Subtotal', ...cols.map((c) => cell(ids, c.key)), cols.reduce((n, c) => n + cell(ids, c.key), 0)])
    })
    out.push(['', '', 'TOTAL', ...cols.map((c) => cell(allIds, c.key)), cols.reduce((n, c) => n + cell(allIds, c.key), 0)])
    out.push([], ['Rincian per layanan'], ['Instansi', 'Kode', 'Layanan', 'Diambil', 'Online', 'Offline', 'Selesai', 'Dilewati', 'Dibatalkan', '% selesai', 'Rata-rata tunggu (menit)', 'Rata-rata layanan (menit)'])
    groups.forEach((g) => g.services.forEach((x) => {
      const c = combine(rowsOf([x.id]))
      out.push([g.agency.name, x.code, x.name, c.total, c.online, c.offline, c.done, c.skipped, c.cancelled,
        c.pctDone == null ? '' : c.pctDone.toFixed(1), c.avgWait == null ? '' : c.avgWait.toFixed(1), c.avgServe == null ? '' : c.avgServe.toFixed(1)])
    }))
    downloadCsv(`${title.replace(/[^\w\d]+/g, '-').toLowerCase()}.csv`, out)
  }

  const yearOptions = Array.from({ length: 11 }, (_, i) => thisYear - 10 + i)

  return (
    <>
      <div className="print-only" style={{ marginBottom: 12 }}>
        <b style={{ fontSize: '14pt' }}>{s.org_name}</b>
        <div>{title} · {agencyName} · {metricLabel}</div>
        <small>Dicetak {fmtDateTime(new Date())}</small>
      </div>

      <header className="no-print">
        <h1 style={{ fontSize: '2.4rem' }}>Rekap layanan</h1>
        <p>Jumlah nomor antrian per jenis layanan, dikelompokkan per instansi.</p>
      </header>

      <div className="panel no-print">
        <div className="seg" role="group" aria-label="Jenis rekap">
          {PERIODS.map(([k, l]) => <button key={k} type="button" aria-pressed={period === k} onClick={() => setPeriod(k)}>{l}</button>)}
        </div>
        <div className="report-filters">
          <button className="btn btn-ghost" onClick={() => shift(-1)} aria-label="Periode sebelumnya">‹</button>
          {period === 'day' && (
            <label className="field">Bulan<input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} /></label>
          )}
          {(period === 'month' || period === 'quarter') && (
            <label className="field">Tahun
              <select value={year} onChange={(e) => setYear(Number(e.target.value))}>{yearOptions.map((y) => <option key={y}>{y}</option>)}</select>
            </label>
          )}
          {period === 'year' && (
            <>
              <label className="field">Dari tahun
                <select value={yearFrom} onChange={(e) => setYearFrom(Number(e.target.value))}>{yearOptions.map((y) => <option key={y}>{y}</option>)}</select>
              </label>
              <label className="field">Sampai
                <select value={yearTo} onChange={(e) => setYearTo(Number(e.target.value))}>{yearOptions.map((y) => <option key={y}>{y}</option>)}</select>
              </label>
            </>
          )}
          <button className="btn btn-ghost" onClick={() => shift(1)} aria-label="Periode berikutnya">›</button>
          <label className="field">Instansi
            <select value={agencyFilter} onChange={(e) => setAgencyFilter(e.target.value)}>
              <option value="">Semua instansi</option>
              {agencies.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </label>
          <label className="field">Angka di tabel
            <select value={metric} onChange={(e) => setMetric(e.target.value)}>{METRICS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          </label>
          <span className="spacer" />
          <button className="btn btn-ghost" onClick={exportCsv} disabled={loading || !groups.length}>Unduh CSV</button>
          <button className="btn btn-primary" onClick={() => window.print()} disabled={loading}>Cetak</button>
        </div>
      </div>

      {err && <div className="alert err panel">{err}</div>}

      <h2 style={{ fontSize: '1.7rem', marginBottom: 12 }} className="no-print">{title}</h2>

      <div className="stats panel">
        <div className="stat"><b>{grand.total.toLocaleString('id-ID')}</b><span>nomor diambil</span></div>
        <div className="stat"><b>{grand.done.toLocaleString('id-ID')}</b><span>selesai dilayani{grand.pctDone != null ? ` (${fmt1(grand.pctDone)}%)` : ''}</span></div>
        <div className="stat"><b>{grand.online.toLocaleString('id-ID')} / {grand.offline.toLocaleString('id-ID')}</b><span>online / offline</span></div>
        <div className="stat"><b>{fmt1(grand.avgWait)}</b><span>menit rata-rata tunggu</span></div>
        <div className="stat"><b>{fmt1(grand.avgServe)}</b><span>menit rata-rata layanan</span></div>
        <div className="stat"><b style={{ fontSize: '1.3rem', lineHeight: 1.2 }}>{busiest?.n ? busiest.x.name : '–'}</b><span>layanan tersibuk{busiest?.n ? ` · ${busiest.n.toLocaleString('id-ID')} nomor` : ''}</span></div>
        <div className="stat"><b style={{ fontSize: '1.3rem', lineHeight: 1.2 }}>{peakCol?.n ? peakCol.c.long : '–'}</b><span>periode tersibuk{peakCol?.n ? ` · ${peakCol.n.toLocaleString('id-ID')} nomor` : ''}</span></div>
      </div>

      <section className="panel">
        <h3>{metricLabel} per layanan</h3>
        <div className="tbl-wrap">
          <table className="tbl matrix">
            <thead>
              <tr>
                <th>Layanan</th>
                {cols.map((c) => <th key={c.key} title={c.long} style={c.weekend ? { color: 'var(--bad)' } : undefined}>{c.label}</th>)}
                <th className="col-total">Jumlah</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={cols.length + 2} className="muted" style={{ textAlign: 'left' }}>Memuat rekap…</td></tr>}
              {!loading && groups.length === 0 && <tr><td colSpan={cols.length + 2} className="muted" style={{ textAlign: 'left' }}>Belum ada layanan.</td></tr>}
              {!loading && groups.map((g) => {
                const ids = g.services.map((x) => x.id)
                const sub = cols.reduce((n, c) => n + cell(ids, c.key), 0)
                return [
                  <tr className="ag-row" key={g.agency.id}>
                    <td><span className="ag-cell"><AgencyLogo agency={g.agency} size={24} />{g.agency.name}</span></td>
                    {cols.map((c) => <td key={c.key}>{cell(ids, c.key) || ''}</td>)}
                    <td className="col-total">{sub}</td>
                  </tr>,
                  ...g.services.map((x) => {
                    const t = cols.reduce((n, c) => n + cell([x.id], c.key), 0)
                    return (
                      <tr key={x.id}>
                        <td style={{ paddingLeft: 24 }}><b>{x.code}</b> — {x.name}{!x.active && <span className="badge" style={{ marginLeft: 6 }}>nonaktif</span>}</td>
                        {cols.map((c) => { const v = cell([x.id], c.key); return <td key={c.key} className={v ? '' : 'zero'}>{v || '·'}</td> })}
                        <td className="col-total">{t}</td>
                      </tr>
                    )
                  }),
                ]
              })}
              {!loading && groups.length > 1 && (
                <tr className="grand">
                  <td>Total semua instansi</td>
                  {cols.map((c) => <td key={c.key}>{cell(allIds, c.key)}</td>)}
                  <td className="col-total">{cols.reduce((n, c) => n + cell(allIds, c.key), 0)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <h3>Rincian per layanan — {title.replace('Rekap ', '').replace(/^\w+ — /, '')}</h3>
        <div className="tbl-wrap">
          <table className="tbl num">
            <thead>
              <tr>
                <th>Layanan</th><th>Diambil</th><th>Online</th><th>Offline</th><th>Selesai</th><th>Dilewati</th><th>Dibatalkan</th>
                <th>% selesai</th><th>Tunggu (mnt)</th><th>Layanan (mnt)</th>
              </tr>
            </thead>
            <tbody>
              {!loading && groups.map((g) => [
                <tr key={g.agency.id} className="ag-row"><td colSpan={10}><span className="ag-cell"><AgencyLogo agency={g.agency} size={24} /><b>{g.agency.name}</b></span></td></tr>,
                ...g.services.map((x) => {
                  const c = combine(rowsOf([x.id]))
                  return (
                    <tr key={x.id}>
                      <td style={{ paddingLeft: 24 }}><b>{x.code}</b> — {x.name}</td>
                      <td>{c.total}</td><td>{c.online}</td><td>{c.offline}</td><td>{c.done}</td><td>{c.skipped}</td><td>{c.cancelled}</td>
                      <td>{c.pctDone == null ? '–' : `${fmt1(c.pctDone)}%`}</td><td>{fmt1(c.avgWait)}</td><td>{fmt1(c.avgServe)}</td>
                    </tr>
                  )
                }),
              ])}
            </tbody>
          </table>
        </div>
        <p className="muted">Tunggu = dari nomor diambil sampai dipanggil. Layanan = dari mulai dilayani sampai selesai. Rentang: {from} s.d. {to}.</p>
      </section>
    </>
  )
}
