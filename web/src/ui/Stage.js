import { jsx as _jsx } from "react/jsx-runtime";
import {} from 'react';
import { REFERENCE_HEIGHT, REFERENCE_WIDTH } from '../config/constants';
import { useStageFitScale } from './useStageFitScale';
const W = REFERENCE_WIDTH;
const H = REFERENCE_HEIGHT;
export const Stage = ({ children, shellRef, stageRef, displayRef }) => {
    const scale = useStageFitScale(shellRef);
    return (_jsx("div", { className: "stage-shell", children: _jsx("div", { ref: displayRef, className: "stage-scale-outer", style: {
                width: W * scale,
                height: H * scale,
            }, children: _jsx("div", { ref: stageRef, className: "stage", style: {
                    width: W,
                    height: H,
                    transform: `scale(${scale})`,
                    transformOrigin: 'top left',
                }, children: children }) }) }));
};
