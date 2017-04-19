package ch.sysout.gameexplorer.api;

import ch.sysout.gameexplorer.impl.event.NavigationEvent;

public interface GameViewListener {
	void navigationChanged(NavigationEvent e);
}
