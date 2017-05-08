package ch.sysout.emubro.impl.event;

import ch.sysout.emubro.api.event.PlatformRemovedEvent;
import ch.sysout.emubro.api.model.Platform;

public class BroPlatformRemovedEvent implements PlatformRemovedEvent {
	private Platform platform;
	private int platformCount;

	public BroPlatformRemovedEvent(Platform element, int platformCount) {
		platform = element;
		this.platformCount = platformCount;
	}

	@Override
	public Platform getPlatform() {
		return platform;
	}

	@Override
	public int getPlatformCount() {
		return platformCount;
	}
}
