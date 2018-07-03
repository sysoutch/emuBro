package ch.sysout.util;

import java.text.MessageFormat;
import java.util.Locale;
import java.util.MissingResourceException;
import java.util.ResourceBundle;

public class Messages {
	private static final String FILENAME = "messages";
	private static ResourceBundle RESOURCES = ResourceBundle.getBundle(FILENAME);
	private static MessageFormat FORMATTER = new MessageFormat("");

	static {
		FORMATTER.setLocale(Locale.getDefault());
	}

	public static String get(String key) {
		try {
			return RESOURCES.getString(key);
		} catch (MissingResourceException e) {
			return key;
		}
	}

	public static String get(String key, Object... arguments) {
		FORMATTER.applyPattern(RESOURCES.getString(key));
		return FORMATTER.format(arguments);
	}

	public static void clearCache() {
		ResourceBundle.clearCache();
	}

	public static void setDefault(Locale locale) {
		Locale.setDefault(locale);
		FORMATTER.setLocale(locale);
		RESOURCES = ResourceBundle.getBundle(FILENAME);
	}

	public static Locale getDefault() {
		return Locale.getDefault();
	}
}
