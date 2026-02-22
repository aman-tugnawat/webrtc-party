package com.example.game;

import io.vertx.core.http.ServerWebSocket;

public class Player {
    private final String playerId;
    private transient ServerWebSocket webSocket;

    public Player(String playerId) {
        this.playerId = playerId;
    }

    public String getPlayerId() {
        return playerId;
    }

    public void setWebSocket(ServerWebSocket webSocket) {
        this.webSocket = webSocket;
    }

    public ServerWebSocket getWebSocket() {
        return webSocket;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Player player = (Player) o;
        return java.util.Objects.equals(playerId, player.playerId);
    }

    @Override
    public int hashCode() {
        return java.util.Objects.hash(playerId);
    }

    @Override
    public String toString() {
        return "Player{" +
               "playerId='" + playerId + '\'' +
               '}';
    }
}
