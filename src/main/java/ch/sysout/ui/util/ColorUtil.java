package ch.sysout.ui.util;

import ch.sysout.emubro.ui.CustomColor;

import java.awt.Color;

public class ColorUtil {
	public static Color brighter(Color color, float factor) {
		int r = color.getRed();
		int g = color.getGreen();
		int b = color.getBlue();
		int alpha = color.getAlpha();

		/*
		 * From 2D group: 1. black.brighter() should return grey 2. applying brighter to
		 * blue will always return blue, brighter 3. non pure color (non zero rgb) will
		 * eventually return white
		 */
		int i = (int) (1.0 / (1.0 - factor));
		if (r == 0 && g == 0 && b == 0) {
			return new Color(i, i, i, alpha);
		}
		if (r > 0 && r < i) {
			r = i;
		}
		if (g > 0 && g < i) {
			g = i;
		}
		if (b > 0 && b < i) {
			b = i;
		}
		return new Color(Math.min((int) (r / factor), 255), Math.min((int) (g / factor), 255),
				Math.min((int) (b / factor), 255), alpha);
	}

	public static Color darker(Color color, float factor) {
		return new Color(Math.max((int) (color.getRed() * factor), 0), Math.max((int) (color.getGreen() * factor), 0),
				Math.max((int) (color.getBlue() * factor), 0), color.getAlpha());
	}

	public static boolean isColorDark(Color color) {
		double darkness = 1 - (0.299 * color.getRed() + 0.587 * color.getGreen() + 0.114 * color.getBlue()) / 255;
		if (darkness < 0.5) {
			return false;
		} else {
			return true;
		}
	}

	public static Color getComplementaryColor(Color color) {
		float[] hsbVals = Color.RGBtoHSB(color.getRed(), color.getGreen(), color.getBlue(), null);
		float complementaryHue = (hsbVals[0] + 0.5f) % 1.0f;
		return Color.getHSBColor(complementaryHue, hsbVals[1], hsbVals[2]);
	}

    public static String toHexColor(Color color) {
		return "#"+Integer.toHexString(color.getRGB()).substring(2);
    }
}
