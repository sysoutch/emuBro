package ch.sysout.gameexplorer.impl.event;

import ch.sysout.gameexplorer.api.event.GameRemovedEvent;
import ch.sysout.gameexplorer.api.model.Game;

public class BroGameRemovedEvent implements GameRemovedEvent {
	private Game game;
	private int gameCount;

	public BroGameRemovedEvent(Game element, int gameCount) {
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
