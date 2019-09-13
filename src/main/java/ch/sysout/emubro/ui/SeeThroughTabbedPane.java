package ch.sysout.emubro.ui;

import java.awt.AlphaComposite;
import java.awt.Graphics;
import java.awt.Graphics2D;

import javax.swing.JTabbedPane;

public class SeeThroughTabbedPane extends JTabbedPane {
	private static final long serialVersionUID = 1L;

	private float alpha;

	public SeeThroughTabbedPane() {
		this(TOP, WRAP_TAB_LAYOUT);
	}

	public SeeThroughTabbedPane(int tabPlacement) {
		this(tabPlacement, WRAP_TAB_LAYOUT);
	}

	public SeeThroughTabbedPane(int tabPlacement, int tabLayoutPolicy) {
		super();
		setOpaque(false);
		setAlpha(0.5f);
	}

	public void setAlpha(float value) {
		if (alpha != value) {
			float old = alpha;
			alpha = value;
			firePropertyChange("alpha", old, alpha);
			repaint();
		}
	}

	public float getAlpha() {
		return alpha;
	}

	@Override
	protected void paintComponent(Graphics g) {
		Graphics2D g2d = (Graphics2D) g.create();
		g2d.setColor(getBackground());
		g2d.setComposite(AlphaComposite.SrcOver.derive(getAlpha()));
		g2d.fillRect(0, 0, getWidth(), getHeight());
		g2d.dispose();
		super.paintComponent(g);
	}
}
