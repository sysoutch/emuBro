package ch.sysout.emubro.api.event;

import ch.sysout.emubro.api.model.Emulator;
import ch.sysout.emubro.api.model.Platform;

public interface EmulatorEvent {
	Emulator getEmulator();

	Platform getPlatform();
}
