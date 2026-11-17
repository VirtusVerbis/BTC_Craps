export type FeedGlyphStatus = 'connecting' | 'connected' | 'disconnected'

const glyphColor = (status: FeedGlyphStatus): string => {
  if (status === 'connected') return '#4caf50'
  if (status === 'connecting') return '#ffc107'
  return '#757575'
}

interface FeedGlyphProps {
  status: FeedGlyphStatus
  title?: string
  ariaLabel?: string
  className?: string
}

export const FeedGlyph = ({ status, title, ariaLabel, className }: FeedGlyphProps) => {
  const color = glyphColor(status)
  const tip = title ?? status
  return (
    <span
      className={className ? `feed-glyph ${className}` : 'feed-glyph'}
      style={{ color }}
      title={tip}
      aria-hidden={ariaLabel ? undefined : true}
    >
      <svg
        className="feed-glyph-svg"
        viewBox="0 0 24 24"
        role="img"
        aria-label={ariaLabel ?? 'wifi status'}
      >
        <path
          fill="currentColor"
          d="M12 18.5a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2Zm0-2.8a5.9 5.9 0 0 1 4.2 1.8l1.3-1.4a7.8 7.8 0 0 0-11 0l1.3 1.4A5.9 5.9 0 0 1 12 15.7Zm0-4.4a10.2 10.2 0 0 1 7.3 3l1.3-1.4a12.1 12.1 0 0 0-17.2 0l1.3 1.4a10.2 10.2 0 0 1 7.3-3Zm0-4.4c-4 0-7.8 1.6-10.6 4.4L2.7 8.7a14.9 14.9 0 0 1 18.6 0l1.3-1.4A14.8 14.8 0 0 0 12 6.9Z"
        />
      </svg>
    </span>
  )
}