import { memo, useEffect, useRef, type MutableRefObject } from 'react'
import type { ChipDisc } from '../chipPhysics'
import { CHIP_CANVAS_MAX_DPR } from './chipWebglConstants'
import { WebGLChipPresenter } from './webglChipPresenter'

export type ChipFrameApply = (discs: readonly ChipDisc[]) => void

interface ChipPresenterHostProps {
  applyRef: MutableRefObject<ChipFrameApply | null>
}

const ChipPresenterHostInner = ({ applyRef }: ChipPresenterHostProps) => {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return undefined

    const presenter = new WebGLChipPresenter(mount, CHIP_CANVAS_MAX_DPR)
    const apply: ChipFrameApply = (discs) => {
      presenter.apply(discs)
    }
    applyRef.current = apply

    const onResize = () => {
      presenter.resize(CHIP_CANVAS_MAX_DPR)
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
