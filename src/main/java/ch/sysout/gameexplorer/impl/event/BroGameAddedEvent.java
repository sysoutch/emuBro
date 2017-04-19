package ch.sysout.gameexplorer.impl.event;

import ch.sysout.gameexplorer.api.event.GameAddedEvent;
import ch.sysout.gameexplorer.api.model.Game;

public class BroGameAddedEvent implements GameAddedEvent {
	private Game game;
	private int gameCount;

	public BroGameAddedEvent(Game element, int gameCount) {
		game = element;
		this.gameCount = gameCount;
	}

	@Override
	public Game getGame() {
		return game;
	}

	@Override
	public int getGameCount() {
		return gameCount;
	}
}
