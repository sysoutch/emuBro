package ch.sysout.emubro.ui;

import java.awt.Color;
import java.awt.image.BufferedImage;

import ch.sysout.util.ImageUtil;

public class Theme {
	private static final int TOP_LEFT = 0;
	private static final int BOTTOM_RIGHT = 1;

	private String name;
	private Color defaultBackgroundColor;

	private ThemeBackground menuBar;
	private ThemeBackground buttonBar;
	private ThemeBackground view;
	private ThemeBackground navigationPane;
	private ThemeBackground previewPane;
	private ThemeBackground tabs;

	public Theme(String name, Color defaultBackgroundColor) {
		this.name = name;
		this.defaultBackgroundColor = defaultBackgroundColor;
		initBackgrounds();
	}

	public Theme(String name) {
		this(name, Color.WHITE);
	}

	private void initBackgrounds() {
		// TODO init images and colors from json
		menuBar = createThemeBackground(Color.BLACK);
		buttonBar = createThemeBackground("buttonbar.jpg", true, BOTTOM_RIGHT);
		view = createThemeBackground("bg-only.jpg", true, BOTTOM_RIGHT);
		navigationPane = createThemeBackground("nav.jpg", true, BOTTOM_RIGHT);
		previewPane = createThemeBackground("previewpane.jpg", true, BOTTOM_RIGHT);
		tabs = createThemeBackground("tab.jpg");
	}

	private ThemeBackground createThemeBackground(Color color) {
		return new ThemeBackground(null, color);
	}

	private ThemeBackground createThemeBackground(String string, boolean autoPickColorFromImage, int pickColorFromPoint) {
		BufferedImage img = null;
		try {
			img = ImageUtil.getBufferedImageFrom("/themes/"+name+"/"+string);
		} catch (Exception e) {
			img = null;
		}
		Color color = defaultBackgroundColor;
		int x;
		int y;
		switch (pickColorFromPoint) {
		case TOP_LEFT:
			x = 0;
			y = 0;
			break;
		case BOTTOM_RIGHT:
			x = (img != null) ? img.getWidth()-1 : 0;
			y = (img != null) ? img.getHeight()-1 : 0;
			break;
		default:
			x = 0;
			y = 0;
			break;
		}
		return new ThemeBackground(img, color, autoPickColorFromImage, x, y);
	}

	private ThemeBackground createThemeBackground(String string, boolean b) {
		return createThemeBackground(string, false, TOP_LEFT);
	}

	private ThemeBackground createThemeBackground(String string) {
		return createThemeBackground(string, false);
	}

	public ThemeBackground getMenuBar() {
		return menuBar;
	}

	public ThemeBackground getButtonBar() {
		return buttonBar;
	}

	public ThemeBackground getView() {
		return view;
	}

	public ThemeBackground getNavigationPane() {
		return navigationPane;
	}

	public ThemeBackground getPreviewPane() {
		return previewPane;
	}

	public ThemeBackground getTabs() {
		return tabs;
	}

	public BufferedImage getTransparentBackgroundOverlayImage() {
		return null;
	}
}