package ch.sysout.emubro.ui;

import java.awt.Component;
import java.awt.Graphics;

import javax.swing.Icon;

public class CompoundIcon implements Icon {
	private Icon[] icons;

	public CompoundIcon(Icon... icons) {
		this.icons = icons;
	}

	@Override
	public void paintIcon(Component c, Graphics g, int x, int y) {
		for (Icon icon : icons) {
			icon.paintIcon(c, g, x, y);
			x += icon.getIconWidth();
		}
	}

	@Override
	public int getIconWidth() {
		if (icons == null) {
			return 0;
		}
		int width = 0;
		for (Icon ico : icons) {
			width += ico.getIconWidth();
		}
		return width;
	}

	@Override
	public int getIconHeight() {
		if (icons == null) {
			return 0;
		}
		int height = 0;
		for (Icon ico : icons) {
			int icoHeight = ico.getIconHeight();
			if (icoHeight > height) {
				height = icoHeight;
			}
		}
		return height;
	}
}