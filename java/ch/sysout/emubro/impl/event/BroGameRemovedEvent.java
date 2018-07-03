package ch.sysout.emubro.impl.event;

import ch.sysout.emubro.api.event.GameRemovedEvent;
import ch.sysout.emubro.api.model.Game;
import ch.sysout.emubro.api.model.Platform;

public class BroGameRemovedEvent implements GameRemovedEvent {
	private Game game;
	private Platform platform;
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
	public Platform getPlatform() {
		return platform;
	}

	@Override
	public int getGameCount() {
		return gameCount;
	}
}
