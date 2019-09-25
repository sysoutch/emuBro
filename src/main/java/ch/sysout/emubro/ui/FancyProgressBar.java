package ch.sysout.emubro.ui;

import java.awt.BasicStroke;
import java.awt.Color;
import java.awt.Graphics;
import java.awt.Graphics2D;
import java.awt.LinearGradientPaint;
import java.awt.RenderingHints;
import java.awt.geom.Point2D;
import java.awt.geom.RoundRectangle2D;

import javax.swing.JComponent;
import javax.swing.plaf.basic.BasicProgressBarUI;

public class FancyProgressBar extends BasicProgressBarUI {

	//	@Override
	//	protected Dimension getPreferredInnerVertical() {
	//		return new Dimension(20, 146);
	//	}
	//
	//	@Override
	//	protected Dimension getPreferredInnerHorizontal() {
	//		return new Dimension(146, 20);
	//	}

	private Color color = Color.RED;

	@Override
	protected void paintDeterminate(Graphics g, JComponent c) {
		Graphics2D g2d = (Graphics2D) g.create();

		g2d.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);

		int iStrokWidth = 3;
		g2d.setStroke(new BasicStroke(iStrokWidth, BasicStroke.CAP_ROUND, BasicStroke.JOIN_ROUND));
		g2d.setColor(color);
		g2d.setBackground(color);

		int width = progressBar.getWidth();
		int height = progressBar.getHeight();

		RoundRectangle2D outline = new RoundRectangle2D.Double((iStrokWidth / 2), (iStrokWidth / 2),
				width - iStrokWidth, height - iStrokWidth, height, height);

		g2d.draw(outline);

		int iInnerHeight = height - (iStrokWidth * 4);
		int iInnerWidth = width - (iStrokWidth * 4);

		double dProgress = progressBar.getPercentComplete();
		if (dProgress < 0) {
			dProgress = 0;
		} else if (dProgress > 1) {
			dProgress = 1;
		}

		iInnerWidth = (int) Math.round(iInnerWidth * dProgress);

		int x = iStrokWidth * 2;
		int y = iStrokWidth * 2;

		Point2D start = new Point2D.Double(x, y);
		Point2D end = new Point2D.Double(x, y + iInnerHeight);

		float[] dist = { 0.0f, 0.25f, 1.0f };
		Color[] colors = { color, color.brighter(),
				color.darker() };
		LinearGradientPaint p = new LinearGradientPaint(start, end, dist, colors);

		g2d.setPaint(p);

		RoundRectangle2D fill = new RoundRectangle2D.Double(iStrokWidth * 2, iStrokWidth * 2, iInnerWidth, iInnerHeight,
				iInnerHeight, iInnerHeight);

		g2d.fill(fill);

		g2d.dispose();
	}

	@Override
	protected void paintIndeterminate(Graphics g, JComponent c) {
		super.paintIndeterminate(g, c); // To change body of generated methods, choose Tools | Templates.
	}
}