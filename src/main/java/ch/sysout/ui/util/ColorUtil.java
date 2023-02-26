package ch.sysout.ui.util;

import java.awt.Color;

public class ColorUtil {

	public static boolean isColorDark(Color color) {
		double darkness = 1 - (0.299 * color.getRed() + 0.587 * color.getGreen() + 0.114 * color.getBlue()) / 255;
		if (darkness < 0.5) {
			return false;
		} else {
			return true;
		}
	}
}
