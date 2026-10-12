import { supabase } from '../lib/supabase'

// Tabel sunting-langsung untuk tabel sederhana (layanan, loket, media promosi).
// fields: [{ key, label, type: 'text'|'number'|'bool'|'select'|'custom', options?, render?, width? }]
export default function Crud({ table, rows, fields, onChange, newRow, addLabel = 'Tambah', canDelete = true, empty = 'Belum ada data.' }) {
  const save = async (id, patch) => {
    const { error } = await supabase.from(table).update(patch).eq('id', id)
    if (error) alert('Gagal menyimpan: ' + error.message)
    onChange?.()
  }
  const del = async (row) => {
    if (!confirm('Hapus data ini?')) return
    const { error } = await supabase.from(table).delete().eq('id', row.id)
    if (error) alert('Gagal menghapus: ' + error.message)
    onChange?.()
  }
  const add = async () => {
    const { error } = await supabase.from(table).insert(newRow)
    if (error) alert('Gagal menambah: ' + error.message)
    onChange?.()
  }

  const cell = (row, f) => {
    const v = row[f.key]
    const k = `${row.id}-${f.key}-${JSON.stringify(v)}`
    if (f.type === 'custom') return f.render(row)
    if (f.type === 'bool')
      return <input type="checkbox" checked={!!v} onChange={(e) => save(row.id, { [f.key]: e.target.checked })} aria-label={f.label} />
    if (f.type === 'select')
      return (
        <select value={v ?? ''} onChange={(e) => save(row.id, { [f.key]: e.target.value || null })} aria-label={f.label}>
          {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      )
    return (
      <input
        key={k} type={f.type === 'number' ? 'number' : 'text'} defaultValue={v ?? ''} aria-label={f.label}
        onBlur={(e) => {
          const raw = e.target.value
          const nv = f.type === 'number' ? Number(raw) : raw
          if (String(nv) !== String(v ?? '')) save(row.id, { [f.key]: nv })
        }}
      />
    )
  }

  return (
    <div className="stack">
      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>{fields.map((f) => <th key={f.key} style={{ width: f.width }}>{f.label}</th>)}{canDelete && <th style={{ width: 80 }} />}</tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={fields.length + 1} className="muted">{empty}</td></tr>}
            {rows.map((r) => (
              <tr key={r.id}>
                {fields.map((f) => <td key={f.key}>{cell(r, f)}</td>)}
                {canDelete && <td><button className="btn btn-sm btn-danger-ghost" onClick={() => del(r)}>Hapus</button></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {newRow && <div><button className="btn btn-sm btn-primary" onClick={add}>+ {addLabel}</button></div>}
    </div>
  )
}
