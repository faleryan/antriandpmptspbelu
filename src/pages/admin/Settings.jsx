import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { uploadMedia } from '../../lib/media'
import { DEFAULTS, useSettings } from '../../context/Settings.jsx'

const LANDING_SECTIONS = [
  ['agencies', 'Logo instansi yang melayani'],
  ['news', 'Berita & pengumuman terbaru'],
]
const DASHBOARD_SECTIONS = [
  ['queue', 'Papan "sedang dipanggil"'],
  ['services', 'Layanan per instansi'],
  ['info', 'Kartu informasi'],
  ['promo', 'Pemutar promosi'],
]
const ARTS = [
  ['antrian', 'Orang & laptop'],
  ['status', 'Ponsel & daftar'],
  ['bukutamu', 'Daftar centang'],
  ['survei', 'Formulir survei'],
]
const COLORS = [['#0b6bcb', 'Biru'], ['#d9333f', 'Merah'], ['#1a8a4c', 'Hijau'], ['#e08a00', 'Oranye'], ['#6b45c9', 'Ungu'], ['#0f8b8d', 'Toska']]
const NEW_CARD = { title: 'Kartu baru', text: '', button: 'Kunjungi', link: '/', color: '#0b6bcb', art: 'survei', image: '' }

function ImageField({ label, hint, value, onUpload, onClear, busy, previewStyle }) {
  return (
    <div className="field">
      <span style={{ fontWeight: 600, fontSize: '.9rem' }}>{label} {hint && <small>{hint}</small>}</span>
      {value && <img src={value} alt="" style={{ maxHeight: 120, maxWidth: '100%', width: 'auto', borderRadius: 6, background: '#0a1140', ...previewStyle }} />}
      <div className="row">
        <label className="btn btn-sm btn-ghost" style={{ cursor: 'pointer' }}>
          {busy ? 'Mengunggah…' : value ? 'Ganti gambar' : 'Unggah gambar'}
          <input type="file" accept="image/*" hidden disabled={busy} onChange={onUpload} />
        </label>
        {value && <button type="button" className="btn btn-sm btn-danger-ghost" onClick={onClear}>Hapus</button>}
      </div>
    </div>
  )
}

export default function Settings() {
  const { reload } = useSettings()
  const [f, setF] = useState(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [uploading, setUploading] = useState('')

  useEffect(() => {
    supabase.from('site_settings').select('*').then(({ data }) => {
      const o = { ...DEFAULTS }
      ;(data || []).forEach((r) => { o[r.key] = r.value })
      o.sections = { ...DEFAULTS.sections, ...(o.sections || {}) }
      o.info_cards = o.info_cards || []
      o.landing_cards = Array.isArray(o.landing_cards) ? o.landing_cards : DEFAULTS.landing_cards
      setF(o)
    })
  }, [])

  if (!f) return <p className="muted">Memuat…</p>
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const card = (i, k) => (e) => setF({ ...f, info_cards: f.info_cards.map((c, j) => (j === i ? { ...c, [k]: e.target.value } : c)) })

  // Unggah gambar lalu simpan URL-nya lewat fungsi apply(url)
  const uploadTo = (slot, folder, apply) => async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setErr(''); setUploading(slot)
    try { const url = await uploadMedia(file, folder); setF((prev) => apply(prev, url)) }
    catch (ex) { setErr('Gagal mengunggah gambar: ' + ex.message) }
    setUploading('')
  }
  const upload = uploadTo('logo', 'logo', (p, url) => ({ ...p, logo_url: url }))
  const lcard = (i, k) => (e) => setF({ ...f, landing_cards: f.landing_cards.map((c, j) => (j === i ? { ...c, [k]: e.target.value } : c)) })
  const moveCard = (i, d) => {
    const arr = [...f.landing_cards]; const j = i + d
    if (j < 0 || j >= arr.length) return
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
    setF({ ...f, landing_cards: arr })
  }
  const toggle = (k) => (e) => setF({ ...f, sections: { ...f.sections, [k]: e.target.checked } })

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
      <header className="row">
        <div><h1 style={{ fontSize: '2.4rem' }}>Tampilan situs</h1><p>Atur identitas, beranda, halaman Dashboard, dan layar antrian tanpa mengubah kode.</p></div>
        <span className="spacer" />
        <a className="btn btn-ghost" href="/" target="_blank" rel="noreferrer">Lihat beranda</a>
      </header>
      <form className="editor" style={{ maxWidth: 760 }} onSubmit={save}>
        {err && <div className="alert err">{err}</div>}

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
          <h3>Beranda — bagian atas (hero)</h3>
          <p className="muted">Bagian paling atas beranda: label, judul besar dengan kata yang berganti seperti diketik, slogan, lalu gambar gedung.</p>
          <label className="field">Label di atas judul <small>kosongkan untuk memakai nama instansi</small>
            <input value={f.hero_label} onChange={set('hero_label')} placeholder={f.org_name} />
          </label>
          <label className="field">Judul <small>bagian yang tetap, misalnya "Cara mudah mengurus"</small>
            <input value={f.hero_prefix} onChange={set('hero_prefix')} />
          </label>
          <label className="field">Kata yang berganti <small>pisahkan dengan koma; tampil merah dan diketik bergantian</small>
            <input value={f.hero_words} onChange={set('hero_words')} placeholder="KTP-el, Akta Kelahiran, Paspor" />
          </label>
          <label className="field">Slogan di bawah judul<input value={f.hero_tagline} onChange={set('hero_tagline')} /></label>

          <h3 style={{ marginTop: 8 }}>Latar belakang</h3>
          <div className="row" style={{ alignItems: 'end' }}>
            <label className="field">Warna latar<input type="color" value={f.hero_bg_color} onChange={set('hero_bg_color')} /></label>
            <label className="row" style={{ fontWeight: 600, paddingBottom: 10 }}>
              <input type="checkbox" checked={!!f.hero_pattern} onChange={(e) => setF({ ...f, hero_pattern: e.target.checked })} /> Pola titik
            </label>
          </div>
          <ImageField
            label="Foto latar penuh" hint="opsional — menggantikan warna & pola; foto digelapkan agar teks tetap terbaca"
            value={f.hero_bg_image} busy={uploading === 'bg'}
            onUpload={uploadTo('bg', 'beranda', (p, url) => ({ ...p, hero_bg_image: url }))}
            onClear={() => setF({ ...f, hero_bg_image: '' })}
          />
          {f.hero_bg_image && (
            <label className="field" style={{ maxWidth: 320 }}>Kegelapan foto latar: {f.hero_bg_dim}%
              <input type="range" min={0} max={85} step={5} value={f.hero_bg_dim} onChange={(e) => setF({ ...f, hero_bg_dim: Number(e.target.value) })} />
            </label>
          )}
          <ImageField
            label="Gambar gedung" hint="foto gedung kantor; paling bagus PNG tanpa latar (lebar ±1600 px). Kosong = ilustrasi gedung bawaan"
            value={f.hero_image} busy={uploading === 'gedung'}
            onUpload={uploadTo('gedung', 'beranda', (p, url) => ({ ...p, hero_image: url }))}
            onClear={() => setF({ ...f, hero_image: '' })}
            previewStyle={{ background: f.hero_bg_color }}
          />
        </section>

        <section className="card editor">
          <h3>Beranda — kartu pintasan</h3>
          <p className="muted">Kartu di bawah gambar gedung (maksimal 4). Tautan bisa halaman situs ini, misalnya <code>/antrian</code>, atau alamat luar seperti formulir survei <code>https://…</code>.</p>
          {f.landing_cards.map((c, i) => (
            <div className="card editor" key={i} style={{ borderLeft: `4px solid ${c.color}` }}>
              <div className="row">
                <b>Kartu {i + 1}</b><span className="spacer" />
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => moveCard(i, -1)} disabled={i === 0} aria-label="Geser ke kiri">↑</button>
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => moveCard(i, 1)} disabled={i === f.landing_cards.length - 1} aria-label="Geser ke kanan">↓</button>
                <button type="button" className="btn btn-sm btn-danger-ghost" onClick={() => setF({ ...f, landing_cards: f.landing_cards.filter((_, j) => j !== i) })}>Hapus</button>
              </div>
              <div className="grid-2">
                <label className="field">Judul<input value={c.title} onChange={lcard(i, 'title')} /></label>
                <label className="field">Tulisan tombol<input value={c.button} onChange={lcard(i, 'button')} /></label>
              </div>
              <label className="field">Keterangan singkat<input value={c.text} onChange={lcard(i, 'text')} /></label>
              <div className="grid-2">
                <label className="field">Tautan<input value={c.link} onChange={lcard(i, 'link')} placeholder="/antrian atau https://…" /></label>
                <label className="field">Warna tombol
                  <select value={COLORS.some(([v]) => v === c.color) ? c.color : ''} onChange={lcard(i, 'color')}>
                    {COLORS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    {!COLORS.some(([v]) => v === c.color) && <option value="">Lainnya</option>}
                  </select>
                </label>
              </div>
              <div className="grid-2">
                <label className="field">Ilustrasi bawaan
                  <select value={c.art} onChange={lcard(i, 'art')} disabled={!!c.image}>
                    {ARTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </label>
                <ImageField
                  label="Atau gambar sendiri" value={c.image} busy={uploading === 'card' + i}
                  previewStyle={{ background: '#fff', maxHeight: 80 }}
                  onUpload={uploadTo('card' + i, 'beranda', (p, url) => ({ ...p, landing_cards: p.landing_cards.map((x, j) => (j === i ? { ...x, image: url } : x)) }))}
                  onClear={() => setF({ ...f, landing_cards: f.landing_cards.map((x, j) => (j === i ? { ...x, image: '' } : x)) })}
                />
              </div>
            </div>
          ))}
          {f.landing_cards.length < 4 && (
            <div><button type="button" className="btn btn-sm btn-ghost" onClick={() => setF({ ...f, landing_cards: [...f.landing_cards, { ...NEW_CARD }] })}>+ Tambah kartu</button></div>
          )}
        </section>

        <section className="card editor">
          <h3>Bagian lain yang ditampilkan</h3>
          <div className="field">
            <span style={{ fontWeight: 600, fontSize: '.9rem' }}>Beranda</span>
            <div className="checks">
              {LANDING_SECTIONS.map(([k, l]) => <label key={k}><input type="checkbox" checked={!!f.sections[k]} onChange={toggle(k)} />{l}</label>)}
            </div>
          </div>
          <div className="field">
            <span style={{ fontWeight: 600, fontSize: '.9rem' }}>Halaman Dashboard (menu "Dashboard")</span>
            <div className="checks">
              {DASHBOARD_SECTIONS.map(([k, l]) => <label key={k}><input type="checkbox" checked={!!f.sections[k]} onChange={toggle(k)} />{l}</label>)}
            </div>
          </div>
          <label className="field">Judul halaman Dashboard<input value={f.hero_title} onChange={set('hero_title')} /></label>
          <label className="field">Kalimat pendukung Dashboard<textarea rows={2} value={f.hero_subtitle} onChange={set('hero_subtitle')} /></label>
          <label className="field">Teks berjalan <small>tampil di halaman Dashboard dan di layar antrian</small><textarea rows={2} value={f.running_text} onChange={set('running_text')} /></label>
        </section>

        <section className="card editor">
          <h3>Kartu informasi</h3>
          <p className="muted">Misalnya persyaratan, alur layanan, atau imbauan. Tampil sebagai kartu di halaman Dashboard.</p>
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
          <h3>Kontak <small className="muted" style={{ fontFamily: 'var(--font)', fontWeight: 400, fontSize: '.85rem' }}>tampil di kaki halaman</small></h3>
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

        <div className="save-bar">
          <button className="btn btn-primary btn-lg" disabled={busy || !!uploading}>{busy ? 'Menyimpan…' : 'Simpan pengaturan'}</button>
          {msg && <span className="muted">{msg}</span>}
        </div>
      </form>
    </>
  )
}
