import { WS_RECONNECT_PROBE_MS } from './exchangeConstants';
const DEFAULT_MAX_PAYLOAD_BYTES = 32_768;
export class SafeWebSocketClient {
    options;
    socket = null;
    reconnectTimer = null;
    shouldReconnect = true;
    constructor(options) {
        this.options = options;
        const hasJson = Boolean(options.onJsonMessage);
        const hasParsed = Boolean(options.parseMessage && options.onMessage);
        if (!hasJson && !hasParsed) {
            throw new Error('SafeWebSocketClient: provide onJsonMessage and/or parseMessage+onMessage');
        }
    }
    connect() {
        if (this.socket) {
            const rs = this.socket.readyState;
            if (rs === WebSocket.CONNECTING || rs === WebSocket.OPEN)
                return;
        }
        this.options.onStatus?.('connecting');
        this.socket = new WebSocket(this.options.url);
        this.socket.onopen = () => {
            this.options.onStatus?.('connected');
            if (this.socket) {
                this.options.onOpen?.(this.socket);
            }
        };
        this.socket.onclose = () => {
            this.options.onStatus?.('disconnected');
            if (this.shouldReconnect) {
                this.scheduleReconnect();
            }
        };
        this.socket.onerror = () => {
            this.socket?.close();
        };
        this.socket.onmessage = (event) => {
            const payloadText = String(event.data ?? '');
            const maxBytes = this.options.maxPayloadBytes ?? DEFAULT_MAX_PAYLOAD_BYTES;
            if (payloadText.length > maxBytes) {
                return;
            }
            try {
                const parsedRaw = JSON.parse(payloadText);
                this.options.onJsonMessage?.(parsedRaw);
                if (this.options.parseMessage && this.options.onMessage) {
                    const parsed = this.options.parseMessage(parsedRaw);
                    if (parsed) {
                        this.options.onMessage(parsed);
                    }
                }
            }
            catch {
                // Ignore malformed payloads.
            }
        };
    }
    disconnect() {
        this.shouldReconnect = false;
        if (this.reconnectTimer) {
            window.clearTimeout(this.reconnectTimer);
        }
        this.socket?.close();
        this.socket = null;
    }
    scheduleReconnect() {
        /** Match Android `WebSocketRepository`: probe/reconnect on a ~10s cadence. */
        if (this.reconnectTimer !== null) {
            window.clearTimeout(this.reconnectTimer);
        }
        const jitter = Math.floor(Math.random() * 500);
        const wait = WS_RECONNECT_PROBE_MS + jitter;
        this.reconnectTimer = window.setTimeout(() => {
            this.reconnectTimer = null;
            this.connect();
        }, wait);
    }
}
