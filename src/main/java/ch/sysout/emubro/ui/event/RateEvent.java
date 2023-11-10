package ch.sysout.emubro.ui.event;

import ch.sysout.emubro.api.model.Game;

public class RateEvent {
	private Game game;

	public RateEvent(Game game) {
		this.game = game;
	}

	public Game getGame() {
		return game;
	}
}
