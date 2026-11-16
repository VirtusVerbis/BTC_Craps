import { useEffect, useState } from 'react'
import type { MicrostructureService } from '../../data/microstructure/microstructureService'
import type { MicrostructureState } from '../../data/microstructure/types'
import { emptyMicrostructureState } from '../../data/microstructure/emptyState'

export const useMicrostructure = (service: MicrostructureService | null): MicrostructureState => {
  const [state, setState] = useState<MicrostructureState>(emptyMicrostructureState())

  useEffect(() => {
    if (!service) return undefined
    return service.subscribe(setState)
  }, [service])

  return state
}