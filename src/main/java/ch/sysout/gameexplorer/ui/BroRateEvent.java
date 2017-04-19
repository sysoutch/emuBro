package ch.sysout.gameexplorer.ui;

import ch.sysout.gameexplorer.api.model.Game;

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
