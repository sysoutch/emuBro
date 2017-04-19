package ch.sysout.gameexplorer.api;

import ch.sysout.gameexplorer.api.event.GameAddedEvent;
import ch.sysout.gameexplorer.api.event.GameRemovedEvent;
import ch.sysout.gameexplorer.api.event.GameSelectionEvent;

public interface GameListener {
	void gameSelected(GameSelectionEvent e);

	void gameAdded(GameAddedEvent e);

	void gameRemoved(GameRemovedEvent e);
}