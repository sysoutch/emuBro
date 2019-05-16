package ch.sysout.util;

import java.awt.Component;
import java.awt.Desktop;
import java.awt.Toolkit;
import java.awt.Window;
import java.awt.datatransfer.Clipboard;
import java.awt.datatransfer.DataFlavor;
import java.awt.datatransfer.StringSelection;
import java.awt.datatransfer.UnsupportedFlavorException;
import java.awt.event.ActionEvent;
import java.awt.event.FocusAdapter;
import java.awt.event.FocusEvent;
import java.awt.event.FocusListener;
import java.awt.event.KeyEvent;
import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;
import java.awt.event.MouseListener;
import java.awt.event.WindowEvent;
import java.io.IOException;
import java.net.URI;
import java.net.URISyntaxException;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;

import javax.swing.AbstractAction;
import javax.swing.AbstractButton;
import javax.swing.Action;
import javax.swing.ActionMap;
import javax.swing.InputMap;
import javax.swing.JComponent;
import javax.swing.JDialog;
import javax.swing.JFrame;
import javax.swing.JOptionPane;
import javax.swing.JRootPane;
import javax.swing.KeyStroke;
import javax.swing.text.JTextComponent;

import ch.sysout.emubro.ui.AboutDialog;

public class UIUtil {
	private static MouseAdapter mouseAdapter;
	private static MouseAdapter mouseAdapterKeepHoverWhenSelected;
	private static FocusAdapter focusAdapter;
	private static FocusAdapter focusAdapterKeepHoverWhenSelected;
	private static DateTimeFormatter dateFormat;

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

	public static void copyTextToClipboard(String string) {
		StringSelection stringSelection = new StringSelection(string);
		Clipboard clpbrd = Toolkit.getDefaultToolkit().getSystemClipboard();
		clpbrd.setContents(stringSelection, null);
	}

	public static String getClipboardText() {
		Clipboard clpbrd = Toolkit.getDefaultToolkit().getSystemClipboard();
		String data;
		try {
			data = (String) clpbrd.getData(DataFlavor.stringFlavor);
		} catch (UnsupportedFlavorException | IOException e) {
			return null;
		}
		return data;
	}

	public static String format(ZonedDateTime dateTime) {
		if (dateFormat == null) {
			dateFormat = DateTimeFormatter.ofPattern("MMMM d, yyyy hh:mm a");
		}
		return dateTime.format(dateFormat);
	}

	public static void showInformationMessage(Component component, String message, String title) {
		JOptionPane.showMessageDialog(component, message, title, JOptionPane.INFORMATION_MESSAGE);
	}

	public static void showQuestionMessage(AboutDialog component, String message, String title) {
		JOptionPane.showConfirmDialog(component, message, title, JOptionPane.YES_NO_CANCEL_OPTION);
	}

	public static void showWarningMessage(Component component, String message, String title) {
		JOptionPane.showMessageDialog(component, message, title, JOptionPane.WARNING_MESSAGE);
	}

	public static void showErrorMessage(Component component, String message, String title) {
		JOptionPane.showMessageDialog(component, message, title, JOptionPane.ERROR_MESSAGE);
	}

	private static final KeyStroke escapeStroke =
			KeyStroke.getKeyStroke(KeyEvent.VK_ESCAPE, 0);
	public static final String dispatchWindowClosingActionMapKey =
			"com.spodding.tackline.dispatch:WINDOW_CLOSING";

	public static void installEscapeCloseOperation(JDialog dialog) {
		JRootPane root = dialog.getRootPane();
		installEscapeCloseOperation(root, dialog);
	}

	public static void installEscapeCloseOperation(JFrame frame) {
		JRootPane root = frame.getRootPane();
		installEscapeCloseOperation(root, frame);
	}

	private static void installEscapeCloseOperation(JRootPane root, Window frame) {
		Action dispatchClosing = new AbstractAction() {
			private static final long serialVersionUID = 1L;

			@Override
			public void actionPerformed(ActionEvent event) {
				frame.dispatchEvent(new WindowEvent(frame, WindowEvent.WINDOW_CLOSING));
			}
		};
		InputMap inputMap = root.getInputMap(JComponent.WHEN_IN_FOCUSED_WINDOW);
		ActionMap actionMap = root.getActionMap();
		inputMap.put(escapeStroke, dispatchWindowClosingActionMapKey);
		actionMap.put(dispatchWindowClosingActionMapKey, dispatchClosing);
	}

	public static void openWebsite(String url) throws IOException, URISyntaxException {
		Desktop.getDesktop().browse(new URI(url));
	}
}
