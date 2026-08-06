const $ = (id) => document.getElementById(id)

export async function renderSponsors() {
  const container = $('sponsors')
  if (!container) return

  let sponsors
  try {
    const res = await fetch('/sponsors.json')
    sponsors = res.ok ? await res.json() : []
  } catch {
    return
  }
  if (!Array.isArray(sponsors)) return

  container.innerHTML = ''
  sponsors
    .filter((s) => s?.name && s?.logo && s?.link)
    .forEach((sponsor) => {
      const link = document.createElement('a')
      link.href = sponsor.link
      link.target = '_blank'
      link.rel = 'noopener noreferrer'
      link.title = sponsor.name
      link.className = 'opacity-30 hover:opacity-70 transition-opacity'

      const img = document.createElement('img')
      img.src = sponsor.logo
      img.alt = sponsor.name
      img.className = 'h-5 w-auto grayscale'

      link.appendChild(img)
      container.appendChild(link)
    })
}
