package com.example.game;

import java.security.SecureRandom;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class SessionManager {

    private static final SessionManager INSTANCE = new SessionManager();
    private final Map<String, GameSession> sessions = new ConcurrentHashMap<>();
    private static final String CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    private static final int SESSION_ID_LENGTH = 4;
    private static final SecureRandom random = new SecureRandom();

    private SessionManager() {}

    public static SessionManager getInstance() {
        return INSTANCE;
    }

    private String generateUniqueSessionId() {
        String id;
        do {
            StringBuilder sb = new StringBuilder(SESSION_ID_LENGTH);
            for (int i = 0; i < SESSION_ID_LENGTH; i++) {
                sb.append(CHARACTERS.charAt(random.nextInt(CHARACTERS.length())));
            }
            id = sb.toString();
        } while (sessions.containsKey(id));
        return id;
    }

    public GameSession createSession(String hostId, String gameType, int maxPlayers) {
        String sessionId = generateUniqueSessionId();
        GameSession session = new GameSession(sessionId, hostId, gameType, maxPlayers);
        sessions.put(sessionId, session);
        System.out.println("Session created: " + session);
        return session;
    }

    public GameSession joinSession(String sessionId, String playerId) {
        GameSession session = sessions.get(sessionId);
        if (session != null) {
            Player player = new Player(playerId);
            boolean added = session.addPlayer(player);
            if (added) {
                 System.out.println("Player " + playerId + " joined session: " + sessionId);
                return session;
            } else {
                System.out.println("Failed to join session " + sessionId + " for player " + playerId + ": Session full");
                return null;
            }
        }
         System.out.println("Failed to join session " + sessionId + " for player " + playerId + ": Session not found");
        return null;
    }

    public GameSession getSession(String sessionId) {
        return sessions.get(sessionId);
    }

    public void removePlayer(String sessionId, String playerId) {
        GameSession session = sessions.get(sessionId);
        if (session != null) {
            session.removePlayer(playerId);
            System.out.println("Player " + playerId + " removed from session: " + sessionId);
            if (playerId.equals(session.getHostId()) || session.isEmpty()) {
                deleteSession(sessionId);
            }
        } else {
             System.out.println("Failed to remove player " + playerId + " from session " + sessionId + ": Session not found");
        }
    }

    public void deleteSession(String sessionId) {
        GameSession removedSession = sessions.remove(sessionId);
         if (removedSession != null) {
            System.out.println("Session deleted: " + sessionId);
        } else {
            System.out.println("Failed to delete session " + sessionId + ": Session not found");
        }
    }

    public Map<String, GameSession> getAllSessions() {
        return new ConcurrentHashMap<>(sessions);
    }
}
