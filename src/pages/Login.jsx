import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/Auth.jsx'
import { useSettings } from '../context/Settings.jsx'
import { Brand } from '../components/PublicLayout.jsx'

export default function Login() {
  const { signIn, signUp, session, profile, loading } = useAuth()
  const { settings: s } = useSettings()
  const nav = useNavigate()
  const loc = useLocation()
  const [mode, setMode] = useState('login')
  const [f, setF] = useState({ name: '', email: '', password: '' })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [info, setInfo] = useState('')

  useEffect(() => {
    if (!loading && session && profile) {
      nav(loc.state?.from || (profile.role === 'admin' ? '/admin' : '/operator'), { replace: true })
    }
  }, [loading, session, profile])

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setErr(''); setInfo('')
    if (mode === 'login') {
      const { error } = await signIn(f.email, f.password)
      if (error) setErr(error.message === 'Invalid login credentials' ? 'Email atau kata sandi salah.' : error.message)
    } else {
      const { data, error } = await signUp(f.email, f.password, f.name)
      if (error) setErr(error.message)
      else if (!data.session) setInfo('Pendaftaran berhasil. Periksa email Anda untuk konfirmasi, lalu masuk.')
      else setInfo('Akun dibuat. Admin utama perlu mengaktifkan akun Anda sebelum bisa dipakai.')
    }
    setBusy(false)
  }

  return (
    <div className="auth-wrap">
      <aside className="auth-side">
        <Brand settings={s} light />
        <div className="stack">
          <h1>Ruang kerja petugas</h1>
          <p>Masuk untuk memanggil antrian, memantau layanan, atau mengelola konten situs.</p>
        </div>
        <Link to="/" style={{ color: '#9fb4c6' }}>← Kembali ke situs publik</Link>
      </aside>
      <main className="auth-main">
        <form className="auth-card stack" onSubmit={submit}>
          <h2>{mode === 'login' ? 'Masuk' : 'Daftar akun petugas'}</h2>
          {err && <div className="alert err">{err}</div>}
          {info && <div className="alert ok">{info}</div>}
          {mode === 'register' && (
            <label className="field">Nama lengkap
              <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required />
            </label>
          )}
          <label className="field">Email
            <input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required autoComplete="email" />
          </label>
          <label className="field">Kata sandi
            <input type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required minLength={6}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
          </label>
          <button className="btn btn-primary btn-lg" disabled={busy}>{busy ? 'Memproses…' : mode === 'login' ? 'Masuk' : 'Daftar'}</button>
          <button type="button" className="btn btn-ghost" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setErr(''); setInfo('') }}>
            {mode === 'login' ? 'Belum punya akun? Daftar' : 'Sudah punya akun? Masuk'}
          </button>
        </form>
      </main>
    </div>
  )
}
