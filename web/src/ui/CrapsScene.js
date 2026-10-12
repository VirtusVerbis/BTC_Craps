import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import {} from 'react';
import { REFERENCE_HEIGHT, REFERENCE_WIDTH } from '../config/constants';
import { BG2_ARROW_DOWN_ASPECT_HEIGHT_PER_WIDTH, BG2_ARROW_DOWN_TOP_OFFSET_FRACTION, BG2_ARROW_UP_ASPECT_HEIGHT_PER_WIDTH, BG2_ARROW_UP_TOP_OFFSET_FRACTION, BG2_BDWW_ASPECT_HEIGHT_PER_WIDTH, BG2_BDWW_TOP_OFFSET_FRACTION, BG2_DCB_ASPECT_HEIGHT_PER_WIDTH, BG2_DCB_TOP_OFFSET_FRACTION, BG2_FR_ASPECT_HEIGHT_PER_WIDTH, BG2_FR_TOP_OFFSET_FRACTION, BG2_NEO_ASPECT_HEIGHT_PER_WIDTH, BG2_NEO_TOP_OFFSET_FRACTION, } from './androidMirrorConstants';
import { BonusFields } from './BonusFields';
import { BtcCandleChart } from './BtcCandleChart';
import { formatPnlBtc, formatPnlUsd, pnlColor, PL_CHARACTERS } from './characterPnl';
import { PL_LABEL_ANCHOR, PL_LABEL_FONT_PX } from './characterPnlConstants';
import { ChipLayer } from './ChipStack';
import { DiceLayer } from './DiceLayer';
import { SpeechLayer } from './SpeechLayer';
import { RollHistogram } from './RollHistogram';
import { mobileAssetManifest } from './mobileAssetManifest';
import { resolveMobileAssetUrl } from './mobileAssetUrls';
const bg2MemeFile = (frame) => {
    const f = Math.max(1, Math.min(40, frame));
    return `dancing_chika_brr_${String(f).padStart(3, '0')}.png`;
};
const fg3CatFile = (direction, frame) => {
    const f = frame % 2 === 0 ? 1 : 2;
    return `e_cat_${direction}_${f}.png`;
};
const boxStyle = (layer) => ({
    position: 'absolute',
    zIndex: layer.zIndex,
    left: `${layer.left * 100}%`,
    top: `${layer.top * 100}%`,
    width: `${layer.width * 100}%`,
    height: `${layer.height * 100}%`,
    pointerEvents: 'none',
});
export const CrapsScene = ({ showCandleChart, showBg2Meme, bg2ActiveMeme, candles, showFg3Cat, fg3Direction, fg3Frame, fg3Left, fg3Top, fg3Width, fg3Height, dice, characterPnl, rolls, histogramReveal, histogramAnimate, histogramTransitionMs, bonusHits, bonusFlashing, bonusLines, dieColor, }) => {
    const m = mobileAssetManifest;
    const bg2MemeSrc = (() => {
        if (!bg2ActiveMeme)
            return null;
        if (bg2ActiveMeme.sequenceId === 'dcb')
            return resolveMobileAssetUrl(bg2MemeFile(bg2ActiveMeme.frameIndex + 1));
        if (bg2ActiveMeme.sequenceId === 'bdww')
            return resolveMobileAssetUrl('buy_dip_with_what.png');
        if (bg2ActiveMeme.sequenceId === 'neo')
            return resolveMobileAssetUrl('neo.png');
        if (bg2ActiveMeme.sequenceId === 'firstRule')
            return resolveMobileAssetUrl('btc_first_rule.png');
        if (bg2ActiveMeme.sequenceId === 'arrowUp')
            return resolveMobileAssetUrl('arrow_up_0.png');
        return resolveMobileAssetUrl('arrow_down_0.png');
    })();
    const bg2TopOffset = (() => {
        if (!bg2ActiveMeme)
            return BG2_DCB_TOP_OFFSET_FRACTION;
        if (bg2ActiveMeme.sequenceId === 'dcb')
            return BG2_DCB_TOP_OFFSET_FRACTION;
        if (bg2ActiveMeme.sequenceId === 'bdww')
            return BG2_BDWW_TOP_OFFSET_FRACTION;
        if (bg2ActiveMeme.sequenceId === 'neo')
            return BG2_NEO_TOP_OFFSET_FRACTION;
        if (bg2ActiveMeme.sequenceId === 'firstRule')
            return BG2_FR_TOP_OFFSET_FRACTION;
        if (bg2ActiveMeme.sequenceId === 'arrowUp')
            return BG2_ARROW_UP_TOP_OFFSET_FRACTION;
        return BG2_ARROW_DOWN_TOP_OFFSET_FRACTION;
    })();
    const bg2Aspect = (() => {
        if (!bg2ActiveMeme)
            return BG2_DCB_ASPECT_HEIGHT_PER_WIDTH;
        if (bg2ActiveMeme.sequenceId === 'dcb')
            return BG2_DCB_ASPECT_HEIGHT_PER_WIDTH;
        if (bg2ActiveMeme.sequenceId === 'bdww')
            return BG2_BDWW_ASPECT_HEIGHT_PER_WIDTH;
        if (bg2ActiveMeme.sequenceId === 'neo')
            return BG2_NEO_ASPECT_HEIGHT_PER_WIDTH;
        if (bg2ActiveMeme.sequenceId === 'firstRule')
            return BG2_FR_ASPECT_HEIGHT_PER_WIDTH;
        if (bg2ActiveMeme.sequenceId === 'arrowUp')
            return BG2_ARROW_UP_ASPECT_HEIGHT_PER_WIDTH;
        return BG2_ARROW_DOWN_ASPECT_HEIGHT_PER_WIDTH;
    })();
    // Percentages resolve against the 1080×1920 stage, not the scaled anchor.
    const bg2HeightPct = (REFERENCE_WIDTH * bg2Aspect * 100) / REFERENCE_HEIGHT;
    const bg2Style = {
        position: 'absolute',
        zIndex: m.meme.zIndex,
        left: '0%',
        top: `${bg2TopOffset * 100}%`,
        width: '100%',
        height: `${bg2HeightPct}%`,
        objectFit: 'contain',
        pointerEvents: 'none',
    };
    const fg3Style = {
        position: 'absolute',
        zIndex: m.fg3.zIndex,
        left: `${fg3Left * 100}%`,
        top: `${fg3Top * 100}%`,
        width: `${fg3Width * 100}%`,
        height: `${fg3Height * 100}%`,
        objectFit: m.fg3.objectFit,
        pointerEvents: 'none',
    };
    return (_jsxs("div", { className: "scene", children: [_jsx("img", { src: "/craps-scene-layout_onepiece.png", alt: "", className: "scene-layer scene-craps", draggable: false }), _jsx(BonusFields, {}), _jsx(RollHistogram, { rolls: rolls, reveal: histogramReveal, animate: histogramAnimate, transitionMs: histogramTransitionMs, hits: bonusHits, flashing: bonusFlashing }), _jsx("div", { className: "character-pnl-layer", children: PL_CHARACTERS.map((character) => {
                    const amount = characterPnl[character];
                    if (!amount.shown)
                        return null;
                    const anchor = PL_LABEL_ANCHOR[character];
                    const sign = amount.usd !== 0 ? amount.usd : amount.btc;
                    return (_jsxs("div", { className: "character-pnl", style: {
                            left: anchor.x,
                            top: anchor.y,
                            color: pnlColor(amount),
                            fontSize: PL_LABEL_FONT_PX,
                        }, "aria-label": sign < 0 ? 'loss' : sign > 0 ? 'profit' : 'flat', children: [_jsx("p", { children: formatPnlBtc(amount.btc) }), _jsx("p", { children: formatPnlUsd(amount.usd) })] }, character));
                }) }), showBg2Meme && bg2MemeSrc ? (_jsx("img", { src: bg2MemeSrc, alt: "", className: "scene-layer scene-bg2-meme", style: bg2Style, draggable: false })) : null, showCandleChart ? (_jsx("div", { className: "scene-layer scene-chart-band", style: boxStyle(m.chartBand), children: _jsx(BtcCandleChart, { candles: candles, showAxisLabels: true }) })) : null, showFg3Cat ? (_jsx("img", { src: resolveMobileAssetUrl(fg3CatFile(fg3Direction, fg3Frame)), alt: "", className: "scene-layer scene-fg3-cat", style: fg3Style, draggable: false })) : null, _jsx(ChipLayer, { discs: dice?.chips ?? [], guides: dice?.guides ?? [] }), _jsx(SpeechLayer, { speech: dice?.speech ?? [] }), dice ? _jsx(DiceLayer, { presentation: dice, bonusLines: bonusLines, dieColor: dieColor }) : null] }));
};
