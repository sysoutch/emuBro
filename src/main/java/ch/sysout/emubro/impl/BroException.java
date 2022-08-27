package ch.sysout.emubro.impl;

public class BroException extends Exception {
	private static final long serialVersionUID = 1L;

	public BroException(final String message, final Throwable cause) {
		super(message, cause);
	}

	public BroException(String message) {
		super(message);
	}

	@Override
	public String getMessage() {
		return super.getMessage() + " " + getCause().getClass().getSimpleName() + " " + getCause().getMessage();
	}
}
