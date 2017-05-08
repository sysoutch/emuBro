package ch.sysout.emubro.ui;

import java.awt.Dimension;
import java.awt.FontMetrics;
import java.awt.Graphics;

import javax.swing.ImageIcon;
import javax.swing.JComponent;
import javax.swing.JToolTip;
import javax.swing.plaf.metal.MetalToolTipUI;

public class JToolTipWithIcon extends JToolTip {
	private static final long serialVersionUID = 1L;

	protected ImageIcon icon;

	public JToolTipWithIcon(ImageIcon icon) {
		this.icon = icon;
		setUI(new IconToolTipUI());
	}

	public JToolTipWithIcon(MetalToolTipUI toolTipUI) {
		setUI(toolTipUI);
	}

	private class IconToolTipUI extends MetalToolTipUI {
		@Override
		public void paint(Graphics g, JComponent c) {
			FontMetrics metrics = c.getFontMetrics(c.getFont());
			Dimension size = c.getSize();
			g.setColor(c.getBackground());
			g.fillRect(0, 0, size.width, size.height);
			int x = 3;
			if (icon != null) {
				icon.paintIcon(c, g, 0, 0);
				x += icon.getIconWidth() + 1;
			}
			g.setColor(c.getForeground());
			g.drawString(((JToolTip) c).getTipText(), x, metrics.getHeight());
		}

		@Override
		public Dimension getPreferredSize(JComponent c) {
			return new Dimension(icon.getIconWidth(), icon.getIconHeight());
		}
	}
}