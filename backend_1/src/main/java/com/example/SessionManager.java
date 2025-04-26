package com.example;

import java.security.SecureRandom;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class SessionManager {

    private static final SessionManager INSTANCE = new SessionManager();
    private final Map<String, GameSession> sessions = new ConcurrentHashMap<>();
    private static final String CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    private static final int SESSION_ID_LENGTH = 4;
    private static final SecureRandom random = new SecureRandom();

    // Private constructor for singleton pattern
    private SessionManager() {}

    public static SessionManager getInstance() {
        return INSTANCE;
    }

    /**
     * Generates a unique 4-character session ID.
     * Retries if a generated ID already exists.
     */
    private String generateUniqueSessionId() {
        String id;
        do {
            StringBuilder sb = new StringBuilder(SESSION_ID_LENGTH);
            for (int i = 0; i < SESSION_ID_LENGTH; i++) {
                sb.append(CHARACTERS.charAt(random.nextInt(CHARACTERS.length())));
            }
            id = sb.toString();
        } while (sessions.containsKey(id)); // Ensure uniqueness
        return id;
    }

    /**
     * Creates a new game session.
     *
     * @param hostId     The ID of the player hosting the session.
     * @param gameType   The type of game.
     * @param maxPlayers The maximum number of players allowed.
     * @return The newly created GameSession.
     */
    public GameSession createSession(String hostId, String gameType, int maxPlayers) {
        String sessionId = generateUniqueSessionId();
        GameSession session = new GameSession(sessionId, hostId, gameType, maxPlayers);
        sessions.put(sessionId, session);
        System.out.println("Session created: " + session); // Logging
        return session;
    }

    /**
     * Adds a player to an existing game session.
     *
     * @param sessionId The ID of the session to join.
     * @param playerId  The ID of the player joining.
     * @return The GameSession if joined successfully, null otherwise (session not found or full).
     */
    public GameSession joinSession(String sessionId, String playerId) {
        GameSession session = sessions.get(sessionId);
        if (session != null) {
            Player player = new Player(playerId);
            boolean added = session.addPlayer(player);
            if (added) {
                 System.out.println("Player " + playerId + " joined session: " + sessionId); // Logging
                return session;
            } else {
                System.out.println("Failed to join session " + sessionId + " for player " + playerId + ": Session full"); // Logging
                return null; // Session is full
            }
        }
         System.out.println("Failed to join session " + sessionId + " for player " + playerId + ": Session not found"); // Logging
        return null; // Session not found
    }

    /**
     * Retrieves a game session by its ID.
     *
     * @param sessionId The ID of the session to retrieve.
     * @return The GameSession, or null if not found.
     */
    public GameSession getSession(String sessionId) {
        return sessions.get(sessionId);
    }

    /**
     * Removes a player from a specific game session.
     * If the removed player was the host, or if the session becomes empty, the session is deleted.
     *
     * @param sessionId The ID of the session.
     * @param playerId  The ID of the player to remove.
     */
    public void removePlayer(String sessionId, String playerId) {
        GameSession session = sessions.get(sessionId);
        if (session != null) {
            session.removePlayer(playerId);
            System.out.println("Player " + playerId + " removed from session: " + sessionId); // Logging
            // Check if the session should be deleted
            if (playerId.equals(session.getHostId()) || session.isEmpty()) {
                deleteSession(sessionId);
            }
        } else {
             System.out.println("Failed to remove player " + playerId + " from session " + sessionId + ": Session not found"); // Logging
        }
    }

    /**
     * Deletes a game session.
     *
     * @param sessionId The ID of the session to delete.
     */
    public void deleteSession(String sessionId) {
        GameSession removedSession = sessions.remove(sessionId);
         if (removedSession != null) {
            System.out.println("Session deleted: " + sessionId); // Logging
        } else {
            System.out.println("Failed to delete session " + sessionId + ": Session not found"); // Logging
        }
    }

    // Optional: Method to get all active sessions (e.g., for admin purposes)
    public Map<String, GameSession> getAllSessions() {
        return new ConcurrentHashMap<>(sessions); // Return a copy
    }
}
