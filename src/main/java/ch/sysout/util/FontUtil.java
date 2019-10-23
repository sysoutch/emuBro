package ch.sysout.util;

import java.awt.Font;
import java.awt.FontFormatException;
import java.awt.GraphicsEnvironment;
import java.io.IOException;
import java.io.InputStream;

import javax.swing.UIManager;

public class FontUtil {
	private static Font customFont;
	private static Font customFontBold;

	public static Font getCustomFont() {
		if (customFont == null) {
			InputStream is = null;
			try {
				GraphicsEnvironment ge = GraphicsEnvironment.getLocalGraphicsEnvironment();
				is = FontUtil.class.getResourceAsStream("/fonts/OpenSans/OpenSans-Regular.ttf");
				customFont = Font.createFont(Font.TRUETYPE_FONT, is);
				customFont = customFont.deriveFont(16f);
				ge.registerFont(customFont);
			} catch (FontFormatException | IOException e) {
				customFont = (Font) UIManager.get("MenuItem.font");
				e.printStackTrace();
			} finally {
				try {
					if (is != null) {
						is.close();
					}
				} catch (Exception e) { }
			}
		}
		return customFont;
	}

	public static Font getCustomFontBold() {
		if (customFontBold == null) {
			InputStream is = null;
			try {
				GraphicsEnvironment ge = GraphicsEnvironment.getLocalGraphicsEnvironment();
				is = FontUtil.class.getResourceAsStream("/fonts/OpenSans/OpenSans-Bold.ttf");
				customFontBold = Font.createFont(Font.TRUETYPE_FONT, is);
				customFontBold = customFontBold.deriveFont(16f);
				ge.registerFont(customFontBold);
			} catch (FontFormatException | IOException e) {
				customFontBold = (Font) UIManager.get("MenuItem.font");
				e.printStackTrace();
			} finally {
				try {
					if (is != null) {
						is.close();
					}
				} catch (Exception e) { }
			}
		}
		return customFontBold;
	}
}