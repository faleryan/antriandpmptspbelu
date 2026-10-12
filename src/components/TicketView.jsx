import { Link } from 'react-router-dom'
import { fmtTime, waitingAhead } from '../lib/util'
import AgencyLogo from './AgencyLogo.jsx'

// Tampilan tiket antrian bergaya karcis (setelah ambil antrian online, buku tamu, dan kiosk).
export default function TicketView({ ticket, service, agency, tickets = [], showLink = true }) {
  if (!ticket) return null
  const ahead = waitingAhead(ticket, tickets)
  const est = service ? ahead * (service.est_minutes || 0) : null
  return (
    <div className="ticket">
      <div className="ticket-top">
        {agency && (
          <div className="ticket-agency">
            <AgencyLogo agency={agency} size={44} />
            <b>{agency.name}</b>
          </div>
        )}
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
