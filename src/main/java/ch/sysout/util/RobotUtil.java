package ch.sysout.util;

import java.awt.AWTException;
import java.awt.Robot;

public class RobotUtil {

	static Robot robot;

	public static void mouseMove(int x, int y) {
		initializeIfNot();
		robot.mouseMove(x, y);
	}

	private static void initializeIfNot() {
		if (robot == null) {
			try {
				robot = new Robot();
			} catch (AWTException e) {
				// TODO Auto-generated catch block
				e.printStackTrace();
			}
		}
	}

	//	public static void copyImageToClipboard(Rectangle screen) {
	//		BufferedImage i = robot.createScreenCapture(screen);
	//		TransferableImage trans = new TransferableImage(i);
	//		Clipboard c = Toolkit.getDefaultToolkit().getSystemClipboard();
	//		c.setContents(trans, this);
	//	}
}
