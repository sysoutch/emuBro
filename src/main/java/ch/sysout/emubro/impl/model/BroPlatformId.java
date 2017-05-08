package ch.sysout.emubro.impl.model;

import ch.sysout.emubro.api.model.PlatformId;

public class BroPlatformId implements PlatformId {
	private int id;
	private BroPlatform platform;

	public BroPlatformId(int id, BroPlatform platform) {
		this.id = id;
		this.platform = platform;
	}

	public BroPlatform getPlatform() {
		return platform;
	}

	@Override
	public int getPlatformId() {
		return id;
	}
}
