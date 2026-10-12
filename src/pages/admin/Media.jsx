import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { uploadMedia } from '../../lib/media'
import { youtubeId } from '../../lib/util'
import Crud from '../../components/Crud.jsx'
import PromoPlayer from '../../components/PromoPlayer.jsx'

const KIND = { image: 'Gambar', video: 'Video', youtube: 'YouTube' }

function Thumb({ row }) {
  if (row.kind === 'image') return <img className="thumb" src={row.url} alt="" />
  if (row.kind === 'video') return <video className="thumb" src={row.url} muted preload="metadata" />
  const id = youtubeId(row.url)
  return id ? <img className="thumb" src={`https://img.youtube.com/vi/${id}/mqdefault.jpg`} alt="" /> : <span className="thumb" />
}

export default function Media() {
  const [rows, setRows] = useState([])
  const [mode, setMode] = useState('file')
  const [title, setTitle] = useState('')
  const [duration, setDuration] = useState(10)
  const [link, setLink] = useState('')
  const [linkKind, setLinkKind] = useState('image')
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [preview, setPreview] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase.from('promo_media').select('*').order('sort')
    setRows(data || [])
  }, [])
  useEffect(() => { load() }, [load])

  const add = async (e) => {
    e.preventDefault()
    setBusy(true); setErr('')
    try {
      let kind, url
      if (mode === 'file') {
        if (!file) throw new Error('Pilih berkas gambar atau video terlebih dahulu.')
        kind = file.type.startsWith('video') ? 'video' : 'image'
        url = await uploadMedia(file, 'promo')
      } else if (mode === 'youtube') {
        if (!youtubeId(link)) throw new Error('Tautan YouTube tidak dikenali.')
        kind = 'youtube'; url = link.trim()
      } else {
        if (!/^https?:\/\//.test(link)) throw new Error('Tautan harus diawali http:// atau https://')
        kind = linkKind; url = link.trim()
      }
      const { error } = await supabase.from('promo_media').insert({
        title: title.trim() || 'Promosi', kind, url, duration_sec: Number(duration) || 10, sort: rows.length + 1,
      })
      if (error) throw error
      setTitle(''); setLink(''); setFile(null); e.target.reset()
      load()
    } catch (ex) { setErr(ex.message) }
    setBusy(false)
  }

  const activeItems = rows.filter((r) => r.active)

  return (
    <>
      <header>
        <h1 style={{ fontSize: '2.4rem' }}>Media promosi</h1>
        <p>Diputar bergantian di layar antrian (/display), layar promosi (/promo), dan beranda. Video berpindah saat selesai; gambar dan YouTube berpindah sesuai durasi.</p>
      </header>

      <form className="card editor panel" onSubmit={add} style={{ maxWidth: 760 }}>
        <h3>Tambah media</h3>
        {err && <div className="alert err">{err}</div>}
        <div className="checks">
          <label><input type="radio" checked={mode === 'file'} onChange={() => setMode('file')} /> Unggah poster / video</label>
          <label><input type="radio" checked={mode === 'youtube'} onChange={() => setMode('youtube')} /> Tautan YouTube</label>
          <label><input type="radio" checked={mode === 'url'} onChange={() => setMode('url')} /> Tautan gambar/video</label>
        </div>
        <label className="field">Judul <small>tampil sebagai teks di bawah media</small><input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} /></label>
        {mode === 'file' && (
          <label className="field">Berkas <small>JPG/PNG/WebP atau MP4/WebM. Batas ukuran mengikuti paket Supabase (gratis: 50 MB per berkas).</small>
            <input type="file" accept="image/*,video/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </label>
        )}
        {mode !== 'file' && (
          <label className="field">Tautan<input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://" /></label>
        )}
        {mode === 'url' && (
          <label className="field">Jenis
            <select value={linkKind} onChange={(e) => setLinkKind(e.target.value)}><option value="image">Gambar</option><option value="video">Video</option></select>
          </label>
        )}
        <label className="field" style={{ maxWidth: 200 }}>Durasi tampil (detik)<input type="number" min={3} value={duration} onChange={(e) => setDuration(e.target.value)} /></label>
        <div><button className="btn btn-primary" disabled={busy}>{busy ? 'Mengunggah…' : 'Tambahkan'}</button></div>
      </form>

      <section className="panel">
        <div className="row"><h3>Daftar media</h3><span className="spacer" />
          <button className="btn btn-sm btn-ghost" onClick={() => setPreview(!preview)} disabled={!activeItems.length}>{preview ? 'Tutup pratinjau' : 'Pratinjau pemutaran'}</button>
        </div>
        {preview && <div className="promo-frame" style={{ maxWidth: 640 }}><PromoPlayer items={activeItems} /></div>}
        <Crud
          table="promo_media" rows={rows} onChange={load} empty="Belum ada media promosi."
          fields={[
            { key: 'preview', label: 'Pratinjau', type: 'custom', width: 120, render: (r) => <Thumb row={r} /> },
            { key: 'title', label: 'Judul', type: 'text' },
            { key: 'kind', label: 'Jenis', type: 'custom', width: 90, render: (r) => <span className="badge">{KIND[r.kind]}</span> },
            { key: 'duration_sec', label: 'Detik', type: 'number', width: 90 },
            { key: 'sort', label: 'Urutan', type: 'number', width: 90 },
            { key: 'active', label: 'Aktif', type: 'bool', width: 70 },
          ]}
        />
        <p className="muted">Menghapus entri tidak menghapus berkas di penyimpanan Supabase; hapus manual dari Storage bila perlu.</p>
      </section>
    </>
  )
}
