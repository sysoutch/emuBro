package ch.sysout.util;

import java.text.MessageFormat;
import java.util.Locale;
import java.util.ResourceBundle;

public class Messages {
	private static final String FILENAME = "messages";
	private static ResourceBundle RESOURCES = ResourceBundle.getBundle(FILENAME);
	private static MessageFormat FORMATTER = new MessageFormat("");

	static {
		FORMATTER.setLocale(Locale.getDefault());
	}

	public static String get(String key) {
		return RESOURCES.getString(key);
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
}
