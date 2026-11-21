type TaHeatmapTransportProps = {
  visible: boolean
  playing: boolean
  onPrev: () => void
  onTogglePlayPause: () => void
  onNext: () => void
}

export const TaHeatmapTransport = ({ visible, playing, onPrev, onTogglePlayPause, onNext }: TaHeatmapTransportProps) => {
  if (!visible) return null
  return (
    <div
      className="depth-ta-transport"
      role="toolbar"
      aria-label="Technical analysis pattern carousel"
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