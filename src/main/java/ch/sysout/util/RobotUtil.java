package ch.sysout.util;

import java.awt.AWTException;
import java.awt.Rectangle;
import java.awt.Robot;
import java.awt.event.KeyEvent;
import java.awt.image.BufferedImage;

public class RobotUtil {

	static Robot robot;

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

	public static void mouseMove(int x, int y) {
		initializeIfNot();
		robot.mouseMove(x, y);
	}

	public static void doScreenshot() {
		initializeIfNot();
		robot.keyPress(KeyEvent.VK_ALT);
		robot.keyPress(KeyEvent.VK_PRINTSCREEN);
		robot.keyRelease(KeyEvent.VK_PRINTSCREEN);
		robot.keyRelease(KeyEvent.VK_ALT);
	}

	public static BufferedImage createScreenCapture(Rectangle screenRect) {
		initializeIfNot();
		return robot.createScreenCapture(screenRect);
	}

	//	public static void copyImageToClipboard(Rectangle screen) {
	//		BufferedImage i = robot.createScreenCapture(screen);
	//		TransferableImage trans = new TransferableImage(i);
	//		Clipboard c = Toolkit.getDefaultToolkit().getSystemClipboard();
	//		c.setContents(trans, this);
	//	}
}
