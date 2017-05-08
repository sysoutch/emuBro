package ch.sysout.emubro.api;

import ch.sysout.emubro.api.event.PlatformEvent;

public interface PlatformListener {
	void platformAdded(PlatformEvent e);

	void platformRemoved(PlatformEvent e);
}
