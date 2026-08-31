const MAX_REMOTE_IMAGE_BYTES = 20 * 1024 * 1024

/**
 * Downloads a remote image so it can go through the same upload path as a
 * picked file. Throws when the host blocks cross-origin reads or the response
 * isn't an image — callers are expected to carry on without a photo.
 */
export async function fetchImageAsFile(url: string): Promise<File> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Kunde inte hämta bilden (HTTP ${res.status})`)

  const blob = await res.blob()
  if (!blob.type.startsWith('image/')) throw new Error('Länken pekar inte på en bild')
  if (blob.size === 0) throw new Error('Tom bild')
  if (blob.size > MAX_REMOTE_IMAGE_BYTES) throw new Error('Bilden är för stor')

  return new File([blob], filenameFromUrl(url), { type: blob.type })
}

function filenameFromUrl(url: string): string {
  try {
    const base = new URL(url).pathname.split('/').pop()
    if (base && /\.(jpe?g|png|webp|gif|avif)$/i.test(base)) return base
  } catch {
    // Fall through to the default name.
  }
  return 'recept.jpg'
}

export async function fileToCompressedDataUrl(
  file: File,
  maxDim = 1600,
  quality = 0.85
): Promise<string> {
  const objectUrl = URL.createObjectURL(file)
  try {
    const img = await loadImage(objectUrl)
    const { width, height } = scaledSize(img.naturalWidth, img.naturalHeight, maxDim)

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Kunde inte skapa canvas-kontext')
    ctx.drawImage(img, 0, 0, width, height)
    return canvas.toDataURL('image/jpeg', quality)
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Kunde inte läsa bilden'))
    img.src = src
  })
}

function scaledSize(w: number, h: number, maxDim: number): { width: number; height: number } {
  const longest = Math.max(w, h)
  if (longest <= maxDim) return { width: w, height: h }
  const scale = maxDim / longest
  return { width: Math.round(w * scale), height: Math.round(h * scale) }
}
