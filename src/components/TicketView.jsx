import { Link } from 'react-router-dom'
import { fmtTime, waitingAhead } from '../lib/util'

// Tampilan tiket antrian bergaya karcis (dipakai setelah ambil antrian online & buku tamu).
export default function TicketView({ ticket, service, tickets = [], showLink = true }) {
  if (!ticket) return null
  const ahead = waitingAhead(ticket, tickets)
  const est = service ? ahead * (service.est_minutes || 0) : null
  return (
    <div className="ticket">
      <div className="ticket-top">
        <span className="ticket-svc">{service?.name || 'Layanan'}</span>
        <div className="ticket-code">{ticket.code}</div>
        <span className="muted">Diambil pukul {fmtTime(ticket.created_at)}</span>
      </div>
      <div className="ticket-perf" aria-hidden="true" />
      <div className="ticket-bottom">
        <div><b>{ahead}</b><small>nomor di depan Anda</small></div>
        <div><b>{est != null ? `±${est}` : '–'}</b><small>menit perkiraan</small></div>
      </div>
      {showLink && (
        <Link className="btn btn-primary btn-block" to={`/status/${ticket.code}`}>Pantau status nomor ini</Link>
      )}
    </div>
  )
}
