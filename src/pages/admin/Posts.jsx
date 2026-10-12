import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { uploadMedia } from '../../lib/media'
import { fmtDate, slugify } from '../../lib/util'

const BLANK = { title: '', category: 'berita', excerpt: '', content: '', cover_url: '', published: true }

export default function Posts() {
  const [posts, setPosts] = useState([])
  const [edit, setEdit] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    const { data } = await supabase.from('posts').select('*').order('created_at', { ascending: false })
    setPosts(data || [])
  }, [])
  useEffect(() => { load() }, [load])

  const set = (k) => (e) => setEdit({ ...edit, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  const upload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true); setErr('')
    try { setEdit((p) => ({ ...p, cover_url: '' })); const url = await uploadMedia(file, 'berita'); setEdit((p) => ({ ...p, cover_url: url })) }
    catch (ex) { setErr('Gagal mengunggah: ' + ex.message) }
    setBusy(false)
  }

  const save = async (e) => {
    e.preventDefault()
    setBusy(true); setErr('')
    const payload = {
      title: edit.title.trim(), category: edit.category, excerpt: edit.excerpt || null,
      content: edit.content || null, cover_url: edit.cover_url || null, published: edit.published,
      published_at: edit.published ? (edit.published_at || new Date().toISOString()) : edit.published_at || null,
    }
    const res = edit.id
      ? await supabase.from('posts').update(payload).eq('id', edit.id)
      : await supabase.from('posts').insert({ ...payload, slug: `${slugify(payload.title)}-${Math.random().toString(36).slice(2, 6)}` })
    setBusy(false)
    if (res.error) return setErr(res.error.message)
    setEdit(null); load()
  }

  const del = async (p) => {
    if (!confirm(`Hapus "${p.title}"?`)) return
    const { error } = await supabase.from('posts').delete().eq('id', p.id)
    if (error) alert(error.message)
    load()
  }
  const toggle = async (p) => {
    const { error } = await supabase.from('posts').update({ published: !p.published, published_at: p.published_at || new Date().toISOString() }).eq('id', p.id)
    if (error) alert(error.message)
    load()
  }

  if (edit) {
    return (
      <>
        <header><h1 style={{ fontSize: '2.4rem' }}>{edit.id ? 'Ubah tulisan' : 'Tulisan baru'}</h1></header>
        <form className="editor" style={{ maxWidth: 760 }} onSubmit={save}>
          {err && <div className="alert err">{err}</div>}
          <label className="field">Judul<input value={edit.title} onChange={set('title')} required maxLength={160} /></label>
          <label className="field">Kategori
            <select value={edit.category} onChange={set('category')}>
              <option value="berita">Berita</option><option value="pengumuman">Pengumuman</option><option value="info">Info</option>
            </select>
          </label>
          <label className="field">Ringkasan <small>tampil di kartu berita</small><textarea rows={2} value={edit.excerpt || ''} onChange={set('excerpt')} maxLength={300} /></label>
          <label className="field">Isi tulisan <small>pisahkan paragraf dengan satu baris kosong</small><textarea rows={12} value={edit.content || ''} onChange={set('content')} /></label>
          <div className="field">
            <span style={{ fontWeight: 600, fontSize: '.9rem' }}>Gambar sampul</span>
            {edit.cover_url && <img src={edit.cover_url} alt="" style={{ maxWidth: 320, borderRadius: 8 }} />}
            <input type="file" accept="image/*" onChange={upload} />
          </div>
          <label className="row" style={{ fontWeight: 600 }}><input type="checkbox" checked={edit.published} onChange={set('published')} /> Terbitkan di situs publik</label>
          <div className="row">
            <button className="btn btn-primary" disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan tulisan'}</button>
            <button type="button" className="btn btn-ghost" onClick={() => setEdit(null)}>Batal</button>
          </div>
        </form>
      </>
    )
  }

  return (
    <>
      <header className="row"><div><h1 style={{ fontSize: '2.4rem' }}>Berita</h1><p>Tulisan yang diterbitkan tampil di beranda dan halaman berita.</p></div><span className="spacer" /><button className="btn btn-primary" onClick={() => { setErr(''); setEdit({ ...BLANK }) }}>+ Tulisan baru</button></header>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th>Judul</th><th>Kategori</th><th>Status</th><th>Tanggal</th><th /></tr></thead>
          <tbody>
            {posts.length === 0 && <tr><td colSpan={5} className="muted">Belum ada tulisan.</td></tr>}
            {posts.map((p) => (
              <tr key={p.id}>
                <td><b>{p.title}</b></td>
                <td>{p.category}</td>
                <td><span className={'badge ' + (p.published ? 'badge-done' : '')}>{p.published ? 'Terbit' : 'Draf'}</span></td>
                <td>{fmtDate(p.published_at || p.created_at)}</td>
                <td className="row" style={{ justifyContent: 'flex-end' }}>
                  <button className="btn btn-sm btn-ghost" onClick={() => toggle(p)}>{p.published ? 'Tarik' : 'Terbitkan'}</button>
                  <button className="btn btn-sm btn-ghost" onClick={() => { setErr(''); setEdit(p) }}>Ubah</button>
                  <button className="btn btn-sm btn-danger-ghost" onClick={() => del(p)}>Hapus</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
