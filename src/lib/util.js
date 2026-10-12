// Zona waktu antrian. Samakan dengan fungsi today_local() di supabase/schema.sql
export const TZ = 'Asia/Makassar'

export const todayStr = () => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date())

export const fmtTime = (d) =>
  d ? new Date(d).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: TZ }) : '–'
export const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: TZ }) : '–'
export const fmtDateTime = (d) => (d ? `${fmtDate(d)}, ${fmtTime(d)}` : '–')

export const STATUS = {
  waiting: 'Menunggu',
  called: 'Dipanggil',
  serving: 'Dilayani',
  done: 'Selesai',
  skipped: 'Dilewati',
  cancelled: 'Dibatalkan',
}

export const visitorOf = (t) => {
  const v = t?.ticket_visitors
  return (Array.isArray(v) ? v[0] : v) || {}
}

export const slugify = (s) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 70) || 'tulisan'

export const youtubeId = (url = '') => {
  const m = url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([A-Za-z0-9_-]{11})/)
  return m ? m[1] : ''
}

export const minutesBetween = (a, b) => (a && b ? Math.max(0, (new Date(b) - new Date(a)) / 60000) : null)
export const minsAgo = (d) => (d ? Math.max(0, Math.round((Date.now() - new Date(d)) / 60000)) : 0)

export const avg = (arr) => {
  const v = arr.filter((x) => x != null)
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null
}

// Berapa nomor menunggu di depan sebuah tiket (per layanan)
export const waitingAhead = (ticket, tickets) =>
  tickets.filter((t) => t.service_id === ticket.service_id && t.status === 'waiting' && t.seq < ticket.seq).length

export const downloadCsv = (filename, rows) => {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const csv = rows.map((r) => r.map(esc).join(',')).join('\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}
