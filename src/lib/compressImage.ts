const MAX_LONG_EDGE = 1280
const JPEG_QUALITY = 0.82

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('画像の読み込みに失敗しました'))
    }
    img.src = url
  })
}

function scaleDimensions(width: number, height: number): { width: number; height: number } {
  const longEdge = Math.max(width, height)
  if (longEdge <= MAX_LONG_EDGE) return { width, height }
  const scale = MAX_LONG_EDGE / longEdge
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  }
}

/** スマホ写真を JPEG にリサイズ・圧縮する（目標 100〜300KB） */
export async function compressImage(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) {
    throw new Error('画像ファイルを選択してください')
  }

  let source: CanvasImageSource
  let srcWidth: number
  let srcHeight: number

  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    source = bitmap
    srcWidth = bitmap.width
    srcHeight = bitmap.height
  } else {
    const img = await loadImageFromFile(file)
    source = img
    srcWidth = img.naturalWidth
    srcHeight = img.naturalHeight
  }

  const { width, height } = scaleDimensions(srcWidth, srcHeight)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('画像の処理に失敗しました')

  ctx.drawImage(source, 0, 0, width, height)
  if (source instanceof ImageBitmap) {
    source.close()
  }

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('画像の圧縮に失敗しました'))),
      'image/jpeg',
      JPEG_QUALITY,
    )
  })

  return blob
}
