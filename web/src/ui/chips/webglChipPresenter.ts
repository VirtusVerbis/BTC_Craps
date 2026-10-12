import {
  Color,
  CylinderGeometry,
  DoubleSide,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  OrthographicCamera,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three'
import { REFERENCE_HEIGHT, REFERENCE_WIDTH } from '../../config/constants'
import { CHIP_FELT_TILT_DEG, type ChipColor } from '../chipConstants'
import { chipDrawSize, type ChipDisc } from '../chipPhysics'
import { CHIP_PALETTE } from './chipPalette'
import {
  CHIP_WEBGL_CYLINDER_SEGMENTS,
  CHIP_WEBGL_MAX_INSTANCES,
} from './chipWebglConstants'
import { resolveChipCanvasDprCap } from './chipRendererMode'

const COLORS: ChipColor[] = ['white', 'red', 'green', 'blue', 'black']

const sliceHeightPx = (): number => {
  const { width } = chipDrawSize()
  return Math.max(0.6, width * 0.04)
}

const tempMatrix = new Matrix4()
const tempPosition = new Vector3()
const tempRotZ = new Matrix4()
const tempRotX = new Matrix4()
const tempLift = new Matrix4()
const tempScale = new Matrix4()

/** Instanced cylinder chips in stage pixel space (1080×1920, Y down). */
export class WebGLChipPresenter {
  private readonly canvas: HTMLCanvasElement

  private readonly renderer: WebGLRenderer

  private readonly scene = new Scene()

  private readonly camera: OrthographicCamera

  private readonly meshes: InstancedMesh[] = []

  private readonly counts = new Map<ChipColor, number>()

  private disposed = false

  private readonly maxDpr: number

  constructor(container: HTMLElement, maxDpr: number) {
    this.maxDpr = maxDpr
    this.canvas = document.createElement('canvas')
    this.canvas.className = 'chip-canvas'
    container.appendChild(this.canvas)

    this.camera = new OrthographicCamera(0, REFERENCE_WIDTH, REFERENCE_HEIGHT, 0, -2000, 2000)
    this.camera.position.set(0, 0, 500)
    this.camera.lookAt(0, 0, 0)

    this.renderer = new WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    })
    this.renderer.setClearColor(0x000000, 0)
    this.renderer.sortObjects = true

    const geo = new CylinderGeometry(1, 1, 1, CHIP_WEBGL_CYLINDER_SEGMENTS, 1, false)
    geo.rotateX(Math.PI / 2)

    for (const color of COLORS) {
      const palette = CHIP_PALETTE[color]
      const material = new MeshBasicMaterial({
        color: new Color(palette.face),
        side: DoubleSide,
      })
      const mesh = new InstancedMesh(geo, material, CHIP_WEBGL_MAX_INSTANCES)
      mesh.frustumCulled = false
      mesh.name = `chips-${color}`
      this.scene.add(mesh)
      this.meshes.push(mesh)
      this.counts.set(color, 0)
    }

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
        this.resize(this.maxDpr)
      },
      false,
    )
  }

  resize(maxDpr: number): void {
    if (this.disposed) return
    const dpr = Math.min(window.devicePixelRatio || 1, resolveChipCanvasDprCap(maxDpr))
    this.renderer.setPixelRatio(dpr)
    this.renderer.setSize(REFERENCE_WIDTH, REFERENCE_HEIGHT, false)
    this.canvas.style.width = `${REFERENCE_WIDTH}px`
    this.canvas.style.height = `${REFERENCE_HEIGHT}px`
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    for (const mesh of this.meshes) {
      mesh.geometry.dispose()
      if (Array.isArray(mesh.material)) mesh.material.forEach((m) => m.dispose())
      else mesh.material.dispose()
      this.scene.remove(mesh)
    }
    this.renderer.dispose()
    this.canvas.remove()
  }

  apply(discs: readonly ChipDisc[]): void {
    if (this.disposed) return
    for (const color of COLORS) this.counts.set(color, 0)

    const sliceH = sliceHeightPx()
    const tiltRad = (CHIP_FELT_TILT_DEG * Math.PI) / 180

    for (const disc of discs) {
      const color = disc.color
      const mesh = this.meshes[COLORS.indexOf(color)]
      const index = this.counts.get(color) ?? 0
      if (index >= CHIP_WEBGL_MAX_INSTANCES) continue
      this.counts.set(color, index + 1)

      const diameter = chipDrawSize().width * disc.scale
      const radius = diameter / 2
      const height = sliceH * disc.scale

      tempPosition.set(disc.x, disc.y, -disc.zIndex * 0.05)
      tempMatrix.makeTranslation(tempPosition.x, tempPosition.y, tempPosition.z)
      tempRotX.makeRotationX(-tiltRad)
      tempRotZ.makeRotationZ((disc.spin * Math.PI) / 180)
      tempLift.makeTranslation(0, disc.lift * disc.scale, 0)
      tempScale.makeScale(radius, radius, height)
      tempMatrix.multiply(tempRotX)
      tempMatrix.multiply(tempRotZ)
      tempMatrix.multiply(tempLift)
      tempMatrix.multiply(tempScale)

      mesh.setMatrixAt(index, tempMatrix)
    }

    for (let i = 0; i < COLORS.length; i += 1) {
      const color = COLORS[i]
      const mesh = this.meshes[i]
      const count = this.counts.get(color) ?? 0
      mesh.count = count
      mesh.instanceMatrix.needsUpdate = true
    }

    this.renderer.render(this.scene, this.camera)
  }
}
