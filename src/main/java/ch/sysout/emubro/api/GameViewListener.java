package ch.sysout.emubro.api;

import ch.sysout.emubro.impl.event.NavigationEvent;

public interface GameViewListener {
	void navigationChanged(NavigationEvent e);
}
