package ch.sysout.util;

import java.awt.Font;
import java.awt.FontFormatException;
import java.awt.GraphicsEnvironment;
import java.io.IOException;
import java.io.InputStream;

import javax.swing.UIManager;

public class FontUtil {
	static Font customFont = null;

	public static Font getCustomFont() {
		if (customFont == null) {
			InputStream is = null;
			try {
				GraphicsEnvironment ge = GraphicsEnvironment.getLocalGraphicsEnvironment();
				is = FontUtil.class.getResourceAsStream("/fonts/OpenSans/OpenSans-Bold.ttf");
				customFont = Font.createFont(Font.TRUETYPE_FONT, is);
				customFont = customFont.deriveFont(16f);
				ge.registerFont(customFont);
			} catch (FontFormatException | IOException e) {
				e.printStackTrace();
			} finally {
				if (customFont == null) {
					customFont = (Font) UIManager.get("MenuItem.font");
				}
				try {
					if (is != null) {
						is.close();
					}
				} catch (Exception e) { }
			}
		}
		return customFont;
	}
}