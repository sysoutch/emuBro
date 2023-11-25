package ch.sysout.emubro.ui;

import java.awt.Color;
import java.awt.GradientPaint;
import java.awt.Image;

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
		Image img = null;
		try {
			if (!string.startsWith("/")) {
				string = "/"+string;
			}
			img = ImageUtil.getImageIconFrom(string, true).getImage();
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
			x = (img != null) ? img.getWidth(null)-1 : 0;
			y = (img != null) ? img.getHeight(null)-1 : 0;
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
