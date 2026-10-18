import { memo, useEffect, useRef, type MutableRefObject } from 'react'
import { REFERENCE_HEIGHT } from '../../config/constants'
import type { ChipDisc } from '../chipPhysics'
import { depthBand, type DepthBand } from '../feltDepth'
import type { PuckPlacement } from '../puckState'
import { CHIP_CANVAS_MAX_DPR } from './chipWebglConstants'
import { WebGLChipPresenter } from './webglChipPresenter'

export interface ChipDepthFrame {
  discs: readonly ChipDisc[]
  /** Depth keys of the visible dice. Empty puts every disc and the puck in front. */
  dieKeys: readonly number[]
  puck?: PuckPlacement | null
}

export type ChipFrameApply = (frame: ChipDepthFrame) => void

interface ChipPresenterHostProps {
  applyRef: MutableRefObject<ChipFrameApply | null>
}

const BANDS: readonly DepthBand[] = ['behind', 'between', 'front']

const ChipPresenterHostInner = ({ applyRef }: ChipPresenterHostProps) => {
  const behindRef = useRef<HTMLDivElement>(null)
  const betweenRef = useRef<HTMLDivElement>(null)
  const frontRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mounts = {
      behind: behindRef.current,
      between: betweenRef.current,
      front: frontRef.current,
    }
    if (!mounts.behind || !mounts.between || !mounts.front) return undefined

    const presenters = {
      behind: new WebGLChipPresenter(mounts.behind, CHIP_CANVAS_MAX_DPR),
      between: new WebGLChipPresenter(mounts.between, CHIP_CANVAS_MAX_DPR),
      front: new WebGLChipPresenter(mounts.front, CHIP_CANVAS_MAX_DPR),
    }
    const apply: ChipFrameApply = (frame) => {
      const grouped: Record<DepthBand, ChipDisc[]> = { behind: [], between: [], front: [] }
      for (let i = 0; i < frame.discs.length; i += 1) {
        const disc = frame.discs[i]
        grouped[depthBand(disc.feltZ, frame.dieKeys)].push(disc)
      }
      const puck = frame.puck ?? null
      const puckBand = puck ? depthBand(REFERENCE_HEIGHT - puck.y, frame.dieKeys) : null
      for (const band of BANDS) {
        presenters[band].apply(grouped[band], puckBand === band ? puck : null)
      }
    }
    applyRef.current = apply

    const onResize = () => {
      for (const band of BANDS) presenters[band].resize(CHIP_CANVAS_MAX_DPR)
    }
    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('resize', onResize)
      if (applyRef.current === apply) applyRef.current = null
      for (const band of BANDS) presenters[band].dispose()
    }
  }, [applyRef])

  return (
    <div className="chip-presenter-host" aria-hidden>
      <div ref={behindRef} className="chip-band" data-band="behind" />
      <div ref={betweenRef} className="chip-band" data-band="between" />
      <div ref={frontRef} className="chip-band" data-band="front" />
    </div>
  )
}

export const ChipPresenterHost = memo(ChipPresenterHostInner)
