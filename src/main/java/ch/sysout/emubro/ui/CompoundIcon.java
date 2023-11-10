package ch.sysout.emubro.ui;

import java.awt.Component;
import java.awt.Graphics;

import javax.swing.Icon;

public class CompoundIcon implements Icon {
	private Icon[] icons;
	private int totalIconWidth;
	private int highestIconHeight;

	public CompoundIcon(Icon... icons) {
		this.icons = icons;
		setIconWidth();
		setIconHeight();
	}

	@Override
	public void paintIcon(Component c, Graphics g, int x, int y) {
		for (Icon icon : icons) {
			icon.paintIcon(c, g, x, y);
			x += icon.getIconWidth();
		}
	}

	private void setIconWidth() {
		totalIconWidth = 0;
		if (icons == null) {
			return;
		}
		for (Icon ico : icons) {
			totalIconWidth += ico.getIconWidth();
		}
	}

	@Override
	public int getIconWidth() {
		return totalIconWidth;
	}

	private void setIconHeight() {
		highestIconHeight = 0;
		if (icons == null) {
			return;
		}
		for (Icon ico : icons) {
			int icoHeight = ico.getIconHeight();
			if (icoHeight > highestIconHeight) {
				highestIconHeight = icoHeight;
			}
		}
	}

	@Override
	public int getIconHeight() {
		return highestIconHeight;
	}

	public Icon[] getIcons() {
		return icons;
	}
}