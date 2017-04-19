package ch.sysout.gameexplorer.api;

import ch.sysout.gameexplorer.api.event.EmulatorEvent;

public interface EmulatorListener {
	void emulatorAdded(EmulatorEvent e);

	void emulatorRemoved(EmulatorEvent e);
}
