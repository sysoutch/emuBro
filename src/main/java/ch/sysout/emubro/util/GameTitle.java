package ch.sysout.emubro.util;

public class GameTitle {
    private String game_name;
    private String game_gameCode;

    public GameTitle(String game_name, String game_gameCode) {
        this.game_name = game_name;
        this.game_gameCode = game_gameCode;
    }

    public String getGame_name() {
        return game_name;
    }

    public String getGame_gameCode() {
        return game_gameCode;
    }
}
