import { useEffect, useState } from 'react'

const FADE_OUT_MS = 800

type NotePhase = 'hidden' | 'shown' | 'leaving'

/** Shown for the whole Shooter session. Fades out once Auto mode returns. */
export const ShooterScrollNote = ({ active }: { active: boolean }) => {
  const [phase, setPhase] = useState<NotePhase>(active ? 'shown' : 'hidden')

  useEffect(() => {
    if (active) {
      setPhase('shown')
      return
    }
    setPhase((current) => (current === 'shown' ? 'leaving' : current))
  }, [active])

  useEffect(() => {
    if (phase !== 'leaving') return undefined
    const id = window.setTimeout(() => setPhase('hidden'), FADE_OUT_MS)
    return () => window.clearTimeout(id)
  }, [phase])

  if (phase === 'hidden') return null
  return (
    <p className={phase === 'leaving' ? 'shooter-scroll-note is-leaving' : 'shooter-scroll-note'} aria-live="polite">
      <span>Mobile scrolling</span>
      <span>disabled.</span>
    </p>
  )
}
