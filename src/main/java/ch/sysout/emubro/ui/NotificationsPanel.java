package ch.sysout.emubro.ui;

import java.awt.BorderLayout;
import java.awt.Color;
import java.awt.Dimension;
import java.awt.FlowLayout;
import java.awt.Font;
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
import javax.swing.JEditorPane;
import javax.swing.JLabel;
import javax.swing.JPanel;

import com.jgoodies.forms.factories.Paddings;
import com.jgoodies.forms.layout.CellConstraints;
import com.jgoodies.forms.layout.FormLayout;
import com.jgoodies.forms.layout.RowSpec;
import com.jgoodies.validation.view.ValidationComponentUtils;

import ch.sysout.emubro.controller.NotificationElementListener;
import ch.sysout.util.Icons;
import ch.sysout.util.ImageUtil;
import ch.sysout.util.Messages;
import ch.sysout.util.ScreenSizeUtil;
import ch.sysout.util.UIUtil;
import ch.sysout.util.ValidationUtil;

public class NotificationsPanel extends JPanel {
	private static final long serialVersionUID = 1L;

	private JLabel lblGameCover = new JLabel();
	private HashMap<JPanel, JPanel> mapPanels = new HashMap<>();

	private List<NotificationElement> notificationElements = new ArrayList<>();
	private Map<JEditorPane, NotificationElement> labels = new HashMap<>();
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
		String message = element3.getMessage().replace("<html>", "").replace("</html>", "");
		Map<String, Action> actionMessages = element3.getActionMessages();
		int notificationType = element3.getNotificationType();
		if (notificationElements != null && notificationElements.contains(element3)) {
			return;
		}
		// LayoutManager formLayout = new FormLayout("min:grow");
		final JPanel pnl = new JPanel(new GridLayout(0, 1));
		ActionListener actionHideMessage = new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				removeNotificationElement(pnl);
			}
		};
		// pnl.setBackground(backgroundColor);

		JEditorPane editorPane = new JEditorPane("text/html", "");
		//		label.setLineWrap(true);
		//		label.setWrapStyleWord(true);
		Font oldFont = editorPane.getFont();
		//		label.setContentType("text/html");
		editorPane.setEditable(false);
		editorPane.setFocusable(false);
		editorPane.setFont(oldFont);
		editorPane.setText("<font face=\"verdana\">"+message+"</font>");
		labels.put(editorPane, element3);

		int size = ScreenSizeUtil.adjustValueToResolution(16);
		final JPanel pnl2 = new JPanel(new BorderLayout(0, 2));
		pnl2.setBorder(Paddings.DLU4);
		LayoutManager formLayoutPnlLabel = new FormLayout("min",
				"fill:min");
		JPanel pnlIcon = new JPanel(formLayoutPnlLabel);

		pnlIcon.setBorder(Paddings.DLU4);
		CellConstraints cc = new CellConstraints();
		JLabel lblIcon = new JLabel();
		pnlIcon.add(lblIcon, cc.xy(1, 1));
		pnl2.add(editorPane, BorderLayout.NORTH);

		// HTMLEditorKit kit = new HTMLEditorKit();
		// StyleSheet styleSheet = kit.getStyleSheet();
		// styleSheet.addRule("a {color:#ff0000;}");
		WrapLayout wrapLayout = new WrapLayout();
		wrapLayout.setAlignment(FlowLayout.LEFT);
		JPanel pnl3 = new JPanel(wrapLayout);
		List<AbstractButton> links2 = new ArrayList<>();
		for (Map.Entry<String, Action> action : actionMessages.entrySet()) {
			JButton lnk = new JLinkButton(Messages.get(action.getKey()));
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

		AbstractButton btnHideMessage = new JButton(iconHideMessage);
		UIUtil.doHover(false, btnHideMessage);
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
		pnlpnl.add(pnlIcon, BorderLayout.WEST);
		pnlpnl.add(pnl2, BorderLayout.CENTER);
		JLabel lblTimestamp = new JLabel();
		//		label.setLineWrap(true);
		//		label.setWrapStyleWord(true);
		ZonedDateTime date = ZonedDateTime.now();
		lblTimestamp.setText(UIUtil.format(date));
		lblTimestamp.setBorder(Paddings.DLU2);
		lblTimestamp.setOpaque(true);
		lblTimestamp.setEnabled(false);
		lblTimestamp.setFocusable(false);
		lblTimestamp.setFont(lblTimestamp.getFont().deriveFont(12.0f).deriveFont(Font.ITALIC));
		pnlpnl.add(lblTimestamp, BorderLayout.SOUTH);
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
				infoIcons.put(size, ImageUtil.getImageIconFrom(Icons.get("info", size, size)));
			}
			lblIcon.setIcon(infoIcons.get(size));
			editorPane.setBackground(Color.WHITE);
			pnlIcon.setBackground(Color.WHITE);
			pnl2.setBackground(Color.WHITE);
			pnl3.setBackground(Color.WHITE);
			lblTimestamp.setBackground(Color.WHITE);
			pnl.setBorder(BorderFactory.createLineBorder(Color.white.darker()));
			break;
		case NotificationElement.INFORMATION_MANDATORY:
			if (!infoImportantIcons.containsKey(size)) {
				infoImportantIcons.put(size, ImageUtil.getImageIconFrom(Icons.get("infoImportant", size, size)));
			}
			lblIcon.setIcon(infoImportantIcons.get(size));
			// pnl2.setBackground(ValidationComponentUtils.getMandatoryBackground());
			// pnl3.setBackground(ValidationComponentUtils.getMandatoryBackground());
			editorPane.setBackground(Color.WHITE);
			pnlIcon.setBackground(Color.WHITE);
			pnl2.setBackground(Color.WHITE);
			pnl3.setBackground(Color.WHITE);
			lblTimestamp.setBackground(Color.WHITE);
			pnl.setBorder(BorderFactory.createLineBorder(ValidationComponentUtils.getMandatoryBackground().darker()));
			break;
		case NotificationElement.WARNING:
			if (!warningIcons.containsKey(size)) {
				warningIcons.put(size, ImageUtil.getImageIconFrom(Icons.get("warning", size, size)));
			}
			lblIcon.setIcon(warningIcons.get(size));
			editorPane.setBackground(ValidationComponentUtils.getWarningBackground());
			pnlIcon.setBackground(ValidationComponentUtils.getWarningBackground());
			pnl2.setBackground(ValidationComponentUtils.getWarningBackground());
			pnl3.setBackground(ValidationComponentUtils.getWarningBackground());
			lblTimestamp.setBackground(ValidationComponentUtils.getWarningBackground());
			pnl.setBorder(BorderFactory.createLineBorder(ValidationComponentUtils.getWarningBackground().darker()));
			break;
		case NotificationElement.ERROR:
			if (!errorIcons.containsKey(size)) {
				errorIcons.put(size, ImageUtil.getImageIconFrom(Icons.get("error", size, size)));
			}
			lblIcon.setIcon(errorIcons.get(size));
			editorPane.setBackground(ValidationComponentUtils.getErrorBackground());
			pnlIcon.setBackground(ValidationComponentUtils.getErrorBackground());
			pnl2.setBackground(ValidationComponentUtils.getErrorBackground());
			pnl3.setBackground(ValidationComponentUtils.getErrorBackground());
			lblTimestamp.setBackground(ValidationComponentUtils.getErrorBackground());
			pnl.setBorder(BorderFactory.createLineBorder(ValidationComponentUtils.getErrorBackground().darker()));
			break;
		case NotificationElement.SUCCESS:
			if (!successIcons.containsKey(size)) {
				successIcons.put(size, ImageUtil.getImageIconFrom(Icons.get("default", size, size)));
			}
			lblIcon.setIcon(successIcons.get(size));
			editorPane.setBackground(ValidationUtil.getSuccessBackground());
			pnlIcon.setBackground(ValidationUtil.getSuccessBackground());
			pnl2.setBackground(ValidationUtil.getSuccessBackground());
			pnl3.setBackground(ValidationUtil.getSuccessBackground());
			lblTimestamp.setBackground(ValidationUtil.getSuccessBackground());
			pnl.setBorder(BorderFactory.createLineBorder(ValidationUtil.getSuccessBackground().darker()));
			break;
		default:
			break;
		}
		layoutMain.appendRow(RowSpec.decode("min"));
		pnlGrid.add(pnl, ccMain.xy(1, layoutMain.getRowCount()));
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
		for (JEditorPane lbl : labels.keySet()) {
			NotificationElement messageKey = labels.get(lbl);
			String text = messageKey.getMessage().replace("<html>", "").replace("</html>", "");
			lbl.setText("<font face=\"verdana\">"+text+"</font>");
		}
		for (List<AbstractButton> lnk : links.keySet()) {
			for (AbstractButton lbl : lnk) {
				lbl.setText("<html><a href=''>" + Messages.get(lbl.getActionCommand()) + "</a></html>");
			}
		}
	}
}