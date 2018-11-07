package ch.sysout.emubro.api;

import ch.sysout.emubro.api.event.GameAddedEvent;
import ch.sysout.emubro.api.event.GameRemovedEvent;

public interface GameListener {
	void gameAdded(GameAddedEvent e);

	void gameRemoved(GameRemovedEvent e);
}