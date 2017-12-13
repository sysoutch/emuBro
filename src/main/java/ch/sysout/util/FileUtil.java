package ch.sysout.util;

import java.io.File;

public class FileUtil {

	public static String getParentDirPath(String fileOrDirPath) {
		boolean endsWithSlash = fileOrDirPath.endsWith(File.separator);
		if (fileOrDirPath == null || fileOrDirPath.isEmpty()) {
			return "";
		}
		int minusTwo = fileOrDirPath.length() - 2;
		int minusOne = fileOrDirPath.length() - 1;
		int subString = fileOrDirPath.lastIndexOf(File.separatorChar, endsWithSlash ? minusTwo : minusOne);
		return (subString > 0) ? fileOrDirPath.substring(0, subString) : "";
	}
}
