package ch.sysout.gameexplorer.impl.event;

import ch.sysout.gameexplorer.api.event.EmulatorEvent;
import ch.sysout.gameexplorer.api.model.Emulator;
import ch.sysout.gameexplorer.api.model.Platform;

public class BroEmulatorEvent implements EmulatorEvent {
	private Emulator emulator;
	private Platform platform;

	@Override
	public Emulator getEmulator() {
		return emulator;
	}

	@Override
	public Platform getPlatform() {
		return platform;
	}
}
