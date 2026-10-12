import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useSettings } from '../context/Settings.jsx'
import { useAuth } from '../context/Auth.jsx'

export function Brand({ settings, light = false }) {
  return (
    <span className={'brand' + (light ? ' brand-light' : '')}>
      {settings.logo_url
        ? <img src={settings.logo_url} alt="" />
        : <span className="logo-dot">{(settings.org_name || 'L').trim()[0]}</span>}
      <span className="brand-text">
        <b>{settings.org_name}</b>
        {settings.tagline && <small>{settings.tagline}</small>}
      </span>
    </span>
  )
}

const NAV = [
  ['/', 'Beranda', true],
  ['/dashboard', 'Dashboard'],
  ['/status', 'Cek Antrian'],
  ['/buku-tamu', 'Buku Tamu'],
  ['/berita', 'Berita'],
]

export default function PublicLayout() {
  const { settings: s } = useSettings()
  const { session, role } = useAuth()
  const [open, setOpen] = useState(false)
  const loc = useLocation()
  const staffLink = session ? (role === 'admin' ? '/admin' : '/operator') : '/login'

  useEffect(() => { setOpen(false); window.scrollTo(0, 0) }, [loc.pathname])

  return (
    <div className="site">
      <header className="site-head">
        <div className="container head-in">
          <Link to="/" className="head-brand"><Brand settings={s} /></Link>
          <button className="burger" onClick={() => setOpen(!open)} aria-label="Buka menu" aria-expanded={open}>
            <span /><span /><span />
          </button>
          <nav className={'nav' + (open ? ' open' : '')} aria-label="Menu utama">
            <div className="nav-links">
              {NAV.map(([to, label, end]) => <NavLink key={to} to={to} end={end}>{label}</NavLink>)}
              <a href="#kontak" onClick={() => setOpen(false)}>Kontak</a>
            </div>
            <div className="nav-actions">
              <Link className="btn btn-soft" to={staffLink}>{session ? 'Dashboard staf' : 'Masuk'}</Link>
              <Link className="btn btn-primary" to="/antrian">Ambil Antrian</Link>
            </div>
          </nav>
        </div>
      </header>

      <main className="site-main"><Outlet /></main>

      <footer className="site-foot" id="kontak">
        <div className="container foot-grid">
          <div className="foot-brand">
            <Brand settings={s} light />
            {s.footer && <p>{s.footer}</p>}
          </div>
          <div>
            <h4>Kontak</h4>
            <ul>
              {s.address && <li>{s.address}</li>}
              {s.phone && <li>Telp. {s.phone}</li>}
              {s.email && <li><a href={`mailto:${s.email}`}>{s.email}</a></li>}
              {s.open_hours && <li>Jam layanan: {s.open_hours}</li>}
              {!s.address && !s.phone && !s.email && !s.open_hours && <li>Isi alamat dan kontak di Admin → Tampilan situs.</li>}
            </ul>
          </div>
          <div>
            <h4>Layanan</h4>
            <ul>
              <li><Link to="/antrian">Ambil antrian online</Link></li>
              <li><Link to="/status">Cek status antrian</Link></li>
              <li><Link to="/buku-tamu">Buku tamu</Link></li>
              <li><Link to="/dashboard">Dashboard antrian</Link></li>
              <li><Link to="/berita">Berita & pengumuman</Link></li>
            </ul>
          </div>
        </div>
        <div className="container foot-bottom">© {new Date().getFullYear()} {s.org_name}</div>
      </footer>
    </div>
  )
}
