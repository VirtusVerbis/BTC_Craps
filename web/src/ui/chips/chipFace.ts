import type { ChipColor, ChipMarker } from '../chipConstants'
import { CHIP_PALETTE, MARKER_PAINT } from './chipPalette'

/** View box of `bitcoin-mark.svg`. The mark sits in the gray center of a face. */
const MARK_VIEW_W = 273.6
const MARK_VIEW_H = 360
const MARK_D =
  'M217.021,167.042c18.631-9.483,30.288-26.184,27.565-54.007c-3.667-38.023-36.526-50.773-78.006-54.404l-0.008-52.741h-32.139l-0.009,51.354c-8.456,0-17.076,0.166-25.657,0.338L108.76,5.897l-32.11-0.003l-0.006,52.728c-6.959,0.142-13.793,0.277-20.466,0.277v-0.156l-44.33-0.018l0.006,34.282c0,0,23.734-0.446,23.343-0.013c13.013,0.009,17.262,7.559,18.484,14.076l0.01,60.083v84.397c-0.573,4.09-2.984,10.625-12.083,10.637c0.414,0.364-23.379-0.004-23.379-0.004l-6.375,38.335h41.817c7.792,0.009,15.448,0.13,22.959,0.19l0.028,53.338l32.102,0.009l-0.009-52.779c8.832,0.18,17.357,0.258,25.684,0.247l-0.009,52.532h32.138l0.018-53.249c54.022-3.1,91.842-16.697,96.544-67.385C266.916,192.612,247.692,174.396,217.021,167.042z M109.535,95.321c18.126,0,75.132-5.767,75.14,32.064c-0.008,36.269-56.996,32.032-75.14,32.032V95.321z M109.521,262.447l0.014-70.672c21.778-0.006,90.085-6.261,90.094,35.32C199.638,266.971,131.313,262.431,109.521,262.447z'

const FACE_PX = 256

let markPath: Path2D | null = null

const bitcoinPath = (): Path2D => {
  if (!markPath) markPath = new Path2D(MARK_D)
  return markPath
}

export const chipHex = (n: number): string => `#${n.toString(16).padStart(6, '0')}`

const wedge = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  start: number,
  end: number,
  color: string,
): void => {
  ctx.beginPath()
  ctx.moveTo(cx, cy)
  ctx.arc(cx, cy, radius, start, end)
  ctx.closePath()
  ctx.fillStyle = color
  ctx.fill()
}

/** Rim spots, and on the face a gray center plus the Bitcoin mark. */
export const paintChipCell = (
  ctx: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  size: number,
  spot: string,
  body: string,
  face: boolean,
): void => {
  const cx = originX + size / 2
  const cy = originY + size / 2
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, size / 2, 0, Math.PI * 2)
  ctx.clip()
  for (let i = 0; i < 5; i += 1) {
    const start = -Math.PI / 2 + (i * 72 * Math.PI) / 180
    const spotEnd = start + (16 * Math.PI) / 180
    const end = start + (72 * Math.PI) / 180
    wedge(ctx, cx, cy, size / 2, start, spotEnd, spot)
    wedge(ctx, cx, cy, size / 2, spotEnd, end, body)
  }
  if (face) {
    ctx.beginPath()
    ctx.arc(cx, cy, size * 0.35, 0, Math.PI * 2)
    ctx.fillStyle = '#d0d0d0'
    ctx.fill()
    const markW = size * 0.4256
    const markH = size * 0.56
    ctx.translate(cx - markW / 2, cy - markH / 2)
    ctx.scale(markW / MARK_VIEW_W, markH / MARK_VIEW_H)
    ctx.fillStyle = '#F7931A'
    ctx.fill(bitcoinPath())
  }
  ctx.restore()
}

/** Solid lammer. The edge has no spots. The face is the marker word and nothing else. */
export const paintMarkerCell = (
  ctx: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  size: number,
  marker: ChipMarker,
  face: boolean,
): void => {
  const paint = MARKER_PAINT[marker]
  const cx = originX + size / 2
  const cy = originY + size / 2
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, size / 2, 0, Math.PI * 2)
  ctx.clip()
  ctx.fillStyle = chipHex(face ? paint.face : paint.edge)
  ctx.fillRect(originX, originY, size, size)
  if (face) {
    const maxWidth = size * 0.78
    let fontPx = Math.round(size * 0.42)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = paint.ink
    ctx.font = `bold ${fontPx}px "Arial Black", Arial, sans-serif`
    const measured = ctx.measureText(paint.label).width
    if (measured > maxWidth && measured > 0) {
      fontPx = Math.round(fontPx * (maxWidth / measured))
      ctx.font = `bold ${fontPx}px "Arial Black", Arial, sans-serif`
    }
    ctx.fillText(paint.label, cx, cy)
  }
  ctx.restore()
}

const faceUrls = new Map<ChipColor, string>()

/** Same face the felt chips use: denomination body, five rim spots, gray center, Bitcoin mark. */
export const chipFaceUrl = (color: ChipColor): string => {
  const cached = faceUrls.get(color)
  if (cached) return cached
  const canvas = document.createElement('canvas')
  canvas.width = FACE_PX
  canvas.height = FACE_PX
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  const palette = CHIP_PALETTE[color]
  paintChipCell(ctx, 0, 0, FACE_PX, chipHex(palette.spot), chipHex(palette.face), true)
  const url = canvas.toDataURL('image/png')
  faceUrls.set(color, url)
  return url
}
