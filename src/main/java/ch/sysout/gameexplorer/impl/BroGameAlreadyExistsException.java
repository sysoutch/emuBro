package ch.sysout.gameexplorer.impl;

public class BroGameAlreadyExistsException extends Exception {
	private static final long serialVersionUID = 1L;

	public BroGameAlreadyExistsException(String message) {
		super(message);
	}
}
