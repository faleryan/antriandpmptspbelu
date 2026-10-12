import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase, configured } from '../lib/supabase'

export const DEFAULTS = {
  org_name: 'Layanan Terpadu',
  tagline: 'Antrian, buku tamu, dan informasi layanan publik',
  logo_url: '',
  primary_color: '#0b6bcb',
  running_text: '',
  // Beranda (hero bergaya pusat layanan)
  hero_label: '',                 // kosong = pakai nama instansi
  hero_prefix: 'Cara mudah mengurus',
  hero_words: 'KTP-el, Akta Kelahiran, Kartu Keluarga, Perizinan Usaha',
  hero_tagline: 'Semua layanan dalam satu tempat',
  hero_bg_color: '#0a1140',
  hero_bg_image: '',              // foto latar penuh (opsional)
  hero_bg_dim: 55,                // gelapkan foto latar, persen
  hero_pattern: true,             // pola titik di latar
  hero_image: '',                 // foto gedung / gambar utama (PNG tanpa latar paling bagus)
  landing_cards: [
    { title: 'Antrian online', text: 'Ambil nomor antrian dari rumah dengan mudah', button: 'Kunjungi', link: '/antrian', color: '#0b6bcb', art: 'antrian', image: '' },
    { title: 'Cek status antrian', text: 'Pantau posisi nomor antrian Anda', button: 'Kunjungi', link: '/status', color: '#d9333f', art: 'status', image: '' },
    { title: 'Buku tamu', text: 'Catat kunjungan Anda sebelum tiba', button: 'Kunjungi', link: '/buku-tamu', color: '#1a8a4c', art: 'bukutamu', image: '' },
  ],
  // Halaman Dashboard (papan antrian)
  hero_title: 'Datang tanpa menunggu lama',
  hero_subtitle: 'Ambil nomor antrian dari ponsel Anda dan pantau posisi secara langsung.',
  address: '',
  phone: '',
  email: '',
  open_hours: '',
  footer: '',
  online_queue_open: true,
  promo_default_seconds: 10,
  sections: { queue: true, services: true, info: true, promo: true, news: true, contact: true, agencies: true },
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
    document.documentElement.style.setProperty('--primary', settings.primary_color || '#0b6bcb')
    document.title = settings.org_name || 'Layanan Terpadu'
  }, [settings])

  return <Ctx.Provider value={{ settings, reload: load }}>{children}</Ctx.Provider>
}
