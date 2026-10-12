import { Routes, Route, Navigate } from 'react-router-dom'
import { configured } from './lib/supabase'
import { RequireRole } from './context/Auth.jsx'
import PublicLayout from './components/PublicLayout.jsx'
import Home from './pages/public/Home.jsx'
import TakeTicket from './pages/public/TakeTicket.jsx'
import Track from './pages/public/Track.jsx'
import GuestBook from './pages/public/GuestBook.jsx'
import News from './pages/public/News.jsx'
import Display from './pages/Display.jsx'
import Kiosk from './pages/Kiosk.jsx'
import Login from './pages/Login.jsx'
import Operator from './pages/operator/Operator.jsx'
import AdminLayout from './pages/admin/AdminLayout.jsx'
import Overview from './pages/admin/Overview.jsx'
import Services from './pages/admin/Services.jsx'
import Guests from './pages/admin/Guests.jsx'
import Posts from './pages/admin/Posts.jsx'
import Media from './pages/admin/Media.jsx'
import Settings from './pages/admin/Settings.jsx'
import Users from './pages/admin/Users.jsx'
import Reports from './pages/admin/Reports.jsx'

function SetupNotice() {
  return (
    <div className="center-screen">
      <div className="card narrow stack">
        <h2>Supabase belum dihubungkan</h2>
        <p>Isi <code>VITE_SUPABASE_URL</code> dan <code>VITE_SUPABASE_ANON_KEY</code> pada file <code>.env</code> (lokal) atau Environment Variables di Vercel, lalu muat ulang.</p>
        <p className="muted">Langkah lengkap ada di README.md.</p>
      </div>
    </div>
  )
}

export default function App() {
  if (!configured) return <SetupNotice />
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<Home />} />
        <Route path="antrian" element={<TakeTicket />} />
        <Route path="status" element={<Track />} />
        <Route path="status/:code" element={<Track />} />
        <Route path="buku-tamu" element={<GuestBook />} />
        <Route path="berita" element={<News />} />
        <Route path="berita/:slug" element={<News />} />
      </Route>

      {/* Layar penuh: dibuka di komputer/TV antrian */}
      <Route path="display" element={<Display />} />
      <Route path="promo" element={<Display promoOnly />} />
      <Route path="kiosk" element={<Kiosk />} />

      <Route path="login" element={<Login />} />
      <Route path="operator" element={<RequireRole roles={['admin', 'operator']}><Operator /></RequireRole>} />
      <Route path="admin" element={<RequireRole roles={['admin']}><AdminLayout /></RequireRole>}>
        <Route index element={<Overview />} />
        <Route path="layanan" element={<Services />} />
        <Route path="rekap" element={<Reports />} />
        <Route path="buku-tamu" element={<Guests />} />
        <Route path="berita" element={<Posts />} />
        <Route path="media" element={<Media />} />
        <Route path="pengaturan" element={<Settings />} />
        <Route path="pengguna" element={<Users />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
