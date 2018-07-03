package ch.sysout.emubro.impl.event;

import ch.sysout.emubro.api.event.PlatformEvent;
import ch.sysout.emubro.api.model.Platform;

public class BroPlatformEvent implements PlatformEvent {
	private Platform platform;

	@Override
	public Platform getPlatform() {
		return platform;
	}
}
