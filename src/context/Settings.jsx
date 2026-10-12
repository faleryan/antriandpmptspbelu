import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase, configured } from '../lib/supabase'

export const DEFAULTS = {
  org_name: 'Layanan Terpadu',
  tagline: 'Antrian, buku tamu, dan informasi layanan publik',
  logo_url: '',
  primary_color: '#0e4c7a',
  running_text: '',
  hero_title: 'Datang tanpa menunggu lama',
  hero_subtitle: 'Ambil nomor antrian dari ponsel Anda dan pantau posisi secara langsung.',
  address: '',
  phone: '',
  email: '',
  open_hours: '',
  footer: '',
  online_queue_open: true,
  promo_default_seconds: 10,
  sections: { queue: true, services: true, info: true, promo: true, news: true, contact: true },
  info_cards: [],
}

const Ctx = createContext({ settings: DEFAULTS, reload: () => {} })
export const useSettings = () => useContext(Ctx)

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULTS)

  const load = useCallback(async () => {
    const { data } = await supabase.from('site_settings').select('*')
    if (!data) return
    const o = { ...DEFAULTS }
    data.forEach((r) => { o[r.key] = r.value })
    o.sections = { ...DEFAULTS.sections, ...(o.sections || {}) }
    setSettings(o)
  }, [])

  useEffect(() => {
    if (!configured) return
    load()
    const ch = supabase.channel('settings-' + Math.random().toString(36).slice(2))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [load])

  useEffect(() => {
    document.documentElement.style.setProperty('--primary', settings.primary_color || '#0e4c7a')
    document.title = settings.org_name || 'Layanan Terpadu'
  }, [settings])

  return <Ctx.Provider value={{ settings, reload: load }}>{children}</Ctx.Provider>
}
