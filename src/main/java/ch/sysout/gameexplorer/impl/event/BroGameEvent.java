package ch.sysout.gameexplorer.impl.event;

import ch.sysout.gameexplorer.api.event.GameEvent;
import ch.sysout.gameexplorer.api.model.Game;

public class BroGameEvent implements GameEvent {
	private Game game;

	@Override
	public Game getGame() {
		return game;
	}
}
