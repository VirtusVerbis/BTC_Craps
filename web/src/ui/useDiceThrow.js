import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useOpenInterest } from '../data/openInterest';
import { applyCharacterPnl, characterStakes, loadCharacterPnl, PL_CHARACTERS, saveCharacterPnl, } from './characterPnl';
import { SPEECH_SHOW_MS } from './characterBetConstants';
import { composeTableBets } from './characterProfiles';
import { isHardRoll } from './crapsPayouts';
import { btcPrice } from './chipBets';
import { settleColumns, driftLooseChips, emptyChipWorld, guideFrames, lineLaunchObstacles, presentChips, puckObstacle, resolveDiceChips, tickRestack, worldFromBets, } from './chipPhysics';
import { DIE_RESULT_HOLD_MS, SHOT_CLOCK_MS } from './diceConstants';
import { advanceThrow, aimHeldPair, arcDisplayFrom, clearSharedX, createHoldingDice, createThrowState, launchGestureThrow, launchHeldAuto, reseatHeldDice, dieScreenCenter, quatToCssMatrix, spreadPairX, stageMetrics, syncArcDisplay, visualDieSize, } from './dicePhysics';
import { DEFAULT_DICE_CONTROL, holdFor } from './diceControl';
import { useDiceVolumeWindow } from './useDiceVolumeWindow';
import { emptyBonusHand } from './bonusCraps';
import { applyShooterRoll, bonusStakeDollars, emptyBonusStakes, loadShooterBook, saveShooterBook, shooterLineBets, } from './shooterProfile';
import { applyRollStreak, loadRollStreakLongest, saveRollStreakLongest, } from './rollStreak';
const emptyVolume = () => ({
    binanceBuy: 0,
    binanceSell: 0,
    coinbaseBuy: 0,
    coinbaseSell: 0,
});
const toView = (die, id, x, display) => {
    const metrics = stageMetrics();
    const screen = dieScreenCenter(die, metrics);
    const depth = metrics.wallZ > 0 ? Math.min(1, Math.max(0, die.z / metrics.wallZ)) : 0;
    const airborne = die.alive && !die.resting && !die.leaving && die.h > 0;
    return {
        id,
        visible: die.alive,
        x,
        y: screen.y,
        size: visualDieSize(die.z, die.h, metrics),
        depth,
        transform: quatToCssMatrix(airborne ? display.q : die.q),
    };
};
const shotClockMs = (state, nowMs) => {
    if (state.phase !== 'holding' || !state.manualHold)
        return null;
    return Math.max(0, SHOT_CLOCK_MS - (nowMs - state.phaseStartedMs));
};
const present = (state, chips, guides, speech, pnl, shooter, bonusStakes, rollStreak, nowMs, display) => {
    const [x0, x1] = spreadPairX(state.dice[0], state.dice[1]);
    return {
        dice: [toView(state.dice[0], 'left', x0, display[0]), toView(state.dice[1], 'right', x1, display[1])],
        result: state.phase === 'result' ? state.result : null,
        point: state.point,
        chips: chips.slice(),
        guides: guides.slice(),
        speech: speech.slice(),
        pnl,
        shooter,
        bonusStakes,
        rollStreak,
        phase: state.phase,
        shotClockMs: shotClockMs(state, nowMs),
    };
};
const laneKey = (world) => lineLaunchObstacles(world)
    .map((obstacle) => `${obstacle.x.toFixed(1)}:${obstacle.clearance.toFixed(1)}`)
    .join('|');
/** Move a held pair into an open lane. The same stacks leave the dice where they are. */
const aimClearLane = (state, world, aimedKey) => {
    if (state.phase !== 'holding')
        return { state, aimedKey };
    const key = laneKey(world);
    if (key === '' || key === aimedKey)
        return { state, aimedKey };
    const sharedX = clearSharedX(lineLaunchObstacles(world));
    return {
        aimedKey: key,
        state: { ...state, sharedX, dice: createHoldingDice(sharedX, Math.random, state.hold) },
    };
};
const liveSpeech = (speech, now) => {
    const live = [];
    for (const character of PL_CHARACTERS) {
        const row = speech[character];
        if (!row || row.until <= now) {
            delete speech[character];
            continue;
        }
        live.push({ character, text: row.text });
    }
    return live;
};
export const useDiceThrow = (market, enabled, rolls, onCountedRoll, bonusHandRef, shooterMode = false, shooterControlsRef, diceControlRef, onDiceControlRoll) => {
    const oi = useOpenInterest();
    const volume = useDiceVolumeWindow(market);
    const volumeRef = useRef(volume);
    volumeRef.current = volume;
    const marketRef = useRef(market);
    marketRef.current = market;
    const oiRef = useRef(oi);
    oiRef.current = oi;
    const rollsRef = useRef(rolls);
    rollsRef.current = rolls;
    const onCountedRollRef = useRef(onCountedRoll);
    onCountedRollRef.current = onCountedRoll;
    const onDiceControlRollRef = useRef(onDiceControlRoll);
    onDiceControlRollRef.current = onDiceControlRoll;
    const diceControlFallback = useRef(DEFAULT_DICE_CONTROL);
    if (diceControlRef)
        diceControlFallback.current = diceControlRef.current;
    const stateRef = useRef(createThrowState(performance.now()));
    const displayRef = useRef([
        arcDisplayFrom(stateRef.current.dice[0]),
        arcDisplayFrom(stateRef.current.dice[1]),
    ]);
    const worldRef = useRef(null);
    const pnlRef = useRef(loadCharacterPnl());
    const shooterRef = useRef(loadShooterBook());
    const betsRef = useRef([]);
    const profilesRef = useRef([]);
    const profilePointRef = useRef(null);
    const pressRollRef = useRef(null);
    const sevenOutRef = useRef(false);
    const speechRef = useRef({});
    const streakRef = useRef({ longest: loadRollStreakLongest(), current: 0 });
    const streakView = useCallback(() => ({
        current: streakRef.current.current,
        longest: streakRef.current.longest,
    }), []);
    const [presentation, setPresentation] = useState(() => present(stateRef.current, [], [], [], pnlRef.current, shooterRef.current, emptyBonusStakes(), streakView(), performance.now(), displayRef.current));
    const manualRef = useRef(shooterMode);
    manualRef.current = shooterMode;
    const commandRef = useRef([]);
    const lastVolumeRef = useRef(emptyVolume());
    const controls = useMemo(() => ({
        aimLaunchX: (stageX) => {
            commandRef.current.push({ kind: 'aim', x: stageX });
        },
        releaseGesture: (stroke) => {
            commandRef.current.push({ kind: 'gesture', stroke });
        },
        launchAutoNow: () => {
            commandRef.current.push({ kind: 'auto' });
        },
    }), []);
    useEffect(() => {
        if (!shooterControlsRef)
            return undefined;
        shooterControlsRef.current = controls;
        return () => {
            if (shooterControlsRef.current === controls)
                shooterControlsRef.current = null;
        };
    }, [controls, shooterControlsRef]);
    useEffect(() => {
        if (!enabled)
            return undefined;
        commandRef.current = [];
        stateRef.current = reseatHeldDice(createThrowState(performance.now()), holdFor(diceControlRef?.current ?? diceControlFallback.current, null));
        displayRef.current = [arcDisplayFrom(stateRef.current.dice[0]), arcDisplayFrom(stateRef.current.dice[1])];
        worldRef.current = null;
        pnlRef.current = loadCharacterPnl();
        shooterRef.current = loadShooterBook();
        betsRef.current = [];
        profilesRef.current = [];
        profilePointRef.current = null;
        pressRollRef.current = null;
        sevenOutRef.current = false;
        speechRef.current = {};
        streakRef.current = { longest: loadRollStreakLongest(), current: 0 };
        setPresentation(present(stateRef.current, [], [], [], pnlRef.current, shooterRef.current, emptyBonusStakes(), streakView(), performance.now(), displayRef.current));
        let frame = 0;
        let last = performance.now();
        const betsNow = (now) => {
            const snap = oiRef.current;
            const price = btcPrice(marketRef.current);
            const shooter = shooterLineBets(shooterRef.current.allWorking);
            if (!snap || !(price > 0)) {
                betsRef.current = shooter;
                return shooter;
            }
            const point = stateRef.current.point;
            const continued = point != null && point === profilePointRef.current;
            const hand = { continued, pressRoll: continued ? pressRollRef.current : null };
            const table = composeTableBets(snap.openInterest * price, snap.longPct, snap.shortPct, rollsRef.current, point, profilesRef.current, sevenOutRef.current, hand);
            sevenOutRef.current = false;
            pressRollRef.current = null;
            profilePointRef.current = point;
            profilesRef.current = table.profiles;
            for (const character of PL_CHARACTERS) {
                const text = table.callouts[character];
                if (text)
                    speechRef.current[character] = { text, until: now + SPEECH_SHOW_MS };
            }
            const bets = [...table.bets, ...shooter];
            betsRef.current = bets;
            return bets;
        };
        const poseHook = (dice, dt, metrics) => {
            const world = worldRef.current;
            const next = world
                ? resolveDiceChips(world, dice, dt, metrics, puckObstacle(stateRef.current.point))
                : dice;
            displayRef.current = syncArcDisplay(displayRef.current, next, dt);
            return next;
        };
        let aimedKey = '';
        const holdLane = () => {
            if (stateRef.current.aimLocked)
                return;
            const world = worldRef.current;
            if (!world || stateRef.current.phase !== 'holding') {
                if (stateRef.current.phase !== 'holding')
                    aimedKey = '';
                return;
            }
            const aimed = aimClearLane(stateRef.current, world, aimedKey);
            aimedKey = aimed.aimedKey;
            stateRef.current = aimed.state;
        };
        const armManualHold = (now) => {
            const state = stateRef.current;
            if (state.phase !== 'holding')
                return;
            if (manualRef.current && !state.manualHold) {
                stateRef.current = { ...state, manualHold: true, phaseStartedMs: now, aimLocked: false };
            }
            else if (!manualRef.current && state.manualHold) {
                stateRef.current = { ...state, manualHold: false };
            }
        };
        const drainCommands = (now, metrics) => {
            const commands = commandRef.current.splice(0);
            for (const command of commands) {
                if (stateRef.current.phase !== 'holding')
                    continue;
                if (command.kind === 'aim' && manualRef.current) {
                    stateRef.current = aimHeldPair(stateRef.current, command.x);
                }
                else if (command.kind === 'gesture' && stateRef.current.manualHold) {
                    stateRef.current = launchGestureThrow(stateRef.current, now, command.stroke, metrics);
                }
                else if (command.kind === 'auto') {
                    stateRef.current = launchHeldAuto(stateRef.current, now, lastVolumeRef.current, metrics);
                }
            }
        };
        const loop = (now) => {
            const dt = Math.min(0.05, (now - last) / 1000);
            last = now;
            const metrics = stageMetrics();
            const desired = holdFor(diceControlRef?.current ?? diceControlFallback.current, stateRef.current.point);
            const desiredKey = `${desired.setId}|${desired.stacked}`;
            const heldKey = `${stateRef.current.hold.setId}|${stateRef.current.hold.stacked}`;
            if (desiredKey !== heldKey)
                stateRef.current = reseatHeldDice(stateRef.current, desired);
            armManualHold(now);
            drainCommands(now, metrics);
            if (stateRef.current.phase === 'holding' && stateRef.current.manualHold) {
                lastVolumeRef.current = volumeRef.current;
                if (now - stateRef.current.phaseStartedMs >= SHOT_CLOCK_MS) {
                    stateRef.current = launchHeldAuto(stateRef.current, now, lastVolumeRef.current, metrics);
                }
            }
            if (!worldRef.current) {
                const bets = betsNow(now);
                if (bets.length > 0)
                    worldRef.current = worldFromBets(bets, Math.floor(now));
            }
            holdLane();
            if (stateRef.current.phase !== 'flying') {
                displayRef.current = [arcDisplayFrom(stateRef.current.dice[0]), arcDisplayFrom(stateRef.current.dice[1])];
            }
            const phaseBefore = stateRef.current.phase;
            const pointBefore = stateRef.current.point;
            stateRef.current = advanceThrow(stateRef.current, dt, now, volumeRef.current, metrics, poseHook);
            if (phaseBefore !== 'result' && stateRef.current.phase === 'result') {
                const result = stateRef.current.result;
                if (result && 'total' in result) {
                    const snap = oiRef.current;
                    const price = btcPrice(marketRef.current);
                    const faces = stateRef.current.dice;
                    const hard = isHardRoll(faces[0].topFace, faces[1].topFace);
                    if (snap && price > 0 && snap.openInterest > 0) {
                        pnlRef.current = applyCharacterPnl(pnlRef.current, pointBefore, result.total, characterStakes(snap.openInterest, price, snap.longPct, snap.shortPct), profilesRef.current, hard);
                        saveCharacterPnl(pnlRef.current);
                    }
                    if (pointBefore != null && result.total === 7)
                        sevenOutRef.current = true;
                    const samePoint = pointBefore != null && stateRef.current.point === pointBefore;
                    pressRollRef.current = samePoint && (result.total === 6 || result.total === 8) ? result.total : null;
                    const nextShooter = applyShooterRoll(shooterRef.current, pointBefore, result.total, bonusHandRef?.current ?? emptyBonusHand(), price);
                    if (nextShooter !== shooterRef.current) {
                        shooterRef.current = nextShooter;
                        saveShooterBook(nextShooter);
                    }
                    const step = applyRollStreak(streakRef.current, pointBefore != null, result.total);
                    streakRef.current = step.streak;
                    if (step.record)
                        saveRollStreakLongest(step.streak.longest);
                    const launched = stateRef.current.controlSnap;
                    const leftFace = faces[0].topFace;
                    const rightFace = faces[1].topFace;
                    if (launched && leftFace != null && rightFace != null) {
                        onDiceControlRollRef.current?.({
                            phase: launched.phase,
                            setId: launched.setId,
                            stacked: launched.stacked,
                            left: leftFace,
                            right: rightFace,
                        });
                    }
                }
                const raw = result ? onCountedRollRef.current?.(result) : 0;
                const extra = typeof raw === 'number' ? raw : 0;
                if (extra > 0)
                    stateRef.current = { ...stateRef.current, resultHoldMs: DIE_RESULT_HOLD_MS + extra };
            }
            if (phaseBefore !== 'holding' && stateRef.current.phase === 'holding') {
                const bets = betsNow(now);
                worldRef.current = settleColumns(worldRef.current ?? emptyChipWorld(), bets, now, Math.floor(now));
                aimedKey = '';
                if (manualRef.current) {
                    stateRef.current = { ...stateRef.current, manualHold: true, phaseStartedMs: now, aimLocked: false };
                }
                holdLane();
            }
            else if (stateRef.current.phase === 'result' && worldRef.current) {
                worldRef.current = driftLooseChips(worldRef.current, dt, metrics, puckObstacle(stateRef.current.point));
            }
            if (worldRef.current?.restack)
                worldRef.current = tickRestack(worldRef.current, now);
            const chips = worldRef.current ? presentChips(worldRef.current, now, metrics) : [];
            const guides = worldRef.current ? guideFrames(worldRef.current, metrics) : [];
            setPresentation(present(stateRef.current, chips, guides, liveSpeech(speechRef.current, now), pnlRef.current, shooterRef.current, bonusStakeDollars(betsRef.current), streakView(), now, displayRef.current));
            frame = window.requestAnimationFrame(loop);
        };
        frame = window.requestAnimationFrame(loop);
        return () => window.cancelAnimationFrame(frame);
    }, [enabled, streakView]);
    if (!enabled)
        return null;
    return presentation;
};
