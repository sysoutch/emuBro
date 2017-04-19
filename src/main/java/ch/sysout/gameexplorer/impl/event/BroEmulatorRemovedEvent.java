package ch.sysout.gameexplorer.impl.event;

import ch.sysout.gameexplorer.api.event.EmulatorRemovedEvent;
import ch.sysout.gameexplorer.api.model.Emulator;
import ch.sysout.gameexplorer.api.model.Platform;

public class BroEmulatorRemovedEvent implements EmulatorRemovedEvent {
	private Emulator emulator;
	private Platform platform;

	public BroEmulatorRemovedEvent(Platform platform, Emulator element) {
		emulator = element;
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
