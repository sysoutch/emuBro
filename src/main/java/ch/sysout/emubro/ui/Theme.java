package ch.sysout.emubro.ui;

import java.awt.Color;
import java.awt.Image;
import java.awt.image.BufferedImage;

public class Theme {
	public static final int TOP_LEFT = 0;
	public static final int BOTTOM_RIGHT = 1;

	private String name;
	private ThemeBackground background;
	private ThemeBackground menuBar;
	private ThemeBackground buttonBar;
	private ThemeBackground gameFilterPane;
	private ThemeBackground view;
	private ThemeBackground navigationPane;
	private ThemeBackground previewPane;
	private ThemeBackground detailsPane;
	private ThemeBackground tabs;
	private ThemeBackground statusBar;

	public Theme(String name, Color defaultBackgroundColor) {
		this.name = name;
		background = new ThemeBackground(null, defaultBackgroundColor);
	}

	public Theme(String name) {
		this(name, Color.WHITE);
	}

	public String getName() {
		return name;
	}

	public ThemeBackground getBackground() {
		return background;
	}

	public void setBackground(ThemeBackground background) {
		this.background = background;
	}

	public ThemeBackground getMenuBar() {
		return menuBar;
	}

	public void setMenuBar(ThemeBackground menuBar) {
		this.menuBar = menuBar;
	}

	public ThemeBackground getButtonBar() {
		return buttonBar;
	}

	public void setButtonBar(ThemeBackground buttonBar) {
		this.buttonBar = buttonBar;
	}

	public ThemeBackground getGameFilterPane() {
		return gameFilterPane;
	}

	public void setGameFilterPane(ThemeBackground gameFilterPane) {
		this.gameFilterPane = gameFilterPane;
	}

	public ThemeBackground getView() {
		return view;
	}

	public void setView(ThemeBackground view) {
		this.view = view;
	}

	public BufferedImage getTransparentBackgroundOverlayImage() {
		return null;
	}

	public void setTransparentBackgroundOverlayImage(Image image) {
	}

	public ThemeBackground getNavigationPane() {
		return navigationPane;
	}

	public void setNavigationPane(ThemeBackground navigationPane) {
		this.navigationPane = navigationPane;
	}

	public ThemeBackground getPreviewPane() {
		return previewPane;
	}

	public void setPreviewPane(ThemeBackground previewPane) {
		this.previewPane = previewPane;
	}

	public ThemeBackground getDetailsPane() {
		return detailsPane;
	}

	public void setDetailsPane(ThemeBackground detailsPane) {
		this.detailsPane = detailsPane;
	}

	public ThemeBackground getTabs() {
		return tabs;
	}

	public void setTabs(ThemeBackground tabs) {
		this.tabs = tabs;
	}

	public ThemeBackground getStatusBar() {
		return statusBar;
	}

	public void setStatusBar(ThemeBackground statusBar) {
		this.statusBar = statusBar;
	}
}