import { useEffect, useRef, useState } from 'react'
import { REFERENCE_HEIGHT, REFERENCE_WIDTH } from '../config/constants'
import {
  DIE_ARC_LIFT_HEIGHT_PX,
  DIE_ARC_LIFT_SCALE,
  DIE_FORWARD_SPIN_SCALE,
  DIE_LAUNCH_SIZE_PX,
  DIE_LAUNCH_TILT_DEG,
  PRECISION_AIM_COLOR,
  PRECISION_AIM_THICKNESS_PX,
  PRECISION_DEFAULT_ANGLE_DEG,
  PRECISION_GHOST_LOOP_MS,
  PRECISION_SPIN_PREVIEW_PX,
} from './diceConstants'
import type { DieColorId } from './diceColor'
import { DieMesh, useRainbowStep } from './DiceLayer'
import {
  aimMetrics,
  arrowTip,
  bezierPoint,
  PRECISION_PHASE_LABEL,
  precisionArc,
  type PrecisionPhase,
  type StagePoint,
} from './precisionAim'

const RAD_TO_DEG = 180 / Math.PI

const ghostSize = (startY: number, endY: number, pointY: number, t: number): number => {
  const chordY = startY + (endY - startY) * t
  const rise = Math.max(0, chordY - pointY)
  const lift = Math.min(1, rise / DIE_ARC_LIFT_HEIGHT_PX)
  return DIE_LAUNCH_SIZE_PX * (1 + (DIE_ARC_LIFT_SCALE - 1) * lift)
}

const AngleGauge = ({ angle }: { angle: number }) => {
  const originX = 36
  const originY = 150
  const length = 110
  const radians = (angle * Math.PI) / 180
  const tipX = originX + Math.cos(radians) * length
  const tipY = originY - Math.sin(radians) * length
  const labelX = tipX + Math.sin(radians) * 16 + 6
  const labelY = tipY - Math.cos(radians) * 8
  const guide = (PRECISION_DEFAULT_ANGLE_DEG * Math.PI) / 180
  const guideLength = length + 56
  const guideX = originX + Math.cos(guide) * guideLength
  const guideY = originY - Math.sin(guide) * guideLength
  const guideLabelX = guideX + 8
  const guideLabelY = guideY + 6
  return (
    <svg className="precision-gauge" viewBox="0 0 220 190" aria-hidden="true">
      <defs>
        <marker
          id="precision-gauge-arrow"
          markerUnits="userSpaceOnUse"
          markerWidth="25.2"
          markerHeight="18"
          refX="21.6"
          refY="9"
          orient="auto"
        >
          <path d="M0,0 L21.6,9 L0,18 Z" fill={PRECISION_AIM_COLOR} />
        </marker>
      </defs>
      <line className="precision-gauge-axis" x1={originX} y1={originY} x2={200} y2={originY} />
      <line className="precision-gauge-axis" x1={originX} y1={originY} x2={originX} y2={24} />
      <line className="precision-gauge-guide" x1={originX} y1={originY} x2={guideX} y2={guideY} />
      <text className="precision-gauge-guide-label" x={guideLabelX} y={guideLabelY}>
        {PRECISION_DEFAULT_ANGLE_DEG}°
      </text>
      <line
        className="precision-gauge-ray"
        x1={originX}
        y1={originY}
        x2={tipX}
        y2={tipY}
        markerEnd="url(#precision-gauge-arrow)"
      />
      <text className="precision-gauge-readout" x={Math.min(190, labelX)} y={Math.max(22, labelY)}>
        {Math.round(angle)}°
      </text>
    </svg>
  )
}

export const PrecisionOverlay = ({
  active,
  phase,
  target,
  angle,
  spin,
  launch,
  dieColor,
  onOk,
}: {
  active: boolean
  phase: PrecisionPhase
  target: StagePoint
  angle: number
  spin: number
  launch: StagePoint
  dieColor: DieColorId
  onOk: () => void
}) => {
  const rainbowStep = useRainbowStep(active && dieColor === 'rainbow')
  const [ghostT, setGhostT] = useState(0)
  const [spinDeg, setSpinDeg] = useState(0)
  const spinDegRef = useRef(0)
  const showArc = active && (phase === 'target' || phase === 'trajectory')
  const showSpin = active && phase === 'spin'

  useEffect(() => {
    if (!showArc) return undefined
    const started = performance.now()
    let frame = 0
    const tick = (now: number) => {
      setGhostT(((now - started) % PRECISION_GHOST_LOOP_MS) / PRECISION_GHOST_LOOP_MS)
      frame = window.requestAnimationFrame(tick)
    }
    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [showArc])

  useEffect(() => {
    if (!showSpin && !showArc) return undefined
    let last = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const dt = (now - last) / 1000
      last = now
      spinDegRef.current += spin * DIE_FORWARD_SPIN_SCALE * dt * RAD_TO_DEG
      setSpinDeg(spinDegRef.current)
      frame = window.requestAnimationFrame(tick)
    }
    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [showArc, showSpin, spin])

  if (!active) return null

  const arc = precisionArc(launch, target, angle)
  const tip = arrowTip(arc)
  const ghost = bezierPoint(arc, ghostT)
  const size = ghostSize(arc.start.y, arc.end.y, ghost.y, ghostT)
  const metrics = aimMetrics()
  const previewY = metrics.wallBottom + 180
  const tilt = DIE_LAUNCH_TILT_DEG + (showSpin || showArc ? spinDeg : 0)

  return (
    <div className="precision-overlay">
      {showArc ? (
        <svg className="precision-arc" viewBox={`0 0 ${REFERENCE_WIDTH} ${REFERENCE_HEIGHT}`} aria-hidden="true">
          <defs>
            <marker id="precision-arrow" markerWidth="6" markerHeight="6" refX="4.5" refY="2.25" orient="auto">
              <path d="M0,0 L5.25,2.25 L0,4.5 Z" fill={PRECISION_AIM_COLOR} />
            </marker>
          </defs>
          <path
            d={`M ${arc.start.x} ${arc.start.y} Q ${arc.control.x} ${arc.control.y} ${tip.x} ${tip.y}`}
            fill="none"
            stroke={PRECISION_AIM_COLOR}
            strokeWidth={PRECISION_AIM_THICKNESS_PX}
            strokeLinecap="round"
            markerEnd="url(#precision-arrow)"
          />
        </svg>
      ) : null}
      {showArc ? (
        <>
          <DieMesh
            x={ghost.x - size * 0.55}
            y={ghost.y}
            size={size}
            tiltDeg={tilt}
            transform=""
            color={dieColor}
            rainbowStep={rainbowStep}
            opacity={0.5}
          />
          <DieMesh
            x={ghost.x + size * 0.55}
            y={ghost.y}
            size={size}
            tiltDeg={tilt}
            transform=""
            color={dieColor}
            rainbowStep={rainbowStep}
            opacity={0.5}
          />
          <svg
            className="precision-reticle"
            viewBox="0 0 64 64"
            style={{ left: target.x, top: target.y }}
            aria-hidden="true"
          >
            <circle className="precision-reticle-line" cx="32" cy="32" r="16" />
            <line className="precision-reticle-line" x1="32" y1="2" x2="32" y2="12" />
            <line className="precision-reticle-line" x1="32" y1="52" x2="32" y2="62" />
            <line className="precision-reticle-line" x1="2" y1="32" x2="12" y2="32" />
            <line className="precision-reticle-line" x1="52" y1="32" x2="62" y2="32" />
            <line className="precision-reticle-line" x1="32" y1="22" x2="32" y2="28" />
            <line className="precision-reticle-line" x1="32" y1="36" x2="32" y2="42" />
            <line className="precision-reticle-line" x1="22" y1="32" x2="28" y2="32" />
            <line className="precision-reticle-line" x1="36" y1="32" x2="42" y2="32" />
            <circle className="precision-reticle-dot" cx="32" cy="32" r="2" />
          </svg>
        </>
      ) : null}
      {phase === 'trajectory' ? <AngleGauge angle={angle} /> : null}
      {showSpin ? (
        <>
          <DieMesh
            x={metrics.width / 2 - PRECISION_SPIN_PREVIEW_PX * 0.55}
            y={previewY}
            size={PRECISION_SPIN_PREVIEW_PX}
            tiltDeg={tilt}
            transform=""
            color={dieColor}
            rainbowStep={rainbowStep}
            opacity={0.85}
          />
          <DieMesh
            x={metrics.width / 2 + PRECISION_SPIN_PREVIEW_PX * 0.55}
            y={previewY}
            size={PRECISION_SPIN_PREVIEW_PX}
            tiltDeg={tilt}
            transform=""
            color={dieColor}
            rainbowStep={rainbowStep}
            opacity={0.85}
          />
        </>
      ) : null}
      <p className="precision-phase-label">{PRECISION_PHASE_LABEL[phase]}</p>
      {phase === 'gesture' ? null : (
        <button className="precision-ok" type="button" onClick={onOk}>
          OK
        </button>
      )}
    </div>
  )
}
