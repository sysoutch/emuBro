package ch.sysout.emubro.ui.event;

import ch.sysout.emubro.ui.Theme;

public class ThemeChangeEvent {

	private Theme theme;

	public ThemeChangeEvent(Theme theme) {
		this.theme = theme;
	}

	public Theme getTheme() {
		return theme;
	}
}
