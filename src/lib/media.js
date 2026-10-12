import { supabase } from './supabase'

// Unggah file ke bucket "media" (hanya admin) dan kembalikan URL publiknya.
export async function uploadMedia(file, folder = 'misc') {
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase()
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await supabase.storage.from('media').upload(path, file, { cacheControl: '3600', upsert: false })
  if (error) throw error
  return supabase.storage.from('media').getPublicUrl(path).data.publicUrl
}
