package ch.sysout.gameexplorer.impl.event;

import ch.sysout.gameexplorer.api.event.PlatformRemovedEvent;
import ch.sysout.gameexplorer.api.model.Platform;

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
