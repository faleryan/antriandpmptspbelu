import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Crud from '../../components/Crud.jsx'

export default function Services() {
  const [services, setServices] = useState([])
  const [counters, setCounters] = useState([])

  const load = useCallback(async () => {
    const [s, c] = await Promise.all([
      supabase.from('services').select('*').order('sort'),
      supabase.from('counters').select('*').order('name'),
    ])
    setServices(s.data || [])
    setCounters(c.data || [])
  }, [])
  useEffect(() => { load() }, [load])

  const nextCode = () => {
    const used = new Set(services.map((x) => x.code))
    return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').find((l) => !used.has(l)) || 'Z' + (services.length + 1)
  }

  return (
    <>
      <header>
        <h1 style={{ fontSize: '2.4rem' }}>Layanan & loket</h1>
        <p>Kode layanan menjadi awalan nomor antrian (contoh A-001). Ubah isian langsung di tabel; tersimpan saat Anda berpindah kolom.</p>
      </header>

      <section className="panel">
        <h3>Layanan</h3>
        <Crud
          table="services" rows={services} onChange={load} addLabel="Tambah layanan"
          newRow={{ code: nextCode(), name: 'Layanan baru', est_minutes: 10, sort: services.length + 1 }}
          fields={[
            { key: 'code', label: 'Kode', type: 'text', width: 80 },
            { key: 'name', label: 'Nama layanan', type: 'text' },
            { key: 'description', label: 'Keterangan', type: 'text' },
            { key: 'est_minutes', label: 'Menit/orang', type: 'number', width: 110 },
            { key: 'sort', label: 'Urutan', type: 'number', width: 90 },
            { key: 'active', label: 'Aktif', type: 'bool', width: 70 },
          ]}
        />
        <p className="muted">Menghapus layanan juga menghapus riwayat nomor antriannya. Untuk menyembunyikan, cukup nonaktifkan.</p>
      </section>

      <section className="panel">
        <h3>Loket</h3>
        <Crud
          table="counters" rows={counters} onChange={load} addLabel="Tambah loket"
          newRow={{ name: `Loket ${counters.length + 1}` }}
          fields={[
            { key: 'name', label: 'Nama loket', type: 'text' },
            {
              key: 'service_id', label: 'Melayani', type: 'select',
              options: [{ value: '', label: 'Semua layanan' }, ...services.map((x) => ({ value: x.id, label: `${x.code} — ${x.name}` }))],
            },
            { key: 'active', label: 'Aktif', type: 'bool', width: 70 },
          ]}
        />
      </section>
    </>
  )
}
