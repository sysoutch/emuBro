package ch.sysout.emubro.impl.model;

import ch.sysout.emubro.api.model.EmulatorId;

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
