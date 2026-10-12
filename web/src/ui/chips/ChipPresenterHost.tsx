import { memo, useEffect, useRef, type MutableRefObject } from 'react'
import type { ChipDisc } from '../chipPhysics'
import { DomChipPresenter } from './domChipPresenter'
import { resolveChipRendererMode, type ChipRendererMode } from './chipRendererMode'
import { CHIP_CANVAS_MAX_DPR } from './chipWebglConstants'
import { WebGLChipPresenter } from './webglChipPresenter'

export type ChipFrameApply = (discs: readonly ChipDisc[]) => void

interface ChipPresenterHostProps {
  applyRef: MutableRefObject<ChipFrameApply | null>
}

const ChipPresenterHostInner = ({ applyRef }: ChipPresenterHostProps) => {
  const mountRef = useRef<HTMLDivElement>(null)
  const modeRef = useRef<ChipRendererMode | null>(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return undefined

    const mode = resolveChipRendererMode()
    modeRef.current = mode

    let presenter: DomChipPresenter | WebGLChipPresenter
    if (mode === 'webgl') {
      presenter = new WebGLChipPresenter(mount, CHIP_CANVAS_MAX_DPR)
    } else {
      presenter = new DomChipPresenter(mount)
    }

    const apply: ChipFrameApply = (discs) => {
      presenter.apply(discs)
    }
    applyRef.current = apply

    const onResize = () => {
      if (presenter instanceof WebGLChipPresenter) presenter.resize(CHIP_CANVAS_MAX_DPR)
    }
    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('resize', onResize)
      if (applyRef.current === apply) applyRef.current = null
      presenter.dispose()
    }
  }, [applyRef])

  return <div ref={mountRef} className="chip-presenter-host" aria-hidden />
}

export const ChipPresenterHost = memo(ChipPresenterHostInner)
