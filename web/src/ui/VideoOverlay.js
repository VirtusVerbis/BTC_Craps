import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef } from 'react';
import { VIDEO_OVERLAY_TOP_PX_WEB } from './androidMirrorConstants';
import { VIDEO_SET_TO_VIDEO_ID } from './videoOverlayConfig';
let ytApiReadyPromise = null;
const ensureYoutubeApi = () => {
    if (window.YT?.Player)
        return Promise.resolve();
    if (!ytApiReadyPromise) {
        ytApiReadyPromise = new Promise((resolve) => {
            const existing = document.querySelector('script[data-yt-iframe-api="1"]');
            if (!existing) {
                const script = document.createElement('script');
                script.src = 'https://www.youtube.com/iframe_api';
                script.async = true;
                script.dataset.ytIframeApi = '1';
                document.body.appendChild(script);
            }
            const previousReady = window.onYouTubeIframeAPIReady;
            window.onYouTubeIframeAPIReady = () => {
                previousReady?.();
                resolve();
            };
        });
    }
    return ytApiReadyPromise;
};
export function VideoOverlay({ videoId, soundEnabled, onEnded, onPlaybackError, onClose, sceneWidthPx, }) {
    if (!Object.values(VIDEO_SET_TO_VIDEO_ID).includes(videoId))
        return null;
    const playerId = useMemo(() => `yt-overlay-${videoId}-${Math.random().toString(36).slice(2, 8)}`, [videoId]);
    const playerRef = useRef(null);
    useEffect(() => {
        let mounted = true;
        const init = async () => {
            await ensureYoutubeApi();
            if (!mounted || !window.YT?.Player)
                return;
            playerRef.current = new window.YT.Player(playerId, {
                videoId,
                playerVars: {
                    autoplay: 1,
                    controls: 1,
                    rel: 0,
                    modestbranding: 1,
                    playsinline: 1,
                    mute: 1,
                },
                events: {
                    onReady: (event) => {
                        // Force muted state before first playback to avoid audible startup blips.
                        event.target.mute();
                        event.target.playVideo();
                        if (soundEnabled) {
                            event.target.unMute();
                        }
                    },
                    onStateChange: (event) => {
                        if (event.data === window.YT?.PlayerState?.ENDED || event.data === 0) {
                            onEnded();
                        }
                    },
                    onError: () => {
                        onPlaybackError();
                    },
                },
            });
        };
        void init();
        return () => {
            mounted = false;
            playerRef.current?.destroy();
            playerRef.current = null;
        };
    }, [onEnded, onPlaybackError, playerId, soundEnabled, videoId]);
    useEffect(() => {
        if (soundEnabled) {
            playerRef.current?.unMute();
        }
        else {
            playerRef.current?.mute();
        }
    }, [soundEnabled]);
    const desiredTopPx = VIDEO_OVERLAY_TOP_PX_WEB;
    const frameWidthPx = sceneWidthPx;
    const frameHeightPx = (frameWidthPx * 9) / 16;
    const topPx = desiredTopPx;
    const heightPx = frameHeightPx;
    return (_jsx("div", { className: "video-overlay-root", style: { top: `${topPx}px`, height: `${heightPx}px` }, children: _jsxs("div", { className: "video-overlay-content", children: [_jsx("div", { className: "video-overlay-player-shell", children: _jsx("div", { id: playerId, className: "video-overlay-player" }) }), _jsx("button", { type: "button", className: "video-overlay-close", onClick: onClose, children: "Close" })] }) }));
}
