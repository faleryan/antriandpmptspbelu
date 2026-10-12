import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { Navigate, useLocation, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const Ctx = createContext(null)
export const useAuth = () => useContext(Ctx)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  // undefined = sedang dimuat, null = tidak ada profil
  const [profile, setProfile] = useState(undefined)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (uid) => {
    if (!uid) { setProfile(null); return }
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle()
    setProfile(data || null)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session)
      await loadProfile(data.session?.user.id)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
      if (s) { setProfile(undefined); setTimeout(() => loadProfile(s.user.id), 0) } else setProfile(null)
    })
    return () => sub.subscription.unsubscribe()
  }, [loadProfile])

  const value = {
    session,
    profile: profile || null,
    role: profile?.role,
    loading: loading || (Boolean(session) && profile === undefined),
    signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
    signUp: (email, password, full_name) =>
      supabase.auth.signUp({ email, password, options: { data: { full_name } } }),
    signOut: () => supabase.auth.signOut(),
    refresh: () => loadProfile(session?.user.id),
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function RequireRole({ roles, children }) {
  const { session, profile, loading, signOut } = useAuth()
  const loc = useLocation()

  if (loading) return <div className="center-screen">Memuat…</div>
  if (!session) return <Navigate to="/login" state={{ from: loc.pathname }} replace />
  if (!profile) {
    return (
      <div className="center-screen">
        <div className="card narrow stack">
          <h2>Profil tidak ditemukan</h2>
          <p className="muted">Akun ini belum memiliki profil staf. Hubungi admin utama.</p>
          <button className="btn btn-ghost" onClick={signOut}>Keluar</button>
        </div>
      </div>
    )
  }
  if (!roles.includes(profile.role)) {
    const pending = profile.role === 'pending'
    return (
      <div className="center-screen">
        <div className="card narrow stack">
          <h2>{pending ? 'Akun menunggu persetujuan' : 'Akses tidak tersedia'}</h2>
          <p className="muted">
            {pending
              ? 'Akun Anda sudah terdaftar. Admin utama perlu mengaktifkannya sebagai operator terlebih dahulu.'
              : profile.role === 'operator'
                ? 'Halaman ini khusus admin utama. Operator dapat memakai dashboard operator.'
                : 'Akun Anda tidak memiliki izin untuk halaman ini.'}
          </p>
          <div className="row">
            {profile.role === 'operator' && <Link className="btn btn-primary" to="/operator">Buka dashboard operator</Link>}
            <Link className="btn btn-ghost" to="/">Ke beranda</Link>
            <button className="btn btn-ghost" onClick={signOut}>Keluar</button>
          </div>
        </div>
      </div>
    )
  }
  return children
}
