package ch.sysout.emubro.ui;

import java.awt.Color;
import java.awt.GradientPaint;
import java.awt.Point;
import java.awt.image.BufferedImage;

public class ThemeBackground {
	private boolean autoPickColorFromImageEnabled;

	private BufferedImage image;

	private boolean verticalCenterImageEnabled = true;
	private boolean horizontalCenterImageEnabled = false;

	private boolean imageScaleEnabled = true; // TODO make this dynamic
	private boolean stretchToViewEnabled = true;
	private boolean addTransparencyPaneEnabled = true;
	private Color transparencyColor = new Color(0f, 0f, 0f, 0.4f);
	// TODO boolean for overscale
	// TODO boolean for position
	private Color color;
	private Color colorFromImage;
	private GradientPaint gradientPaint;
	private Point pickColorFromPoint;

	private ThemeImage imageNew;
	private ThemeColor colorNew;

	private boolean transparentSelection;

	public ThemeBackground(BufferedImage image, Color color) {
		this(image, color, false, 0, 0);
	}

	public ThemeBackground(BufferedImage image, Color color, boolean autoPickColorFromImageEnabled, int x, int y) {
		this.image = image;
		this.color = color;
		this.autoPickColorFromImageEnabled = autoPickColorFromImageEnabled;
		pickColorFromPoint = new Point(x, y);
	}

	public ThemeBackground(GradientPaint gradientPaint) {
		this.gradientPaint = gradientPaint;
	}

	public BufferedImage getImage() {
		return image;
	}

	public void setImage(BufferedImage image) {
		this.image = image;
	}

	public boolean hasColor() {
		return getColor() != null;
	}

	public Color getColor() {
		if (autoPickColorFromImageEnabled && image != null) {
			if (pickColorFromPoint == null) {
				pickColorFromPoint = new Point(0, 0);
			}
			if (colorFromImage == null) {
				colorFromImage = new Color(image.getRGB(pickColorFromPoint.x, pickColorFromPoint.y));
			}
			return colorFromImage;
		}
		return color;
	}

	public void setColor(Color color) {
		this.color = color;
	}

	public boolean hasGradientPaint() {
		return gradientPaint != null;
	}

	public GradientPaint getGradientPaint() {
		return gradientPaint;
	}

	public void setGradientPaint(GradientPaint gradientPaint) {
		this.gradientPaint = gradientPaint;
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

	public boolean isImageScaleEnabled() {
		return imageScaleEnabled;
	}

	public void setImageScaleEnabled(boolean imageScaleEnabled) {
		this.imageScaleEnabled = imageScaleEnabled;
	}

	public boolean isStretchToViewEnabled() {
		return stretchToViewEnabled;
	}

	public void setStretchToViewEnabled(boolean stretchToViewEnabled) {
		this.stretchToViewEnabled = stretchToViewEnabled;
	}

	public boolean isVerticalCenterImageEnabled() {
		return verticalCenterImageEnabled;
	}

	public void setVerticalCenterImageEnabled(boolean verticalCenterImageEnabled) {
		this.verticalCenterImageEnabled = verticalCenterImageEnabled;
	}

	public boolean isHorizontalCenterImageEnabled() {
		return horizontalCenterImageEnabled;
	}

	public void setHorizontalCenterImageEnabled(boolean horizontalCenterImageEnabled) {
		this.horizontalCenterImageEnabled = horizontalCenterImageEnabled;
	}

	public boolean isAddTransparencyPaneEnabled() {
		return addTransparencyPaneEnabled;
	}

	public void setAddTransparencyPaneEnabled(boolean addTransparencyPaneEnabled) {
		this.addTransparencyPaneEnabled = addTransparencyPaneEnabled;
	}

	public int getTransparencyValue() {
		return transparencyColor.getAlpha();
	}

	public void setTransparencyValue(int transparencyValue) {
		int red = transparencyColor.getRed();
		int green = transparencyColor.getGreen();
		int blue = transparencyColor.getBlue();
		transparencyColor = new Color(red, green, blue, transparencyValue);
	}

	public Color getTransparencyColor() {
		return transparencyColor;
	}

	public void setTransparencyColor(Color transparencyColor) {
		this.transparencyColor = transparencyColor;
	}

	public boolean isTransparentSelection() {
		return transparentSelection;
	}

	public void setTransparentSelectionEnabled(boolean transparentSelection) {
		this.transparentSelection = transparentSelection;
	}
}
