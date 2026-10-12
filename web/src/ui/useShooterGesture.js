import { useEffect } from "react";
import { REFERENCE_HEIGHT, REFERENCE_WIDTH } from "../config/constants";
import { gestureFromStroke } from "./gestureThrow";
const blockedTarget = (target) => {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      ".shooter-mode-button, .shooter-scroll-note, .time-button, .video-overlay-close, .side-panel, .precision-mode-switch, .precision-ok, a"
    )
  );
};
const stagePoint = (stage, clientX, clientY) => {
  const rect = stage.getBoundingClientRect();
  if (!(rect.width > 0) || !(rect.height > 0)) return null;
  return {
    x: (clientX - rect.left) / rect.width * REFERENCE_WIDTH,
    y: (clientY - rect.top) / rect.height * REFERENCE_HEIGHT
  };
};
const useShooterGesture = (enabled, stageRef, controlsRef) => {
  useEffect(() => {
    if (!enabled) return void 0;
    let pointerId = null;
    let points = [];
    const finish = (event) => {
      if (event.pointerId !== pointerId) return;
      const stage = stageRef.current;
      const point = stage ? stagePoint(stage, event.clientX, event.clientY) : null;
      if (point) points.push({ ...point, t: event.timeStamp });
      const stroke = gestureFromStroke(points);
      pointerId = null;
      points = [];
      if (stroke) controlsRef.current?.releaseGesture(stroke);
    };
    const onDown = (event) => {
      if (pointerId !== null || blockedTarget(event.target)) return;
      const stage = stageRef.current;
      if (!stage) return;
      const point = stagePoint(stage, event.clientX, event.clientY);
      if (!point) return;
      pointerId = event.pointerId;
      points = [{ ...point, t: event.timeStamp }];
      controlsRef.current?.aimLaunchX(point.x);
    };
    const onMove = (event) => {
      if (event.pointerId !== pointerId) return;
      const stage = stageRef.current;
      if (!stage) return;
      const point = stagePoint(stage, event.clientX, event.clientY);
      if (!point) return;
      points.push({ ...point, t: event.timeStamp });
    };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
    };
  }, [controlsRef, enabled, stageRef]);
};
const TRACKPAD_GESTURE_MS = 200;
const DELTA_PIXEL = 0;
const DELTA_LINE = 1;
const DELTA_PAGE = 2;
const trackpadScaled = (wheelDelta, delta) => {
  if (typeof wheelDelta !== "number" || delta === 0) return false;
  const scaled = -delta * 3;
  return Math.abs(wheelDelta - scaled) < 1 || Math.abs(wheelDelta - Math.round(scaled)) <= 1;
};
const mouseNotch = (wheelDelta, delta) => {
  if (trackpadScaled(wheelDelta, delta)) return false;
  if (typeof wheelDelta === "number" && wheelDelta !== 0 && Math.abs(wheelDelta) % 120 === 0) return true;
  return delta !== 0 && Number.isInteger(delta) && Math.abs(delta) >= 100 && Math.abs(delta) % 100 === 0;
};
const isDiscreteMouseWheel = (sample) => {
  if (sample.ctrlKey) return false;
  if (sample.deltaMode === DELTA_LINE || sample.deltaMode === DELTA_PAGE) return true;
  if (sample.deltaMode !== DELTA_PIXEL) return false;
  return mouseNotch(sample.wheelDeltaY, sample.deltaY) || mouseNotch(sample.wheelDeltaX, sample.deltaX);
};
const isTrackpadWheel = (sample) => {
  if (sample.ctrlKey) return true;
  if (isDiscreteMouseWheel(sample)) return false;
  if (sample.deltaMode !== DELTA_PIXEL) return false;
  const { deltaX, deltaY, wheelDeltaX, wheelDeltaY } = sample;
  if (deltaX === 0 && deltaY === 0) return false;
  if (trackpadScaled(wheelDeltaY, deltaY) || trackpadScaled(wheelDeltaX, deltaX)) return true;
  if (!Number.isInteger(deltaX) || !Number.isInteger(deltaY)) return true;
  return Math.abs(deltaX) + Math.abs(deltaY) < 50;
};
const nextWheelLock = (sample, timeStamp, lock) => {
  if (isDiscreteMouseWheel(sample)) return { lock: { gestureUntil: 0 }, block: false };
  if (isTrackpadWheel(sample)) return { lock: { gestureUntil: timeStamp + TRACKPAD_GESTURE_MS }, block: true };
  return { lock, block: timeStamp < lock.gestureUntil };
};
const wheelSampleFromEvent = (event) => {
  const legacy = event;
  return {
    deltaMode: event.deltaMode,
    deltaX: event.deltaX,
    deltaY: event.deltaY,
    ctrlKey: event.ctrlKey,
    wheelDeltaX: legacy.wheelDeltaX,
    wheelDeltaY: legacy.wheelDeltaY
  };
};
const useShooterPageLock = (locked) => {
  useEffect(() => {
    if (!locked) return void 0;
    const prevent = (event) => {
      event.preventDefault();
    };
    let lock = { gestureUntil: 0 };
    const onWheel = (event) => {
      const next = nextWheelLock(wheelSampleFromEvent(event), event.timeStamp, lock);
      lock = next.lock;
      if (next.block) event.preventDefault();
    };
    const root = document.documentElement;
    root.classList.add("shooter-gesture-lock");
    document.addEventListener("touchmove", prevent, { passive: false });
    document.addEventListener("wheel", onWheel, { passive: false });
    document.addEventListener("gesturestart", prevent);
    document.addEventListener("gesturechange", prevent);
    return () => {
      root.classList.remove("shooter-gesture-lock");
      document.removeEventListener("touchmove", prevent);
      document.removeEventListener("wheel", onWheel);
      document.removeEventListener("gesturestart", prevent);
      document.removeEventListener("gesturechange", prevent);
    };
  }, [locked]);
};
export {
  TRACKPAD_GESTURE_MS,
  isDiscreteMouseWheel,
  isTrackpadWheel,
  nextWheelLock,
  useShooterGesture,
  useShooterPageLock
};
