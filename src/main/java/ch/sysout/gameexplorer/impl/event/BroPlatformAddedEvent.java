package ch.sysout.gameexplorer.impl.event;

import ch.sysout.gameexplorer.api.event.PlatformAddedEvent;
import ch.sysout.gameexplorer.api.model.Platform;

public class BroPlatformAddedEvent implements PlatformAddedEvent {
	private Platform platform;

	public BroPlatformAddedEvent(Platform element) {
		platform = element;
	}

	@Override
	public Platform getPlatform() {
		return platform;
	}
}
