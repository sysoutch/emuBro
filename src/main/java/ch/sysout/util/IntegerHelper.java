package ch.sysout.util;

public class IntegerHelper {
	public static int compare(int a, int b) {
		return (a == b) ? 0 : (a < b) ? -1 : 1;
	}
}
