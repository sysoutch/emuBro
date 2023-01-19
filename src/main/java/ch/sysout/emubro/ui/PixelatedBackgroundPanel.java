package ch.sysout.emubro.ui;

import java.awt.Color;
import java.awt.Graphics;
import java.awt.LayoutManager;
import java.util.Random;

import javax.swing.JPanel;

public class PixelatedBackgroundPanel extends JPanel {
	private static final long serialVersionUID = 1L;

	private int imageWidth = 640;
	private int imageHeight = 460;
	private int pixelSizeW = 32;
	private int pixelSizeH = 32;
	private int maxLoops = 10;

	private boolean randomColors;
	private boolean autoDecideBrighterDarker;
	private boolean fillWidthEnabled = true;
	private boolean fillHeightEnabled = true;

	private CustomColor baseColor = new CustomColor(200, 50, 85); // red-ish
	//	private CustomColor baseColor = new CustomColor(88, 200, 50); // green-ish
	//	private CustomColor baseColor = new CustomColor(100, 140, 160); // blue-ish

	public PixelatedBackgroundPanel() {
		super();
	}

	public PixelatedBackgroundPanel(LayoutManager layout) {
		super(layout);
	}

	@Override
	protected void paintComponent(Graphics g) {
		super.paintComponent(g);
		//        g.setColor(Color.BLACK);
		//        g.fillOval(x, y, 50, 50);
		//
		Random rand = new Random();
		int width = fillWidthEnabled ? PixelatedBackgroundPanel.this.getWidth() : imageWidth;
		int height = fillHeightEnabled ? PixelatedBackgroundPanel.this.getHeight() : imageHeight;
		for (int y = 0; (y * pixelSizeH) < height; y++) {
			for (int x = 0; (x * pixelSizeW) < width; x++) {
				CustomColor color = null;
				if (randomColors) {
					int red = rand.nextInt(256);
					int green = rand.nextInt(256);
					int blue = rand.nextInt(256);
					color = new CustomColor(red, green, blue);
				} else {
					CustomColor color2 = baseColor;
					boolean brighter = (autoDecideBrighterDarker ? rand.nextInt(2) == 1 : true);
					color = brighter ? color2.brighter() : color2.darker();
					int loops = rand.nextInt(maxLoops);
					for (int i = 0; i < loops; i++) {
						color = brighter ? color.brighter() : color.darker();
					}
				}
				g.setColor(color);
				g.fillRect(pixelSizeW * x, pixelSizeH * y, pixelSizeW, pixelSizeH);
			}
		}
	}

	public boolean isRandomColors() {
		return randomColors;
	}

	public void setRandomColors(boolean randomColors) {
		this.randomColors = randomColors;
	}

	public CustomColor getBaseColor() {
		return baseColor;
	}

	public void setBaseColor(CustomColor baseColor) {
		this.baseColor = baseColor;
	}

	public void setBaseColor(Color baseColor) {
		this.baseColor = CustomColor.convertToCustomColor(baseColor);
	}

	public boolean isAutoDecideBrighterDarker() {
		return autoDecideBrighterDarker;
	}

	public void setAutoDecideBrighterDarker(boolean autoDecideBrighterDarker) {
		this.autoDecideBrighterDarker = autoDecideBrighterDarker;
	}

	public int getMaxLoops() {
		return maxLoops;
	}

	public void setMaxLoops(int maxLoops) {
		this.maxLoops = maxLoops;
	}

	public double getFactor() {
		return CustomColor.factor;
	}

	public void setFactor(double factor) {
		CustomColor.factor = factor;
	}

	public void setFillWidthEnabled(boolean fillWidthEnabled) {
		this.fillWidthEnabled = fillWidthEnabled;
	}

	public void setFillHeightEnabled(boolean fillHeightEnabled) {
		this.fillHeightEnabled = fillHeightEnabled;
	}

	public int getImageWidth() {
		return imageWidth;
	}

	public void setImageWidth(int imageWidth) {
		this.imageWidth = imageWidth;
		repaint();
	}

	public int getImageHeight() {
		return imageHeight;
	}

	public void setImageHeight(int imageHeight) {
		this.imageHeight = imageHeight;
		repaint();
	}

	public int getPixelSizeW() {
		return pixelSizeW;
	}

	public void setPixelSizeW(int pixelSizeW) {
		this.pixelSizeW = pixelSizeW;
		repaint();
	}

	public int getPixelSizeH() {
		return pixelSizeH;
	}

	public void setPixelSizeH(int pixelSizeH) {
		this.pixelSizeH = pixelSizeH;
		repaint();
	}
}

