package ch.sysout.emubro.impl.event;

import ch.sysout.emubro.api.event.GameEvent;
import ch.sysout.emubro.api.model.Game;
import ch.sysout.emubro.api.model.Platform;

public class BroGameEvent implements GameEvent {
	private Game game;
	private Platform platform;

	@Override
	public Game getGame() {
		return game;
	}

	@Override
	public Platform getPlatform() {
		return platform;
	}
}
