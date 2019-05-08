package ch.sysout.emubro.ui;

import java.awt.BorderLayout;
import java.awt.Component;
import java.awt.Cursor;
import java.awt.Dimension;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;
import java.io.File;
import java.util.List;

import javax.swing.AbstractButton;
import javax.swing.BorderFactory;
import javax.swing.ButtonGroup;
import javax.swing.JButton;
import javax.swing.JLabel;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.JTabbedPane;
import javax.swing.JToggleButton;
import javax.swing.SwingConstants;

import com.jgoodies.forms.factories.Paddings;
import com.jgoodies.forms.layout.CellConstraints;
import com.jgoodies.forms.layout.FormLayout;

import ch.sysout.emubro.api.event.GameSelectionEvent;
import ch.sysout.emubro.controller.NotificationElementListener;
import ch.sysout.emubro.util.MessageConstants;
import ch.sysout.util.Icons;
import ch.sysout.util.ImageUtil;
import ch.sysout.util.Messages;
import ch.sysout.util.UIUtil;

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

	private AbstractButton btnInformations = new JToggleButton("");
	private AbstractButton btnWarnings = new JToggleButton("");
	private AbstractButton btnErrors = new JToggleButton("");

	private FormLayout notificationLayout;

	private JScrollPane spNotifications;
	private JScrollPane spWarnings;
	private JScrollPane spErrors;

	JPanel pnlNotification;

	private CellConstraints cc2;

	public DetailsPanel() {
		super(new BorderLayout());
		initComponents();
		createUI();
	}

	private void initComponents() {
		ButtonGroup grp = new ButtonGroup();
		grp.add(btnInformations);
		grp.add(btnWarnings);
		grp.add(btnErrors);
		btnInformations.setSelected(true);

		btnInformations.setFocusPainted(false);
		btnWarnings.setFocusPainted(false);
		btnErrors.setFocusPainted(false);
		UIUtil.doHover(false, btnWarnings, btnErrors);

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
		pnlBrowseTags = new JPanel();
		pnlBrowseTags.add(new JLabel("Nothing to do here yet. Come back again later."));
		addListeners();
	}

	private void addListeners() {
		btnInformations.addActionListener(new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				UIUtil.doHover(false, btnWarnings, btnErrors);
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
		btnInformations.addMouseListener(UIUtil.getMouseAdapterKeepHoverWhenSelected());
		btnWarnings.addActionListener(new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				UIUtil.doHover(false, btnInformations, btnErrors);
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

		btnWarnings.addMouseListener(UIUtil.getMouseAdapterKeepHoverWhenSelected());
		btnErrors.addActionListener(new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				UIUtil.doHover(false, btnInformations, btnWarnings);
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

		btnErrors.addMouseListener(UIUtil.getMouseAdapterKeepHoverWhenSelected());
	}

	private void doHover(AbstractButton btn, boolean b) {
		Cursor cursor = (b) ? Cursor.getPredefinedCursor(Cursor.HAND_CURSOR) : null;
		btn.setCursor(cursor);
		if (b || !btn.isSelected()) {
			UIUtil.doHover(b, btn);
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
		String messageCount = (elementCount == 1) ? Messages.get(MessageConstants.MESSAGES1) : Messages.get(MessageConstants.MESSAGES, elementCount);
		btn.setText("<html><a href='' style='text-decoration: " + style + "'>" + type + "</a>" + "<br>"
				+ messageCount +"</html>");
	}

	private void createUI() {
		pnlTpInformationBar = new JPanel(new BorderLayout());
		tpDetailsPane = new JTabbedPane(SwingConstants.BOTTOM);
		tpDetailsPane.setTabLayoutPolicy(JTabbedPane.SCROLL_TAB_LAYOUT);
		tpDetailsPane.setTabPlacement(JTabbedPane.TOP);
		JScrollPane sp2 = new JScrollPane(pnlBrowseComputer);
		sp2.setBorder(BorderFactory.createEmptyBorder());
		sp2.getVerticalScrollBar().setUnitIncrement(16);
		tpDetailsPane.addTab(Messages.get(MessageConstants.NOTIFICATIONS),
				ImageUtil.getImageIconFrom(Icons.get("info", 16, 16), false), createNotificationPanel());
		tpDetailsPane.addTab(Messages.get(MessageConstants.BROWSE_COMPUTER),
				ImageUtil.getImageIconFrom(Icons.get("search", 16, 16), false), sp2);
		FindCoversPanel pnlFindCovers = new FindCoversPanel();
		pnlFindCovers.setBorder(Paddings.TABBED_DIALOG);
		JScrollPane spFindCovers = new JScrollPane(pnlFindCovers);
		spFindCovers.setBorder(BorderFactory.createEmptyBorder());
		spFindCovers.getVerticalScrollBar().setUnitIncrement(16);

		ImageUtil.getImageIconFrom(Icons.get("fromComputer", 16, 16));
		ImageUtil.getImageIconFrom(Icons.get("fromWeb", 16, 16));

		tpDetailsPane.addTab(Messages.get(MessageConstants.BROWSE_COVERS), pnlBrowseCovers);
		tpDetailsPane.addTab(Messages.get(MessageConstants.BROWSE_TAGS), pnlBrowseTags);

		pnlTpInformationBar.add(tpDetailsPane);
		JPanel pnl = new JPanel(new BorderLayout());
		pnl.add(pnlHideDetailsPanePanel = createHideDetailsPanePanel(), BorderLayout.CENTER);
		add(pnl, BorderLayout.EAST);
		pnlBrowseComputer.setBorder(Paddings.TABBED_DIALOG);
		add(pnlTpInformationBar);
	}

	private Component createHideDetailsPanePanel() {
		JPanel pnl = new JPanel(new BorderLayout());
		btnHideDetailsPane = new JButton();
		UIUtil.doHover(false, btnHideDetailsPane);
		btnHideDetailsPane.setIcon(ImageUtil.getImageIconFrom(Icons.get("hideDetailsPane", 24, 24)));
		btnHideDetailsPane.setActionCommand(GameViewConstants.HIDE_DETAILS_PANE);
		btnHideDetailsPane.setToolTipText("Informationsbereich ausblenden (Alt+Shift+I)");
		btnHideDetailsPane.addMouseListener(new MouseAdapter() {

			@Override
			public void mouseEntered(MouseEvent e) {
				UIUtil.doHover(true, btnHideDetailsPane);
			}

			@Override
			public void mouseExited(MouseEvent e) {
				UIUtil.doHover(false, btnHideDetailsPane);
			}
		});
		btnPinUnpinDetailsPane = new JButton();
		UIUtil.doHover(true, btnPinUnpinDetailsPane);
		btnPinUnpinDetailsPane.setIcon(ImageUtil.getImageIconFrom(Icons.get("unpinDetailsPane", 24, 24)));
		btnPinUnpinDetailsPane.setActionCommand(GameViewConstants.UNPIN_DETAILS_PANE);
		btnPinUnpinDetailsPane.setToolTipText("Informationsbereich in eigenem Fenster öffnen");
		btnPinUnpinDetailsPane.addMouseListener(UIUtil.getMouseAdapter());
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
		pnlNotification = new JPanel();
		pnlNotification.setBorder(Paddings.TABBED_DIALOG);
		notificationLayout = new FormLayout(
				"fill:pref:grow, min, fill:pref:grow, min, fill:pref:grow",
				"min, min, fill:default:grow");
		pnlNotification.setLayout(notificationLayout);
		cc2 = new CellConstraints();
		pnlNotification.add(btnInformations, cc2.xy(1, 1));
		spNotifications = new JScrollPane(pnlInformations);
		spWarnings = new JScrollPane(pnlWarnings);
		spErrors = new JScrollPane(pnlErrors);
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
		case NotificationElement.INFORMATION_MANDATORY:
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
		btnInformations.setText("<html><a href='' style='text-decoration: none'>"+Messages.get(MessageConstants.INFORMATIONS)+"</a>"
				+ "<br>"+messageCount+"</html>");
	}

	private void updateWarningElementsCount() {
		int elementCount = pnlWarnings.getElementCount();
		String messageCount = (elementCount == 1) ? Messages.get(MessageConstants.MESSAGES1)
				: Messages.get(MessageConstants.MESSAGES, elementCount);
		btnWarnings.setText("<html><a href='' style='text-decoration: none'>"+Messages.get(MessageConstants.WARNINGS)+"</a>"
				+ "<br>"+messageCount+"</html>");
	}

	private void updateErrorElementsCount() {
		int elementCount = pnlErrors.getElementCount();
		String messageCount = (elementCount == 1) ? Messages.get(MessageConstants.MESSAGES1)
				: Messages.get(MessageConstants.MESSAGES, elementCount);
		btnErrors.setText("<html><a href='' style='text-decoration: none'>"+Messages.get(MessageConstants.ERRORS)+"</a>"
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
		tpDetailsPane.setTitleAt(0, Messages.get(MessageConstants.NOTIFICATIONS));
		tpDetailsPane.setTitleAt(1, Messages.get(MessageConstants.BROWSE_COMPUTER));
		tpDetailsPane.setTitleAt(2, Messages.get(MessageConstants.BROWSE_COVERS));
		tpDetailsPane.setTitleAt(3, Messages.get(MessageConstants.BROWSE_TAGS));
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

		btnInformations.setText("<html><a href='' style='text-decoration: " + style + "'>" + Messages.get(MessageConstants.INFORMATIONS) + "</a>" + "<br>"
				+ messageCountInformations+"</html>");
		btnWarnings.setText("<html><a href='' style='text-decoration: " + style + "'>" + Messages.get(MessageConstants.WARNINGS) + "</a>" + "<br>"
				+ messageCountWarnings +"</html>");
		btnErrors.setText("<html><a href='' style='text-decoration: " + style + "'>" + Messages.get(MessageConstants.ERRORS) + "</a>" + "<br>"
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
}
