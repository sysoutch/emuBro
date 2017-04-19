package ch.sysout.gameexplorer.impl.event;

import ch.sysout.gameexplorer.api.event.EmulatorAddedEvent;
import ch.sysout.gameexplorer.api.model.Emulator;
import ch.sysout.gameexplorer.api.model.Platform;

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
