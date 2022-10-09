package ch.sysout.util;

import java.io.IOException;

public class SystemUtil {

	public static void killTask(int pId) throws IOException {
		if (ValidationUtil.isWindows()) {
			Runtime.getRuntime().exec("cmd.exe /c taskkill -IM " + pId);
		} else if (ValidationUtil.isUnix()) {
			Runtime.getRuntime().exec("kill " + pId);
		}
	}
}
