package ch.sysout.gameexplorer.api.event;

import ch.sysout.gameexplorer.api.model.Emulator;
import ch.sysout.gameexplorer.api.model.Platform;

public interface EmulatorEvent {
	Emulator getEmulator();

	Platform getPlatform();
}
