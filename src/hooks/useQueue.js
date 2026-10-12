import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { todayStr } from '../lib/util'

// Memuat tiket hari ini + layanan + loket, dan memperbaruinya secara realtime.
// staff=true menyertakan nama/telepon pengunjung (hanya terisi bila login sebagai staf).
export function useQueue({ staff = false } = {}) {
  const [state, setState] = useState({ tickets: [], services: [], counters: [], loading: true })

  const load = useCallback(async () => {
    const sel = staff ? '*, ticket_visitors(visitor_name, phone)' : '*'
    const [t, s, c] = await Promise.all([
      supabase.from('tickets').select(sel).eq('queue_date', todayStr()).order('created_at', { ascending: true }),
      supabase.from('services').select('*').order('sort'),
      supabase.from('counters').select('*').order('name'),
    ])
    setState({ tickets: t.data || [], services: s.data || [], counters: c.data || [], loading: false })
  }, [staff])

  useEffect(() => {
    load()
    let timer
    const debounced = () => { clearTimeout(timer); timer = setTimeout(load, 200) }
    const ch = supabase.channel('queue-' + Math.random().toString(36).slice(2))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, debounced)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'services' }, debounced)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'counters' }, debounced)
      .subscribe()
    const iv = setInterval(load, 20000) // cadangan bila koneksi realtime terputus / pergantian hari
    return () => { clearTimeout(timer); clearInterval(iv); supabase.removeChannel(ch) }
  }, [load])

  return { ...state, reload: load }
}
