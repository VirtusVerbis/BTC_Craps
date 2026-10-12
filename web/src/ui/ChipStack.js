import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BET_STACK_GUIDES_ON, STACK_GUIDE_FONT_PX } from './characterBetConstants';
import { CHIP_FELT_TILT_DEG } from './chipConstants';
import { chipDrawSize } from './chipPhysics';
export const ChipLayer = ({ discs, guides = [] }) => {
    const { width, height } = chipDrawSize();
    return (_jsxs("div", { className: "chip-stack", "aria-hidden": true, children: [discs.map((disc) => {
                const style = {
                    width: width * disc.scale,
                    height: height * disc.scale,
                    left: disc.x,
                    top: disc.y,
                    zIndex: disc.zIndex,
                    transform: `translate(-50%, -50%) translateY(${disc.lift * disc.scale}px) rotateX(${CHIP_FELT_TILT_DEG}deg) rotateZ(${disc.spin}deg)`,
                };
                return (_jsx("div", { className: `chip chip-${disc.color}${disc.face ? ' chip-top' : ' chip-wall'}`, style: style, children: disc.face ? (_jsx("span", { className: "chip-mark", style: { transform: 'translate(-50%, -50%)' } })) : null }, disc.key));
            }), BET_STACK_GUIDES_ON
                ? guides.map((guide) => (_jsx("div", { className: "stack-guide", style: {
                        left: guide.left,
                        top: guide.top,
                        width: guide.width,
                        height: guide.height,
                        borderColor: guide.color,
                        color: guide.color,
                        fontSize: STACK_GUIDE_FONT_PX,
                    }, children: _jsx("span", { className: "stack-guide-caption", children: guide.label }) }, guide.label)))
                : null] }));
};
