package ch.sysout.emubro.api;

import ch.sysout.emubro.api.event.EmulatorEvent;

public interface EmulatorListener {
	void emulatorAdded(EmulatorEvent e);

	void emulatorRemoved(EmulatorEvent e);
}
