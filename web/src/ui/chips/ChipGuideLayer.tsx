import { memo, useEffect, useRef, type MutableRefObject } from 'react'
import { GuidePresenter, type GuideFrameApply } from './guidePresenter'

interface ChipGuideLayerProps {
  applyRef: MutableRefObject<GuideFrameApply | null>
}

const ChipGuideLayerInner = ({ applyRef }: ChipGuideLayerProps) => {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return undefined
    const presenter = new GuidePresenter(mount)
    applyRef.current = (guides, dieKeys) => presenter.apply(guides, dieKeys)
    return () => {
      if (applyRef.current) applyRef.current = null
      presenter.dispose()
    }
  }, [applyRef])

  return <div ref={mountRef} className="chip-guide-layer" aria-hidden />
}

export const ChipGuideLayer = memo(ChipGuideLayerInner)
