import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { fmtDate } from '../../lib/util'

const CATS = [['', 'Semua'], ['berita', 'Berita'], ['pengumuman', 'Pengumuman'], ['info', 'Info']]

function Detail({ slug }) {
  const [post, setPost] = useState(undefined)
  useEffect(() => {
    supabase.from('posts').select('*').eq('slug', slug).eq('published', true).maybeSingle()
      .then(({ data }) => setPost(data || null))
  }, [slug])

  if (post === undefined) return <div className="container"><p className="page muted">Memuat…</p></div>
  if (post === null) {
    return (
      <div className="container"><div className="page stack">
        <h2>Tulisan tidak ditemukan</h2>
        <Link to="/berita">← Kembali ke daftar berita</Link>
      </div></div>
    )
  }
  return (
    <div className="container">
      <article className="article stack" style={{ paddingTop: 36 }}>
        <Link to="/berita">← Semua berita</Link>
        <span className="news-meta">{post.category} · {fmtDate(post.published_at)}</span>
        <h1 style={{ fontSize: 'clamp(2rem,4vw,3rem)' }}>{post.title}</h1>
        {post.cover_url && <img src={post.cover_url} alt="" style={{ borderRadius: 12, width: '100%' }} />}
        <div className="article-body">
          {(post.content || '').split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}
        </div>
      </article>
    </div>
  )
}

function List() {
  const [cat, setCat] = useState('')
  const [posts, setPosts] = useState(null)
  useEffect(() => {
    let q = supabase.from('posts').select('id,title,slug,category,excerpt,cover_url,published_at')
      .eq('published', true).order('published_at', { ascending: false })
    if (cat) q = q.eq('category', cat)
    q.then(({ data }) => setPosts(data || []))
  }, [cat])

  return (
    <div className="container" style={{ paddingTop: 36 }}>
      <div className="section-head"><h2>Berita & pengumuman</h2></div>
      <div className="row" style={{ marginBottom: 18 }}>
        {CATS.map(([v, l]) => (
          <button key={v} className={'btn btn-sm ' + (cat === v ? 'btn-primary' : 'btn-ghost')} onClick={() => setCat(v)}>{l}</button>
        ))}
      </div>
      {posts === null ? <p className="muted">Memuat…</p> : posts.length === 0 ? (
        <div className="card muted">Belum ada tulisan di kategori ini.</div>
      ) : (
        <div className="news-grid">
          {posts.map((p) => (
            <Link key={p.id} className="card news-card" to={`/berita/${p.slug}`}>
              <div className="news-cover" style={p.cover_url ? { backgroundImage: `url(${p.cover_url})` } : undefined} />
              <div className="news-body">
                <span className="news-meta">{p.category} · {fmtDate(p.published_at)}</span>
                <h3>{p.title}</h3>
                {p.excerpt && <p className="muted">{p.excerpt}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default function News() {
  const { slug } = useParams()
  return slug ? <Detail slug={slug} /> : <List />
}
