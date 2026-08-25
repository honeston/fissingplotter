function defaultFilename(): string {
  return `cast-mark-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.jpg`
}

/** 共有シートまたはダウンロードで端末に画像を残す */
export async function saveImageToDevice(
  source: Blob | string,
  filename = defaultFilename(),
): Promise<void> {
  const blob =
    typeof source === 'string' ? await (await fetch(source)).blob() : source
  const file = new File([blob], filename, { type: blob.type || 'image/jpeg' })

  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: '釣果写真' })
      return
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      // 共有が使えない場合はダウンロードへ
    }
  }

  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
