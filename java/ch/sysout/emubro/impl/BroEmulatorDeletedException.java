package ch.sysout.emubro.impl;

import ch.sysout.emubro.api.model.Emulator;

public class BroEmulatorDeletedException extends Exception {
	private static final long serialVersionUID = 1L;
	private Emulator emulator;

	public BroEmulatorDeletedException(String message, Emulator emulator) {
		super(message);
		this.emulator = emulator;
	}

	public Emulator getEmulator() {
		return emulator;
	}
}
