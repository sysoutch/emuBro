package ch.sysout.emubro.controller;

import ch.sysout.emubro.api.event.GameSelectionEvent;

public interface GameSelectionListener {
	void gameSelected(GameSelectionEvent e);

}
