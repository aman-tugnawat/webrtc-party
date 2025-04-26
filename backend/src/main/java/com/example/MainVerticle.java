package com.example;

import io.vertx.core.AbstractVerticle;
import io.vertx.core.Promise;
import io.vertx.core.Vertx;
import io.vertx.core.http.HttpServer;
import io.vertx.core.http.ServerWebSocket;
import io.vertx.core.json.Json;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;


public class MainVerticle extends AbstractVerticle {

    private final SessionManager sessionManager = SessionManager.getInstance();
    // Map playerId to WebSocket connection
    private final Map<String, ServerWebSocket> playerConnections = new ConcurrentHashMap<>();
    // Map WebSocket hashcode to playerId (needed for cleanup on close)
    private final Map<Integer, String> webSocketToPlayerId = new ConcurrentHashMap<>();

    @Override
    public void start(Promise<Void> startPromise) throws Exception {

        HttpServer server = vertx.createHttpServer();

        server.webSocketHandler(ws -> {
            // --- WebSocket Connection Handling ---
            System.out.println("WebSocket connected: " + ws.textHandlerID());

            // Temporarily store the ws connection until playerId is established (e.g., via join/create)
            // A playerId will be assigned upon successful session creation or joining.

            ws.closeHandler(v -> handleWebSocketClose(ws));
            ws.exceptionHandler(Throwable::printStackTrace); // Basic error handling
            ws.textMessageHandler(message -> handleWebSocketMessage(ws, message));

        }).listen(8080, http -> {
            if (http.succeeded()) {
                System.out.println("HTTP server started on port 8888, WebSocket listening on /ws");
                startPromise.complete();
            } else {
                System.err.println("Could not start HTTP server: " + http.cause());
                startPromise.fail(http.cause());
            }
        });
    }

    // --- WebSocket Message Handler ---
    private void handleWebSocketMessage(ServerWebSocket ws, String message) {
        try {
            JsonObject json = new JsonObject(message);
            String type = json.getString("type");
            JsonObject payload = json.getJsonObject("payload", new JsonObject());
            String playerId = webSocketToPlayerId.get(ws.hashCode()); // Get playerId if already associated

             System.out.println("Received message: type=" + type + ", playerId=" + (playerId != null ? playerId : "UNKNOWN") + ", payload=" + payload.encode());


            switch (type) {
                case "create_session":
                    handleCreateSession(ws, payload);
                    break;
                case "join_session":
                    handleJoinSession(ws, payload);
                    break;
                case "offer":
                case "answer":
                case "ice_candidate":
                    handleSignalingMessage(playerId, type, payload);
                    break;
                case "start_game":
                    handleStartGame(playerId, payload);
                    break;
                default:
                    System.out.println("Unknown message type: " + type);
                    sendError(ws, "Unknown message type: " + type);
            }
        } catch (Exception e) {
            System.err.println("Failed to handle message: " + message + " | Error: " + e.getMessage());
            e.printStackTrace();
            sendError(ws, "Failed to process message: " + e.getMessage());
        }
    }

    // --- Specific Message Handlers ---

    private void handleCreateSession(ServerWebSocket ws, JsonObject payload) {
        String hostId = UUID.randomUUID().toString(); // Generate a unique player ID for the host
        String gameType = payload.getString("gameType", "default");
        int maxPlayers = payload.getInteger("maxPlayers", 4); // Default or from payload

        GameSession session = sessionManager.createSession(hostId, gameType, maxPlayers);
        if (session != null) {
            Player hostPlayer = session.getPlayers().get(hostId);
            if (hostPlayer != null) {
                associateWebSocketWithPlayer(ws, hostPlayer);

                // Send session created confirmation to host
                JsonObject response = new JsonObject()
                        .put("type", "session_created")
                        .put("payload", new JsonObject()
                                .put("sessionId", session.getSessionId())
                                .put("playerId", hostId) // Send the generated hostId back
                                .put("players", getPlayerListJson(session)));
                ws.writeTextMessage(response.encode());
                 System.out.println("Sent session_created to host: " + hostId + " for session: " + session.getSessionId());

            } else {
                 System.err.println("Error: Host player object not found after session creation for hostId: " + hostId);
                 sendError(ws, "Internal server error: Could not retrieve host player.");
            }
        } else {
            System.err.println("Error: SessionManager failed to create session for hostId: " + hostId);
            sendError(ws, "Failed to create session.");
        }
    }

    private void handleJoinSession(ServerWebSocket ws, JsonObject payload) {
        String sessionId = payload.getString("sessionId");
        String playerId = UUID.randomUUID().toString(); // Generate unique ID for joining player

        if (sessionId == null || sessionId.isEmpty()) {
            sendError(ws, "Session ID is required to join.");
            return;
        }

        GameSession session = sessionManager.joinSession(sessionId, playerId);
        if (session != null) {
            Player newPlayer = session.getPlayers().get(playerId);
             if (newPlayer != null) {
                 associateWebSocketWithPlayer(ws, newPlayer);

                // Send session joined confirmation to the new player
                JsonObject response = new JsonObject()
                        .put("type", "session_joined")
                        .put("payload", new JsonObject()
                                .put("sessionId", session.getSessionId())
                                .put("playerId", playerId) // Send the generated playerId back
                                .put("gameType", session.getGameType())
                                .put("players", getPlayerListJson(session)));
                ws.writeTextMessage(response.encode());
                 System.out.println("Sent session_joined to player: " + playerId + " for session: " + session.getSessionId());


                // Notify existing players about the new player
                broadcastPlayerUpdate(session, newPlayer, false); // false = not leaving
             } else {
                  System.err.println("Error: New player object not found after joining session for playerId: " + playerId);
                  sendError(ws, "Internal server error: Could not retrieve player object after join.");
             }

        } else {
             GameSession existingSession = sessionManager.getSession(sessionId);
             if (existingSession == null) {
                 sendError(ws, "Session not found: " + sessionId);
             } else {
                 sendError(ws, "Failed to join session: " + sessionId + " (Maybe full?)");
             }
        }
    }

     private void handleSignalingMessage(String senderPlayerId, String type, JsonObject payload) {
        if (senderPlayerId == null) {
            System.err.println("Cannot handle signaling: WebSocket not associated with a player.");
            // Cannot send error as we don't know which WS it was if senderPlayerId is null
            return;
        }
        String targetPlayerId = payload.getString("targetPlayerId");
        String sessionId = payload.getString("sessionId"); // Assuming sessionId is included

        if (targetPlayerId == null || sessionId == null) {
            System.err.println("Signaling message missing targetPlayerId or sessionId. Sender: " + senderPlayerId);
             sendError(playerConnections.get(senderPlayerId), "Signaling message requires 'targetPlayerId' and 'sessionId'.");
            return;
        }

        GameSession session = sessionManager.getSession(sessionId);
        if (session == null || !session.getPlayers().containsKey(senderPlayerId) || !session.getPlayers().containsKey(targetPlayerId)) {
             System.err.println("Invalid session or player for signaling. Session: " + sessionId + ", Sender: " + senderPlayerId + ", Target: " + targetPlayerId);
             sendError(playerConnections.get(senderPlayerId), "Cannot send signaling message: Invalid session or target player.");
            return;
        }


        ServerWebSocket targetWs = playerConnections.get(targetPlayerId);
        if (targetWs != null) {
            // Forward the message, adding the sender's ID
            JsonObject forwardMessage = new JsonObject()
                    .put("type", type)
                    .put("payload", payload.copy().put("senderPlayerId", senderPlayerId)); // Add sender info
            targetWs.writeTextMessage(forwardMessage.encode());
            System.out.println("Forwarded " + type + " from " + senderPlayerId + " to " + targetPlayerId + " in session " + sessionId);
        } else {
             System.err.println("Signaling target player WebSocket not found: " + targetPlayerId);
             // Optionally notify sender that target is offline? Be careful of feedback loops.
             // sendError(playerConnections.get(senderPlayerId), "Target player " + targetPlayerId + " is not connected.");
        }
    }


     private void handleStartGame(String senderPlayerId, JsonObject payload) {
         if (senderPlayerId == null) {
             System.err.println("Cannot handle start_game: WebSocket not associated with a player.");
             return;
         }
         String sessionId = payload.getString("sessionId");
         if (sessionId == null) {
             System.err.println("start_game message missing sessionId. Sender: " + senderPlayerId);
             sendError(playerConnections.get(senderPlayerId), "start_game message requires 'sessionId'.");
             return;
         }

         GameSession session = sessionManager.getSession(sessionId);
         if (session == null) {
             System.err.println("Session not found for start_game: " + sessionId);
             sendError(playerConnections.get(senderPlayerId), "Session not found: " + sessionId);
             return;
         }

         // Verify sender is the host
         if (!senderPlayerId.equals(session.getHostId())) {
              System.err.println("Player " + senderPlayerId + " attempted to start game in session " + sessionId + " but is not the host (" + session.getHostId() + ").");
              sendError(playerConnections.get(senderPlayerId), "Only the host can start the game.");
             return;
         }

         // Broadcast game_started message to all players in the session
         JsonObject startGameMessage = new JsonObject()
                 .put("type", "game_started")
                 .put("payload", new JsonObject()
                         .put("gameType", session.getGameType())
                         .put("sessionId", sessionId)); // Include sessionId for context

        System.out.println("Host " + senderPlayerId + " starting game for session " + sessionId);
        broadcastToSession(session, startGameMessage.encode(), null); // Broadcast to all
     }

    // --- WebSocket Close Handler ---
    private void handleWebSocketClose(ServerWebSocket ws) {
        Integer wsHashCode = ws.hashCode();
        String playerId = webSocketToPlayerId.remove(wsHashCode); // Remove mapping
        System.out.println("[Close] WebSocket closed event for Hash: " + wsHashCode);

        if (playerId != null) {
            playerConnections.remove(playerId); // Remove connection reference
            System.out.println("[Close] Found Player ID: " + playerId);

            // Find which session the player was in
            System.out.println("[Close] Searching sessions for player: " + playerId);
            // This is inefficient; ideally, store sessionId with player connection info
            // System.out.println("[Close] Searching for session containing player: " + playerId); // Redundant log
            GameSession sessionPlayerWasIn = null;
            String sessionIdPlayerWasIn = null;
            for (Map.Entry<String, GameSession> entry : sessionManager.getAllSessions().entrySet()) {
                if (entry.getValue().getPlayers().containsKey(playerId)) {
                    sessionPlayerWasIn = entry.getValue();
                    sessionIdPlayerWasIn = entry.getKey();
                    break;
                }
            }

            if (sessionPlayerWasIn != null && sessionIdPlayerWasIn != null) {
                System.out.println("[Close] Player " + playerId + " found in session " + sessionIdPlayerWasIn + " (Host: " + sessionPlayerWasIn.getHostId() + ")");
                System.out.println("[Close] Session state BEFORE removal: Players=" + sessionPlayerWasIn.getPlayers().keySet());

                // Prepare the broadcast message content *before* potential session modification/deletion
                // Create a temporary player object just for the broadcast payload
                Player leavingPlayer = new Player(playerId); // Use the actual leaving player ID
                // Get the list of players *before* removal to determine recipients and payload content
                Map<String, Player> playersBeforeRemoval = new ConcurrentHashMap<>(sessionPlayerWasIn.getPlayers());
                JsonArray playersListForPayload = new JsonArray(
                    playersBeforeRemoval.values().stream()
                        .filter(p -> !p.getPlayerId().equals(playerId)) // Exclude the leaving player from the list in the payload
                        .map(p -> new JsonObject().put("playerId", p.getPlayerId()))
                        .collect(Collectors.toList())
                );
                JsonObject playerLeftMessagePayload = new JsonObject()
                    .put("playerId", leavingPlayer.getPlayerId())
                    .put("players", playersListForPayload);


                // Now, remove the player from the session manager
                System.out.println("[Close] Calling sessionManager.removePlayer(" + sessionIdPlayerWasIn + ", " + playerId + ")");
                sessionManager.removePlayer(sessionIdPlayerWasIn, playerId); // This might delete the session

                // Check if the session still exists AFTER removal
                GameSession currentSessionState = sessionManager.getSession(sessionIdPlayerWasIn);
                if (currentSessionState != null) {
                    System.out.println("[Close] Session " + sessionIdPlayerWasIn + " still exists after removal.");
                    JsonObject playerLeftMessage = new JsonObject().put("type", "player_left").put("payload", playerLeftMessagePayload);
                    System.out.println("[Close] Broadcasting player_left: " + playerLeftMessage.encode());
                    // Broadcast to remaining players in the *current* session state
                    broadcastToSession(currentSessionState, playerLeftMessage.encode(), playerId);
                } else {
                    System.out.println("[Close] Session " + sessionIdPlayerWasIn + " was deleted after removing player " + playerId + ".");
                    // Optionally broadcast session_deleted to the players who *were* in the session (excluding the leaver)
                    // This requires iterating over playersBeforeRemoval
                    JsonObject sessionDeletedMessage = new JsonObject().put("type", "session_deleted").put("payload", new JsonObject().put("sessionId", sessionIdPlayerWasIn));
                    System.out.println("[Close] Broadcasting session_deleted: " + sessionDeletedMessage.encode());
                    broadcastToPlayers(playersBeforeRemoval.values(), sessionDeletedMessage.encode(), playerId); // Use a helper to broadcast to a specific list
                }


            } else {
                System.out.println("[Close] Player " + playerId + " was not found in any active session.");
            }

        } else {
            System.out.println("WebSocket closed, but no player mapping found (maybe connection closed before joining/creating session). Hash: " + wsHashCode);
        }
    }

    // --- Helper Methods ---

     private void associateWebSocketWithPlayer(ServerWebSocket ws, Player player) {
        player.setWebSocket(ws); // Link in Player object
        playerConnections.put(player.getPlayerId(), ws);
        webSocketToPlayerId.put(ws.hashCode(), player.getPlayerId());
         System.out.println("Associated WebSocket " + ws.textHandlerID() + " with Player " + player.getPlayerId());
    }


    private JsonArray getPlayerListJson(GameSession session) {
        return new JsonArray(
                session.getPlayers().values().stream()
                        .map(p -> new JsonObject().put("playerId", p.getPlayerId())) // Add more player details if needed
                        .collect(Collectors.toList())
        );
    }

    private void broadcastPlayerUpdate(GameSession session, Player updatedPlayer, boolean leaving) {
        JsonObject message = new JsonObject()
                .put("type", leaving ? "player_left" : "player_joined")
                .put("payload", new JsonObject()
                        .put("playerId", updatedPlayer.getPlayerId())
                        .put("players", getPlayerListJson(session))); // Send the updated list

        String logAction = leaving ? "left" : "joined";
        System.out.println("Broadcasting player_" + logAction + " update for player " + updatedPlayer.getPlayerId() + " in session " + session.getSessionId());
        broadcastToSession(session, message.encode(), updatedPlayer.getPlayerId()); // Exclude the player who triggered the update
    }

     private void broadcastToSession(GameSession session, String message, String excludePlayerId) {
        if (session == null) {
            System.err.println("[Broadcast] Attempted to broadcast to a null session!");
            return;
        }
        System.out.println("[Broadcast] Broadcasting to session " + session.getSessionId() + (excludePlayerId != null ? " (excluding " + excludePlayerId + ")" : "") + ": " + message);
        if (session.getPlayers().isEmpty()) {
             System.out.println("[Broadcast] No players in session " + session.getSessionId() + " to broadcast to.");
             return;
        }
        session.getPlayers().values().forEach(player -> {
            // Ensure player object is not null before accessing methods
            if (player == null) {
                System.err.println("[Broadcast] Encountered null player object in session " + session.getSessionId());
                return; // Skip this iteration
            }
            String currentPlayerId = player.getPlayerId();
            if (currentPlayerId == null) {
                 System.err.println("[Broadcast] Encountered player with null ID in session " + session.getSessionId());
                 return; // Skip this iteration
            }

            if (!currentPlayerId.equals(excludePlayerId)) {
                 System.out.println("[Broadcast] Targeting player " + currentPlayerId + " in session " + session.getSessionId());
                ServerWebSocket targetWs = playerConnections.get(currentPlayerId);
                if (targetWs != null && !targetWs.isClosed()) {
                    targetWs.writeTextMessage(message);
                } else {
                     System.out.println("[Broadcast] Skipping broadcast to player " + currentPlayerId + ": WebSocket not found or closed.");
                }
            } else {
                 System.out.println("[Broadcast] Skipping broadcast to excluded player " + excludePlayerId);
            }
        });
    }

    // Helper to broadcast to a specific collection of players (used for session_deleted)
    private void broadcastToPlayers(Iterable<Player> players, String message, String excludePlayerId) {
        System.out.println("[BroadcastPlayers] Broadcasting message" + (excludePlayerId != null ? " (excluding " + excludePlayerId + ")" : "") + ": " + message);
        for (Player player : players) {
            if (player == null || player.getPlayerId() == null) {
                System.err.println("[BroadcastPlayers] Skipping null player or player with null ID.");
                continue;
            }
            String currentPlayerId = player.getPlayerId();
            if (!currentPlayerId.equals(excludePlayerId)) {
                ServerWebSocket targetWs = playerConnections.get(currentPlayerId);
                if (targetWs != null && !targetWs.isClosed()) {
                    targetWs.writeTextMessage(message);
                } else {
                    System.out.println("[BroadcastPlayers] Skipping broadcast to player " + currentPlayerId + ": WebSocket not found or closed.");
                }
            }
        }
    }


    private void sendError(ServerWebSocket ws, String errorMessage) {
        JsonObject errorMsg = new JsonObject()
                .put("type", "error")
                .put("payload", new JsonObject().put("message", errorMessage));
        ws.writeTextMessage(errorMsg.encode());
         System.out.println("Sent error to WebSocket " + ws.textHandlerID() + ": " + errorMessage);
    }


    // Main method remains the same
    public static void main(String[] args) {
        Vertx vertx = Vertx.vertx();
        vertx.deployVerticle(new MainVerticle());
  }
}
