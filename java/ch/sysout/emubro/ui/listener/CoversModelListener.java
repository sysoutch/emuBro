package ch.sysout.emubro.ui.listener;

import ch.sysout.emubro.api.model.Game;

public interface CoversModelListener {
	void elementAdded(Game game);

	void elementRemoved(Game game);

	void allElementsRemoved();
}
