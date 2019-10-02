package ch.sysout.emubro.ui;

import java.awt.Color;
import java.awt.Font;
import java.awt.FontMetrics;
import java.awt.GradientPaint;
import java.awt.Graphics;
import java.awt.Graphics2D;
import java.awt.Insets;
import java.awt.Polygon;
import java.awt.Rectangle;
import java.awt.RenderingHints;
import java.util.Arrays;

import javax.swing.UIManager;
import javax.swing.plaf.basic.BasicGraphicsUtils;
import javax.swing.plaf.basic.BasicTabbedPaneUI;
import javax.swing.text.View;

public class CustomTabbedPaneUI extends BasicTabbedPaneUI {
	private int inclTab = 4;
	private int anchoFocoV = inclTab;
	private int anchoFocoH = 4;
	private int anchoCarpetas = 18;
	private Polygon shape;
	private Color colorTabTextSelected = Color.WHITE;
	private Color colorTabText = Color.WHITE;

	public CustomTabbedPaneUI() {
	}

	private final Insets borderInsets = new Insets(0, 0, 0, 0);

	@Override
	protected void paintContentBorder(Graphics g, int tabPlacement, int selectedIndex) {
	}
	@Override
	protected Insets getContentBorderInsets(int tabPlacement) {
		return borderInsets;
	}

	@Override
	protected void installDefaults() {
		super.installDefaults();
		//		selectColor = new Color(55, 110, 160);
		//		deSelectColor = new Color(100, 135, 165);
		//		deSelectColor = new Color(31,120,173);

		tabAreaInsets.right = anchoCarpetas;
	}

	@Override
	protected void paintTabArea(Graphics g, int tabPlacement, int selectedIndex) {
		if (runCount > 1) {
			int lines[] = new int[runCount];
			for (int i = 0; i < runCount; i++) {
				lines[i] = rects[tabRuns[i]].y + (tabPlacement == TOP ? maxTabHeight : 0);
			}
			Arrays.sort(lines);
			if (tabPlacement == TOP) {
				int fila = runCount;
				for (int i = 0; i < lines.length - 1; i++, fila--) {
					Polygon carp = new Polygon();
					carp.addPoint(0, lines[i]);
					carp.addPoint(tabPane.getWidth() - 2 * fila - 2, lines[i]);
					carp.addPoint(tabPane.getWidth() - 2 * fila, lines[i] + 3);
					if (i < lines.length - 2) {
						carp.addPoint(tabPane.getWidth() - 2 * fila, lines[i + 1]);
						carp.addPoint(0, lines[i + 1]);
					} else {
						carp.addPoint(tabPane.getWidth() - 2 * fila, lines[i] + rects[selectedIndex].height);
						carp.addPoint(0, lines[i] + rects[selectedIndex].height);
					}
					carp.addPoint(0, lines[i]);
					g.setColor(hazAlfa(fila));
					g.fillPolygon(carp);
					g.setColor(darkShadow.darker());
					g.drawPolygon(carp);
				}
			} else {
				int fila = 0;
				for (int i = 0; i < lines.length - 1; i++, fila++) {
					Polygon carp = new Polygon();
					carp.addPoint(0, lines[i]);
					carp.addPoint(tabPane.getWidth() - 2 * fila - 1, lines[i]);
					carp.addPoint(tabPane.getWidth() - 2 * fila - 1, lines[i + 1] - 3);
					carp.addPoint(tabPane.getWidth() - 2 * fila - 3, lines[i + 1]);
					carp.addPoint(0, lines[i + 1]);
					carp.addPoint(0, lines[i]);
					g.setColor(hazAlfa(fila + 2));
					g.fillPolygon(carp);
					g.setColor(darkShadow.darker());
					g.drawPolygon(carp);
				}
			}
		}
		super.paintTabArea(g, tabPlacement, selectedIndex);
	}

	@Override
	protected void paintTabBackground(Graphics g, int tabPlacement, int tabIndex, int x, int y, int w, int h, boolean isSelected) {
		Graphics2D g2D = (Graphics2D) g;
		GradientPaint gradientShadow;
		int xp[] = null; // Para la forma
		int yp[] = null;
		switch (tabPlacement) {
		case LEFT:
			xp = new int[]{x, x, x + w, x + w, x};
			yp = new int[]{y, y + h - 3, y + h - 3, y, y};
			gradientShadow = new GradientPaint(x, y, new Color(100, 100, 255), x, y + h, Color.ORANGE);
			break;
		case RIGHT:
			xp = new int[]{x, x, x + w - 2, x + w - 2, x};
			yp = new int[]{y, y + h - 3, y + h - 3, y, y};
			gradientShadow = new GradientPaint(x, y, new Color(100, 100, 255), x, y + h, new Color(153, 186, 243));
			break;
		case BOTTOM:
			xp = new int[]{x, x, x + 3, x + w - inclTab - 6, x + w - inclTab - 2, x + w - inclTab, x + w - 3, x};
			yp = new int[]{y, y + h - 3, y + h, y + h, y + h - 1, y + h - 3, y, y};
			gradientShadow = new GradientPaint(x, y, new Color(100, 100, 255), x, y + h, Color.BLUE);
			break;
		case TOP:
		default:
			xp = new int[]{x, x, x + 3, x + w - inclTab - 6, x + w - inclTab - 2, x + w - inclTab, x + w - inclTab, x};
			yp = new int[]{y + h, y + 3, y, y, y + 1, y + 3, y + h, y + h};
			gradientShadow = new GradientPaint(0, 0, Color.ORANGE, 0, y + h / 2, new Color(240, 255, 210));
			break;
		}
		// ;
		shape = new Polygon(xp, yp, xp.length);
		if (isSelected) {
			Color selectColor = IconStore.current().getCurrentTheme().getView().getColor();
			g2D.setColor(selectColor);
			//			g2D.setPaint(gradientShadow);
		} else {
			if (tabPane.isEnabled() && tabPane.isEnabledAt(tabIndex)) {
				Color deSelectColor = IconStore.current().getCurrentTheme().getNavigationPane().getColor();
				g2D.setColor(deSelectColor);
				GradientPaint gradientShadowTmp = new GradientPaint(0, 0, new Color(255, 255, 200), 0, y + h / 2, new Color(240, 255, 210));
				//				g2D.setPaint(gradientShadowTmp);
			} else {
				GradientPaint gradientShadowTmp = new GradientPaint(0, 0, new Color(240, 255, 210), 0, y + 15 + h / 2, new Color(204, 204, 204));
				//				g2D.setPaint(gradientShadowTmp);
			}
		}
		//selectColor = new Color(255, 255, 200);
		//deSelectColor = new Color(240, 255, 210);
		g2D.fill(shape);
		if (runCount > 1) {
			g2D.setColor(hazAlfa(getRunForTab(tabPane.getTabCount(), tabIndex) - 1));
			g2D.fill(shape);
		}
		g2D.fill(shape);
	}

	@Override
	protected void paintText(Graphics g, int tabPlacement, Font font, FontMetrics metrics, int tabIndex, String title, Rectangle textRect, boolean isSelected) {
		super.paintText(g, tabPlacement, font, metrics, tabIndex, title, textRect, isSelected);
		Graphics2D g2d = (Graphics2D) g;
		g2d.setRenderingHint(
				RenderingHints.KEY_TEXT_ANTIALIASING,
				RenderingHints.VALUE_TEXT_ANTIALIAS_LCD_HRGB);

		g2d.setFont(font);
		View v = getTextViewForTab(tabIndex);
		if (v != null) {
			// html
			v.paint(g, textRect);
		} else {
			// plain text
			int mnemIndex = tabPane.getDisplayedMnemonicIndexAt(tabIndex);
			if (tabPane.isEnabled() && tabPane.isEnabledAt(tabIndex)) {
				g2d.setColor(isSelected ? colorTabTextSelected : colorTabText);
				BasicGraphicsUtils.drawStringUnderlineCharAt(g2d, title, mnemIndex, textRect.x, textRect.y + metrics.getAscent());
			} else { // tab disabled
				g2d.setColor(colorTabTextSelected);
				BasicGraphicsUtils.drawStringUnderlineCharAt(g2d, title, mnemIndex, textRect.x, textRect.y + metrics.getAscent());
				g2d.setColor(colorTabTextSelected);
				BasicGraphicsUtils.drawStringUnderlineCharAt(g2d, title, mnemIndex, textRect.x - 1, textRect.y + metrics.getAscent() - 1);
			}
		}
	}
	/*protected void paintText(Graphics g, int tabPlacement, Font font, FontMetrics metrics, int tabIndex, String title, Rectangle textRect, boolean isSelected) {
    g.setFont(font);
    View v = getTextViewForTab(tabIndex);
    if (v != null) {
    // html
    v.paint(g, textRect);
    } else {
    // plain text
    int mnemIndex = tabPane.getDisplayedMnemonicIndexAt(tabIndex);

    if (tabPane.isEnabled() && tabPane.isEnabledAt(tabIndex)) {
    Color fg = tabPane.getForegroundAt(tabIndex);
    if (isSelected && (fg instanceof UIResource)) {
    Color selectedFG = UIManager.getColor("TabbedPane.selectedForeground");
    if (selectedFG != null) {
    fg = selectedFG;
    }
    }
    g.setColor(fg);
    SwingUtilities2.drawStringUnderlineCharAt(tabPane, g, title, mnemIndex, textRect.x, textRect.y + metrics.getAscent());

    } else { // tab disabled
    //PAY ATTENTION TO HERE
    g.setColor(tabPane.getBackgroundAt(tabIndex).brighter());
    SwingUtilities2.drawStringUnderlineCharAt(tabPane, g, title, mnemIndex, textRect.x, textRect.y + metrics.getAscent());
    g.setColor(tabPane.getBackgroundAt(tabIndex).darker());
    SwingUtilities2.drawStringUnderlineCharAt(tabPane, g, title, mnemIndex,
    textRect.x - 1, textRect.y + metrics.getAscent() - 1);
    }
    }
    }*/

	@Override
	protected int calculateTabWidth(int tabPlacement, int tabIndex, FontMetrics metrics) {
		return 20 + inclTab + super.calculateTabWidth(tabPlacement, tabIndex, metrics);
	}

	@Override
	protected int calculateTabHeight(int tabPlacement, int tabIndex, int fontHeight) {
		if (tabPlacement == LEFT || tabPlacement == RIGHT) {
			return super.calculateTabHeight(tabPlacement, tabIndex, fontHeight);
		} else {
			return anchoFocoH + super.calculateTabHeight(tabPlacement, tabIndex, fontHeight);
		}
	}

	@Override
	protected void paintTabBorder(Graphics g, int tabPlacement, int tabIndex, int x, int y, int w, int h, boolean isSelected) {
	}

	@Override
	protected void paintFocusIndicator(Graphics g, int tabPlacement, Rectangle[] rects, int tabIndex, Rectangle iconRect, Rectangle textRect, boolean isSelected) {
		if (tabPane.hasFocus() && isSelected) {
			g.setColor(UIManager.getColor("ScrollBar.thumbShadow"));
			g.drawPolygon(shape);
		}
	}

	protected Color hazAlfa(int fila) {
		int alfa = 0;
		if (fila >= 0) {
			alfa = 50 + (fila > 7 ? 70 : 10 * fila);
		}
		return new Color(0, 0, 0, alfa);
	}
}