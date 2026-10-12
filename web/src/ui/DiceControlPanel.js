import { jsx, jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { diceControlCharts } from "./diceControl";
import { DICE_SETS, diceSet } from "./diceSets";
import { DiceControlChart } from "./DiceControlChart";
const REFERENCES = [
  {
    href: "https://wizardofvegas.com/forum/gambling/dice-setting/37761-dice-control-dice-setting-defined/",
    label: "Wizard of Vegas: dice setting defined"
  },
  { href: "https://www.dicecoach.com/dicesets.asp", label: "Dice Coach: dice sets" },
  { href: "https://www.axispowercraps.com/gripping-the-dice/", label: "Axis Power Craps: gripping the dice" }
];
const SetSelect = ({
  id,
  label,
  value,
  onChange
}) => /* @__PURE__ */ jsxs("label", { className: "dice-control-field", htmlFor: id, children: [
  /* @__PURE__ */ jsx("span", { children: label }),
  /* @__PURE__ */ jsx("select", { id, value, onChange: (event) => onChange(event.target.value), children: DICE_SETS.map((set) => /* @__PURE__ */ jsx("option", { value: set.id, children: set.label }, set.id)) }),
  /* @__PURE__ */ jsx("p", { className: "dice-control-note", children: diceSet(value).description })
] });
const DiceControlPanel = ({
  settings,
  onChange
}) => {
  const [open, setOpen] = useState(false);
  const [referencesOpen, setReferencesOpen] = useState(false);
  return /* @__PURE__ */ jsxs("section", { className: "side-panel", children: [
    /* @__PURE__ */ jsxs(
      "button",
      {
        className: "side-panel-toggle",
        type: "button",
        "aria-expanded": open,
        onClick: () => setOpen((current) => !current),
        children: [
          /* @__PURE__ */ jsx("span", { children: "Dice Control" }),
          /* @__PURE__ */ jsx("span", { "aria-hidden": "true", children: open ? "\u25BE" : "\u25B8" })
        ]
      }
    ),
    open ? /* @__PURE__ */ jsxs("div", { className: "side-panel-body", children: [
      /* @__PURE__ */ jsx(
        SetSelect,
        {
          id: "dice-control-come-out",
          label: "Come Out",
          value: settings.comeOut,
          onChange: (comeOut) => onChange({ comeOut })
        }
      ),
      /* @__PURE__ */ jsx(
        SetSelect,
        {
          id: "dice-control-point",
          label: "Point",
          value: settings.point,
          onChange: (point) => onChange({ point })
        }
      ),
      /* @__PURE__ */ jsxs(
        "button",
        {
          className: "dice-control-stack",
          type: "button",
          "aria-pressed": settings.stacked,
          onClick: () => onChange({ stacked: !settings.stacked }),
          children: [
            /* @__PURE__ */ jsx("span", { children: "Dice Stacking" }),
            /* @__PURE__ */ jsx("span", { children: settings.stacked ? "On" : "Off" })
          ]
        }
      ),
      /* @__PURE__ */ jsxs("div", { className: "dice-control-references", children: [
        /* @__PURE__ */ jsx(
          "button",
          {
            className: "dice-control-references-toggle",
            type: "button",
            "aria-expanded": referencesOpen,
            onClick: () => setReferencesOpen((current) => !current),
            children: "References"
          }
        ),
        referencesOpen ? /* @__PURE__ */ jsx("ul", { children: REFERENCES.map((link) => /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx("a", { href: link.href, target: "_blank", rel: "noopener noreferrer", children: link.label }) }, link.href)) }) : null
      ] })
    ] }) : null
  ] });
};
const DiceControlHistogram = ({
  settings,
  book
}) => {
  const [open, setOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const charts = diceControlCharts(settings, book);
  return /* @__PURE__ */ jsxs("section", { className: "side-panel", children: [
    /* @__PURE__ */ jsxs(
      "button",
      {
        className: "side-panel-toggle",
        type: "button",
        "aria-expanded": open,
        onClick: () => setOpen((current) => !current),
        children: [
          /* @__PURE__ */ jsx("span", { children: "Dice Control Histogram" }),
          /* @__PURE__ */ jsx("span", { "aria-hidden": "true", children: open ? "\u25BE" : "\u25B8" })
        ]
      }
    ),
    open ? /* @__PURE__ */ jsxs("div", { className: "side-panel-body", children: [
      /* @__PURE__ */ jsxs("div", { className: "dice-control-help", children: [
        /* @__PURE__ */ jsxs(
          "button",
          {
            className: "dice-control-help-toggle",
            type: "button",
            "aria-expanded": helpOpen,
            "aria-controls": "dice-control-help",
            onClick: () => setHelpOpen((current) => !current),
            children: [
              /* @__PURE__ */ jsx("span", { className: "dice-control-help-icon", "aria-hidden": "true", children: "i" }),
              "How to read this"
            ]
          }
        ),
        helpOpen ? /* @__PURE__ */ jsxs("div", { id: "dice-control-help", className: "dice-control-help-body", children: [
          /* @__PURE__ */ jsx("p", { children: "Come Out is every roll before a point is set. Point is every roll after. When both dropdowns name the same set, one chart combines them. When the names differ, the top chart is the Come Out set and the bottom chart is the Point set." }),
          /* @__PURE__ */ jsx("p", { children: "The center line is a fair pair of dice. A bar above it means that total is coming up more often than fair. A bar below means less often. A faded bar can still be ordinary luck. A solid bar has moved far enough that luck is a poor explanation." }),
          /* @__PURE__ */ jsx("p", { children: "Hard 4, 6, 8, and 10 are the doubles. The number after the name is how many times that double came up. fair is how many a fair pair would produce in this many rolls. random, when it appears, is that same count from the Random tosses." })
        ] }) : null
      ] }),
      charts.map((view) => /* @__PURE__ */ jsx(DiceControlChart, { view }, view.label))
    ] }) : null
  ] });
};
export {
  DiceControlHistogram,
  DiceControlPanel
};
