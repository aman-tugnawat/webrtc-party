import { useState, useRef, useEffect, useCallback } from 'react';
import WebSocketService from '../services/WebSocketService';

interface Player {
    playerId: string;
    // Add other relevant player details if needed
}

interface UseWebRTCReturn {
    sessionId: string | null;
    playerId: string | null;
    isHost: boolean;
    players: Player[];
    gameType: string | null;
    isGameStarted: boolean;
    isConnected: boolean; // WebSocket connection status
    connectWebSocket: () => void;
    disconnectWebSocket: () => void;
    createSession: (gameType: string, maxPlayers?: number) => void;
    joinSession: (sessionId: string) => void;
    startGame: () => void;
    broadcastData: (data: any) => void;
    // Add a way to register a callback for received data
    registerDataCallback: (callback: (data: any, senderId: string) => void) => void;
}

const STUN_SERVER = 'stun:stun.l.google.com:19302';

export const useWebRTC = (): UseWebRTCReturn => {
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [playerId, setPlayerId] = useState<string | null>(null);
    const [isHost, setIsHost] = useState<boolean>(false);
    const [players, setPlayers] = useState<Player[]>([]);
    const [gameType, setGameType] = useState<string | null>(null);
    const [isGameStarted, setIsGameStarted] = useState<boolean>(false);
    const [isConnected, setIsConnected] = useState<boolean>(WebSocketService.isConnected());

    const peerConnectionsRef = useRef<Record<string, RTCPeerConnection>>({});
    const dataChannelsRef = useRef<Record<string, RTCDataChannel>>({});
    const onDataReceivedCallbackRef = useRef<((data: any, senderId: string) => void) | null>(null);


    // --- WebSocket Connection Management ---

    const connectWebSocket = useCallback(() => {
        if (!WebSocketService.isConnected()) {
             // Ensure environment variable is handled correctly (provide fallback for local dev)
             // @ts-ignore
             const wsUrl = import.meta.env.VITE_WS_URL || `ws://${window.location.hostname}:8080/ws`;
             console.log("Connecting WS to:", wsUrl);
             WebSocketService.connect(wsUrl);
        }
    }, []);

    const disconnectWebSocket = useCallback(() => {
        WebSocketService.disconnect();
         // Reset state on disconnect
         setSessionId(null);
         setPlayerId(null);
         setIsHost(false);
         setPlayers([]);
         setGameType(null);
         setIsGameStarted(false);
         Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
         peerConnectionsRef.current = {};
         dataChannelsRef.current = {};
         console.log("WebRTC state reset after disconnect.");
    }, []);


    // --- Core Actions ---

    const createSession = useCallback((gameType: string, maxPlayers: number = 4) => {
        if (!WebSocketService.isConnected()) {
            console.error("Cannot create session: WebSocket not connected.");
            return;
        }
        WebSocketService.sendMessage({
            type: 'create_session',
            payload: { gameType, maxPlayers } // Include maxPlayers if backend supports it
        });
    }, []);

    const joinSession = useCallback((sessionIdToJoin: string) => {
        if (!WebSocketService.isConnected()) {
            console.error("Cannot join session: WebSocket not connected.");
            return;
        }
        if (!sessionIdToJoin || sessionIdToJoin.trim().length !== 4) {
             console.error("Invalid session ID format provided.");
             // TODO: Provide user feedback
             return;
         }
        WebSocketService.sendMessage({
            type: 'join_session',
            payload: { sessionId: sessionIdToJoin.toUpperCase() } // Ensure consistent casing
        });
    }, []);

    const startGame = useCallback(() => {
        if (!WebSocketService.isConnected() || !isHost || !sessionId) {
            console.error("Cannot start game: Conditions not met (not connected, not host, or no session ID).");
            return;
        }
        WebSocketService.sendMessage({
            type: 'start_game',
            payload: { sessionId }
        });
    }, [isHost, sessionId]);


    // --- Signaling via WebSocket ---

    const sendToPeer = useCallback((type: string, payload: any, targetPlayerId: string) => {
        if (!WebSocketService.isConnected() || !sessionId) {
            console.error(`Cannot send ${type} to ${targetPlayerId}: WebSocket not connected or no session ID.`);
            return;
        }
         console.log(`Sending ${type} to ${targetPlayerId}`);
        WebSocketService.sendMessage({
            type: type, // 'offer', 'answer', 'ice_candidate'
            payload: { ...payload, targetPlayerId, sessionId } // Add target and session context
        });
    }, [sessionId]);


    // --- WebRTC Peer Connection and Data Channel Setup ---

    const createPeerConnection = useCallback((peerId: string, isInitiator: boolean) => {
        console.log(`Creating PeerConnection for peer ${peerId}, initiator: ${isInitiator}`);
        if (peerConnectionsRef.current[peerId]) {
            console.warn(`PeerConnection for ${peerId} already exists.`);
            return peerConnectionsRef.current[peerId]; // Return existing PC
        }

        const pc = new RTCPeerConnection({
            iceServers: [{ urls: STUN_SERVER }]
        });
        peerConnectionsRef.current[peerId] = pc;

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                console.log(`Sending ICE candidate to ${peerId}`);
                sendToPeer('ice_candidate', { candidate: event.candidate }, peerId);
            }
        };

        pc.onconnectionstatechange = () => {
            console.log(`PeerConnection state for ${peerId}: ${pc.connectionState}`);
             if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected' || pc.connectionState === 'closed') {
                // Handle cleanup if needed
                 console.warn(`PeerConnection for ${peerId} is ${pc.connectionState}. Cleaning up.`);
                 closePeerConnection(peerId);
            }
        };

         pc.oniceconnectionstatechange = () => {
             console.log(`ICE Connection state for ${peerId}: ${pc.iceConnectionState}`);
         };

        // Handle data channel creation/reception
        if (isInitiator) {
            console.log(`Creating DataChannel for ${peerId}`);
            const dc = pc.createDataChannel('gameDataChannel', { negotiated: false }); // Let browser negotiate ID
            setupDataChannel(dc, peerId);
            dataChannelsRef.current[peerId] = dc;

             // Create offer after setting up DC and ICE handler
             pc.createOffer()
                .then(offer => pc.setLocalDescription(offer))
                .then(() => {
                    console.log(`Sending offer to ${peerId}`);
                    sendToPeer('offer', { offer: pc.localDescription }, peerId);
                })
                .catch(e => console.error(`Error creating offer for ${peerId}:`, e));

        } else {
            // Only set ondatachannel listener if we are *not* the initiator
            pc.ondatachannel = (event) => {
                console.log(`Received DataChannel from ${peerId}`);
                const dc = event.channel;
                setupDataChannel(dc, peerId);
                dataChannelsRef.current[peerId] = dc;
            };
        }

        return pc;

    }, [sendToPeer]); // Added sendToPeer dependency

     const closePeerConnection = useCallback((peerId: string) => {
        console.log(`Closing PeerConnection and DataChannel for ${peerId}`);
        if (peerConnectionsRef.current[peerId]) {
            peerConnectionsRef.current[peerId].close();
            delete peerConnectionsRef.current[peerId];
        }
        if (dataChannelsRef.current[peerId]) {
            dataChannelsRef.current[peerId].close();
            delete dataChannelsRef.current[peerId];
        }
        // Optional: Update UI state if necessary
         setPlayers(prev => prev.filter(p => p.playerId !== peerId));
    }, []);


    const setupDataChannel = useCallback((dc: RTCDataChannel, peerId: string) => {
        dc.onopen = () => {
            console.log(`DataChannel opened with ${peerId}`);
            // Optionally send a confirmation or initial data
            // dc.send(JSON.stringify({ type: 'hello', from: playerId }));
        };

        dc.onclose = () => {
            console.log(`DataChannel closed with ${peerId}`);
             // Might want to remove the peer connection here too
             closePeerConnection(peerId);
        };

        dc.onerror = (error) => {
            console.error(`DataChannel error with ${peerId}:`, error);
        };

        dc.onmessage = (event) => {
            // console.log(`DataChannel message received from ${peerId}:`, event.data); // Can be noisy
            try {
                const data = JSON.parse(event.data);
                if (onDataReceivedCallbackRef.current) {
                    onDataReceivedCallbackRef.current(data, peerId);
                } else {
                     console.warn("Received data channel message, but no callback registered.");
                }
            } catch (error) {
                console.error(`Failed to parse DataChannel message from ${peerId}:`, event.data, error);
            }
        };
    }, [playerId, closePeerConnection]); // Added dependencies


     // --- WebRTC Signaling Handlers ---

    const handleOffer = useCallback(async (offer: RTCSessionDescriptionInit, senderId: string) => {
        console.log(`Handling offer from ${senderId}`);
        if (!playerId) return; // Cannot handle if own playerId is not set

        const pc = peerConnectionsRef.current[senderId] || createPeerConnection(senderId, false); // Create PC if doesn't exist, not initiator

        try {
             // Check signaling state before setting remote description
            if (pc.signalingState !== 'stable' && pc.signalingState !== 'have-remote-offer') {
                 console.warn(`Cannot set remote offer for ${senderId} in state ${pc.signalingState}. Potential glare.`);
                 // Basic glare resolution: initiator keeps their offer, non-initiator accepts
                 // A more robust solution might involve comparing player IDs.
                 // For now, if we are not stable and not expecting an offer, maybe ignore? Or force reset?
                 // Let's try ignoring if we already have a local offer set (we initiated)
                 if (pc.signalingState === 'have-local-offer') {
                     console.log(`Ignoring offer from ${senderId} due to signaling state ${pc.signalingState} (potential glare).`);
                     return;
                 }
                 // If state is closed, try recreating? Risky.
                 if(pc.signalingState === 'closed') {
                    console.error(`Peer connection with ${senderId} is closed. Cannot handle offer.`);
                    // Attempt cleanup and maybe notify user?
                    closePeerConnection(senderId);
                    return;
                 }
             }

            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            console.log(`Set remote description (offer) for ${senderId}`);

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            console.log(`Set local description (answer) for ${senderId}`);

            sendToPeer('answer', { answer: pc.localDescription }, senderId);

        } catch (error) {
            console.error(`Error handling offer from ${senderId}:`, error);
        }
    }, [createPeerConnection, sendToPeer, playerId, closePeerConnection]);


    const handleAnswer = useCallback(async (answer: RTCSessionDescriptionInit, senderId: string) => {
        console.log(`Handling answer from ${senderId}`);
        const pc = peerConnectionsRef.current[senderId];
        if (!pc) {
            console.error(`Received answer from ${senderId}, but no PeerConnection found.`);
            return;
        }

         // Check signaling state
         if (pc.signalingState !== 'have-local-offer') {
             console.warn(`Received answer from ${senderId}, but signaling state is ${pc.signalingState}. Ignoring.`);
             return;
         }

        try {
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
            console.log(`Set remote description (answer) for ${senderId}`);
        } catch (error) {
            console.error(`Error setting remote description (answer) for ${senderId}:`, error);
        }
    }, []);

    const handleIceCandidate = useCallback(async (candidate: RTCIceCandidateInit, senderId: string) => {
        // console.log(`Handling ICE candidate from ${senderId}`); // Can be noisy
        const pc = peerConnectionsRef.current[senderId];
        if (!pc) {
            console.warn(`Received ICE candidate from ${senderId}, but no PeerConnection found.`);
            // It's possible to receive candidates before the offer/answer cycle completes setup.
            // Buffering candidates might be needed in complex scenarios, but often adding them directly works if PC exists.
            return;
        }

        // Only add candidate if remote description is set
        if (!pc.remoteDescription) {
             console.warn(`Received ICE candidate from ${senderId}, but remote description not yet set. Ignoring.`);
             // TODO: Consider buffering candidates if this becomes an issue.
             return;
         }


        try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
            // console.log(`Added ICE candidate from ${senderId}`); // Can be noisy
        } catch (error: any) {
             // Ignore benign errors like candidate already added or adding null candidate after end-of-candidates
             if ((error instanceof DOMException && error.message.includes("Cannot add null candidate")) || (error && error.message && error.message.includes("Error processing ICE candidate"))) {
                 // console.log(`Ignoring benign ICE candidate error for ${senderId}: ${error.message}`);
             } else {
                console.error(`Error adding ICE candidate from ${senderId}:`, error);
             }
        }
    }, []);


    // --- Data Channel Broadcasting ---

    const broadcastData = useCallback((data: any) => {
        const message = JSON.stringify(data);
        // console.log("Broadcasting data:", data); // Can be noisy
        let sentCount = 0;
        Object.entries(dataChannelsRef.current).forEach(([peerId, dc]) => {
            if (dc && dc.readyState === 'open') {
                try {
                    dc.send(message);
                    sentCount++;
                } catch (error) {
                    console.error(`Failed to send data to ${peerId}:`, error);
                }
            } else {
                 console.warn(`Cannot send data to ${peerId}: DataChannel not open (state: ${dc?.readyState})`);
            }
        });
         if(sentCount > 0) console.log(`Broadcast data to ${sentCount} peers.`);
    }, []);

     // --- Data Callback Registration ---
     const registerDataCallback = useCallback((callback: (data: any, senderId: string) => void) => {
        onDataReceivedCallbackRef.current = callback;
        console.log("Registered data callback.");
    }, []);


    // --- WebSocket Event Listeners Effect ---
    useEffect(() => {
        const handleWsOpen = () => {
            console.log("useWebRTC: WebSocket connected.");
            setIsConnected(true);
        };

        const handleWsClose = (event: CloseEvent) => {
            console.log(`useWebRTC: WebSocket disconnected. Code: ${event.code}`);
            setIsConnected(false);
             // Don't automatically reset state here, let disconnectWebSocket handle it if called
             // Maybe notify user connection lost?
        };

        const handleWsMessage = (data: any) => {
            console.log('useWebRTC: Received message:', data); // Log all messages for debugging
            const { type, payload } = data;

            switch (type) {
                case 'session_created':
                    setSessionId(payload.sessionId);
                    setPlayerId(payload.playerId);
                    setPlayers(payload.players); // Expecting [{playerId: string}, ...]
                    setIsHost(true);
                    console.log(`Session ${payload.sessionId} created. You are host ${payload.playerId}. Players:`, payload.players);
                    break;

                case 'session_joined':
                     if (payload.playerId === playerId) { // Confirmation for self
                        setSessionId(payload.sessionId);
                        // PlayerId already set by the backend message handler now
                        setPlayers(payload.players);
                        setGameType(payload.gameType);
                        setIsHost(false); // Joined, so not host
                        console.log(`Joined session ${payload.sessionId} as player ${payload.playerId}. Players:`, payload.players);
                     } else {
                        // This case shouldn't happen if backend sends session_joined only to the joiner
                        console.warn("Received session_joined for another player?", payload);
                     }
                    break;

                case 'player_joined': // Sent to existing players when someone new joins
                case 'player_left':   // Sent to remaining players when someone leaves
                     console.log(`Player update (${type}):`, payload);
                    setPlayers(payload.players); // Update player list
                    if (type === 'player_joined' && isHost && payload.playerId !== playerId) {
                        // If host, initiate connection to the new player
                        console.log(`Host initiating connection to new player ${payload.playerId}`);
                        createPeerConnection(payload.playerId, true); // true = initiator
                    } else if (type === 'player_left' && payload.playerId !== playerId) {
                         // Clean up connection to the player who left
                         console.log(`Cleaning up connection for player ${payload.playerId} who left.`);
                         closePeerConnection(payload.playerId);
                    }
                    break;

                case 'offer':
                    if (payload.senderPlayerId !== playerId) {
                        handleOffer(payload.offer, payload.senderPlayerId);
                    }
                    break;

                case 'answer':
                    if (payload.senderPlayerId !== playerId) {
                        handleAnswer(payload.answer, payload.senderPlayerId);
                    }
                    break;

                case 'ice_candidate':
                    if (payload.senderPlayerId !== playerId) {
                        handleIceCandidate(payload.candidate, payload.senderPlayerId);
                    }
                    break;

                case 'game_started':
                    console.log("Game started!", payload);
                    setIsGameStarted(true);
                    setGameType(payload.gameType); // Ensure gameType is set here too
                    break;

                case 'error':
                     console.error("Received error from server:", payload.message);
                     // TODO: Display error to user
                     // Maybe reset state partially depending on error?
                     // If error is "Session not found", reset sessionId?
                     if (payload.message?.includes("Session not found")) {
                         setSessionId(null); // Reset session if it's invalid
                     }
                    break;

                default:
                    console.log('Unknown WebSocket message type:', type);
            }
        };

        // Subscribe
        const unsubscribeOpen = WebSocketService.onOpen(handleWsOpen);
        const unsubscribeClose = WebSocketService.onClose(handleWsClose);
        const unsubscribeMessage = WebSocketService.onMessage(handleWsMessage);

        // Check initial connection state
        setIsConnected(WebSocketService.isConnected());


        // Cleanup on unmount
        return () => {
            console.log("Cleaning up useWebRTC listeners.");
            unsubscribeOpen();
            unsubscribeClose();
            unsubscribeMessage();
            // Optional: disconnect WebSocket on hook unmount? Depends on desired lifecycle.
            // disconnectWebSocket();
        };
    }, [playerId, isHost, handleOffer, handleAnswer, handleIceCandidate, createPeerConnection, closePeerConnection]); // Added dependencies


    // --- Return Hook State and Functions ---
    return {
        sessionId,
        playerId,
        isHost,
        players,
        gameType,
        isGameStarted,
        isConnected,
        connectWebSocket,
        disconnectWebSocket,
        createSession,
        joinSession,
        startGame,
        broadcastData,
        registerDataCallback
    };
};
