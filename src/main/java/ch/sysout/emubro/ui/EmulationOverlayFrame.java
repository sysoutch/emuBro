package ch.sysout.emubro.ui;

import java.awt.AWTException;
import java.awt.BorderLayout;
import java.awt.Component;
import java.awt.Frame;
import java.awt.Image;
import java.awt.Robot;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.awt.event.ComponentAdapter;
import java.awt.event.ComponentEvent;
import java.awt.event.KeyEvent;
import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;
import java.awt.event.MouseMotionAdapter;
import java.awt.event.WindowAdapter;
import java.awt.event.WindowEvent;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Timer;
import java.util.TimerTask;

import javax.swing.ImageIcon;
import javax.swing.JButton;
import javax.swing.JCheckBox;
import javax.swing.JFrame;
import javax.swing.JMenuItem;
import javax.swing.JOptionPane;
import javax.swing.JPanel;
import javax.swing.JPopupMenu;
import javax.swing.JSeparator;

import ch.sysout.emubro.api.model.Game;
import ch.sysout.emubro.api.model.Platform;
import ch.sysout.emubro.util.MessageConstants;
import ch.sysout.ui.ImageUtil;
import ch.sysout.util.Icons;
import ch.sysout.util.Messages;
import ch.sysout.util.ScreenSizeUtil;
import ch.sysout.util.ValidationUtil;

public class EmulationOverlayFrame extends JFrame {
	private static final long serialVersionUID = 1L;
	private JPanel pnl = new JPanel();
	private JButton btnMoveLeft = new JButton();
	private JButton btnMoveRight = new JButton();
	private JButton btnMoveUp = new JButton();
	private JButton btnMoveDown = new JButton();

	public JButton btnMenu = new JButton();

	final JPopupMenu popup = new JPopupMenu();
	private JMenuItem btnSendEsc = new JMenuItem(Messages.get(MessageConstants.SEND_ESC));
	private JMenuItem btnSendAltEnter = new JMenuItem(Messages.get(MessageConstants.SEND_ALT_ENTER));
	private JButton btnShowProcessManager = new JButton(Messages.get(MessageConstants.SHOW_PROCESS_MANAGER));
	private JMenuItem btnShowApplication = new JMenuItem(
			Messages.get(MessageConstants.SHOW_APPLICATION, Messages.get(MessageConstants.APPLICATION_TITLE)));
	private JMenuItem btnStopEmulation = new JMenuItem(Messages.get(MessageConstants.STOP_EMULATION));
	private JMenuItem btnEmulationOverlayPanelSettings = new JMenuItem(MessageConstants.OVERLAY_PANEL_SETTINGS + "...");
	private JMenuItem btnHideEmulationOverlayPanel = new JMenuItem(MessageConstants.HIDE_OVERLAY_PANEL);

	private Game game;
	protected Platform platform;
	private int pid = -1;

	public EmulationOverlayFrame(Game game, Platform platform) {
		super("Emulation Overlay Frame");
		this.game = game;
		this.platform = platform;
		setIconImages(getIcons());
		initComponents();
		createUI();
		hideButton();
	}

	private void initComponents() {
		btnMenu.setFocusPainted(false);
		addComponentsToPopup(popup, btnShowApplication, new JSeparator(), btnStopEmulation, new JSeparator(),
				btnSendEsc, btnSendAltEnter, new JSeparator(), btnEmulationOverlayPanelSettings, new JSeparator(),
				btnHideEmulationOverlayPanel);

		// btnMenu.setComponentPopupMenu(popup);
		btnMenu.addActionListener(new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				// popup.show(btnMenu, -(popup.getWidth() - btnMenu.getWidth()),
				// btnMenu.getHeight());

				// FIXME Exception..
				// Exception in thread "AWT-EventQueue-0"
				// java.awt.IllegalComponentStateException: component must be
				// showing on the screen to determine its location
				// at java.awt.Component.getLocationOnScreen_NoTreeLock(Unknown
				// Source)
				popup.show(btnMenu, btnMenu.getWidth(), 0);

				// fixes a paint bug in javas gtk+ lnf on linux that magically
				// changes icons to related icons
				popup.validate();
				popup.repaint();
			}
		});

		btnSendEsc.addActionListener(new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				EmulationOverlayFrame.this.setVisible(false);
				EmulationOverlayFrame.this.setState(Frame.ICONIFIED);
				TimerTask task = new TimerTask() {

					@Override
					public void run() {
						try {
							Robot robot = new Robot();
							robot.keyPress(KeyEvent.VK_ESCAPE);
							robot.keyRelease(KeyEvent.VK_ESCAPE);
						} catch (AWTException e1) {
						}
					}
				};
				Timer timer = new Timer();
				timer.schedule(task, 100);

				TimerTask task2 = new TimerTask() {

					@Override
					public void run() {
						EmulationOverlayFrame.this.setState(Frame.NORMAL);
						EmulationOverlayFrame.this.setVisible(true);
					}
				};
				Timer timer2 = new Timer();
				timer2.schedule(task2, 1000);
			}
		});

		btnSendAltEnter.addActionListener(new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				EmulationOverlayFrame.this.setVisible(false);
				EmulationOverlayFrame.this.setState(Frame.ICONIFIED);
				TimerTask task = new TimerTask() {

					@Override
					public void run() {
						try {
							Robot robot = new Robot();
							robot.keyPress(KeyEvent.VK_ALT);
							robot.keyPress(KeyEvent.VK_ENTER);
							robot.keyRelease(KeyEvent.VK_ENTER);
							robot.keyRelease(KeyEvent.VK_ALT);
						} catch (AWTException e1) {
						}
					}
				};
				Timer timer = new Timer();
				timer.schedule(task, 100);

				TimerTask task2 = new TimerTask() {

					@Override
					public void run() {
						EmulationOverlayFrame.this.setState(Frame.NORMAL);
						EmulationOverlayFrame.this.setVisible(true);
					}
				};
				Timer timer2 = new Timer();
				timer2.schedule(task2, 1000);
			}
		});

		addWindowListener(new WindowAdapter() {
			@Override
			public void windowActivated(WindowEvent e) {
				super.windowActivated(e);
				showButton();
			}

			@Override
			public void windowDeactivated(WindowEvent e) {
				super.windowDeactivated(e);
				hideButton();
			}
		});

		addComponentListener(new ComponentAdapter() {
			@Override
			public void componentMoved(ComponentEvent e) {
				super.componentMoved(e);
				System.err.println(getX() + " " + getY());
			}
		});
		setAlwaysOnTop(true);
		setUndecorated(true);
		// setOpacity(1.0f);
		// getRootPane().setOpaque(false);
		// btnStopEmulation.setOpaque(false);
		// addMouseListener(new MouseAdapter() {
		// @Override
		// public void mouseEntered(MouseEvent e) {
		// super.mouseEntered(e);
		// showButton();
		// }
		// @Override
		// public void mouseExited(MouseEvent e) {
		// super.mouseExited(e);
		// hideButton();
		// }
		// });
		btnMenu.addMouseListener(new MouseAdapter() {
			@Override
			public void mouseEntered(MouseEvent e) {
				super.mouseEntered(e);
				showButton();
			}

			@Override
			public void mouseExited(MouseEvent e) {
				super.mouseExited(e);
				hideButton();
			}
		});
		btnMenu.addMouseMotionListener(new MouseMotionAdapter() {
			@Override
			public void mouseDragged(MouseEvent e) {
				showButton();
				int targetX = e.getXOnScreen() - btnMenu.getWidth() / 2;
				int targetY = e.getYOnScreen() - btnMenu.getHeight() / 2;
				if (targetX < 0) {
					targetX = 0;
				}
				if (targetY < 0) {
					targetY = 0;
				}
				if (targetX + getWidth() > ScreenSizeUtil.screenSize().width) {
					setLocation(ScreenSizeUtil.screenSize().width - getWidth(), targetY);
				} else if (targetY + getHeight() > ScreenSizeUtil.screenSize().height) {
					setLocation(targetX, ScreenSizeUtil.screenSize().height - getHeight());
				} else {
					setLocation(targetX, targetY);
				}
			}
		});
	}

	private void addComponentsToPopup(JPopupMenu popup2, Component... components) {
		for (Component c : components) {
			popup2.add(c);
		}
	}

	private void createUI() {
		int value = ScreenSizeUtil.adjustValueToResolution(2);
		pnl.setLayout(new BorderLayout(0, value));
		// btnStopEmulation.setBorder(new EmptyBorder(20, 20, 20, 20));
		// pnl.add(btnShowProcessManager, BorderLayout.NORTH);

		pnl.add(btnMenu, BorderLayout.NORTH);

		int size = ScreenSizeUtil.adjustValueToResolution(32);
		int size2 = ScreenSizeUtil.adjustValueToResolution(32);
		int size3 = ScreenSizeUtil.adjustValueToResolution(16);

		// btnShowProcessManager.setIcon(ImageUtil.getImageIconFrom(Icons.get("showProcessManager",
		// size, size)));
		btnMenu.setIcon(ImageUtil.getImageIconFrom(Icons.get("applicationIconOther", size, size)));
		btnMenu.setToolTipText("<html><strong>emulation overlay panel</strong>" + "<br>* Click to show options"
				+ "<br>* Drag to move panel" + "</html>");

		btnSendEsc.setIcon(ImageUtil.getImageIconFrom(Icons.get("sendKeyCommand", size2, size2)));
		btnSendEsc.setToolTipText("<html><strong>Send ESC</strong><br>"
				+ "That function sends 'ESC' to the underlying window.<br><br>"
				+ "This can be useful when you dont have a keyboard right now and you want to<br>"
				+ "either quit the currently running emulator or game, or show/hide the menu bar.<br>"
				+ "Most of the emulators and games listen to that hot key.</html>");
		btnSendAltEnter.setIcon(ImageUtil.getImageIconFrom(Icons.get("sendKeyCommand", size2, size2)));
		btnSendAltEnter.setToolTipText("<html><strong>Send Alt+Enter</strong><br>"
				+ "That function sends 'Alt+Enter' to the underlying window.<br><br>"
				+ "This can be useful when you dont have a keyboard right now and you want to<br>"
				+ "go/leave fullscreen mode in the currently running emulator or game.<br>"
				+ "Most of the emulators and games listen to that hot key.</html>");
		btnStopEmulation.setIcon(ImageUtil.getImageIconFrom(Icons.get("stopProcess", size2, size2)));
		btnStopEmulation.setToolTipText("Stop emulation");
		btnShowApplication.setIcon(ImageUtil.getImageIconFrom(Icons.get("applicationIcon", size2, size2)));
		btnShowApplication.setToolTipText("Show emuBro");
		btnEmulationOverlayPanelSettings.setIcon(ImageUtil.getImageIconFrom(Icons.get("settings", size3, size3)));
		btnHideEmulationOverlayPanel.setIcon(ImageUtil.getImageIconFrom(Icons.get("close3", size3, size3)));
		btnStopEmulation.addActionListener(new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				JCheckBox checkbox = new JCheckBox("Always stop without prompt");
				String title = "Emulation beenden";

				String gameName = game.getName();
				String platformName = platform.getName();
				System.out.println(gameName);
				String message = Messages.get(MessageConstants.CONFIRM_STOP_EMULATION, "" + gameName, "" + platformName);
				Object[] params = { message, " ", checkbox };

				int request = JOptionPane.showConfirmDialog(null, params, title, JOptionPane.YES_NO_OPTION);
				checkbox.isSelected();
				if (request == JOptionPane.YES_OPTION) {
					// setVisible(false);
					// // try {
					// // Robot robot = new Robot();
					// // robot.keyPress(KeyEvent.VK_ALT);
					// // robot.keyPress(KeyEvent.VK_F4);
					// // robot.keyRelease(KeyEvent.VK_F4);
					// // robot.keyRelease(KeyEvent.VK_ALT);
					// // } catch (AWTException e1) {
					// setVisible(true);
					// int action = JOptionPane.showConfirmDialog(null, "Could
					// not end emulation in a safe way.\n"
					// + "Do you want to kill the process? (Any changes you made
					// in the emulator settings may probably be lost)",
					// "", JOptionPane.YES_NO_OPTION);
					// if (action == JOptionPane.YES_OPTION) {
					// } else {
					// setVisible(true);
					// }
					// // }
					while (pid == -1) {
						int request3 = JOptionPane.showConfirmDialog(null, "No process to kill yet.\nIf you just started the game, try it again now.", "",
								JOptionPane.YES_NO_OPTION);
						if (request3 != JOptionPane.YES_OPTION) {
							return;
						}
					}
					if (ValidationUtil.isWindows()) {
						try {
							Runtime.getRuntime().exec("cmd.exe /c taskkill -IM " + pid);
							dispose();
						} catch (IOException e1) {
							// TODO Auto-generated catch block
							e1.printStackTrace();
						}
					} else if (ValidationUtil.isUnix()) {
						try {
							Runtime.getRuntime().exec("kill " + pid);
							dispose();
						} catch (IOException e1) {
							// TODO Auto-generated catch block
							e1.printStackTrace();
						}
					}
				} else {
					hideButton();
				}
			}
		});
		add(pnl);
		pack();
	}

	private void showButton() {
		try {
			setOpacity(1f);
		} catch (UnsupportedOperationException e) {
			System.err.println(e.getMessage());
		}
		pnl.setOpaque(true);
		btnMenu.setOpaque(true);
		btnShowApplication.setOpaque(true);
		btnStopEmulation.setOpaque(true);
		setAlwaysOnTop(false);
		setAlwaysOnTop(true);
	}

	private void hideButton() {
		if (!popup.isVisible()) {
			try {
				setOpacity(0.1f);
			} catch (UnsupportedOperationException e) {
				System.err.println(e.getMessage());
			}
			pnl.setOpaque(false);
			btnMenu.setOpaque(false);
			btnShowApplication.setOpaque(false);
			btnStopEmulation.setOpaque(false);
		}
	}

	public void addShowApplicationListener(ActionListener l) {
		btnShowApplication.addActionListener(l);
	}

	private List<Image> getIcons() {
		List<Image> icons = new ArrayList<>();
		String[] dimensions = { "256x256", "192x192", "128x128", "96x96", "72x72", "64x64", "48x48", "32x32", "24x24",
		"16x16" };
		for (String d : dimensions) {
			try {
				icons.add(new ImageIcon(getClass().getResource("/images/" + d + "/logo.png")).getImage());
			} catch (Exception e) {
				// ignore
			}
		}
		return icons;
	}

	public Integer getPid() {
		return pid;
	}

	public void setPID(Integer pid) {
		this.pid = pid;
	}

	public void setProcess(Process process) {
	}

	public void showToolTipText() {
	}
}
