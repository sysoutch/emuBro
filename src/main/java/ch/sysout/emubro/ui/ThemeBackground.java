package ch.sysout.emubro.ui;

import java.awt.Color;
import java.awt.Point;
import java.awt.image.BufferedImage;

public class ThemeBackground {
	private boolean autoPickColorFromImageEnabled;

	private BufferedImage image;
	private Color color;
	private Color colorFromImage;
	private Point pickColorFromPoint;

	public ThemeBackground(BufferedImage image, Color color) {
		this(image, color, false, 0, 0);
	}

	public ThemeBackground(BufferedImage image, Color color, boolean autoPickColorFromImageEnabled, int x, int y) {
		this.image = image;
		this.color = color;
		this.autoPickColorFromImageEnabled = autoPickColorFromImageEnabled;
		pickColorFromPoint = new Point(x, y);
	}

	public BufferedImage getImage() {
		return image;
	}

	public void setImage(BufferedImage image) {
		this.image = image;
	}

	public Color getColor() {
		if (autoPickColorFromImageEnabled && image != null) {
			if (pickColorFromPoint == null) {
				pickColorFromPoint = new Point(0, 0);
			}
			return colorFromImage = new Color(image.getRGB(pickColorFromPoint.x, pickColorFromPoint.y));
		}
		return color;
	}

	public void setColor(Color color) {
		this.color = color;
	}

	public boolean isAutoPickColorFromImageEnabled() {
		return autoPickColorFromImageEnabled;
	}

	public void setAutoPickColorFromImageEnabled(boolean autoPickColorFromImageEnabled) {
		this.autoPickColorFromImageEnabled = autoPickColorFromImageEnabled;
	}

	public void setPickColorFromPoint(Point pickColorFromPoint) {
		this.pickColorFromPoint = pickColorFromPoint;
	}

	public void setPickColorFromPoint(int x, int y) {
		pickColorFromPoint = new Point(x, y);
	}
}
