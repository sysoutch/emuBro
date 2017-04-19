package ch.sysout.util;

import java.awt.Dimension;
import java.awt.Font;
import java.awt.Toolkit;

import javax.swing.UIManager;

/**
 * this is a helper class which holds static methods.
 * <p>
 * they can be called to easily check common situations like
 *
 * <pre>
 * </pre>
 *
 * in just one line of code. if the if-statement is <code>false</code>, nothing
 * happens. but if the check is <code>true</code>, e.g. an Exception can be
 * thrown
 */
public class ScreenSizeUtil {
	public static Dimension screenSize() {
		return Toolkit.getDefaultToolkit().getScreenSize();
	}

	public static boolean is2k() {
		return (screenSize().width >= 2048 && screenSize().height >= 1152)
				|| (screenSize().width >= 1152 && screenSize().height >= 2048);
	}

	public static boolean is3k() {
		return (screenSize().width >= 3072 && screenSize().height >= 1728)
				|| (screenSize().width >= 1728 && screenSize().height >= 3072);
	}

	public static boolean is4k() {
		return (screenSize().width >= 4096 && screenSize().height >= 2304)
				|| (screenSize().width >= 2304 && screenSize().height >= 4096);
	}

	public static Font defaultFont() {
		return (Font) UIManager.get("MenuItem.font");
	}

	public static int adjustValueToResolution(int i) {
		double half = (double) i / 2;
		double value = is3k() ? (half * 3) : i;
		int roundedValue = (int) Math.round(value);
		return roundedValue;
	}

	public static int getWidth() {
		return (int) screenSize().getWidth();
	}

	public static int getHeight() {
		return (int) screenSize().getHeight();
	}
}