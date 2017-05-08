package ch.sysout.emubro.api.model;

public enum GenreValue {
	ZERO(0), ONE(1), TWO(2), THREE(3), FOUR(4), FIVE(5), SIX(6), SEVEN(7), EIGHT(8), NINE(9), CHANGE(0), LOOK(
			0), TAKE_TWO(0);
	private int value;

	private GenreValue(final int value) {
		this.value = value;
	}

	public int getPoints() {
		return value;
	}

	public boolean isSpecial() {
		return this == CHANGE || this == LOOK || this == TAKE_TWO;
	}
}
