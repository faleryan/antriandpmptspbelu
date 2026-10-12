import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
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

export default function PublicLayout() {
  const { settings: s } = useSettings()
  const { session, role } = useAuth()
  const [open, setOpen] = useState(false)
  const dash = role === 'admin' ? '/admin' : '/operator'

  return (
    <div className="site">
      <header className="site-head">
        <div className="container head-in">
          <Link to="/"><Brand settings={s} /></Link>
          <button className="burger" onClick={() => setOpen(!open)} aria-label="Buka menu" aria-expanded={open}>
            <span /><span /><span />
          </button>
          <nav className={'nav' + (open ? ' open' : '')} onClick={() => setOpen(false)}>
            <NavLink to="/" end>Beranda</NavLink>
            <NavLink to="/antrian">Ambil antrian</NavLink>
            <NavLink to="/status">Cek antrian</NavLink>
            <NavLink to="/buku-tamu">Buku tamu</NavLink>
            <NavLink to="/berita">Berita</NavLink>
            <Link className="btn btn-sm btn-ghost" to={session ? dash : '/login'}>{session ? 'Dashboard' : 'Masuk staf'}</Link>
          </nav>
        </div>
      </header>

      {s.running_text && (
        <div className="ticker" aria-label="Pengumuman">
          <div className="ticker-in"><span>{s.running_text}</span></div>
        </div>
      )}

      <main className="site-main"><Outlet /></main>

      <footer className="site-foot">
        <div className="container foot-in">
          <div>
            <b>{s.org_name}</b>
            {s.footer && <p>{s.footer}</p>}
          </div>
          <div className="foot-links">
            <Link to="/antrian">Ambil antrian</Link>
            <Link to="/buku-tamu">Buku tamu</Link>
            <Link to="/berita">Berita</Link>
            <Link to="/login">Masuk staf</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
