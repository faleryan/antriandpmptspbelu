import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { uploadMedia } from '../../lib/media'
import { DEFAULTS, useSettings } from '../../context/Settings.jsx'

const SECTIONS = [
  ['queue', 'Papan antrian di bagian atas'],
  ['services', 'Daftar layanan'],
  ['info', 'Kartu informasi'],
  ['promo', 'Pemutar promosi'],
  ['news', 'Berita & pengumuman'],
  ['contact', 'Kontak & jam layanan'],
]

export default function Settings() {
  const { reload } = useSettings()
  const [f, setF] = useState(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => {
    supabase.from('site_settings').select('*').then(({ data }) => {
      const o = { ...DEFAULTS }
      ;(data || []).forEach((r) => { o[r.key] = r.value })
      o.sections = { ...DEFAULTS.sections, ...(o.sections || {}) }
      o.info_cards = o.info_cards || []
      setF(o)
    })
  }, [])

  if (!f) return <p className="muted">Memuat…</p>
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const card = (i, k) => (e) => setF({ ...f, info_cards: f.info_cards.map((c, j) => (j === i ? { ...c, [k]: e.target.value } : c)) })

  const upload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setErr('')
    try { setF({ ...f, logo_url: await uploadMedia(file, 'logo') }) } catch (ex) { setErr('Gagal mengunggah logo: ' + ex.message) }
  }

  const save = async (e) => {
    e.preventDefault()
    setBusy(true); setErr(''); setMsg('')
    const rows = Object.keys(DEFAULTS).map((key) => ({ key, value: f[key] ?? DEFAULTS[key] }))
    const { error } = await supabase.from('site_settings').upsert(rows, { onConflict: 'key' })
    setBusy(false)
    if (error) return setErr(error.message)
    setMsg('Pengaturan disimpan. Situs publik dan layar antrian ikut berubah otomatis.')
    reload()
  }

  return (
    <>
      <header><h1 style={{ fontSize: '2.4rem' }}>Tampilan situs</h1><p>Atur identitas, isi beranda publik, dan layar antrian tanpa mengubah kode.</p></header>
      <form className="editor" style={{ maxWidth: 760 }} onSubmit={save}>
        {err && <div className="alert err">{err}</div>}
        {msg && <div className="alert ok">{msg}</div>}

        <section className="card editor">
          <h3>Identitas</h3>
          <label className="field">Nama instansi<input value={f.org_name} onChange={set('org_name')} required /></label>
          <label className="field">Slogan<input value={f.tagline} onChange={set('tagline')} /></label>
          <div className="field">
            <span style={{ fontWeight: 600, fontSize: '.9rem' }}>Logo</span>
            {f.logo_url && <img src={f.logo_url} alt="" style={{ height: 56, width: 'auto' }} />}
            <input type="file" accept="image/*" onChange={upload} />
            {f.logo_url && <button type="button" className="btn btn-sm btn-ghost" style={{ alignSelf: 'start' }} onClick={() => setF({ ...f, logo_url: '' })}>Hapus logo</button>}
          </div>
          <label className="field">Warna utama<input type="color" value={f.primary_color} onChange={set('primary_color')} /></label>
        </section>

        <section className="card editor">
          <h3>Beranda publik</h3>
          <label className="field">Judul utama<input value={f.hero_title} onChange={set('hero_title')} /></label>
          <label className="field">Kalimat pendukung<textarea rows={2} value={f.hero_subtitle} onChange={set('hero_subtitle')} /></label>
          <label className="field">Teks berjalan <small>tampil di bawah menu situs dan di layar antrian</small><textarea rows={2} value={f.running_text} onChange={set('running_text')} /></label>
          <div className="field">
            <span style={{ fontWeight: 600, fontSize: '.9rem' }}>Bagian yang ditampilkan</span>
            <div className="checks">
              {SECTIONS.map(([k, l]) => (
                <label key={k}><input type="checkbox" checked={!!f.sections[k]} onChange={(e) => setF({ ...f, sections: { ...f.sections, [k]: e.target.checked } })} />{l}</label>
              ))}
            </div>
          </div>
        </section>

        <section className="card editor">
          <h3>Kartu informasi</h3>
          <p className="muted">Misalnya persyaratan, alur layanan, atau imbauan. Tampil sebagai kartu di beranda.</p>
          <div className="cards-edit">
            {f.info_cards.map((c, i) => (
              <div className="card" key={i}>
                <input value={c.icon || ''} onChange={card(i, 'icon')} placeholder="Ikon" maxLength={4} aria-label="Ikon (emoji)" />
                <input value={c.title || ''} onChange={card(i, 'title')} placeholder="Judul" aria-label="Judul kartu" />
                <textarea rows={2} value={c.text || ''} onChange={card(i, 'text')} placeholder="Isi" aria-label="Isi kartu" />
                <button type="button" className="btn btn-sm btn-danger-ghost" onClick={() => setF({ ...f, info_cards: f.info_cards.filter((_, j) => j !== i) })}>Hapus</button>
              </div>
            ))}
          </div>
          <div><button type="button" className="btn btn-sm btn-ghost" onClick={() => setF({ ...f, info_cards: [...f.info_cards, { icon: '📌', title: '', text: '' }] })}>+ Tambah kartu</button></div>
        </section>

        <section className="card editor">
          <h3>Kontak & layanan</h3>
          <label className="field">Alamat<textarea rows={2} value={f.address} onChange={set('address')} /></label>
          <div className="grid-2">
            <label className="field">Telepon<input value={f.phone} onChange={set('phone')} /></label>
            <label className="field">Email<input value={f.email} onChange={set('email')} /></label>
          </div>
          <label className="field">Jam layanan<input value={f.open_hours} onChange={set('open_hours')} /></label>
          <label className="field">Teks kaki halaman<input value={f.footer} onChange={set('footer')} /></label>
        </section>

        <section className="card editor">
          <h3>Antrian & promosi</h3>
          <label className="row" style={{ fontWeight: 600 }}>
            <input type="checkbox" checked={!!f.online_queue_open} onChange={(e) => setF({ ...f, online_queue_open: e.target.checked })} />
            Buka antrian online (kiosk tetap bisa dipakai bila ditutup)
          </label>
          <label className="field" style={{ maxWidth: 240 }}>Durasi standar gambar (detik)
            <input type="number" min={3} value={f.promo_default_seconds} onChange={(e) => setF({ ...f, promo_default_seconds: Number(e.target.value) || 10 })} />
          </label>
        </section>

        <div><button className="btn btn-primary btn-lg" disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan pengaturan'}</button></div>
      </form>
    </>
  )
}
