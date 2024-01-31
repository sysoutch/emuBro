package ch.sysout.emubro.ui;

import java.awt.BorderLayout;
import java.awt.Color;
import java.awt.Component;
import java.awt.Cursor;
import java.awt.Dimension;
import java.awt.GradientPaint;
import java.awt.Graphics;
import java.awt.Graphics2D;
import java.awt.Image;
import java.awt.RenderingHints;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;
import java.awt.event.MouseMotionListener;
import java.awt.image.BufferedImage;
import java.io.File;
import java.util.List;

import javax.swing.AbstractButton;
import javax.swing.BorderFactory;
import javax.swing.Box;
import javax.swing.ButtonGroup;
import javax.swing.JButton;
import javax.swing.JLabel;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.JTabbedPane;
import javax.swing.JToolBar;
import javax.swing.SwingConstants;

import com.jgoodies.forms.factories.Paddings;
import com.jgoodies.forms.layout.CellConstraints;
import com.jgoodies.forms.layout.FormLayout;

import ch.sysout.emubro.api.event.GameSelectionEvent;
import ch.sysout.emubro.controller.NotificationElementListener;
import ch.sysout.emubro.util.ColorConstants;
import ch.sysout.emubro.util.MessageConstants;
import ch.sysout.ui.util.ImageUtil;
import ch.sysout.util.Icons;
import ch.sysout.util.Messages;
import ch.sysout.util.ScreenSizeUtil;

public class DetailsPanel extends JPanel implements NotificationElementListener {
	private static final long serialVersionUID = 1L;

	JPanel pnlTpInformationBar;
	JTabbedPane tpDetailsPane;
	JButton btnHideDetailsPane;
	JButton btnPinUnpinDetailsPane;

	BrowseComputerPanel pnlBrowseComputer;
	JPanel pnlBrowseTags;
	BrowseCoversPanel pnlBrowseCovers;

	NotificationsPanel pnlInformations;
	NotificationsPanel pnlWarnings;
	NotificationsPanel pnlErrors;

	Component pnlHideDetailsPanePanel;

	private AbstractButton btnInformations = new JCustomToggleButton("");
	private AbstractButton btnWarnings = new JCustomToggleButton("");
	private AbstractButton btnErrors = new JCustomToggleButton("");

	private FormLayout notificationLayout;

	private JScrollPane spNotifications;
	private JScrollPane spWarnings;
	private JScrollPane spErrors;

	JPanel pnlNotification;

	private CellConstraints cc2;

	AbstractButton btnResizeDetailsPane = new JCustomButtonNew();

	public DetailsPanel() {
		super(new BorderLayout());
		initComponents();
		setIcons();
		createUI();
	}

	private void initComponents() {
		btnResizeDetailsPane.setFocusable(false);
		btnResizeDetailsPane.addMouseListener(new MouseAdapter() {
			@Override
			public void mouseEntered(MouseEvent e) {
				super.mouseEntered(e);
				btnResizeDetailsPane.setCursor(Cursor.getPredefinedCursor(Cursor.N_RESIZE_CURSOR | Cursor.S_RESIZE_CURSOR));
			}

			@Override
			public void mouseExited(MouseEvent e) {
				super.mouseExited(e);
				btnResizeDetailsPane.setCursor(null);
			}
		});

		ButtonGroup grp = new ButtonGroup();
		grp.add(btnInformations);
		grp.add(btnWarnings);
		grp.add(btnErrors);
		btnInformations.setSelected(true);

		btnInformations.setFocusPainted(false);
		btnWarnings.setFocusPainted(false);
		btnErrors.setFocusPainted(false);

		btnInformations.setHorizontalAlignment(SwingConstants.LEFT);
		btnWarnings.setHorizontalAlignment(SwingConstants.LEFT);
		btnErrors.setHorizontalAlignment(SwingConstants.LEFT);

		int size = 22;
		btnInformations.setIcon(ImageUtil.getFlatSVGIconFrom(Icons.get("info"), size, new Color(137, 207, 240)));
		btnWarnings.setIcon(ImageUtil.getFlatSVGIconFrom(Icons.get("warning"), size, new Color(240, 167, 50)));
		btnErrors.setIcon(ImageUtil.getFlatSVGIconFrom(Icons.get("error"), size, new Color(199, 62, 29)));

		pnlInformations = new NotificationsPanel();
		pnlWarnings = new NotificationsPanel();
		pnlErrors = new NotificationsPanel();

		// pnlNotifications.setBorder(BorderFactory.createLoweredBevelBorder());
		// pnlWarnings.setBorder(BorderFactory.createLoweredBevelBorder());
		// pnlErrors.setBorder(BorderFactory.createLoweredBevelBorder());

		pnlBrowseComputer = new BrowseComputerPanel() {
			/**
			 *
			 */
			private static final long serialVersionUID = 1L;
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
		pnlBrowseTags = new JPanel();
		pnlBrowseTags.add(new JLabel("Nothing to do here yet. Come back again later."));
		addListeners();
	}

	private void addListeners() {
		btnInformations.addActionListener(new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				if (btnInformations.isSelected()) {
					spNotifications.setVisible(true);
					spWarnings.setVisible(false);
					spErrors.setVisible(false);
					doHover(btnWarnings, false);
					doHover(btnErrors, false);
					pnlNotification.add(spNotifications, cc2.xyw(1, 3, notificationLayout.getColumnCount()));
				}
				repaint();
			}
		});
		btnWarnings.addActionListener(new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				if (btnWarnings.isSelected()) {
					spWarnings.setVisible(true);
					spNotifications.setVisible(false);
					spErrors.setVisible(false);
					doHover(btnInformations, false);
					doHover(btnErrors, false);
					pnlNotification.add(spWarnings, cc2.xyw(1, 3, notificationLayout.getColumnCount()));
				}
				repaint();
			}
		});

		btnErrors.addActionListener(new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				if (btnErrors.isSelected()) {
					spErrors.setVisible(true);
					spNotifications.setVisible(false);
					spWarnings.setVisible(false);
					doHover(btnInformations, false);
					doHover(btnWarnings, false);
					pnlNotification.add(spErrors, cc2.xyw(1, 3, notificationLayout.getColumnCount()));
				}
				repaint();
			}
		});
	}

	private void doHover(AbstractButton btn, boolean b) {
		Cursor cursor = (b) ? Cursor.getPredefinedCursor(Cursor.HAND_CURSOR) : null;
		btn.setCursor(cursor);
		if (b || !btn.isSelected()) {
		}
		String style = (b) ? "underline" : "none";
		String type = "NotificationType";
		int elementCount = 0;
		if (btn == btnInformations) {
			type = Messages.get(MessageConstants.INFORMATIONS);
			elementCount = pnlInformations.getElementCount();
		} else if (btn == btnWarnings) {
			type = Messages.get(MessageConstants.WARNINGS);
			elementCount = pnlWarnings.getElementCount();
		} else if (btn == btnErrors) {
			type = Messages.get(MessageConstants.ERRORS);
			elementCount = pnlErrors.getElementCount();
		}
	}

	private void setIcons() {
		int size = ScreenSizeUtil.is3k() ? 16 : 12;
		btnResizeDetailsPane.setIcon(ImageUtil.getImageIconFrom(Icons.get("barsWhite", size, size)));
	}

	private void createUI() {
		pnlTpInformationBar = new JPanel(new BorderLayout());
		pnlTpInformationBar.setOpaque(false);
		tpDetailsPane = new JTabbedPane() {
			private static final long serialVersionUID = 1L;

			@Override
			protected void paintComponent(Graphics g) {
				super.paintComponent(g);
				Image background = IconStore.current().getCurrentTheme().getNavigationPane().getImage();
				if (background != null) {
					Graphics2D g2d = (Graphics2D) g.create();
					int panelWidth = getWidth();
					int panelHeight = getHeight();
					g2d.drawImage(background, 0, 0, panelWidth, panelHeight, this);
					g2d.dispose();
				}
			}
		};

		tpDetailsPane.setTabLayoutPolicy(JTabbedPane.SCROLL_TAB_LAYOUT);
		tpDetailsPane.setTabPlacement(JTabbedPane.TOP);
		JScrollPane sp2 = new JCustomScrollPane(pnlBrowseComputer);
		sp2.setBorder(BorderFactory.createEmptyBorder());
		sp2.getVerticalScrollBar().setUnitIncrement(16);
		Color noColor = ColorStore.current().getColor(ColorConstants.SVG_NO_COLOR);
		tpDetailsPane.addTab(Messages.get(MessageConstants.DASHBOARD), ImageUtil.getFlatSVGIconFrom(Icons.get("tag"), 16, noColor), createDashboardPanel());
		tpDetailsPane.addTab(Messages.get(MessageConstants.NOTIFICATIONS), ImageUtil.getFlatSVGIconFrom(Icons.get("info"), 16, noColor), createNotificationPanel());
		tpDetailsPane.addTab(Messages.get(MessageConstants.BROWSE_COMPUTER), ImageUtil.getFlatSVGIconFrom(Icons.get("search"), 16, noColor), sp2);
		tpDetailsPane.addTab(Messages.get(MessageConstants.BROWSE_COVERS), ImageUtil.getFlatSVGIconFrom(Icons.get("picture"), 16, noColor), pnlBrowseCovers);
		tpDetailsPane.addTab(Messages.get(MessageConstants.BROWSE_TAGS), ImageUtil.getFlatSVGIconFrom(Icons.get("tag"), 16, noColor), pnlBrowseTags);

		pnlTpInformationBar.add(tpDetailsPane);
		JPanel pnl = new JPanel(new BorderLayout());
		pnl.add(pnlHideDetailsPanePanel = createHideDetailsPanePanel(), BorderLayout.CENTER);
		add(pnl, BorderLayout.EAST);
		pnlBrowseComputer.setBorder(Paddings.TABBED_DIALOG);
		add(pnlTpInformationBar);

		JToolBar trailing = new JToolBar();
		trailing.setFloatable(false);
		trailing.setBorder(null);
		// trailing.add(new JButton("test"));
		trailing.add(Box.createHorizontalGlue());
		trailing.add(btnHideDetailsPane);
		trailing.add(btnPinUnpinDetailsPane);
		tpDetailsPane.putClientProperty("JTabbedPane.trailingComponent", trailing);
	}

	private Component createHideDetailsPanePanel() {
		JPanel pnl = new JPanel(new BorderLayout());
		//		pnl.setOpaque(false);
		btnHideDetailsPane = new JCustomButton();
		btnHideDetailsPane.setIcon(ImageUtil.getImageIconFrom(Icons.get("hideDetailsPane", 24, 24)));
		btnHideDetailsPane.setActionCommand(GameViewConstants.HIDE_DETAILS_PANE);
		btnHideDetailsPane.setToolTipText("Informationsbereich ausblenden (Alt+Shift+I)");
		btnPinUnpinDetailsPane = new JCustomButton();
		btnPinUnpinDetailsPane.setIcon(ImageUtil.getImageIconFrom(Icons.get("unpinDetailsPane", 24, 24)));
		btnPinUnpinDetailsPane.setActionCommand(GameViewConstants.UNPIN_DETAILS_PANE);
		btnPinUnpinDetailsPane.setToolTipText("Informationsbereich in eigenem Fenster öffnen");
		//		JPanel pnl2 = new JPanel(new BorderLayout());
		//		pnl2.setOpaque(false);
		//		pnl2.add(btnPinUnpinDetailsPane, BorderLayout.NORTH);
		//		pnl2.add(btnHideDetailsPane, BorderLayout.SOUTH);
		//		pnl.add(pnl2, BorderLayout.NORTH);
		return pnl;
	}

	public void addShowGameDetailsListener(ActionListener l) {
		btnHideDetailsPane.addActionListener(l);
	}

	private JPanel createDashboardPanel() {
		JPanel pnlDashboard = new WelcomeViewPanel();
		return pnlDashboard;
	}

	private JPanel createNotificationPanel() {
		pnlNotification = new JPanel();
		pnlNotification.setOpaque(false);
		pnlNotification.setBorder(Paddings.TABBED_DIALOG);
		notificationLayout = new FormLayout(
				"fill:pref:grow, min, fill:pref:grow, min, fill:pref:grow",
				"min, min, fill:default:grow");
		pnlNotification.setLayout(notificationLayout);
		cc2 = new CellConstraints();
		pnlNotification.add(btnInformations, cc2.xy(1, 1));
		spNotifications = new JCustomScrollPane(pnlInformations);
		spWarnings = new JCustomScrollPane(pnlWarnings);
		spErrors = new JCustomScrollPane(pnlErrors);
		spNotifications.getVerticalScrollBar().setUnitIncrement(16);
		spWarnings.getVerticalScrollBar().setUnitIncrement(16);
		spErrors.getVerticalScrollBar().setUnitIncrement(16);
		spNotifications.setMinimumSize(new Dimension(0, 0));
		spWarnings.setMinimumSize(new Dimension(0, 0));
		spErrors.setMinimumSize(new Dimension(0, 0));
		spNotifications.setBorder(BorderFactory.createEmptyBorder());
		spWarnings.setBorder(BorderFactory.createEmptyBorder());
		spErrors.setBorder(BorderFactory.createEmptyBorder());

		pnlNotification.add(btnWarnings, cc2.xy(3, 1));
		pnlNotification.add(btnErrors, cc2.xy(5, 1));
		pnlNotification.add(spNotifications, cc2.xyw(1, 3, notificationLayout.getColumnCount()));

		spNotifications.setOpaque(false);
		spWarnings.setOpaque(false);
		spErrors.setOpaque(false);
		spNotifications.getViewport().setOpaque(false);
		spWarnings.getViewport().setOpaque(false);
		spErrors.getViewport().setOpaque(false);

		spWarnings.setVisible(false);
		spErrors.setVisible(false);
		return pnlNotification;
	}

	public boolean isNotificationsPanelVisible() {
		return pnlInformations.isVisible();
	}

	public void addNotificationElement(NotificationElement element) {
		int notificationType = element.getNotificationType();
		switch (notificationType) {
		case NotificationElement.INFORMATION:
			pnlInformations.addNotificationElement(element);
			pnlInformations.addNotificationElementListener(this);
			updateInformationElementsCount();
			break;
		case NotificationElement.WARNING:
			pnlWarnings.addNotificationElement(element);
			pnlWarnings.addNotificationElementListener(this);
			updateWarningElementsCount();
			break;
		case NotificationElement.ERROR:
			pnlErrors.addNotificationElement(element);
			pnlErrors.addNotificationElementListener(this);
			updateErrorElementsCount();
			break;
		case NotificationElement.SUCCESS:
			pnlErrors.addNotificationElement(element);
			pnlErrors.addNotificationElementListener(this);
			updateErrorElementsCount();
			break;
		}
	}

	private void updateInformationElementsCount() {
		int elementCount = pnlInformations.getElementCount();
		String messageCount = (elementCount == 1) ? Messages.get(MessageConstants.MESSAGES1)
				: Messages.get(MessageConstants.MESSAGES, elementCount);
		btnInformations.setText("<html>"+Messages.get(MessageConstants.INFORMATIONS)
		+ "<br>"+messageCount+"</html>");
	}

	private void updateWarningElementsCount() {
		int elementCount = pnlWarnings.getElementCount();
		String messageCount = (elementCount == 1) ? Messages.get(MessageConstants.MESSAGES1)
				: Messages.get(MessageConstants.MESSAGES, elementCount);
		btnWarnings.setText("<html>"+Messages.get(MessageConstants.WARNINGS)
		+ "<br>"+messageCount+"</html>");
	}

	private void updateErrorElementsCount() {
		int elementCount = pnlErrors.getElementCount();
		String messageCount = (elementCount == 1) ? Messages.get(MessageConstants.MESSAGES1)
				: Messages.get(MessageConstants.MESSAGES, elementCount);
		btnErrors.setText("<html>"+Messages.get(MessageConstants.ERRORS)
		+ "<br>"+messageCount+"</html>");
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
		tpDetailsPane.setTitleAt(0, Messages.get(MessageConstants.DASHBOARD));
		tpDetailsPane.setTitleAt(1, Messages.get(MessageConstants.NOTIFICATIONS));
		tpDetailsPane.setTitleAt(2, Messages.get(MessageConstants.BROWSE_COMPUTER));
		tpDetailsPane.setTitleAt(3, Messages.get(MessageConstants.BROWSE_COVERS));
		tpDetailsPane.setTitleAt(4, Messages.get(MessageConstants.BROWSE_TAGS));
		//		String style = (b) ? "underline" : "none";
		String style = "none";
		int elementCountInformations = pnlInformations.getElementCount();
		int elementCountWarnings = pnlWarnings.getElementCount();
		int elementCountErrors = pnlErrors.getElementCount();
		String messageCountInformations = (elementCountInformations == 1) ? Messages.get(MessageConstants.MESSAGES1)
				: Messages.get(MessageConstants.MESSAGES, elementCountInformations);
		String messageCountWarnings = (elementCountWarnings == 1) ? Messages.get(MessageConstants.MESSAGES1)
				: Messages.get(MessageConstants.MESSAGES, elementCountWarnings);
		String messageCountErrors = (elementCountErrors == 1) ? Messages.get(MessageConstants.MESSAGES1)
				: Messages.get(MessageConstants.MESSAGES, elementCountErrors);

		btnInformations.setText("<html>"+Messages.get(MessageConstants.INFORMATIONS) + "<br>"
				+ messageCountInformations+"</html>");
		btnWarnings.setText("<html>" + Messages.get(MessageConstants.WARNINGS) + "<br>"
				+ messageCountWarnings +"</html>");
		btnErrors.setText("<html>" + Messages.get(MessageConstants.ERRORS) + "<br>"
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

	public void gameSelected(GameSelectionEvent e) {
		pnlBrowseCovers.gameSelected(e);
	}

	@Override
	public void notificationElementRemoved() {
		updateInformationElementsCount();
		updateWarningElementsCount();
		updateErrorElementsCount();
	}

	public void addSetCoverForGameListener(ActionListener l) {
		pnlBrowseCovers.addSetCoverForGameListener(l);
	}

	public void addSelectNextGameListener(ActionListener l) {
		pnlBrowseCovers.addSelectNextGameListener(l);
	}

	public void addSelectPreviousGameListener(ActionListener l) {
		pnlBrowseCovers.addSelectPreviousGameListener(l);
	}

	public void addResizeDetailsPanelListener(MouseMotionListener l) {
		btnResizeDetailsPane.addMouseMotionListener(l);
	}

	@Override
	protected void paintComponent(Graphics g) {
		super.paintComponent(g);
		Graphics2D g2d = (Graphics2D) g.create();
		int panelWidth = getWidth();
		int panelHeight = getHeight();
		Theme currentTheme = IconStore.current().getCurrentTheme();
		ThemeBackground currentBackground = currentTheme.getDetailsPane();
		if (currentBackground.hasGradientPaint()) {
			GradientPaint p = currentBackground.getGradientPaint();
			g2d.setPaint(p);
		} else if (currentBackground.hasColor()) {
			//g2d.setColor(currentBackground.getColor());
		}
		//g2d.fillRect(0, 0, panelWidth, panelHeight);

		Image background = currentBackground.getImage();
		if (background != null) {
			g2d.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
			g2d.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
			g2d.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
			int imgWidth = background.getWidth(null);
			int imgHeight = background.getHeight(null);
			int x = 0;
			int y = 0;
			boolean shouldScale = currentBackground.isImageScaleEnabled();
			if (shouldScale) {
				int new_width = imgWidth;
				int new_height = imgHeight;
				boolean stretchToView = currentBackground.isStretchToViewEnabled();
				if (stretchToView) {
					new_width = panelWidth;
					new_height = panelHeight;
				} else {
					// first check if we need to scale width
					if (imgWidth > panelWidth) {
						//scale width to fit
						new_width = panelWidth;
						//scale height to maintain aspect ratio
						new_height = (new_width * imgHeight) / imgWidth;
					}

					// then check if we need to scale even with the new height
					if (new_height > panelHeight) {
						//scale height to fit instead
						new_height = panelHeight;
						//scale width to maintain aspect ratio
						new_width = (new_height * imgWidth) / imgHeight;
					}
					if (new_width < panelWidth) {
						x += (panelWidth-new_width) / 2;
					}
					if (new_height < panelHeight) {
						y += (panelHeight-new_height) / 2; // image centered
						//					y = panelHeight-new_height; // image bottom
					}
				}
				g2d.drawImage(background, x, y, new_width, new_height, this);
				//				boolean addTransparencyPane = true;
				//				if (addTransparencyPane) {
				//					g2d.setColor(getTransparencyColor());
				//					g2d.fillRect(x, y, new_width, new_height);
				//				}
			} else {
				boolean shouldVerticalCenterImage = currentBackground.isVerticalCenterImageEnabled();
				boolean shouldHorizontalCenterImage = currentBackground.isHorizontalCenterImageEnabled();
				if (shouldVerticalCenterImage) {
					if (imgWidth > panelWidth) {
						x -= (imgWidth-panelWidth) / 2;
					}
				}
				if (shouldHorizontalCenterImage) {
					if (imgHeight > panelHeight) {
						y -= (imgHeight-panelHeight) / 2;
					}
				}
				g2d.drawImage(background, x, y, imgWidth, imgHeight, this);
				//				boolean addTransparencyPane = true;
				//				if (addTransparencyPane) {
				//					g2d.setColor(getTransparencyColor());
				//					g2d.fillRect(x, y, imgWidth, imgHeight);
				//				}
			}
			boolean addTransparencyPane = currentBackground.isAddTransparencyPaneEnabled();
			if (addTransparencyPane) {
				g2d.setColor(currentBackground.getTransparencyColor());
				g2d.fillRect(0, 0, panelWidth, panelHeight);
			}
			BufferedImage imgTransparentOverlay = currentTheme.getTransparentBackgroundOverlayImage();
			if (imgTransparentOverlay != null) {
				int width = imgTransparentOverlay.getWidth();
				int height = imgTransparentOverlay.getHeight();

				double factor = background.getWidth(null) / panelWidth;
				if (factor != 0) {
					int scaledWidth = (int) (width/factor);
					int scaledHeight = (int) (height/factor);
					width = scaledWidth;
					height = scaledHeight;
				}
				x = panelWidth-width;
				y = panelHeight-height;
				g2d.drawImage(imgTransparentOverlay, x, y, width, height, this);
			}
		}
		g2d.dispose();
	}
}