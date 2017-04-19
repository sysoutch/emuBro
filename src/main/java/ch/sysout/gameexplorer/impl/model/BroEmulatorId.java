package ch.sysout.gameexplorer.impl.model;

import ch.sysout.gameexplorer.api.model.EmulatorId;

public class BroEmulatorId implements EmulatorId {
	private int id;
	private BroEmulator emulator;

	public BroEmulatorId(int id, BroEmulator emulator) {
		this.id = id;
		this.emulator = emulator;
	}

	public BroEmulator getEmulator() {
		return emulator;
	}

	@Override
	public int getId() {
		return id;
	}
}
