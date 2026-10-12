import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { DIE_BACK_WALL_TILT_DEG, DIE_LAUNCH_TILT_DEG, PUCK_IMAGE_WIDTH_PX } from "./diceConstants";
import { dieFaceGradient, diePigment, dieRainbowStep, dieShade } from "./diceColor";
import { formatShotClock } from "./gestureThrow";
import { puckPlacement } from "./puckState";
const PIP_LAYOUT = {
  1: [[50, 50]],
  2: [
    [28, 28],
    [72, 72]
  ],
  3: [
    [28, 28],
    [50, 50],
    [72, 72]
  ],
  4: [
    [28, 28],
    [72, 28],
    [28, 72],
    [72, 72]
  ],
  5: [
    [28, 28],
    [72, 28],
    [50, 50],
    [28, 72],
    [72, 72]
  ],
  6: [
    [28, 28],
    [72, 28],
    [28, 50],
    [72, 50],
    [28, 72],
    [72, 72]
  ]
};
const viewTiltDeg = (depth) => DIE_LAUNCH_TILT_DEG + depth * (DIE_BACK_WALL_TILT_DEG - DIE_LAUNCH_TILT_DEG);
const FACES = [
  { name: "front", value: 2 },
  { name: "back", value: 5 },
  { name: "right", value: 3 },
  { name: "left", value: 4 },
  { name: "top", value: 1 },
  { name: "bottom", value: 6 }
];
const useRainbowStep = (active) => {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!active) return void 0;
    const startedAt = performance.now();
    let frame = 0;
    const tick = (now) => {
      const next = dieRainbowStep(now - startedAt);
      setStep((current) => current === next ? current : next);
      frame = window.requestAnimationFrame(tick);
    };
    setStep(0);
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [active]);
  return step;
};
const Face = ({
  name,
  value,
  color,
  rainbowStep
}) => {
  const pigment = diePigment(color, rainbowStep);
  return /* @__PURE__ */ jsx(
    "div",
    {
      className: `die-face die-face-${name}`,
      style: {
        backgroundImage: dieFaceGradient(pigment),
        ["--die-shade"]: dieShade(pigment)
      },
      children: PIP_LAYOUT[value].map(([x, y]) => /* @__PURE__ */ jsx("span", { className: "die-pip", style: { left: `${x}%`, top: `${y}%` } }, `${name}-${x}-${y}`))
    }
  );
};
const DieMesh = ({
  x,
  y,
  size,
  tiltDeg,
  transform,
  color,
  rainbowStep,
  opacity = 1
}) => /* @__PURE__ */ jsx(
  "div",
  {
    className: "die",
    style: {
      width: size,
      height: size,
      left: x - size / 2,
      top: y - size / 2,
      opacity,
      ["--die-half"]: `${size / 2}px`
    },
    children: /* @__PURE__ */ jsx("div", { className: "die-spin", style: { transform: `rotateX(${tiltDeg}deg) ${transform}` }, children: FACES.map((face) => /* @__PURE__ */ jsx(Face, { name: face.name, value: face.value, color, rainbowStep }, face.name)) })
  }
);
const DiceLayer = ({
  presentation,
  bonusLines = [],
  dieColor = "orange"
}) => {
  const rainbowStep = useRainbowStep(dieColor === "rainbow");
  const puck = puckPlacement(presentation.point);
  const result = presentation.result;
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsxs("div", { className: "dice-layer", "data-die-color": dieColor, "aria-hidden": result == null, children: [
      /* @__PURE__ */ jsx(
        "img",
        {
          className: "puck",
          src: puck.src,
          alt: "",
          draggable: false,
          style: { left: puck.x, top: puck.y, width: PUCK_IMAGE_WIDTH_PX * puck.scale }
        }
      ),
      presentation.dice.map(
        (die) => die.visible ? /* @__PURE__ */ jsx(
          DieMesh,
          {
            x: die.x,
            y: die.y,
            size: die.size,
            tiltDeg: viewTiltDeg(die.depth),
            transform: die.transform,
            color: dieColor,
            rainbowStep
          },
          die.id
        ) : null
      )
    ] }),
    presentation.shotClockMs != null ? /* @__PURE__ */ jsxs("div", { className: "shot-clock", children: [
      /* @__PURE__ */ jsx("div", { className: "shot-clock-label", children: "Shot Clock" }),
      /* @__PURE__ */ jsx("div", { className: "shot-clock-time", children: formatShotClock(presentation.shotClockMs) })
    ] }) : null,
    result ? /* @__PURE__ */ jsx("div", { className: "dice-result", children: "noRoll" in result ? /* @__PURE__ */ jsx("div", { className: "dice-result-total", children: "No Roll!" }) : /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx("div", { className: "dice-result-total", children: result.total }),
      result.label ? /* @__PURE__ */ jsx("div", { className: "dice-result-label", children: result.label }) : null,
      bonusLines.map((line) => /* @__PURE__ */ jsx("div", { className: "dice-result-bonus", children: line }, line))
    ] }) }) : null
  ] });
};
export {
  DiceLayer,
  DieMesh,
  useRainbowStep
};
