package ch.sysout.emubro.impl.event;

import ch.sysout.emubro.api.event.PlatformAddedEvent;
import ch.sysout.emubro.api.model.Platform;

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
