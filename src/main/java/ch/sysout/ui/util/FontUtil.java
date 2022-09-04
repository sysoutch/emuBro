package ch.sysout.ui.util;

import java.awt.Font;
import java.awt.FontFormatException;
import java.awt.GraphicsEnvironment;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

public class FontUtil {
	private static float defaultFontSize = 16f;

	private static Map<Float, Font> customFonts = new HashMap<>();
	private static Map<Float, Font> customBoldFonts = new HashMap<>();

	public static Font getCustomFont() {
		return getCustomFont(defaultFontSize);
	}

	public static Font getCustomFont(float fontSize) {
		if (!customFonts.containsKey(fontSize)) {
			InputStream is = null;
			try {
				GraphicsEnvironment ge = GraphicsEnvironment.getLocalGraphicsEnvironment();
				is = FontUtil.class.getResourceAsStream("/fonts/OpenSans/OpenSans-Regular.ttf");
				Font font = Font.createFont(Font.TRUETYPE_FONT, is);
				ge.registerFont(font);
				customFonts.put(fontSize, font.deriveFont(fontSize));
			} catch (FontFormatException | IOException e) {
				e.printStackTrace();
			} finally {
				try {
					if (is != null) {
						is.close();
					}
				} catch (Exception e) { }
			}
		} else {
			return customFonts.get(fontSize);
		}
		return null;
	}

	public static Font getCustomBoldFont() {
		return getCustomBoldFont(defaultFontSize);
	}

	public static Font getCustomBoldFont(float fontSize) {
		if (!customBoldFonts.containsKey(fontSize)) {
			InputStream is = null;
			try {
				GraphicsEnvironment ge = GraphicsEnvironment.getLocalGraphicsEnvironment();
				is = FontUtil.class.getResourceAsStream("/fonts/OpenSans/OpenSans-Bold.ttf");
				Font font = Font.createFont(Font.TRUETYPE_FONT, is);
				ge.registerFont(font);
				customBoldFonts.put(fontSize, font.deriveFont(fontSize));
			} catch (FontFormatException | IOException e) {
				e.printStackTrace();
			} finally {
				try {
					if (is != null) {
						is.close();
					}
				} catch (Exception e) { }
			}
		} else {
			return customBoldFonts.get(fontSize);
		}
		return null;
	}
}