package ch.sysout.emubro.impl.event;

import ch.sysout.emubro.api.event.EmulatorAddedEvent;
import ch.sysout.emubro.api.model.Emulator;
import ch.sysout.emubro.api.model.Platform;

public class BroEmulatorAddedEvent implements EmulatorAddedEvent {
	private Emulator emulator;
	private Platform platform;

	public BroEmulatorAddedEvent(Platform platform, Emulator emulator) {
		this.emulator = emulator;
		this.platform = platform;
	}

	@Override
	public Emulator getEmulator() {
		return emulator;
	}

	@Override
	public Platform getPlatform() {
		return platform;
	}
}
