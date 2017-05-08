package ch.sysout.emubro.impl.event;

import ch.sysout.emubro.api.event.GameEvent;
import ch.sysout.emubro.api.model.Game;

public class BroGameEvent implements GameEvent {
	private Game game;

	@Override
	public Game getGame() {
		return game;
	}
}
