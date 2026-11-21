/** Flip true in dev to expose `window.btcCrapsHotShooter.play()` in the browser console. */
export const HOT_SHOOTER_TEST_HOOK_ON = false

declare global {
  interface Window {
    /** Dev-only. `btcCrapsHotShooter.play()` scrolls the Hot Shooter banner once. */
    btcCrapsHotShooter?: {
      play: () => void
    }
  }
}

export const isHotShooterTestQuery = (value: string | null): boolean =>
  value === '1' || value === 'true'