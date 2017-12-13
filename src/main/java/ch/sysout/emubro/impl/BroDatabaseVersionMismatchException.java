package ch.sysout.emubro.impl;

public class BroDatabaseVersionMismatchException extends Exception {
	private static final long serialVersionUID = 1L;

	private String expectedVersion;
	private String currentVersion;

	public BroDatabaseVersionMismatchException(String message, String expectedVersion, String currentVersion) {
		super(message);
		this.expectedVersion = expectedVersion;
		this.currentVersion = currentVersion;
	}

	public String getExpectedVersion() {
		return expectedVersion;
	}

	public String getCurrentVersion() {
		return currentVersion;
	}
}
