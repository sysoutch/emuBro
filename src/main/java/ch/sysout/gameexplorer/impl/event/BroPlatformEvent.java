package ch.sysout.gameexplorer.impl.event;

import ch.sysout.gameexplorer.api.event.PlatformEvent;
import ch.sysout.gameexplorer.api.model.Platform;

public class BroPlatformEvent implements PlatformEvent {
	private Platform platform;

	@Override
	public Platform getPlatform() {
		return platform;
	}
}
