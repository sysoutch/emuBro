package ch.sysout.util;

import java.awt.Color;
import java.nio.file.Path;
import java.util.Collection;
import java.util.Map;

/**
 * this is a helper class which holds static methods.
 * <p>
 * they can be called to easily check common situations like
 *
 * <pre>
 * 	 if (string == null && string.isEmpty())
 * </pre>
 *
 * in just one line of code. if the if-statement is <code>false</code>, nothing
 * happens. but if the check is <code>true</code>, e.g. an Exception can be
 * thrown
 */
public class ValidationUtil {
	private static final String OS = System.getProperty("os.name").toLowerCase();

	private static final Color SUCCESS_BACKGROUND = new Color(215, 255, 215);
	private static final Color SUCCESS_HOVER_BACKGROUND = new Color(255, 244, 216);

	/**
	 * @param o
	 *            the object to be checked
	 * @param fieldName
	 */
	public static void checkNull(Object o, String fieldName) {
		if (o == null) {
			throw new IllegalArgumentException(fieldName + " may not be null");
		}
	}

	/**
	 * @param s
	 * @param fieldName
	 */
	public static void checkNullOrEmpty(String s, String fieldName) {
		if (s == null || s.trim().isEmpty()) {
			throw new IllegalArgumentException(fieldName + " may not be null or empty");
		}
	}

	/**
	 * @param objects
	 * @param fieldName
	 */
	public static void checkNullOrEmpty(Collection<? extends Object> objects, String fieldName) {
		if (objects == null || objects.isEmpty()) {
			throw new IllegalArgumentException(fieldName + " may not be null or empty");
		}
	}

	/**
	 * @param objects
	 * @param fieldName
	 */
	public static void checkNullOrEmpty(Object[] objects, String fieldName) {
		if (objects == null || objects.length == 0) {
			throw new IllegalArgumentException(fieldName + " may not be null or empty");
		}
		for (Object obj : objects) {
			if (obj == null) {
				throw new IllegalArgumentException(fieldName + " may not be null or empty");
			}
		}
	}

	/**
	 * @param map
	 * @param fieldName
	 */
	public static void checkNullOrEmpty(Map<? extends Object, ? extends Object> map, String fieldName) {
		if (map == null || map.isEmpty()) {
			throw new IllegalArgumentException(fieldName + " may not be null or empty");
		}
	}

	/**
	 * @param input
	 * @param min
	 * @param max
	 */
	public static void checkInRange(Number input, Number min, Number max, String fieldName) {
		if (input == null || (min != null && input.doubleValue() < min.doubleValue())
				|| (max != null && input.doubleValue() > max.doubleValue())) {
			throw new IllegalArgumentException(fieldName + " must be between " + min + " and " + max);
		}
	}

	/**
	 * @param input
	 * @param limit
	 * @param fieldName
	 */
	public static void checkNotLessThan(Number input, Number limit, String fieldName) {
		if (input.doubleValue() < limit.doubleValue()) {
			throw new IllegalArgumentException(fieldName + " may not be less than " + limit);
		}
	}

	/**
	 * @param objects
	 * @param object
	 * @param fieldName
	 */
	public static void checkHasObject(Collection<? extends Object> objects, Object object, String fieldName) {
		if (objects.contains(object)) {
			throw new IllegalArgumentException(fieldName + " already exists");
		}
	}

	/**
	 * @param objects
	 * @param object
	 * @param fieldName
	 */
	public static void checkNoObject(Collection<? extends Object> objects, Object object, String fieldName) {
		if (!objects.contains(object)) {
			throw new IllegalArgumentException(fieldName + " does not exist");
		}
	}

	public static boolean isWindows() {
		return (OS.indexOf("win") >= 0);
	}

	public static boolean isMac() {
		return (OS.indexOf("mac") >= 0);
	}

	public static boolean isUnix() {
		return (OS.indexOf("nix") >= 0 || OS.indexOf("nux") >= 0 || OS.indexOf("aix") > 0);
	}

	public static boolean isSolaris() {
		return (OS.indexOf("sunos") >= 0);
	}

	public static Color getSuccessBackground() {
		return SUCCESS_BACKGROUND;
	}

	public static Color getRemoveInformationBackground() {
		return SUCCESS_HOVER_BACKGROUND;
	}

	public static boolean isLinkFile(Path file) {
		return file.toString().toLowerCase().endsWith(".lnk");
	}

	public static boolean isPictureFile(Path file) {
		return file.toString().toLowerCase().endsWith(".png")
				|| file.toString().toLowerCase().endsWith(".jpg")
				|| file.toString().toLowerCase().endsWith(".jpeg")
				|| file.toString().toLowerCase().endsWith(".bmp")
				|| file.toString().toLowerCase().endsWith(".gif")
				|| file.toString().toLowerCase().endsWith(".tif")
				|| file.toString().toLowerCase().endsWith(".tiff")
				|| file.toString().toLowerCase().endsWith(".ico");
	}

	public static boolean isChecksumDifferent(String checksum1, String checksum2) {
		return !checksum1.equalsIgnoreCase(checksum2);
	}
}