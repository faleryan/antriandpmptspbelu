// Logo instansi; bila belum diunggah, tampilkan inisial nama singkatnya.
export default function AgencyLogo({ agency, size = 48, className = '' }) {
  const label = (agency?.short_name || agency?.name || '?').trim()
  const style = { width: size, height: size }
  if (agency?.logo_url) {
    return <img className={'ag-logo ' + className} style={style} src={agency.logo_url} alt="" />
  }
  const initials = label.split(/\s+/).map((w) => w[0]).join('').slice(0, 3).toUpperCase()
  return (
    <span className={'ag-logo ag-logo-fallback ' + className} style={{ ...style, fontSize: size * 0.36 }} aria-hidden="true">
      {initials}
    </span>
  )
}
