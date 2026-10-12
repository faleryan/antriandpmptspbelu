// Instansi tiruan untuk layanan yang belum dikaitkan ke instansi mana pun.
export const NO_AGENCY = { id: 'none', name: 'Layanan umum', short_name: 'Umum', logo_url: '' }

export const agencyOf = (service, agencies) =>
  (service?.agency_id && agencies.find((a) => a.id === service.agency_id)) || NO_AGENCY

// Kelompokkan layanan per instansi, urut sesuai kolom "sort".
// activeOnly: sembunyikan instansi/layanan nonaktif (untuk halaman publik & kiosk).
export function groupServices(agencies, services, { activeOnly = true } = {}) {
  const ags = [...agencies].sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name))
  const visible = activeOnly ? ags.filter((a) => a.active) : ags
  const known = new Set(ags.map((a) => a.id))
  const svcs = [...services].filter((s) => !activeOnly || s.active).sort((a, b) => a.sort - b.sort)
  const groups = visible.map((a) => ({ agency: a, services: svcs.filter((s) => s.agency_id === a.id) }))
  const orphan = svcs.filter((s) => !s.agency_id || !known.has(s.agency_id))
  if (orphan.length) groups.push({ agency: NO_AGENCY, services: orphan })
  return groups.filter((g) => g.services.length > 0)
}
