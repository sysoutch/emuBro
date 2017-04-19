package ch.sysout.gameexplorer.ui;

import java.awt.Dimension;
import java.awt.Graphics;
import java.awt.Graphics2D;
import java.awt.Image;
import java.awt.RenderingHints;

import javax.swing.JPanel;

public class AutoScaleImagePanel extends JPanel {
	private static final long serialVersionUID = 1L;
	private Image bi;

	@Override
	protected void paintComponent(Graphics g) {
		super.paintComponent(g);
		if (bi != null) {
			Graphics2D g2d = (Graphics2D) g;
			g2d.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
			g2d.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
			g2d.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);

			double scaleFactor = (double) bi.getWidth(null) / (double) bi.getHeight(null);
			int height = getHeight();
			int width = (int) (height * scaleFactor);
			if (width <= getWidth()) {
				int x = 0;
				int y = getHeight() / 2 - height / 2;
				g2d.drawImage(bi, x, y, width, height, this);
				// setSize(width, height);
			} else {
				int x = 0;
				int y = (int) (getHeight() / 2 - ((getWidth() / scaleFactor) / 2));
				g2d.drawImage(bi, x, y, getWidth(), (int) (getWidth() / scaleFactor), this);
				// setSize(getWidth(), (int) (getWidth() / scaleFactor));
			}
			g2d.dispose();
		}
	}

	public void setGameCover(Image icon) {
		bi = icon;
		if (bi != null) {
			bi.flush();
			setPreferredSize(new Dimension(bi.getWidth(this), bi.getHeight(this)));
		}
	}
}
