import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { uploadMedia } from '../../lib/media'
import Crud from '../../components/Crud.jsx'
import AgencyLogo from '../../components/AgencyLogo.jsx'

function LogoCell({ agency, onDone }) {
  const [busy, setBusy] = useState(false)
  const change = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    try {
      const url = await uploadMedia(file, 'instansi')
      const { error } = await supabase.from('agencies').update({ logo_url: url }).eq('id', agency.id)
      if (error) throw error
    } catch (ex) { alert('Gagal mengunggah logo: ' + ex.message) }
    setBusy(false)
    onDone()
  }
  return (
    <div className="ag-cell">
      <AgencyLogo agency={agency} size={44} />
      <label className="btn btn-sm btn-ghost" style={{ cursor: 'pointer' }}>
        {busy ? 'Mengunggah…' : agency.logo_url ? 'Ganti' : 'Unggah'}
        <input type="file" accept="image/*" hidden onChange={change} disabled={busy} />
      </label>
    </div>
  )
}

export default function Services() {
  const [agencies, setAgencies] = useState([])
  const [services, setServices] = useState([])
  const [counters, setCounters] = useState([])
  const [filter, setFilter] = useState('')

  const load = useCallback(async () => {
    const [a, s, c] = await Promise.all([
      supabase.from('agencies').select('*').order('sort'),
      supabase.from('services').select('*').order('sort'),
      supabase.from('counters').select('*').order('name'),
    ])
    setAgencies(a.data || [])
    setServices(s.data || [])
    setCounters(c.data || [])
  }, [])
  useEffect(() => { load() }, [load])

  const nextCode = () => {
    const used = new Set(services.map((x) => x.code))
    return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').find((l) => !used.has(l))
      || ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].flatMap((l) => [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => l + n)).find((c) => !used.has(c))
  }
  const agencyOptions = [{ value: '', label: '— Tanpa instansi —' }, ...agencies.map((a) => ({ value: a.id, label: a.short_name || a.name }))]
  const agencyShort = (id) => agencies.find((a) => a.id === id)?.short_name || agencies.find((a) => a.id === id)?.name || 'Umum'
  const shownServices = filter ? services.filter((x) => (filter === 'none' ? !x.agency_id : x.agency_id === filter)) : services
  const noAgency = services.filter((x) => !x.agency_id).length

  return (
    <>
      <header>
        <h1 style={{ fontSize: '2.4rem' }}>Instansi, layanan & loket</h1>
        <p>Pengunjung memilih instansi dulu, lalu jenis layanannya. Ubah isian langsung di tabel; tersimpan saat Anda berpindah kolom.</p>
      </header>

      <section className="panel">
        <h3>Instansi</h3>
        <Crud
          table="agencies" rows={agencies} onChange={load} addLabel="Tambah instansi"
          newRow={{ name: 'Instansi baru', short_name: '', sort: agencies.length + 1 }}
          empty="Belum ada instansi. Tambahkan instansi, unggah logonya, lalu kaitkan layanan di bawah."
          fields={[
            { key: 'logo', label: 'Logo', type: 'custom', width: 150, render: (r) => <LogoCell agency={r} onDone={load} /> },
            { key: 'name', label: 'Nama instansi', type: 'text' },
            { key: 'short_name', label: 'Nama singkat', type: 'text', width: 160 },
            { key: 'sort', label: 'Urutan', type: 'number', width: 90 },
            { key: 'active', label: 'Aktif', type: 'bool', width: 70 },
          ]}
        />
        <p className="muted">Logo sebaiknya persegi dengan latar putih/transparan (PNG). Nama singkat dipakai di layar operator dan bila logo belum diunggah.</p>
      </section>

      <section className="panel">
        <div className="row">
          <h3>Jenis layanan</h3>
          <span className="spacer" />
          <select style={{ width: 'auto' }} value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Saring per instansi">
            <option value="">Semua instansi</option>
            {agencies.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            {noAgency > 0 && <option value="none">Tanpa instansi ({noAgency})</option>}
          </select>
        </div>
        {noAgency > 0 && agencies.length > 0 && (
          <div className="alert info">{noAgency} layanan belum punya instansi dan tampil sebagai "Layanan umum". Pilih instansinya di kolom Instansi.</div>
        )}
        <Crud
          table="services" rows={shownServices} onChange={load} addLabel="Tambah layanan"
          newRow={{ code: nextCode(), name: 'Layanan baru', est_minutes: 10, sort: services.length + 1, agency_id: filter && filter !== 'none' ? filter : (agencies[0]?.id || null) }}
          fields={[
            { key: 'agency_id', label: 'Instansi', type: 'select', options: agencyOptions, width: 170 },
            { key: 'code', label: 'Kode', type: 'text', width: 80 },
            { key: 'name', label: 'Nama layanan', type: 'text' },
            { key: 'description', label: 'Keterangan', type: 'text' },
            { key: 'est_minutes', label: 'Menit/orang', type: 'number', width: 110 },
            { key: 'sort', label: 'Urutan', type: 'number', width: 90 },
            { key: 'active', label: 'Aktif', type: 'bool', width: 70 },
          ]}
        />
        <p className="muted">Kode layanan harus unik di semua instansi dan menjadi awalan nomor (contoh A-001). Menghapus layanan juga menghapus riwayat nomornya beserta rekapnya — untuk menyembunyikan, cukup nonaktifkan.</p>
      </section>

      <section className="panel">
        <h3>Loket</h3>
        <Crud
          table="counters" rows={counters} onChange={load} addLabel="Tambah loket"
          newRow={{ name: `Loket ${counters.length + 1}`, agency_id: agencies[0]?.id || null }}
          fields={[
            { key: 'name', label: 'Nama loket', type: 'text' },
            { key: 'agency_id', label: 'Instansi', type: 'select', options: [{ value: '', label: 'Semua instansi' }, ...agencies.map((a) => ({ value: a.id, label: a.short_name || a.name }))], width: 180 },
            {
              key: 'service_id', label: 'Khusus layanan', type: 'select', width: 280,
              options: [{ value: '', label: 'Semua layanan' }, ...services.map((x) => ({ value: x.id, label: `${x.code} — ${x.name} (${agencyShort(x.agency_id)})` }))],
            },
            { key: 'active', label: 'Aktif', type: 'bool', width: 70 },
          ]}
        />
        <p className="muted">Loket memanggil nomor sesuai aturan ini: bila "Khusus layanan" diisi, hanya layanan itu; bila tidak, semua layanan milik instansinya; bila instansi juga kosong, semua layanan.</p>
      </section>
    </>
  )
}
