package ch.sysout.emubro.api;

import ch.sysout.emubro.api.event.GameAddedEvent;
import ch.sysout.emubro.api.event.GameRemovedEvent;
import ch.sysout.emubro.api.event.GameSelectionEvent;

public interface GameListener {
	void gameSelected(GameSelectionEvent e);

	void gameAdded(GameAddedEvent e);

	void gameRemoved(GameRemovedEvent e);
}