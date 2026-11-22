type TaHeatmapTransportProps = {
  visible: boolean
  playing: boolean
  toolbarAriaLabel?: string
  onPrev: () => void
  onTogglePlayPause: () => void
  onNext: () => void
}

export const TaHeatmapTransport = ({
  visible,
  playing,
  toolbarAriaLabel = 'Technical analysis pattern carousel',
  onPrev,
  onTogglePlayPause,
  onNext,
}: TaHeatmapTransportProps) => {
  if (!visible) return null
  return (
    <div
      className="depth-ta-transport"
      role="toolbar"
      aria-label={toolbarAriaLabel}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <button type="button" className="depth-ta-transport-btn" onClick={onPrev} aria-label="Previous pattern">
        <span className="depth-ta-transport-glyph" aria-hidden>
          |◀
        </span>
      </button>
      <button
        type="button"
        className="depth-ta-transport-btn depth-ta-transport-btn--play"
        onClick={onTogglePlayPause}
        aria-label={playing ? 'Pause pattern rotation' : 'Resume pattern rotation'}
      >
        {playing ? '⏸' : '▶'}
      </button>
      <button type="button" className="depth-ta-transport-btn" onClick={onNext} aria-label="Next pattern">
        <span className="depth-ta-transport-glyph" aria-hidden>
          ▶|
        </span>
      </button>
    </div>
  )
}