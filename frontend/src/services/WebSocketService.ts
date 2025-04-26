/**
 * Singleton service for managing WebSocket connections.
 */
class WebSocketService {
    private static instance: WebSocketService;
    private ws: WebSocket | null = null;
    private messageListeners: ((data: any) => void)[] = [];
    private openListeners: (() => void)[] = [];
    private closeListeners: ((event: CloseEvent) => void)[] = [];
    private url: string | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectInterval = 3000; // 3 seconds

    private constructor() {
        console.info('[WebSocketService] Constructor called.'); // Log constructor call
    }

    public static getInstance(): WebSocketService {
        if (!WebSocketService.instance) {
            console.info('[WebSocketService] Creating new instance.'); // Log instance creation
            WebSocketService.instance = new WebSocketService();
        }
        return WebSocketService.instance;
    }

    connect(url: string): void {
        console.log('[WebSocketService] connect method called with URL:', url); // Added for debugging
        // Prevent multiple connections
        if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
            console.log('WebSocket is already connected or connecting.');
            return;
        }

        this.url = url; // Store url for potential reconnects
        console.info(`[WebSocketService] Attempting to connect WebSocket to ${url}...`); // Changed to info
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
            console.log('WebSocket connection opened');
            this.reconnectAttempts = 0; // Reset reconnect attempts on successful connection
            this.openListeners.forEach(callback => callback());
        };

        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                // console.log('WebSocket message received:', data); // Can be noisy
                this.messageListeners.forEach(callback => callback(data));
            } catch (error) {
                console.error('Failed to parse WebSocket message:', event.data, error);
            }
        };

        this.ws.onerror = (event: Event) => { // Added Event type
            console.error('[WebSocketService] WebSocket error:', event); // Log the full event
            // Consider adding an error callback mechanism here if needed by App/hook
        };

        this.ws.onclose = (event) => {
             console.warn(`[WebSocketService] WebSocket connection closed: Code=${event.code}, Reason='${event.reason}'`); // Changed to warn, added quotes for reason
            this.ws = null; // Clear the instance
            this.closeListeners.forEach(callback => callback(event));

            // Optional: Implement reconnection logic
            // if (this.reconnectAttempts < this.maxReconnectAttempts) {
            //     this.reconnectAttempts++;
            //     console.log(`Attempting to reconnect WebSocket (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
            //     setTimeout(() => {
            //         if (this.url) {
            //             this.connect(this.url);
            //         }
            //     }, this.reconnectInterval);
            // } else {
            //     console.error('WebSocket max reconnect attempts reached.');
            // }
        };
    }

    disconnect(): void {
        if (this.ws) {
            console.log('Disconnecting WebSocket...');
            this.ws.close(1000, 'User disconnected'); // 1000 indicates normal closure
            this.ws = null;
            this.url = null; // Prevent reconnects after manual disconnect
            this.reconnectAttempts = this.maxReconnectAttempts; // Prevent reconnects
        }
    }

    sendMessage(data: any): boolean {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            try {
                const message = JSON.stringify(data);
                this.ws.send(message);
                // console.log('WebSocket message sent:', data); // Can be noisy
                return true;
            } catch (error) {
                console.error('Failed to stringify or send WebSocket message:', data, error);
                return false;
            }
        } else {
            console.error('Cannot send message: WebSocket is not connected.');
            return false;
        }
    }

    onMessage(callback: (data: any) => void): () => void {
        this.messageListeners.push(callback);
        // Return an unsubscribe function
        return () => {
            this.messageListeners = this.messageListeners.filter(listener => listener !== callback);
        };
    }

    onOpen(callback: () => void): () => void {
        this.openListeners.push(callback);
        return () => {
            this.openListeners = this.openListeners.filter(listener => listener !== callback);
        };
    }

    onClose(callback: (event: CloseEvent) => void): () => void {
        this.closeListeners.push(callback);
        return () => {
            this.closeListeners = this.closeListeners.filter(listener => listener !== callback);
        };
    }

    isConnected(): boolean {
        return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    }
}

export default WebSocketService.getInstance();
