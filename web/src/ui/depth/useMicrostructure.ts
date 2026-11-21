import { useEffect, useState } from 'react'
import type { MicrostructureService } from '../../data/microstructure/microstructureService'
import type { MicrostructureState } from '../../data/microstructure/types'
import { emptyMicrostructureState } from '../../data/microstructure/emptyState'

export const useMicrostructure = (
  service: MicrostructureService | null,
  enabled = true,
): MicrostructureState => {
  const [state, setState] = useState<MicrostructureState>(
    () => service?.getState() ?? emptyMicrostructureState(),
  )

  useEffect(() => {
    if (!service || !enabled) return undefined
    return service.subscribe(setState)
  }, [service, enabled])

  return state
}