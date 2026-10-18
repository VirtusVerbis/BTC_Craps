import {
  CanvasTexture,
  CircleGeometry,
  DataTexture,
  DoubleSide,
  InstancedBufferAttribute,
  InstancedMesh,
  LinearFilter,
  LinearSRGBColorSpace,
  Matrix4,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Texture,
  WebGLRenderer,
} from 'three'
import { REFERENCE_HEIGHT } from '../../config/constants'
import type { ChipColor } from '../chipConstants'
import { PUCK_IMAGE_WIDTH_PX } from '../diceConstants'
import { compareDepth, PUCK_PLATE } from '../feltDepth'
import { chipDrawSize, type ChipDisc } from '../chipPhysics'
import type { PuckPlacement } from '../puckState'
import { CHIP_PALETTE } from './chipPalette'
import {
  CHIP_CAMERA_BOTTOM,
  CHIP_CAMERA_LEFT,
  CHIP_CAMERA_RIGHT,
  CHIP_CAMERA_TOP,
  chipDiscMatrix,
} from './chipWebglPose'
import {
  CHIP_WEBGL_CYLINDER_SEGMENTS,
  CHIP_WEBGL_MAX_INSTANCES,
  resolveChipCanvasDprCap,
} from './chipWebglConstants'

const COLORS: ChipColor[] = ['white', 'red', 'green', 'blue', 'black']

const ATLAS_CELL = 256
const ATLAS_COLS = COLORS.length
const ATLAS_ROWS = 2

/** View box of `bitcoin-mark.svg`. The mark sits in the gray center of a face. */
const MARK_VIEW_W = 273.6
const MARK_VIEW_H = 360
const MARK_D =
  'M217.021,167.042c18.631-9.483,30.288-26.184,27.565-54.007c-3.667-38.023-36.526-50.773-78.006-54.404l-0.008-52.741h-32.139l-0.009,51.354c-8.456,0-17.076,0.166-25.657,0.338L108.76,5.897l-32.11-0.003l-0.006,52.728c-6.959,0.142-13.793,0.277-20.466,0.277v-0.156l-44.33-0.018l0.006,34.282c0,0,23.734-0.446,23.343-0.013c13.013,0.009,17.262,7.559,18.484,14.076l0.01,60.083v84.397c-0.573,4.09-2.984,10.625-12.083,10.637c0.414,0.364-23.379-0.004-23.379-0.004l-6.375,38.335h41.817c7.792,0.009,15.448,0.13,22.959,0.19l0.028,53.338l32.102,0.009l-0.009-52.779c8.832,0.18,17.357,0.258,25.684,0.247l-0.009,52.532h32.138l0.018-53.249c54.022-3.1,91.842-16.697,96.544-67.385C266.916,192.612,247.692,174.396,217.021,167.042z M109.535,95.321c18.126,0,75.132-5.767,75.14,32.064c-0.008,36.269-56.996,32.032-75.14,32.032V95.321z M109.521,262.447l0.014-70.672c21.778-0.006,90.085-6.261,90.094,35.32C199.638,266.971,131.313,262.431,109.521,262.447z'

let markPath: Path2D | null = null

const bitcoinPath = (): Path2D => {
  if (!markPath) markPath = new Path2D(MARK_D)
  return markPath
}

const hex = (n: number): string => `#${n.toString(16).padStart(6, '0')}`

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

/** One atlas cell: rim spots, and on the face a gray center plus the Bitcoin mark. */
const paintCell = (
  ctx: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  spot: string,
  body: string,
  face: boolean,
): void => {
  const size = ATLAS_CELL
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

/**
 * Wall row is the top of the canvas, face row the bottom.
 * With `flipY`, that is texture v 0.5–1 and 0–0.5.
 */
const paintAtlas = (): HTMLCanvasElement => {
  const canvas = document.createElement('canvas')
  canvas.width = ATLAS_CELL * ATLAS_COLS
  canvas.height = ATLAS_CELL * ATLAS_ROWS
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas
  COLORS.forEach((color, col) => {
    const palette = CHIP_PALETTE[color]
    const spot = hex(palette.spot)
    paintCell(ctx, col * ATLAS_CELL, 0, spot, hex(palette.edge), false)
    paintCell(ctx, col * ATLAS_CELL, ATLAS_CELL, spot, hex(palette.face), true)
  })
  return canvas
}

const atlasRect = (colorIndex: number, face: boolean): [number, number, number, number] => {
  const texW = ATLAS_CELL * ATLAS_COLS
  const texH = ATLAS_CELL * ATLAS_ROWS
  const insetU = 0.5 / texW
  const insetV = 0.5 / texH
  const scaleU = 1 / ATLAS_COLS - insetU * 2
  const scaleV = 1 / ATLAS_ROWS - insetV * 2
  const offsetU = colorIndex / ATLAS_COLS + insetU
  const offsetV = (face ? 0 : 0.5) + insetV
  return [offsetU, offsetV, scaleU, scaleV]
}

const COLOR_INDEX: Record<ChipColor, number> = {
  white: 0,
  red: 1,
  green: 2,
  blue: 3,
  black: 4,
}

const tempMatrix = new Matrix4()

interface DrawEntry {
  feltZ: number
  plate: number
  disc?: ChipDisc
  puck?: PuckPlacement
}

const drawEntries = (discs: readonly ChipDisc[], puck: PuckPlacement | null): DrawEntry[] => {
  const entries: DrawEntry[] = []
  for (let i = 0; i < discs.length; i += 1) {
    const disc = discs[i]
    entries.push({ feltZ: disc.feltZ, plate: disc.zIndex, disc })
  }
  if (puck) entries.push({ feltZ: REFERENCE_HEIGHT - puck.y, plate: PUCK_PLATE, puck })
  entries.sort(compareDepth)
  return entries
}

const VERTEX = `
attribute vec4 uvRect;
varying vec2 vUv;
void main() {
  vec2 faceUv = vec2(uv.x, 1.0 - uv.y);
  vUv = faceUv * uvRect.zw + uvRect.xy;
  vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
}
`

const FRAGMENT = `
uniform sampler2D map;
varying vec2 vUv;
void main() {
  gl_FragColor = texture2D(map, vUv);
}
`

const PUCK_VERTEX = `
varying vec2 vUv;
void main() {
  vUv = uv;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
}
`

const PUCK_FRAGMENT = `
uniform sampler2D map;
varying vec2 vUv;
void main() {
  gl_FragColor = texture2D(map, vUv);
}
`

/** Flat discs in stage pixel space (1080×1920, Y down), painted like the CSS chips. */
export class WebGLChipPresenter {
  private readonly canvas: HTMLCanvasElement

  private readonly renderer: WebGLRenderer

  private readonly scene = new Scene()

  private readonly camera: OrthographicCamera

  private readonly geometry: CircleGeometry

  private readonly texture: CanvasTexture

  private readonly material: ShaderMaterial

  private readonly mesh: InstancedMesh

  private readonly uvRect: InstancedBufferAttribute

  private readonly puckGeometry: PlaneGeometry

  private readonly puckMaterial: ShaderMaterial

  private readonly puckMesh: Mesh

  private readonly puckTextures = new Map<string, Texture>()

  private disposed = false

  private readonly maxDpr: number

  private readonly capacity: number

  constructor(container: HTMLElement, maxDpr: number) {
    this.maxDpr = maxDpr
    this.capacity = CHIP_WEBGL_MAX_INSTANCES * COLORS.length
    this.canvas = document.createElement('canvas')
    this.canvas.className = 'chip-canvas'
    container.appendChild(this.canvas)

    this.camera = new OrthographicCamera(
      CHIP_CAMERA_LEFT,
      CHIP_CAMERA_RIGHT,
      CHIP_CAMERA_TOP,
      CHIP_CAMERA_BOTTOM,
      -2000,
      2000,
    )
    this.camera.position.set(0, 0, 500)
    this.camera.lookAt(0, 0, 0)

    this.renderer = new WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    })
    this.renderer.setClearColor(0x000000, 0)
    this.renderer.outputColorSpace = LinearSRGBColorSpace

    this.texture = new CanvasTexture(paintAtlas())
    this.texture.flipY = true
    this.texture.magFilter = LinearFilter
    this.texture.minFilter = LinearFilter
    this.texture.generateMipmaps = false
    this.texture.needsUpdate = true

    this.geometry = new CircleGeometry(1, CHIP_WEBGL_CYLINDER_SEGMENTS)
    this.uvRect = new InstancedBufferAttribute(new Float32Array(this.capacity * 4), 4)
    this.geometry.setAttribute('uvRect', this.uvRect)

    this.material = new ShaderMaterial({
      uniforms: { map: { value: this.texture } },
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      side: DoubleSide,
      depthTest: false,
      depthWrite: false,
    })

    this.mesh = new InstancedMesh(this.geometry, this.material, this.capacity)
    this.mesh.frustumCulled = false
    this.mesh.count = 0
    this.scene.add(this.mesh)

    const puckPlaceholder = new DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1)
    puckPlaceholder.needsUpdate = true
    puckPlaceholder.colorSpace = LinearSRGBColorSpace
    this.puckGeometry = new PlaneGeometry(1, 1)
    this.puckMaterial = new ShaderMaterial({
      uniforms: { map: { value: puckPlaceholder } },
      vertexShader: PUCK_VERTEX,
      fragmentShader: PUCK_FRAGMENT,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      side: DoubleSide,
    })
    this.puckMesh = new Mesh(this.puckGeometry, this.puckMaterial)
    this.puckMesh.frustumCulled = false
    this.puckMesh.visible = false
    this.scene.add(this.puckMesh)
    this.renderer.autoClear = false

    this.handleContextLoss()
    this.resize(maxDpr)
  }

  private handleContextLoss(): void {
    this.canvas.addEventListener(
      'webglcontextlost',
      (event) => {
        event.preventDefault()
      },
      false,
    )
    this.canvas.addEventListener(
      'webglcontextrestored',
      () => {
        this.texture.needsUpdate = true
        this.resize(this.maxDpr)
      },
      false,
    )
  }

  resize(maxDpr: number): void {
    if (this.disposed) return
    const dpr = Math.min(window.devicePixelRatio || 1, resolveChipCanvasDprCap(maxDpr))
    this.renderer.setPixelRatio(dpr)
    this.renderer.setSize(CHIP_CAMERA_RIGHT, CHIP_CAMERA_BOTTOM, false)
    this.canvas.style.width = `${CHIP_CAMERA_RIGHT}px`
    this.canvas.style.height = `${CHIP_CAMERA_BOTTOM}px`
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.scene.remove(this.mesh)
    this.scene.remove(this.puckMesh)
    this.geometry.dispose()
    this.material.dispose()
    this.texture.dispose()
    this.puckGeometry.dispose()
    this.puckMaterial.dispose()
    for (const tex of this.puckTextures.values()) tex.dispose()
    this.puckTextures.clear()
    this.renderer.dispose()
    this.canvas.remove()
  }

  private puckTexture(src: string): Texture | null {
    let tex = this.puckTextures.get(src)
    if (!tex) {
      const image = new Image()
      const created = new Texture(image)
      // This camera's +Y points down the screen, so the PNG must not get the usual Y-up flip.
      created.flipY = false
      created.colorSpace = LinearSRGBColorSpace
      created.magFilter = LinearFilter
      created.minFilter = LinearFilter
      created.generateMipmaps = false
      image.onload = () => {
        created.needsUpdate = true
      }
      image.src = src
      if (image.complete && image.naturalWidth > 0) created.needsUpdate = true
      tex = created
      this.puckTextures.set(src, tex)
    }
    const image = tex.image as HTMLImageElement | undefined
    if (!image?.complete || image.naturalWidth <= 0) return null
    return tex
  }

  private uploadDiscs(discs: readonly ChipDisc[]): void {
    const count = Math.min(discs.length, this.capacity)
    const radiusOf = chipDrawSize().width / 2
    const uv = this.uvRect.array as Float32Array
    for (let i = 0; i < count; i += 1) {
      const disc = discs[i]
      chipDiscMatrix(disc, radiusOf * disc.scale, tempMatrix)
      this.mesh.setMatrixAt(i, tempMatrix)
      const rect = atlasRect(COLOR_INDEX[disc.color], disc.face)
      const offset = i * 4
      uv[offset] = rect[0]
      uv[offset + 1] = rect[1]
      uv[offset + 2] = rect[2]
      uv[offset + 3] = rect[3]
    }
    this.mesh.count = count
    this.mesh.instanceMatrix.needsUpdate = true
    this.uvRect.needsUpdate = true
  }

  private renderDiscs(discs: readonly ChipDisc[]): void {
    if (discs.length === 0) return
    this.uploadDiscs(discs)
    this.mesh.visible = true
    this.puckMesh.visible = false
    this.renderer.render(this.scene, this.camera)
    this.mesh.visible = false
  }

  private renderPuck(puck: PuckPlacement): void {
    const tex = this.puckTexture(puck.src)
    if (!tex) return
    const image = tex.image as HTMLImageElement
    const width = PUCK_IMAGE_WIDTH_PX * puck.scale
    const height = width * (image.naturalHeight / image.naturalWidth)
    this.puckMaterial.uniforms.map.value = tex
    this.puckMesh.position.set(puck.x, puck.y, 0)
    this.puckMesh.scale.set(width, height, 1)
    this.mesh.visible = false
    this.puckMesh.visible = true
    this.renderer.render(this.scene, this.camera)
    this.puckMesh.visible = false
  }

  apply(discs: readonly ChipDisc[], puck: PuckPlacement | null = null): void {
    if (this.disposed) return
    const entries = drawEntries(discs, puck)
    this.renderer.clear()
    this.mesh.visible = false
    this.puckMesh.visible = false
    let batch: ChipDisc[] = []
    const flush = () => {
      this.renderDiscs(batch)
      batch = []
    }
    for (let i = 0; i < entries.length; i += 1) {
      const entry = entries[i]
      if (entry.disc) batch.push(entry.disc)
      else if (entry.puck) {
        flush()
        this.renderPuck(entry.puck)
      }
    }
    flush()
  }
}
