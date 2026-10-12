import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/Auth.jsx'
import { fmtDate } from '../../lib/util'

const ROLES = [
  ['admin', 'Admin utama'],
  ['operator', 'Operator'],
  ['pending', 'Menunggu persetujuan'],
  ['nonaktif', 'Nonaktif'],
]

export default function Users() {
  const { session } = useAuth()
  const [rows, setRows] = useState([])
  const [counters, setCounters] = useState([])

  const load = useCallback(async () => {
    const [p, c] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at'),
      supabase.from('counters').select('id,name').order('name'),
    ])
    setRows(p.data || [])
    setCounters(c.data || [])
  }, [])
  useEffect(() => { load() }, [load])

  const save = async (id, patch) => {
    const { error } = await supabase.from('profiles').update(patch).eq('id', id)
    if (error) alert('Gagal menyimpan: ' + error.message)
    load()
  }
  const pending = rows.filter((r) => r.role === 'pending').length

  return (
    <>
      <header>
        <h1 style={{ fontSize: '2.4rem' }}>Pengguna</h1>
        <p>Petugas mendaftar sendiri di halaman Masuk staf, lalu Anda aktifkan sebagai operator di sini.</p>
      </header>
      {pending > 0 && <div className="alert info" style={{ marginBottom: 14 }}>{pending} akun menunggu persetujuan. Ubah perannya menjadi Operator agar bisa masuk.</div>}
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th>Nama</th><th>Email</th><th>Peran</th><th>Loket bawaan</th><th>Terdaftar</th></tr></thead>
          <tbody>
            {rows.map((r) => {
              const self = r.id === session?.user.id
              return (
                <tr key={r.id}>
                  <td>
                    <input key={r.full_name} defaultValue={r.full_name || ''} aria-label="Nama"
                      onBlur={(e) => e.target.value !== (r.full_name || '') && save(r.id, { full_name: e.target.value })} />
                  </td>
                  <td>{r.email}{self && <span className="badge" style={{ marginLeft: 8 }}>Anda</span>}</td>
                  <td>
                    <select value={r.role} disabled={self} onChange={(e) => save(r.id, { role: e.target.value })} aria-label="Peran">
                      {ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </td>
                  <td>
                    <select value={r.counter_id || ''} onChange={(e) => save(r.id, { counter_id: e.target.value || null })} aria-label="Loket bawaan">
                      <option value="">—</option>
                      {counters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </td>
                  <td>{fmtDate(r.created_at)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="muted" style={{ marginTop: 10 }}>Peran Anda sendiri tidak dapat diubah dari sini agar tidak terkunci. Pengguna pertama yang mendaftar otomatis menjadi admin utama.</p>
    </>
  )
}
