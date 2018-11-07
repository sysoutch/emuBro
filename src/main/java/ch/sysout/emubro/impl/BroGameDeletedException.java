package ch.sysout.emubro.impl;

import ch.sysout.emubro.api.model.Game;

public class BroGameDeletedException extends Exception {
	private static final long serialVersionUID = 1L;
	private Game game;

	public BroGameDeletedException(String message, Game game) {
		super(message);
		this.game = game;
	}

	public Game getGame() {
		return game;
	}
}
