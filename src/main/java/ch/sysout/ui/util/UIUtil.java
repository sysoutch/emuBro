package ch.sysout.ui.util;

import java.awt.AWTException;
import java.awt.Color;
import java.awt.Component;
import java.awt.Desktop;
import java.awt.Image;
import java.awt.SystemTray;
import java.awt.Toolkit;
import java.awt.TrayIcon;
import java.awt.TrayIcon.MessageType;
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
import java.awt.event.WindowEvent;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.net.URI;
import java.net.URISyntaxException;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

import javax.swing.AbstractAction;
import javax.swing.AbstractButton;
import javax.swing.Action;
import javax.swing.ActionMap;
import javax.swing.ImageIcon;
import javax.swing.InputMap;
import javax.swing.JComponent;
import javax.swing.JDialog;
import javax.swing.JFrame;
import javax.swing.JOptionPane;
import javax.swing.JProgressBar;
import javax.swing.JRootPane;
import javax.swing.KeyStroke;
import javax.swing.UIManager;
import javax.swing.WindowConstants;
import javax.swing.text.JTextComponent;

import ch.sysout.emubro.ui.AboutDialog;
import ch.sysout.util.Icons;

public class UIUtil {
	private static MouseAdapter mouseAdapter;
	private static MouseAdapter mouseAdapterKeepHoverWhenSelected;
	private static FocusAdapter focusAdapter;
	private static FocusAdapter focusAdapterKeepHoverWhenSelected;
	private static DateTimeFormatter dateFormat;

	private static Color colorBlack = Color.BLACK;
	private static Color colorWhite = Color.WHITE;
	private static Color colorButtonForeground = UIManager.getColor("Button.foreground");
	private static Color colorButtonForegroundHover = UIManager.getColor("Button.select");

	public static void validateAndRepaint(JComponent pnlCovers) {
		pnlCovers.validate();
		pnlCovers.repaint();
	}

	public static void revalidateAndRepaint(Component pnlCovers) {
		pnlCovers.revalidate();
		pnlCovers.repaint();
	}

	public static FocusListener getFocusAdapter() {
		if (focusAdapter == null) {
			focusAdapter = new FocusAdapter() {
				@Override
				public void focusGained(FocusEvent e) {
					super.focusGained(e);
					AbstractButton source = (AbstractButton) e.getSource();
					//					UIUtil.doHover(true, source);
				}

				@Override
				public void focusLost(FocusEvent e) {
					super.focusLost(e);
					AbstractButton source = (AbstractButton) e.getSource();
					//					UIUtil.doHover(false, source);
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
					//					UIUtil.doHover(true, source);
				}

				@Override
				public void focusLost(FocusEvent e) {
					super.focusLost(e);
					AbstractButton source = (AbstractButton) e.getSource();
					//					UIUtil.doHover(source.isSelected(), source);
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

	public static void displayTray(String message, String title) throws AWTException {
		displayTray(message, title, MessageType.INFO);
	}

	public static void displayTray(String message, String title, MessageType messageType) throws AWTException {
		//Obtain only one instance of the SystemTray object
		SystemTray tray = SystemTray.getSystemTray();

		//If the icon is a file
		Image image = Toolkit.getDefaultToolkit().createImage("icon.png");
		//Alternative (if the icon is on the classpath):
		//Image image = Toolkit.getDefaultToolkit().createImage(getClass().getResource("icon.png"));

		TrayIcon trayIcon = new TrayIcon(image, "Tray Demo");
		//Let the system resize the image if needed
		trayIcon.setImageAutoSize(true);
		//Set tooltip text for the tray icon
		trayIcon.setToolTip("System tray icon demo");
		tray.add(trayIcon);

		trayIcon.displayMessage(message, title, messageType);
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

	private static void installEscapeCloseOperation(JRootPane root, final Window frame) {
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

	public static void openWebsite(String url, Component parent) {
		try {
			Desktop.getDesktop().browse(new URI(url));
		} catch (IOException e1) {
			UIUtil.showWarningMessage(parent, "Maybe there is a conflict with your default web browser and you have to set it again."
					+ "\n\nThe default program page in control panel will be opened now..", "default web browser");
			try {
				Runtime.getRuntime().exec("control.exe /name Microsoft.DefaultPrograms /page pageDefaultProgram");
			} catch (IOException e2) {
				UIUtil.showErrorMessage(parent, "The default program page couldn't be opened.", "oops");
			}
		} catch (URISyntaxException e1) {
			UIUtil.showErrorMessage(parent, "The url couldn't be opened.", "oops");
		}
	}

	public static void setForegroundDependOnBackground(BufferedImage bg, int x, int y, Component... components) {
		setForegroundDependOnBackground(new Color(bg.getRGB(x, y)), components);
	}

	public static void setForegroundDependOnBackground(Color bg, Component... components) {
		if (bg != null) {
			int r = bg.getRed();
			int g = bg.getGreen();
			int b = bg.getBlue();
			//				if ((red + green + blue) <= 384) {
			for (Component c : components) {
				if (((r * 0.299) + (g * 0.587) + (b * 0.114)) > 186) {
					c.setForeground(colorBlack);
				} else {
					c.setForeground(colorWhite);
				}
			}
		}
	}

	public static Color getForegroundDependOnBackground(Color color) {
		return getForegroundDependOnBackground(color, false);
	}

	public static Color getForegroundDependOnBackground(Color color, boolean coloredForeground) {
		int r = color.getRed();
		int g = color.getGreen();
		int b = color.getBlue();
		if (coloredForeground) {
			float[] hsb = Color.RGBtoHSB(r, g, b, null);
			float hueFloat = hsb[0];
			float hue = hueFloat * 360;
			if (hue >= 60f && hue < 180f) {
				System.out.println("complement of green");
				return getComplementaryColor(Color.GREEN);
			} else if (hue >= 180f && hue < 300f) {
				System.out.println("complement of blue");
				return getComplementaryColor(Color.BLUE);
			} else {
				System.out.println("complement of red");
				return getComplementaryColor(Color.RED);
			}
		} else {
			if (((r * 0.299) + (g * 0.587) + (b * 0.114)) > 186) {
				return colorBlack;
			} else {
				return colorWhite;
			}
		}
	}
	public static Color getComplementaryColor(Color color) {
		int maxValue = 255;
		int newRed = maxValue - color.getRed();
		int newGreen = maxValue - color.getGreen();
		int newBlue = maxValue - color.getBlue();
		return new Color(newRed, newGreen, newBlue);
	}

	public static JDialog createProgressDialog(String string) {
		JDialog dlg = new JDialog();
		dlg.setDefaultCloseOperation(WindowConstants.DISPOSE_ON_CLOSE);
		JProgressBar prg;
		dlg.add(prg = new JProgressBar());
		prg.setString(string);
		prg.setStringPainted(true);
		prg.setIndeterminate(true);
		dlg.pack();
		return dlg;
	}

	public static String showInputMessage(Component parentComponent, Object message, String title) {
		return JOptionPane.showInputDialog(parentComponent, message, title);
	}
	
	public static List<Image> getIcons() {
		List<Image> icons = new ArrayList<>();
		int[] dimensions = { 48, 32, 24, 16 };
		for (int size : dimensions) {
			try {
				ImageIcon img = ImageUtil.getFlatSVGIconFrom(Icons.get("applicationIcon"), size, UIManager.getColor("Panel.background").brighter().brighter().brighter());
				icons.add(img.getImage());
			} catch (Exception e) {
				// ignore
			}
		}
		return icons;
	}
}
