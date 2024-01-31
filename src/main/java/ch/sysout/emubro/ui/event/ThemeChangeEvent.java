package ch.sysout.emubro.ui.event;

import ch.sysout.emubro.ui.Theme;

public class ThemeChangeEvent {

	private Theme theme;
	private final boolean reloadIconsEnabled;
	private final boolean reloadLogoEnabled;

	public ThemeChangeEvent(Theme theme) {
		this(theme, false, false);
	}

	public ThemeChangeEvent(Theme theme, boolean reloadIcons, boolean reloadLogo) {
		this.theme = theme;
		this.reloadIconsEnabled = reloadIcons;
		this.reloadLogoEnabled = reloadLogo;
	}

	public Theme getTheme() {
		return theme;
	}

	public boolean isReloadIconsEnabled() {
		return reloadIconsEnabled;
	}

	public boolean isReloadLogoEnabled() {
		return reloadLogoEnabled;
	}
}
