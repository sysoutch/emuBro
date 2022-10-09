package ch.sysout.emubro.ui;

import java.awt.BorderLayout;
import java.awt.Color;
import java.awt.Dimension;
import java.awt.FlowLayout;
import java.awt.GridLayout;
import java.awt.LayoutManager;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import javax.swing.AbstractButton;
import javax.swing.Action;
import javax.swing.BorderFactory;
import javax.swing.Icon;
import javax.swing.ImageIcon;
import javax.swing.JButton;
import javax.swing.JLabel;
import javax.swing.JPanel;
import javax.swing.JTextPane;
import javax.swing.text.JTextComponent;

import com.jgoodies.forms.factories.Paddings;
import com.jgoodies.forms.layout.CellConstraints;
import com.jgoodies.forms.layout.FormLayout;
import com.jgoodies.forms.layout.RowSpec;
import com.jgoodies.validation.view.ValidationComponentUtils;

import ch.sysout.emubro.controller.NotificationElementListener;
import ch.sysout.ui.util.ImageUtil;
import ch.sysout.ui.util.UIUtil;
import ch.sysout.util.Icons;
import ch.sysout.util.Messages;
import ch.sysout.util.ScreenSizeUtil;
import ch.sysout.util.ValidationUtil;

public class NotificationsPanel extends JPanel {
	private static final long serialVersionUID = 1L;

	private JLabel lblGameCover = new JLabel();
	private HashMap<JPanel, JPanel> mapPanels = new HashMap<>();

	private List<NotificationElement> notificationElements = new ArrayList<>();
	private Map<JTextComponent, NotificationElement> labels = new HashMap<>();
	private Map<List<AbstractButton>, NotificationElement> links = new HashMap<>();

	private Map<Integer, ImageIcon> infoIcons = new HashMap<>();
	private Map<Integer, ImageIcon> infoImportantIcons = new HashMap<>();
	private Map<Integer, ImageIcon> warningIcons = new HashMap<>();
	private Map<Integer, ImageIcon> errorIcons = new HashMap<>();
	private Map<Integer, ImageIcon> successIcons = new HashMap<>();

	private JPanel pnlGrid;

	private Icon iconHideMessage = ImageUtil.getImageIconFrom(Icons.get("hideDetailsPane", 16, 16));
	private Icon iconHideMessageHover = ImageUtil.getImageIconFrom(Icons.get("hideDetailsPaneHover", 16, 16));

	private Dimension minimumNotificationsHeight = new Dimension(0, ScreenSizeUtil.adjustValueToResolution(96));

	private List<NotificationElementListener> listeners = new ArrayList<>();

	private FormLayout layoutMain;

	private CellConstraints ccMain;

	@Override
	public Dimension getMinimumSize() {
		if (minimumNotificationsHeight.getHeight() != ScreenSizeUtil.adjustValueToResolution(96)) {
			minimumNotificationsHeight = new Dimension(0, ScreenSizeUtil.adjustValueToResolution(96));
		}
		return minimumNotificationsHeight;
	}

	@Override
	public Dimension getPreferredSize() {
		return new Dimension(0, (int) super.getPreferredSize().getHeight());
	}

	public NotificationsPanel() {
		super(new BorderLayout());
		initComponents();
		createUI();
	}

	public void addNotificationElement(NotificationElement element3) {
		ZonedDateTime date = ZonedDateTime.now();
		String formattedDate = UIUtil.format(date);

		String message = element3.getMessage();
		Map<String, Action> actionMessages = element3.getActionMessages();
		int notificationType = element3.getNotificationType();
		if (notificationElements != null && notificationElements.contains(element3)) {
			return;
		}
		// LayoutManager formLayout = new FormLayout("min:grow");
		final JPanel pnl = new JPanel(new GridLayout(0, 1));
		pnl.setBorder(BorderFactory.createTitledBorder(formattedDate));
		pnl.setOpaque(false);
		ActionListener actionHideMessage = new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				removeNotificationElement(pnl);
			}
		};
		// pnl.setBackground(backgroundColor);

		JTextPane textPane = new JTextPane();
		textPane.setOpaque(false);
		textPane.setEditable(false);
		textPane.setFocusable(false);
		textPane.setText(message);
		labels.put(textPane, element3);

		int size = ScreenSizeUtil.adjustValueToResolution(16);
		final JPanel pnl2 = new JPanel(new BorderLayout(0, 2));
		pnl2.setOpaque(false);
		pnl2.setBorder(Paddings.DLU4);
		LayoutManager formLayoutPnlLabel = new FormLayout("min",
				"fill:min");
		JPanel pnlIcon = new JPanel(formLayoutPnlLabel);
		pnlIcon.setOpaque(false);
		pnlIcon.setBorder(Paddings.DLU4);
		CellConstraints cc = new CellConstraints();
		JLabel lblIcon = new JLabel();
		pnlIcon.add(lblIcon, cc.xy(1, 1));
		pnl2.add(textPane, BorderLayout.NORTH);

		WrapLayout wrapLayout = new WrapLayout();
		wrapLayout.setAlignment(FlowLayout.LEFT);
		JPanel pnl3 = new JPanel(wrapLayout);
		pnl3.setOpaque(false);
		List<AbstractButton> links2 = new ArrayList<>();
		for (Map.Entry<String, Action> action : actionMessages.entrySet()) {
			JButton lnk = new JLinkButton(Messages.get(action.getKey()));
			lnk.setOpaque(false);
			links2.add(lnk);
			String key = action.getKey();
			ActionListener value = action.getValue();
			boolean doHideMessage = key.equals("notifications_thanks") || key.equals("hideMessage");
			if (doHideMessage) {
				lnk.addActionListener(actionHideMessage);
			}
			if (value != null) {
				lnk.addActionListener(value);
			}
			lnk.setActionCommand(key);
			// lnk.setIcon(ImageUtil.getImageIconFrom(Icons.get("blank", size,
			// size)));
			JPanel pnlLnk = new JPanel();
			pnlLnk.setOpaque(false);
			//			Border border = pnlLnk.getBorder();
			//			Border margin = new EmptyBorder(0, 10, 0, 0);
			//			pnlLnk.setBorder(new CompoundBorder(border, margin));
			pnlLnk.add(lnk);
			pnl3.add(pnlLnk);
		}
		links.put(links2, element3);

		pnl2.add(pnl3, BorderLayout.WEST);

		final AbstractButton btnHideMessage = new JCustomButtonNew(iconHideMessage);
		btnHideMessage.addMouseListener(new MouseAdapter() {
			@Override
			public void mouseEntered(MouseEvent e) {
				btnHideMessage.setIcon(iconHideMessageHover);
			}

			@Override
			public void mouseExited(MouseEvent e) {
				btnHideMessage.setIcon(iconHideMessage);
			}
		});
		pnl2.add(btnHideMessage, BorderLayout.EAST);
		JPanel pnlpnl = new JPanel(new BorderLayout());
		pnlpnl.setOpaque(false);
		pnlpnl.add(pnlIcon, BorderLayout.WEST);
		pnlpnl.add(pnl2, BorderLayout.CENTER);
		pnl.add(pnlpnl);

		//		StyleContext context = new StyleContext();
		//		StyledDocument document = new DefaultStyledDocument(context);
		//		Style labelStyle = context.getStyle(StyleContext.DEFAULT_STYLE);
		//		JLabel lbl = new JLabel(message, null, SwingConstants.LEFT);
		//		StyleConstants.setComponent(labelStyle, lbl);
		//		label.setDocument(document);
		switch (notificationType) {
		case NotificationElement.INFORMATION:
			if (!infoIcons.containsKey(size)) {
				infoIcons.put(size, ImageUtil.getFlatSVGIconFrom(Icons.get("info"), size, new Color(137, 207, 240)));
			}
			lblIcon.setIcon(infoIcons.get(size));
			break;
		case NotificationElement.WARNING:
			if (!warningIcons.containsKey(size)) {
				warningIcons.put(size, ImageUtil.getFlatSVGIconFrom(Icons.get("warning"), size, Color.ORANGE));
			}
			lblIcon.setIcon(warningIcons.get(size));
			textPane.setBackground(ValidationComponentUtils.getWarningBackground());
			pnlIcon.setBackground(ValidationComponentUtils.getWarningBackground());
			pnl2.setBackground(ValidationComponentUtils.getWarningBackground());
			pnl3.setBackground(ValidationComponentUtils.getWarningBackground());
			break;
		case NotificationElement.ERROR:
			if (!errorIcons.containsKey(size)) {
				errorIcons.put(size, ImageUtil.getFlatSVGIconFrom(Icons.get("error"), size, Color.RED));
			}
			lblIcon.setIcon(errorIcons.get(size));
			textPane.setBackground(ValidationComponentUtils.getErrorBackground());
			pnlIcon.setBackground(ValidationComponentUtils.getErrorBackground());
			pnl2.setBackground(ValidationComponentUtils.getErrorBackground());
			pnl3.setBackground(ValidationComponentUtils.getErrorBackground());
			break;
		case NotificationElement.SUCCESS:
			if (!successIcons.containsKey(size)) {
				successIcons.put(size, ImageUtil.getImageIconFrom(Icons.get("default", size, size)));
			}
			lblIcon.setIcon(successIcons.get(size));
			textPane.setBackground(ValidationUtil.getSuccessBackground());
			pnlIcon.setBackground(ValidationUtil.getSuccessBackground());
			pnl2.setBackground(ValidationUtil.getSuccessBackground());
			pnl3.setBackground(ValidationUtil.getSuccessBackground());
			break;
		default:
			break;
		}
		layoutMain.appendRow(RowSpec.decode("min"));
		NewNotificationPanel pnlNewNotifications;
		//		pnlGrid.add(pnl, ccMain.xy(1, layoutMain.getRowCount()));
		pnlGrid.add(pnlNewNotifications = new NewNotificationPanel(), ccMain.xy(1, layoutMain.getRowCount()));
		pnlNewNotifications.addNotification(element3);
		mapPanels.put(pnl, pnl);
		btnHideMessage.addActionListener(actionHideMessage);
		btnHideMessage.addActionListener(element3.getCloseAction());
		UIUtil.revalidateAndRepaint(pnlGrid);

		// int value = ScreenSizeUtil.adjustValueToResolution(6);
		// add(Box.createRigidArea(new Dimension(0, value)));
		notificationElements.add(element3);
	}

	public void removeNotificationElement(JPanel pnl) {
		if (mapPanels.containsKey(pnl)) {
			pnlGrid.remove(mapPanels.get(pnl));
			mapPanels.remove(pnl);
			fireNotificationElementRemoved();
			UIUtil.revalidateAndRepaint(this);
		}
	}

	public void addNotificationElementListener(NotificationElementListener l) {
		if (!listeners.contains(l)) {
			listeners.add(l);
		}
	}

	private void fireNotificationElementRemoved() {
		for (NotificationElementListener l : listeners) {
			l.notificationElementRemoved();
		}
	}

	private void initComponents() {
		layoutMain = new FormLayout("min:grow", "");
		ccMain = new CellConstraints();
		pnlGrid = new JPanel(layoutMain);
		pnlGrid.setOpaque(false);
		lblGameCover.setVisible(false);
		lblGameCover.setFocusable(false);
		setToolTipTexts();
	}

	private void setToolTipTexts() {
		lblGameCover.setToolTipText("Hier klicken um Cover hinzuzufügen");
	}

	private void createUI() {
		setOpaque(false);
		add(pnlGrid, BorderLayout.NORTH);
	}

	public int getElementCount() {
		return pnlGrid.getComponentCount();
	}

	public void languageChanged() {
		for (JTextComponent lbl : labels.keySet()) {
			NotificationElement messageKey = labels.get(lbl);
			String text = messageKey.getMessage();
			lbl.setText(text);
		}
		for (List<AbstractButton> lnk : links.keySet()) {
			for (AbstractButton lbl : lnk) {
				lbl.setText(Messages.get(lbl.getActionCommand()));
			}
		}
	}
}