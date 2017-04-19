package ch.sysout.gameexplorer.impl.event;

import ch.sysout.gameexplorer.api.event.GameSelectionEvent;
import ch.sysout.gameexplorer.api.model.Game;
import ch.sysout.gameexplorer.api.model.Platform;

public class BroGameSelectionEvent implements GameSelectionEvent {
	private Game game;
	private Platform platform;

	public BroGameSelectionEvent(Game game, Platform platform) {
		this.game = game;
		this.platform = platform;
	}

	@Override
	public Game getGame() {
		return game;
	}

	@Override
	public Platform getPlatform() {
		return platform;
	}
}
