package ch.sysout.emubro.impl.event;

import ch.sysout.emubro.api.event.EmulatorEvent;
import ch.sysout.emubro.api.model.Emulator;
import ch.sysout.emubro.api.model.Platform;

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
