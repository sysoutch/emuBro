package ch.sysout.emubro.api.event;

import ch.sysout.emubro.api.model.Game;

public interface GameRenamedEvent  {
	String getNewName();

	Game getGame();
}
