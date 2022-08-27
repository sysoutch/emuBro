package ch.sysout.emubro.ui;

import java.awt.Color;
import java.awt.GradientPaint;
import java.awt.image.BufferedImage;

import ch.sysout.ui.util.ImageUtil;

public class ThemeFactory {
	private static Color defaultBackgroundColor = Color.WHITE;

	/** Don't let anyone instantiate this class */
	private ThemeFactory() {
	}

	public static ThemeBackground createThemeBackground(Color color) {
		return new ThemeBackground(null, color);
	}

	public static ThemeBackground createThemeBackground(String string, boolean autoPickColorFromImage, int pickColorFromPoint) {
		BufferedImage img = null;
		try {
			img = ImageUtil.getBufferedImageFrom(string);
		} catch (Exception e) {
			img = null;
		}
		int x;
		int y;
		switch (pickColorFromPoint) {
		case Theme.TOP_LEFT:
			x = 0;
			y = 0;
			break;
		case Theme.BOTTOM_RIGHT:
			x = (img != null) ? img.getWidth()-1 : 0;
			y = (img != null) ? img.getHeight()-1 : 0;
			break;
		default:
			x = 0;
			y = 0;
			break;
		}
		return new ThemeBackground(img, defaultBackgroundColor, autoPickColorFromImage, x, y);
	}

	public static ThemeBackground createThemeBackground(String string, boolean autoPickColorFromImage) {
		return createThemeBackground(string, autoPickColorFromImage, Theme.TOP_LEFT);
	}

	public static ThemeBackground createThemeBackground(String string) {
		return createThemeBackground(string, false);
	}

	public static ThemeBackground createThemeBackground(GradientPaint gradientPaint) {
		return new ThemeBackground(gradientPaint);
	}
}
