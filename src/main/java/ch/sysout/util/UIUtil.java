package ch.sysout.util;

import java.awt.Component;
import java.awt.event.FocusAdapter;
import java.awt.event.FocusEvent;
import java.awt.event.FocusListener;
import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;
import java.awt.event.MouseListener;

import javax.swing.AbstractButton;
import javax.swing.JComponent;
import javax.swing.text.JTextComponent;

public class UIUtil {
	private static MouseAdapter mouseAdapter;
	private static MouseAdapter mouseAdapterKeepHoverWhenSelected;
	private static FocusAdapter focusAdapter;
	private static FocusAdapter focusAdapterKeepHoverWhenSelected;

	public static void doHover(boolean b, AbstractButton... btns) {
		for (AbstractButton btn : btns) {
			btn.setContentAreaFilled(b);
			btn.setBorderPainted(b);
		}
	}

	public static void validateAndRepaint(JComponent pnlCovers) {
		pnlCovers.validate();
		pnlCovers.repaint();
	}

	public static void revalidateAndRepaint(Component pnlCovers) {
		pnlCovers.revalidate();
		pnlCovers.repaint();
	}

	public static MouseListener getMouseAdapter() {
		if (mouseAdapter == null) {
			mouseAdapter = new MouseAdapter() {
				@Override
				public void mouseEntered(MouseEvent e) {
					super.mouseEntered(e);
					AbstractButton source = (AbstractButton) e.getSource();
					UIUtil.doHover(true, source);
				}

				@Override
				public void mouseExited(MouseEvent e) {
					super.mouseExited(e);
					AbstractButton source = (AbstractButton) e.getSource();
					UIUtil.doHover(false, source);
				}
			};
		}
		return mouseAdapter;
	}

	public static MouseListener getMouseAdapterKeepHoverWhenSelected() {
		if (mouseAdapterKeepHoverWhenSelected == null) {
			mouseAdapterKeepHoverWhenSelected = new MouseAdapter() {
				@Override
				public void mouseEntered(MouseEvent e) {
					super.mouseEntered(e);
					AbstractButton source = (AbstractButton) e.getSource();
					UIUtil.doHover(true, source);
				}

				@Override
				public void mouseExited(MouseEvent e) {
					super.mouseExited(e);
					AbstractButton source = (AbstractButton) e.getSource();
					UIUtil.doHover(source.isSelected(), source);
				}
			};
		}
		return mouseAdapterKeepHoverWhenSelected;
	}

	public static FocusListener getFocusAdapter() {
		if (focusAdapter == null) {
			focusAdapter = new FocusAdapter() {
				@Override
				public void focusGained(FocusEvent e) {
					super.focusGained(e);
					AbstractButton source = (AbstractButton) e.getSource();
					UIUtil.doHover(true, source);
				}

				@Override
				public void focusLost(FocusEvent e) {
					super.focusLost(e);
					AbstractButton source = (AbstractButton) e.getSource();
					UIUtil.doHover(false, source);
				}
			};
		}
		return focusAdapter;
	}

	public static FocusListener getFocusAdapterKeepHoverWhenSelected() {
		if (focusAdapterKeepHoverWhenSelected == null) {
			focusAdapterKeepHoverWhenSelected = new FocusAdapter() {
				@Override
				public void focusGained(FocusEvent e) {
					super.focusGained(e);
					AbstractButton source = (AbstractButton) e.getSource();
					UIUtil.doHover(true, source);
				}

				@Override
				public void focusLost(FocusEvent e) {
					super.focusLost(e);
					AbstractButton source = (AbstractButton) e.getSource();
					UIUtil.doHover(source.isSelected(), source);
				}
			};
		}
		return focusAdapterKeepHoverWhenSelected;
	}

	public static String getLongestLabel(String... strings) {
		String longestText = "";
		for (String s : strings) {
			int textLength = s.length();
			if (textLength > longestText.length()) {
				String buttonText = s;
				longestText = buttonText;
			}
		}
		return longestText;
	}

	public static void scrollToTop(JTextComponent edit1) {
		edit1.setCaretPosition(0);
	}
}
