package ch.sysout.emubro.impl.event;

import ch.sysout.emubro.api.event.GameRenamedEvent;
import ch.sysout.emubro.api.model.Game;

public class BroGameRenamedEvent implements GameRenamedEvent {
	private Game game;
	private String newName;

	public BroGameRenamedEvent(Game game, String newName) {
		this.game = game;
		this.newName = newName;
	}

	@Override
	public String getNewName() {
		return newName;
	}

	@Override
	public Game getGame() {
		return game;
	}
}
