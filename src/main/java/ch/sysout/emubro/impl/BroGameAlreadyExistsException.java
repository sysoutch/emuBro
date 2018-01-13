package ch.sysout.emubro.impl;

public class BroGameAlreadyExistsException extends Exception {
	private static final long serialVersionUID = 1L;
	private int gameId;

	public BroGameAlreadyExistsException(String message) {
		super(message);
	}

	public int getGameId() {
		return gameId;
	}

	public void setGameId(int gameId) {
		this.gameId = gameId;
	}
}
