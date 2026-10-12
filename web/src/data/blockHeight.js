import { BLOCK_CHANGE_FLASH_COUNT, BLOCK_HEIGHT_POLL_MS, FLASH_HALF_CYCLE_MS, STALE_FLASH_INTERVAL_MS, STALE_TIMER_MS, } from '../config/constants';
import { env } from '../config/env';
export class BlockHeightService {
    onUpdate;
    pollTimer = null;
    elapsedTimer = null;
    staleTimer = null;
    flashTimer = null;
    lastChangedAt = Date.now();
    blockHeight = null;
    constructor(onUpdate) {
        this.onUpdate = onUpdate;
    }
    start() {
        this.fetchNow();
        this.pollTimer = window.setInterval(() => this.fetchNow(), BLOCK_HEIGHT_POLL_MS);
        this.elapsedTimer = window.setInterval(() => this.emit(false, false), 1000);
        this.staleTimer = window.setInterval(() => {
            if (Date.now() - this.lastChangedAt > STALE_TIMER_MS) {
                this.flashStaleTimer();
            }
        }, STALE_FLASH_INTERVAL_MS);
    }
    stop() {
        if (this.pollTimer)
            window.clearInterval(this.pollTimer);
        if (this.elapsedTimer)
            window.clearInterval(this.elapsedTimer);
        if (this.staleTimer)
            window.clearInterval(this.staleTimer);
        if (this.flashTimer)
            window.clearInterval(this.flashTimer);
    }
    async fetchNow() {
        try {
            const response = await fetch(env.mempoolTipUrl);
            if (!response.ok) {
                return;
            }
            const text = await response.text();
            const parsed = Number(text);
            if (!Number.isFinite(parsed)) {
                return;
            }
            const nextHeight = Math.trunc(parsed);
            if (nextHeight !== this.blockHeight) {
                this.blockHeight = nextHeight;
                this.lastChangedAt = Date.now();
                this.flashBlockChange();
            }
            else {
                this.emit(false, false);
            }
        }
        catch {
            this.emit(false, false);
        }
    }
    flashBlockChange() {
        let cycles = 0;
        let flashOn = true;
        if (this.flashTimer) {
            window.clearInterval(this.flashTimer);
        }
        this.emit(flashOn, false);
        this.flashTimer = window.setInterval(() => {
            flashOn = !flashOn;
            this.emit(flashOn, false);
            cycles += 1;
            if (cycles >= BLOCK_CHANGE_FLASH_COUNT * 2) {
                if (this.flashTimer) {
                    window.clearInterval(this.flashTimer);
                }
                this.emit(false, false);
            }
        }, FLASH_HALF_CYCLE_MS);
    }
    flashStaleTimer() {
        let cycles = 0;
        let flashOn = true;
        const timer = window.setInterval(() => {
            this.emit(false, flashOn);
            flashOn = !flashOn;
            cycles += 1;
            if (cycles >= 6) {
                window.clearInterval(timer);
                this.emit(false, false);
            }
        }, FLASH_HALF_CYCLE_MS);
    }
    emit(blockFlashOn, staleFlashOn) {
        this.onUpdate({
            blockHeight: this.blockHeight,
            elapsedMs: Math.max(0, Date.now() - this.lastChangedAt),
            blockFlashOn,
            staleFlashOn,
        });
    }
}
