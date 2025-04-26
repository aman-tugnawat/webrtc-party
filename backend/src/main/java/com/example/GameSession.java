package com.example;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class GameSession {
    private final String sessionId; // 4-char code
    private final String hostId;
    private final String gameType;
    private final int maxPlayers;
    private final Map<String, Player> players = new ConcurrentHashMap<>(); // Thread-safe map for players

    public GameSession(String sessionId, String hostId, String gameType, int maxPlayers) {
        this.sessionId = sessionId;
        this.hostId = hostId;
        this.gameType = gameType;
        this.maxPlayers = maxPlayers;
        // Add the host as the first player
        addPlayer(new Player(hostId));
    }

    public String getSessionId() {
        return sessionId;
    }

    public String getHostId() {
        return hostId;
    }

    public String getGameType() {
        return gameType;
    }

    public int getMaxPlayers() {
        return maxPlayers;
    }

    public Map<String, Player> getPlayers() {
        return players; // Consider returning an unmodifiable view if needed
    }

    public boolean addPlayer(Player player) {
        if (players.size() >= maxPlayers) {
            return false; // Session is full
        }
        players.put(player.getPlayerId(), player);
        return true;
    }

    public void removePlayer(String playerId) {
        players.remove(playerId);
    }

    public boolean isEmpty() {
        return players.isEmpty();
    }

     @Override
    public String toString() {
        return "GameSession{" +
               "sessionId='" + sessionId + '\'' +
               ", hostId='" + hostId + '\'' +
               ", gameType='" + gameType + '\'' +
               ", maxPlayers=" + maxPlayers +
               ", players=" + players +
               '}';
    }
}
