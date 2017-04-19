package ch.sysout.gameexplorer.ui.listener;

import ch.sysout.gameexplorer.api.model.Game;

public interface CoversModelListener {
	void elementAdded(Game game);

	void elementRemoved(Game game);

	void allElementsRemoved();
}
