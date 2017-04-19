package ch.sysout.gameexplorer.api;

import ch.sysout.gameexplorer.api.event.PlatformEvent;

public interface PlatformListener {
	void platformAdded(PlatformEvent e);

	void platformRemoved(PlatformEvent e);
}
