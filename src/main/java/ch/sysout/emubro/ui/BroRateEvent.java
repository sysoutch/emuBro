package ch.sysout.emubro.ui;

import ch.sysout.emubro.api.model.Game;

public class BroRateEvent implements RateEvent {
	private Game game;

	public BroRateEvent(Game game) {
		this.game = game;
	}

	@Override
	public Game getGame() {
		return game;
	}
}
