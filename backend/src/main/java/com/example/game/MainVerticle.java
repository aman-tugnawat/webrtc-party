package com.example.game;

import io.vertx.core.AbstractVerticle;
import io.vertx.core.Promise;
import io.vertx.core.http.HttpServer;
import io.vertx.core.http.ServerWebSocket; // Added
import io.vertx.core.json.JsonObject; // Added
import io.vertx.core.logging.Logger;
import io.vertx.core.logging.LoggerFactory;

import java.util.Map; // Added
import java.util.Random; // Added
import java.util.concurrent.ConcurrentHashMap; // Added

public class MainVerticle extends AbstractVerticle {

    private static final Logger LOGGER = LoggerFactory.getLogger(MainVerticle.class);
    private static final int HTTP_PORT = 8080;
    private static final int SESSION_CODE_LENGTH = 4; // Added constant

    // Map<SessionCode, Session>
    private final Map<String, Session> sessions = new ConcurrentHashMap<>(); // Added map
    // Map<WebSocketConnection, SessionCode>
    private final Map<ServerWebSocket, String> connections = new ConcurrentHashMap<>(); // Added map
    private final Random random = new Random(); // Added random generator

    @Override
    public void start(Promise<Void> startPromise) throws Exception {
        HttpServer server = vertx.createHttpServer();

        server.webSocketHandler(ws -> {
            // Check if the connection path is /ws
            if (!ws.path().equals("/ws")) {
                LOGGER.info("Rejecting connection for path: " + ws.path());
                ws.reject();
                return;
            }

            LOGGER.info("WebSocket connection established from " + ws.remoteAddress());

            // Handle incoming messages
            ws.handler(buffer -> {
                try {
                    JsonObject message = buffer.toJsonObject();
                    String messageType = message.getString("type");
                    LOGGER.info("Received message of type '{}' from {}", messageType, ws.remoteAddress());

                    if ("CREATE_SESSION".equals(messageType)) {
                        handleCreateSession(ws);
                    } else if ("JOIN_SESSION".equals(messageType)) {
                        JsonObject payload = message.getJsonObject("payload");
                        if (payload != null && payload.getString("sessionCode") != null) {
                            handleJoinSession(ws, payload); // Call new handler method
                        } else {
                            LOGGER.warn("JOIN_SESSION message missing payload or sessionCode from {}", ws.remoteAddress());
                            sendError(ws, "Invalid JOIN_SESSION message format");
                        }
                    } else if ("SIGNAL".equals(messageType)) {
                        JsonObject payload = message.getJsonObject("payload");
                        if (payload != null) {
                            handleSignalMessage(ws, message); // Pass the whole message
                        } else {
                            LOGGER.warn("SIGNAL message missing payload from {}", ws.remoteAddress());
                            sendError(ws, "Invalid SIGNAL message format");
                        }
                    } else if ("START_GAME".equals(messageType)) {
                        JsonObject payload = message.getJsonObject("payload"); // Payload might be used later
                        handleStartGame(ws, payload != null ? payload : new JsonObject());
                    } else {
                        LOGGER.warn("Received unknown message type: {}", messageType);
                        // Optionally send an error back to the client
                        // JsonObject errorResponse = new JsonObject().put("type", "ERROR").put("payload", new JsonObject().put("message", "Unknown message type"));
                        // ws.writeTextMessage(errorResponse.encode());
                    }
                } catch (Exception e) {
                    LOGGER.error("Failed to parse message or handle request from {}: {}", ws.remoteAddress(), buffer.toString(), e);
                    // Optionally send an error back to the client
                    // JsonObject errorResponse = new JsonObject().put("type", "ERROR").put("payload", new JsonObject().put("message", "Invalid message format"));
                    // ws.writeTextMessage(errorResponse.encode());
                }
            });

            // Handle WebSocket closure
            ws.closeHandler(v -> {
                LOGGER.info("WebSocket connection closed from " + ws.remoteAddress());
                handleConnectionClosure(ws); // Call cleanup logic
            });

            // Handle exceptions
            ws.exceptionHandler(e -> {
                LOGGER.error("WebSocket error for " + ws.remoteAddress() + ": " + e.getMessage(), e);
                // Optionally close the connection on error
                // ws.close();
            });

        });

        server.listen(HTTP_PORT, http -> {
            if (http.succeeded()) {
                startPromise.complete();
                LOGGER.info("HTTP server started on port " + HTTP_PORT + " and WebSocket ready on /ws");
            } else {
                startPromise.fail(http.cause());
                LOGGER.error("Failed to start HTTP server", http.cause());
            }
        });
    }

    private void handleCreateSession(ServerWebSocket ws) {
        // Prevent a client from creating multiple sessions
        if (connections.containsKey(ws)) {
             LOGGER.warn("Client {} attempted to create session but is already in session {}", ws.remoteAddress(), connections.get(ws));
             JsonObject errorResponse = new JsonObject()
                     .put("type", "ERROR")
                     .put("payload", new JsonObject().put("message", "Already in a session"));
             ws.writeTextMessage(errorResponse.encode());
             return;
        }

        String sessionCode = generateSessionCode();
        Session newSession = new Session(sessionCode);
        newSession.setHost(ws); // Set the creator as the host
        newSession.addPlayer(ws); // Add the creator as the first player
        sessions.put(sessionCode, newSession);
        connections.put(ws, sessionCode); // Map the connection to the session code

        LOGGER.info("Session {} created by {} (Host)", sessionCode, ws.remoteAddress());

        // Send response back to the client
        JsonObject response = new JsonObject()
                .put("type", "SESSION_CREATED")
                .put("payload", new JsonObject().put("sessionCode", sessionCode));
        ws.writeTextMessage(response.encode());

        // Broadcast initial player update
        broadcastPlayerUpdate(sessionCode);
    }

    private void handleJoinSession(ServerWebSocket ws, JsonObject payload) {
        String sessionCode = payload.getString("sessionCode").toUpperCase(); // Normalize code

        // Prevent joining if already in a session
        if (connections.containsKey(ws)) {
             LOGGER.warn("Client {} attempted to join session {} but is already in session {}", ws.remoteAddress(), sessionCode, connections.get(ws));
             sendError(ws, "Already in a session");
             return;
        }

        Session session = sessions.get(sessionCode);
        if (session == null) {
            LOGGER.warn("Client {} attempted to join non-existent session {}", ws.remoteAddress(), sessionCode);
            sendError(ws, "Session not found");
            return;
        }

        // Add player to session and connection map
        session.addPlayer(ws);
        connections.put(ws, sessionCode);

        LOGGER.info("Player {} joined session {}", ws.remoteAddress(), sessionCode);

        // Send confirmation to the joining player
        JsonObject response = new JsonObject()
                .put("type", "JOIN_SUCCESS")
                .put("payload", new JsonObject().put("sessionCode", sessionCode));
        ws.writeTextMessage(response.encode());

        // Notify everyone in the session about the updated player list
        broadcastPlayerUpdate(sessionCode);
    }


    private void handleConnectionClosure(ServerWebSocket ws) {
        String sessionCode = connections.remove(ws); // Remove connection mapping
        if (sessionCode != null) {
            Session session = sessions.get(sessionCode);
            if (session != null) {
                LOGGER.info("Removing player {} from session {}", ws.remoteAddress(), sessionCode);
                session.removePlayer(ws);

                // Optional: If the session becomes empty, remove it
                if (session.isEmpty()) {
                    LOGGER.info("Session {} is empty, removing.", sessionCode);
                    sessions.remove(sessionCode);
                } else {
                    // Notify remaining players
                    broadcastPlayerUpdate(sessionCode);
                    // Optional: Send a specific "PLAYER_LEFT" message as well
                    // JsonObject notification = new JsonObject()
                    //         .put("type", "PLAYER_LEFT")
                    //         .put("payload", new JsonObject().put("playerId", ws.textHandlerID())); // Or some other identifier
                    // session.getPlayers().forEach(player -> player.writeTextMessage(notification.encode()));
                }
            } else {
                 LOGGER.warn("Session {} not found for closing connection {}", sessionCode, ws.remoteAddress());
            }
        } else {
             LOGGER.info("Connection {} closed, but was not associated with any session.", ws.remoteAddress());
        }
    }


    private String generateSessionCode() {
        String code;
        do {
            StringBuilder sb = new StringBuilder(SESSION_CODE_LENGTH);
            for (int i = 0; i < SESSION_CODE_LENGTH; i++) {
                // Generate random char from A-Z, 0-9
                // Ensure alphanumeric by selecting from a predefined string
                String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
                sb.append(chars.charAt(random.nextInt(chars.length())));
            }
            code = sb.toString();
        } while (sessions.containsKey(code)); // Ensure uniqueness
        return code;
    }

    private void broadcastPlayerUpdate(String sessionCode) {
        Session session = sessions.get(sessionCode);
        if (session == null) {
            // Should not happen if called correctly, but good to check
            LOGGER.warn("Attempted to broadcast player update for non-existent session {}", sessionCode);
            return;
        }

        int playerCount = session.getPlayers().size();
        // For now, just send the count. Could add player identifiers later.
        JsonObject payload = new JsonObject()
                .put("playerCount", playerCount);
                // .put("players", new JsonArray().add("player1_id").add("player2_id")); // Example with identifiers

        JsonObject message = new JsonObject()
                .put("type", "PLAYER_UPDATE")
                .put("payload", payload);

        String encodedMessage = message.encode();

        LOGGER.info("Broadcasting PLAYER_UPDATE to session {}: {}", sessionCode, encodedMessage);
        session.getPlayers().forEach(playerWs -> {
            playerWs.writeTextMessage(encodedMessage);
        });
    }

     private void sendError(ServerWebSocket ws, String message) {
        JsonObject errorResponse = new JsonObject()
                .put("type", "ERROR")
                .put("payload", new JsonObject().put("message", message));
        ws.writeTextMessage(errorResponse.encode());
    }

    private void handleSignalMessage(ServerWebSocket senderWs, JsonObject message) {
        String sessionCode = connections.get(senderWs);
        if (sessionCode == null) {
            LOGGER.warn("Received SIGNAL message from client {} not in a session", senderWs.remoteAddress());
            sendError(senderWs, "Not in a session");
            return;
        }

        Session session = sessions.get(sessionCode);
        if (session == null) {
            // Should not happen if connections map is consistent
            LOGGER.error("Session {} not found for client {} in connections map", sessionCode, senderWs.remoteAddress());
            connections.remove(senderWs); // Clean up inconsistent state
            sendError(senderWs, "Internal server error: session not found");
            return;
        }

        String encodedMessage = message.encode();
        LOGGER.debug("Relaying SIGNAL message from {} in session {}: {}", senderWs.remoteAddress(), sessionCode, encodedMessage);

        // Relay message to all *other* players in the session
        session.getPlayers().forEach(playerWs -> {
            if (playerWs != senderWs) { // Don't send back to the sender
                playerWs.writeTextMessage(encodedMessage);
            }
        });
    }

    private void handleStartGame(ServerWebSocket ws, JsonObject payload) {
         String sessionCode = connections.get(ws);
         if (sessionCode == null) {
             LOGGER.warn("Received START_GAME message from client {} not in a session", ws.remoteAddress());
             sendError(ws, "Not in a session");
             return;
         }

         Session session = sessions.get(sessionCode);
         if (session == null) {
             LOGGER.error("Session {} not found for client {} in connections map", sessionCode, ws.remoteAddress());
             connections.remove(ws); // Clean up inconsistent state
             sendError(ws, "Internal server error: session not found");
             return;
         }

         // Check if the sender is the host
         if (session.getHost() != ws) {
             LOGGER.warn("Non-host client {} attempted to start game in session {}", ws.remoteAddress(), sessionCode);
             sendError(ws, "Only the host can start the game");
             return;
         }

         // Check if there are enough players (e.g., at least 2) - Optional
         // if (session.getPlayers().size() < 2) {
         //     LOGGER.info("Host {} tried to start game in session {} with insufficient players", ws.remoteAddress(), sessionCode);
         //     sendError(ws, "Need at least 2 players to start");
         //     return;
         // }

         LOGGER.info("Host {} starting game in session {}", ws.remoteAddress(), sessionCode);

         // Broadcast GAME_STARTED message to all players in the session
         JsonObject startGameMessage = new JsonObject()
                 .put("type", "GAME_STARTED")
                 .put("payload", payload); // Include original payload if needed later
         String encodedMessage = startGameMessage.encode();

         session.getPlayers().forEach(playerWs -> {
             playerWs.writeTextMessage(encodedMessage);
         });

         // Optional: Change session state, e.g., prevent new players from joining
         // session.setGameState("IN_PROGRESS");
    }
}
