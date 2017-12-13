package ch.sysout.emubro.impl.event;

import ch.sysout.emubro.api.event.GameAddedEvent;
import ch.sysout.emubro.api.model.Game;
import ch.sysout.emubro.api.model.Platform;

public class BroGameAddedEvent implements GameAddedEvent {
	private Game game;
	private Platform platform;
	private int gameCount;

	public BroGameAddedEvent(Game game, Platform platform, int gameCount) {
		this.game = game;
		this.platform = platform;
		this.gameCount = gameCount;
	}

	@Override
	public Game getGame() {
		return game;
	}

	public Platform getPlatform() {
		return platform;
	}

	@Override
	public int getGameCount() {
		return gameCount;
	}
}
