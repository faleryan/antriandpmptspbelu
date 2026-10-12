import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/Auth.jsx'
import { useSettings } from '../../context/Settings.jsx'
import { Brand } from '../../components/PublicLayout.jsx'

const NAV = [
  ['/admin', 'Ringkasan', true],
  ['/admin/rekap', 'Rekap layanan'],
  ['/admin/layanan', 'Instansi & layanan'],
  ['/admin/buku-tamu', 'Buku tamu'],
  ['/admin/berita', 'Berita'],
  ['/admin/media', 'Media promosi'],
  ['/admin/pengaturan', 'Tampilan situs'],
  ['/admin/pengguna', 'Pengguna'],
]

export default function AdminLayout() {
  const { profile, signOut } = useAuth()
  const { settings: s } = useSettings()
  return (
    <div className="admin">
      <aside className="side">
        <Brand settings={s} light />
        <nav className="side-nav" aria-label="Menu admin">
          {NAV.map(([to, label, end]) => <NavLink key={to} to={to} end={end}>{label}</NavLink>)}
        </nav>
        <div className="side-links">
          <Link to="/operator">Dashboard operator</Link>
          <Link to="/display" target="_blank">Layar antrian</Link>
          <Link to="/promo" target="_blank">Layar promosi saja</Link>
          <Link to="/kiosk" target="_blank">Kiosk tiket</Link>
          <Link to="/" target="_blank">Situs publik</Link>
          <span style={{ padding: '7px 12px', fontSize: '.8rem', color: '#6f879b' }}>{profile?.email}</span>
          <button onClick={signOut}>Keluar</button>
        </div>
      </aside>
      <main className="admin-main"><Outlet /></main>
    </div>
  )
}
