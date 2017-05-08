package ch.sysout.emubro.ui;

import java.awt.BorderLayout;
import java.awt.Component;
import java.awt.Cursor;
import java.awt.Dimension;
import java.awt.Point;
import java.awt.Rectangle;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.awt.event.FocusAdapter;
import java.awt.event.FocusEvent;
import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;
import java.io.File;
import java.util.List;

import javax.swing.AbstractButton;
import javax.swing.BorderFactory;
import javax.swing.ImageIcon;
import javax.swing.JButton;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.JTabbedPane;
import javax.swing.JToggleButton;
import javax.swing.SwingConstants;
import javax.swing.SwingUtilities;

import com.jgoodies.forms.factories.Paddings;
import com.jgoodies.forms.layout.CellConstraints;
import com.jgoodies.forms.layout.FormLayout;
import com.jgoodies.forms.layout.RowSpec;
import com.jgoodies.forms.util.LayoutStyle;

import ch.sysout.util.Icons;
import ch.sysout.util.Messages;
import ch.sysout.util.ScreenSizeUtil;

public class DetailsPanel extends JPanel {
	private static final long serialVersionUID = 1L;

	JPanel pnlTpInformationBar;
	JTabbedPane tpDetailsPane;
	JButton btnHideDetailsPane;
	JButton btnPinUnpinDetailsPane;
	JButton btnResize;

	BrowseComputerPanel pnlBrowseComputer;
	BrowseCoversPanel pnlBrowseCovers;

	NotificationsPanel pnlInformations;
	NotificationsPanel pnlWarnings;
	NotificationsPanel pnlErrors;

	Component pnlHideDetailsPanePanel;

	private AbstractButton btnInformations = new JToggleButton(
			"<html><a href='' style='text-decoration: none'>"+Messages.get("informations")+"</a>" + "<br>"+Messages.get("messages", 0)+"</html>");
	private AbstractButton btnWarnings = new JToggleButton(
			"<html><a href='' style='text-decoration: none'>"+Messages.get("warnings")+"</a>" + "<br>"+Messages.get("messages", 0)+"</html>");
	private AbstractButton btnErrors = new JToggleButton(
			"<html><a href='' style='text-decoration: none'>"+Messages.get("errors")+"</a>" + "<br>"+Messages.get("messages", 0)+"</html>");

	private FormLayout notificationLayout;

	private JScrollPane spNotifications;
	private JScrollPane spWarnings;
	private JScrollPane spErrors;

	private JScrollPane sp;

	public DetailsPanel() {
		super(new BorderLayout());
		initComponents();
		createUI();
	}

	private void initComponents() {
		btnInformations.setSelected(true);

		btnInformations.setFocusPainted(false);
		btnWarnings.setFocusPainted(false);
		btnErrors.setFocusPainted(false);

		btnWarnings.setContentAreaFilled(false);
		btnErrors.setContentAreaFilled(false);

		btnWarnings.setBorderPainted(false);
		btnErrors.setBorderPainted(false);

		btnInformations.setHorizontalAlignment(SwingConstants.LEFT);
		btnWarnings.setHorizontalAlignment(SwingConstants.LEFT);
		btnErrors.setHorizontalAlignment(SwingConstants.LEFT);

		btnInformations.setIcon(ImageUtil.getImageIconFrom(Icons.get("info", 22, 22)));
		btnWarnings.setIcon(ImageUtil.getImageIconFrom(Icons.get("warning", 22, 22)));
		btnErrors.setIcon(ImageUtil.getImageIconFrom(Icons.get("error", 22, 22)));

		pnlInformations = new NotificationsPanel();
		pnlWarnings = new NotificationsPanel();
		pnlErrors = new NotificationsPanel();

		// pnlNotifications.setBorder(BorderFactory.createLoweredBevelBorder());
		// pnlWarnings.setBorder(BorderFactory.createLoweredBevelBorder());
		// pnlErrors.setBorder(BorderFactory.createLoweredBevelBorder());

		pnlBrowseComputer = new BrowseComputerPanel() {
			private int lastPreferredWidth;

			@Override
			public Dimension getPreferredSize() {
				Dimension size = super.getPreferredSize();
				int preferredWidth = (int) size.getWidth();
				int parentWidth = getParent().getWidth();
				if (preferredWidth > parentWidth) {
					lastPreferredWidth = preferredWidth;
					pnlBrowseComputer.minimizeButtons();
				} else {
					if (lastPreferredWidth > 0 && parentWidth > lastPreferredWidth) {
						pnlBrowseComputer.maximizeButtons();
					}
				}
				return size;
			}
		};
		pnlBrowseCovers = new BrowseCoversPanel();

		btnInformations.addActionListener(new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				spNotifications.setVisible(!spNotifications.isVisible());
				notificationLayout.setRowSpec(3,
						(spNotifications.isVisible()) ? RowSpec.decode("fill:min:grow") : RowSpec.decode("min"));
				if (spNotifications.isVisible()) {
					btnWarnings.setSelected(false);
					btnErrors.setSelected(false);
					spWarnings.setVisible(false);
					spErrors.setVisible(false);
					notificationLayout.setRowSpec(7, RowSpec.decode("min"));
					notificationLayout.setRowSpec(11, RowSpec.decode("min"));
					doHover(btnWarnings, false);
					doHover(btnErrors, false);
					SwingUtilities.invokeLater(new Runnable() {

						@Override
						public void run() {
							int topBorder = (int) LayoutStyle.getCurrent().getTabbedDialogMarginY().getValue();
							sp.getVerticalScrollBar().setValue(sp.getVerticalScrollBar().getMinimum() + topBorder
									+ (btnInformations.getHeight() / 2));
						}
					});
				} else {
					SwingUtilities.invokeLater(new Runnable() {

						@Override
						public void run() {
							LayoutStyle.getCurrent().getTabbedDialogMarginY().getValue();
							sp.getVerticalScrollBar().setValue(sp.getVerticalScrollBar().getMinimum());
						}
					});
				}
				repaint();
			}
		});
		btnInformations.addMouseListener(new MouseAdapter() {
			@Override
			public void mouseEntered(MouseEvent e) {
				doHover(btnInformations, true);
			}

			@Override
			public void mouseExited(MouseEvent e) {
				doHover(btnInformations, false);
			}
		});

		btnInformations.addFocusListener(new FocusAdapter() {
			@Override
			public void focusGained(FocusEvent e) {
				doHover(btnInformations, true);
			}

			@Override
			public void focusLost(FocusEvent e) {
				doHover(btnInformations, false);
			}
		});

		btnWarnings.addActionListener(new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				spWarnings.setVisible(!spWarnings.isVisible());
				notificationLayout.setRowSpec(7,
						(spWarnings.isVisible()) ? RowSpec.decode("fill:min:grow") : RowSpec.decode("min"));
				if (spWarnings.isVisible()) {
					btnInformations.setSelected(false);
					btnErrors.setSelected(false);
					spNotifications.setVisible(false);
					spErrors.setVisible(false);
					notificationLayout.setRowSpec(3, RowSpec.decode("min"));
					notificationLayout.setRowSpec(11, RowSpec.decode("min"));
					doHover(btnInformations, false);
					doHover(btnErrors, false);
					SwingUtilities.invokeLater(new Runnable() {

						@Override
						public void run() {
							int topBorder = (int) LayoutStyle.getCurrent().getTabbedDialogMarginY().getValue();
							sp.getVerticalScrollBar().setValue(sp.getVerticalScrollBar().getMinimum() + topBorder
									+ btnInformations.getHeight() + (btnWarnings.getHeight() / 2));
						}
					});
				} else {
					SwingUtilities.invokeLater(new Runnable() {

						@Override
						public void run() {
							Rectangle bounds = sp.getViewport().getViewRect();
							Dimension size = sp.getViewport().getViewSize();
							int x = (size.width - bounds.width) / 2;
							int y = (size.height - bounds.height) / 2;
							sp.getViewport().setViewPosition(new Point(x, y));
						}
					});
				}
				repaint();
			}
		});

		btnWarnings.addMouseListener(new MouseAdapter() {
			@Override
			public void mouseEntered(MouseEvent e) {
				doHover(btnWarnings, true);
			}

			@Override
			public void mouseExited(MouseEvent e) {
				doHover(btnWarnings, false);
			}
		});

		btnWarnings.addFocusListener(new FocusAdapter() {
			@Override
			public void focusGained(FocusEvent e) {
				doHover(btnWarnings, true);
			}

			@Override
			public void focusLost(FocusEvent e) {
				doHover(btnWarnings, false);
			}
		});

		btnErrors.addActionListener(new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				spErrors.setVisible(!spErrors.isVisible());
				notificationLayout.setRowSpec(11,
						(spErrors.isVisible()) ? RowSpec.decode("fill:min:grow") : RowSpec.decode("min"));
				if (spErrors.isVisible()) {
					btnInformations.setSelected(false);
					btnWarnings.setSelected(false);
					spNotifications.setVisible(false);
					spWarnings.setVisible(false);
					notificationLayout.setRowSpec(3, RowSpec.decode("min"));
					notificationLayout.setRowSpec(7, RowSpec.decode("min"));
					doHover(btnInformations, false);
					doHover(btnWarnings, false);
					SwingUtilities.invokeLater(new Runnable() {

						@Override
						public void run() {
							int topBorder = (int) LayoutStyle.getCurrent().getTabbedDialogMarginY().getValue();
							sp.getVerticalScrollBar()
							.setValue(sp.getVerticalScrollBar().getMinimum() + topBorder
									+ btnInformations.getHeight() + btnWarnings.getHeight()
									+ (btnErrors.getHeight() / 2));
						}
					});
				} else {
					SwingUtilities.invokeLater(new Runnable() {

						@Override
						public void run() {
							LayoutStyle.getCurrent().getTabbedDialogMarginY().getValue();
							sp.getVerticalScrollBar()
							.setValue(sp.getVerticalScrollBar().getMaximum() - (btnErrors.getHeight()));
						}
					});
				}
				repaint();
			}
		});

		btnErrors.addMouseListener(new MouseAdapter() {
			@Override
			public void mouseEntered(MouseEvent e) {
				doHover(btnErrors, true);
			}

			@Override
			public void mouseExited(MouseEvent e) {
				doHover(btnErrors, false);
			}
		});

		btnErrors.addFocusListener(new FocusAdapter() {
			@Override
			public void focusGained(FocusEvent e) {
				doHover(btnErrors, true);
			}

			@Override
			public void focusLost(FocusEvent e) {
				doHover(btnErrors, false);
			}
		});
	}

	private void doHover(AbstractButton btn, boolean b) {
		Cursor cursor = (b) ? Cursor.getPredefinedCursor(Cursor.HAND_CURSOR) : null;
		btn.setCursor(cursor);
		if (b || !btn.isSelected()) {
			btn.setContentAreaFilled(b);
			btn.setBorderPainted(b);
		}
		String style = (b) ? "underline" : "none";
		String type = "NotificationType";
		int elementCount = 0;
		if (btn == btnInformations) {
			type = Messages.get("informations");
			elementCount = pnlInformations.getElementCount();
		} else if (btn == btnWarnings) {
			type = Messages.get("warnings");
			elementCount = pnlWarnings.getElementCount();
		} else if (btn == btnErrors) {
			type = Messages.get("errors");
			elementCount = pnlErrors.getElementCount();
		}
		String messageCount = (elementCount == 1) ? Messages.get("messages1") : Messages.get("messages", elementCount);
		btn.setText("<html><a href='' style='text-decoration: " + style + "'>" + type + "</a>" + "<br>"
				+ messageCount +"</html>");
	}

	private void createUI() {
		pnlTpInformationBar = new JPanel(new BorderLayout());
		pnlTpInformationBar.setBorder(Paddings.TABBED_DIALOG);

		// Insets oldInsets =
		// UIManager.getInsets("TabbedPane.contentBorderInsets");
		// // bottom insets is 1 because the tabs are bottom aligned
		// UIManager.put("TabbedPane.contentBorderInsets", new Insets(0, 0, 100,
		// 0));
		tpDetailsPane = new JTabbedPane(SwingConstants.BOTTOM);
		tpDetailsPane.setTabLayoutPolicy(JTabbedPane.SCROLL_TAB_LAYOUT);
		// UIManager.put("TabbedPane.contentBorderInsets", oldInsets);

		sp = new JScrollPane(createNotificationPanel());
		sp.setBorder(BorderFactory.createEmptyBorder());
		sp.getVerticalScrollBar().setUnitIncrement(16);

		JScrollPane sp2 = new JScrollPane(pnlBrowseComputer);
		sp2.setBorder(BorderFactory.createEmptyBorder());
		sp2.getVerticalScrollBar().setUnitIncrement(16);
		tpDetailsPane.addTab(Messages.get("notifications"), sp);
		tpDetailsPane.addTab(Messages.get("browseComputer"), sp2);
		FindCoversPanel pnlFindCovers = new FindCoversPanel();
		pnlFindCovers.setBorder(Paddings.TABBED_DIALOG);
		JScrollPane spFindCovers = new JScrollPane(pnlFindCovers);
		spFindCovers.setBorder(BorderFactory.createEmptyBorder());
		spFindCovers.getVerticalScrollBar().setUnitIncrement(16);

		ImageUtil.getImageIconFrom(Icons.get("fromComputer", 16, 16));
		ImageUtil.getImageIconFrom(Icons.get("fromWeb", 16, 16));

		// final String PRE_HTML = "<html><p style=\"text-align: left; width:
		// 128px\">";
		// final String POST_HTML = "</p></html>";
		// JLabel lbl = new JLabel(PRE_HTML + Messages.get("fromComputer") +
		// POST_HTML);
		tpDetailsPane.addTab(Messages.get("browseCovers"), pnlBrowseCovers);

		pnlTpInformationBar.add(tpDetailsPane);
		int size = ScreenSizeUtil.is3k() ? 24 : 16;
		ImageIcon iconResize = ImageUtil.getImageIconFrom(Icons.get("resize", size, size));
		btnResize = new JButton(iconResize);
		btnResize.setContentAreaFilled(false);
		btnResize.setBorderPainted(false);
		btnResize.setFocusable(false);
		btnResize.setVisible(false);
		JPanel pnl = new JPanel(new BorderLayout());
		JPanel pnl3 = new JPanel(new BorderLayout());
		pnl3.add(btnResize, BorderLayout.EAST);
		pnl.add(pnl3, BorderLayout.SOUTH);
		pnl.add(pnlHideDetailsPanePanel = createHideDetailsPanePanel(), BorderLayout.CENTER);
		add(pnl, BorderLayout.EAST);

		pnlBrowseComputer.setBorder(Paddings.TABBED_DIALOG);

		add(pnlTpInformationBar);
	}

	private Component createHideDetailsPanePanel() {
		JPanel pnl = new JPanel(new BorderLayout());
		btnHideDetailsPane = new JButton();
		btnHideDetailsPane.setBorderPainted(false);
		btnHideDetailsPane.setContentAreaFilled(false);
		btnHideDetailsPane.setIcon(ImageUtil.getImageIconFrom(Icons.get("hideDetailsPane", 24, 24)));
		btnHideDetailsPane.setActionCommand(GameViewConstants.HIDE_DETAILS_PANE);
		btnHideDetailsPane.setToolTipText("Informationsbereich ausblenden (Alt+Shift+I)");
		btnHideDetailsPane.addMouseListener(new MouseAdapter() {

			@Override
			public void mouseEntered(MouseEvent e) {
				btnHideDetailsPane.setBorderPainted(true);
				btnHideDetailsPane.setContentAreaFilled(true);
			}

			@Override
			public void mouseExited(MouseEvent e) {
				btnHideDetailsPane.setBorderPainted(false);
				btnHideDetailsPane.setContentAreaFilled(false);
			}
		});
		btnPinUnpinDetailsPane = new JButton();
		btnPinUnpinDetailsPane.setBorderPainted(false);
		btnPinUnpinDetailsPane.setContentAreaFilled(false);
		btnPinUnpinDetailsPane.setIcon(ImageUtil.getImageIconFrom(Icons.get("unpinDetailsPane", 24, 24)));
		btnPinUnpinDetailsPane.setActionCommand(GameViewConstants.UNPIN_DETAILS_PANE);
		btnPinUnpinDetailsPane.setToolTipText("Informationsbereich in eigenem Fenster öffnen");
		btnPinUnpinDetailsPane.addMouseListener(new MouseAdapter() {

			@Override
			public void mouseEntered(MouseEvent e) {
				btnPinUnpinDetailsPane.setBorderPainted(true);
				btnPinUnpinDetailsPane.setContentAreaFilled(true);
			}

			@Override
			public void mouseExited(MouseEvent e) {
				btnPinUnpinDetailsPane.setBorderPainted(false);
				btnPinUnpinDetailsPane.setContentAreaFilled(false);
			}
		});

		JPanel pnl2 = new JPanel(new BorderLayout());
		pnl2.add(btnPinUnpinDetailsPane, BorderLayout.NORTH);
		pnl2.add(btnHideDetailsPane, BorderLayout.SOUTH);
		pnl.add(pnl2, BorderLayout.NORTH);
		return pnl;
	}

	public void addShowGameDetailsListener(ActionListener l) {
		btnHideDetailsPane.addActionListener(l);
	}

	private JPanel createNotificationPanel() {
		JPanel pnl = new JPanel();
		pnl.setBorder(Paddings.TABBED_DIALOG);
		notificationLayout = new FormLayout("min:grow",
				"fill:pref, min, fill:min:grow, min," + "fill:pref, min, fill:min, min," + "fill:pref, min, fill:min");
		pnl.setLayout(notificationLayout);
		CellConstraints cc2 = new CellConstraints();
		pnl.add(btnInformations, cc2.xy(1, 1));
		spNotifications = new JScrollPane(pnlInformations);
		spWarnings = new JScrollPane(pnlWarnings);
		spErrors = new JScrollPane(pnlErrors);
		spNotifications.getVerticalScrollBar().setUnitIncrement(16);
		spWarnings.getVerticalScrollBar().setUnitIncrement(16);
		spErrors.getVerticalScrollBar().setUnitIncrement(16);
		spNotifications.setMinimumSize(new Dimension(0, 70));
		spWarnings.setMinimumSize(new Dimension(0, 72));
		spErrors.setMinimumSize(new Dimension(0, 75));
		spNotifications.setBorder(BorderFactory.createEmptyBorder());
		spWarnings.setBorder(BorderFactory.createEmptyBorder());
		spErrors.setBorder(BorderFactory.createEmptyBorder());

		pnl.add(spNotifications, cc2.xy(1, 3));
		pnl.add(btnWarnings, cc2.xy(1, 5));
		pnl.add(spWarnings, cc2.xy(1, 7));
		pnl.add(btnErrors, cc2.xy(1, 9));
		pnl.add(spErrors, cc2.xy(1, 11));

		spWarnings.setVisible(false);
		spErrors.setVisible(false);
		return pnl;
	}

	public boolean isNotificationsPanelVisible() {
		return pnlInformations.isVisible();
	}

	public void addNotificationElement(NotificationElement element) {
		int notificationType = element.getNotificationType();
		switch (notificationType) {
		case NotificationElement.INFORMATION:
			pnlInformations.addNotificationElement(element);
			updateInformationElementsCount();
			break;
		case NotificationElement.INFORMATION_MANDATORY:
			pnlInformations.addNotificationElement(element);
			updateInformationElementsCount();
			break;
		case NotificationElement.WARNING:
			pnlWarnings.addNotificationElement(element);
			updateWarningElementsCount();
			break;
		case NotificationElement.ERROR:
			pnlErrors.addNotificationElement(element);
			updateErrorElementsCount();
			break;
		case NotificationElement.SUCCESS:
			pnlErrors.addNotificationElement(element);
			updateErrorElementsCount();
			break;
		}
	}

	private void updateInformationElementsCount() {
		int elementCount = pnlInformations.getElementCount();
		String messageCount = (elementCount == 1) ? Messages.get("messages1")
				: Messages.get("messages", elementCount);
		btnInformations.setText("<html><a href='' style='text-decoration: none'>"+Messages.get("informations")+"</a>"
				+ "<br>"+messageCount+"</html>");
	}

	private void updateWarningElementsCount() {
		int elementCount = pnlWarnings.getElementCount();
		String messageCount = (elementCount == 1) ? Messages.get("messages1")
				: Messages.get("messages", elementCount);
		btnWarnings.setText("<html><a href='' style='text-decoration: none'>"+Messages.get("warnings")+"</a>"
				+ "<br>"+Messages.get("messages", messageCount)+"</html>");
	}

	private void updateErrorElementsCount() {
		int elementCount = pnlErrors.getElementCount();
		String messageCount = (elementCount == 1) ? Messages.get("messages1")
				: Messages.get("messages", elementCount);
		btnErrors.setText("<html><a href='' style='text-decoration: none'>"+Messages.get("errors")+"</a>"
				+ "<br>"+Messages.get("messages", messageCount)+"</html>");
	}

	public int getNotificationsPanelWidth() {
		return pnlInformations.getWidth();
	}

	public int getNotificationsPanelHeight() {
		return pnlInformations.getHeight();
	}

	public void setInformationBarPanelVisible(boolean visible) {
		setVisible(visible);
	}

	public void setNotificationsSize(int notificationsPanelHeight, int i) {
		setSize(notificationsPanelHeight, i);
	}

	public void addUnpinDetailsPaneListener(ActionListener l) {
		btnPinUnpinDetailsPane.addActionListener(l);
	}

	public void addPinDetailsPaneListener(ActionListener l) {
		btnPinUnpinDetailsPane.addActionListener(l);
	}

	public void languageChanged() {
		pnlBrowseComputer.languageChanged();
		pnlBrowseCovers.languageChanged();
		tpDetailsPane.setTitleAt(0, Messages.get("notifications"));
		tpDetailsPane.setTitleAt(1, Messages.get("browseComputer"));
		tpDetailsPane.setTitleAt(2, Messages.get("browseCovers"));
		//		String style = (b) ? "underline" : "none";
		String style = "none";
		int elementCountInformations = pnlInformations.getElementCount();
		int elementCountWarnings = pnlWarnings.getElementCount();
		int elementCountErrors = pnlErrors.getElementCount();
		String messageCountInformations = (elementCountInformations == 1) ? Messages.get("messages1")
				: Messages.get("messages", elementCountInformations);
		String messageCountWarnings = (elementCountWarnings == 1) ? Messages.get("messages1")
				: Messages.get("messages", elementCountWarnings);
		String messageCountErrors = (elementCountErrors == 1) ? Messages.get("messages1")
				: Messages.get("messages", elementCountErrors);

		btnInformations.setText("<html><a href='' style='text-decoration: " + style + "'>" + Messages.get("informations") + "</a>" + "<br>"
				+ messageCountInformations+"</html>");
		btnWarnings.setText("<html><a href='' style='text-decoration: " + style + "'>" + Messages.get("warnings") + "</a>" + "<br>"
				+ messageCountWarnings +"</html>");
		btnErrors.setText("<html><a href='' style='text-decoration: " + style + "'>" + Messages.get("errors") + "</a>" + "<br>"
				+ messageCountErrors +"</html>");

		pnlInformations.languageChanged();
		pnlWarnings.languageChanged();
		pnlErrors.languageChanged();
	}

	public List<File> getSelectedDirectoriesToBrowse() {
		return pnlBrowseComputer.getSelectedDirectoriesToBrowse();
	}

	public void rememberZipFile(String file) {
		pnlBrowseComputer.rememberZipFile(file);
	}

	public void rememberRarFile(String file) {
		pnlBrowseComputer.rememberRarFile(file);
	}

	public void rememberIsoFile(String file) {
		pnlBrowseComputer.rememberIsoFile(file);
	}

	public void setActiveTab(int index) {
		tpDetailsPane.setSelectedIndex(index);
	}
}
