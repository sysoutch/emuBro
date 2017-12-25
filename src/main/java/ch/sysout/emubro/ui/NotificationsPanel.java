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
import javax.swing.border.Border;

import com.jgoodies.forms.factories.Paddings;
import com.jgoodies.forms.layout.CellConstraints;
import com.jgoodies.forms.layout.FormLayout;
import com.jgoodies.validation.view.ValidationComponentUtils;

import ch.sysout.emubro.controller.NotificationElementListener;
import ch.sysout.ui.ImageUtil;
import ch.sysout.util.Icons;
import ch.sysout.util.Messages;
import ch.sysout.util.ScreenSizeUtil;
import ch.sysout.util.UIUtil;
import ch.sysout.util.ValidationUtil;

public class NotificationsPanel extends JPanel {
	private static final long serialVersionUID = 1L;

	private JLabel lblGameCover = new JLabel();
	private HashMap<JPanel, JPanel> test = new HashMap<>();

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
		// pnl.setBackground(backgroundColor);

		JEditorPane label = new JEditorPane("text/html", "");
		//		label.setLineWrap(true);
		//		label.setWrapStyleWord(true);
		Font oldFont = label.getFont();
		//		label.setContentType("text/html");
		label.setEditable(false);
		label.setFocusable(false);
		label.setFont(oldFont);
		label.setText("<font face=\"verdana\">"+message+"</font>");
		labels.put(label, element3);

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
		pnl2.add(label, BorderLayout.NORTH);

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
			lnk.setActionCommand(action.getKey());
			lnk.addActionListener(action.getValue());
			// lnk.setIcon(ImageUtil.getImageIconFrom(Icons.get("blank", size,
			// size)));
			JPanel pnlLnk = new JPanel();
			pnlLnk.setOpaque(false);
			Border border = pnlLnk.getBorder();
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
			label.setBackground(Color.WHITE);
			pnlIcon.setBackground(Color.WHITE);
			pnl2.setBackground(Color.WHITE);
			pnl3.setBackground(Color.WHITE);
			pnl.setBorder(BorderFactory.createLineBorder(Color.white.darker()));
			break;
		case NotificationElement.INFORMATION_MANDATORY:
			if (!infoImportantIcons.containsKey(size)) {
				infoImportantIcons.put(size, ImageUtil.getImageIconFrom(Icons.get("infoImportant", size, size)));
			}
			lblIcon.setIcon(infoImportantIcons.get(size));
			// pnl2.setBackground(ValidationComponentUtils.getMandatoryBackground());
			// pnl3.setBackground(ValidationComponentUtils.getMandatoryBackground());
			label.setBackground(Color.WHITE);
			pnlIcon.setBackground(Color.WHITE);
			pnl2.setBackground(Color.WHITE);
			pnl3.setBackground(Color.WHITE);
			pnl.setBorder(BorderFactory.createLineBorder(ValidationComponentUtils.getMandatoryBackground().darker()));
			break;
		case NotificationElement.WARNING:
			if (!warningIcons.containsKey(size)) {
				warningIcons.put(size, ImageUtil.getImageIconFrom(Icons.get("warning", size, size)));
			}
			lblIcon.setIcon(warningIcons.get(size));
			label.setBackground(ValidationComponentUtils.getWarningBackground());
			pnlIcon.setBackground(ValidationComponentUtils.getWarningBackground());
			pnl2.setBackground(ValidationComponentUtils.getWarningBackground());
			pnl3.setBackground(ValidationComponentUtils.getWarningBackground());
			pnl.setBorder(BorderFactory.createLineBorder(ValidationComponentUtils.getWarningBackground().darker()));
			break;
		case NotificationElement.ERROR:
			if (!errorIcons.containsKey(size)) {
				errorIcons.put(size, ImageUtil.getImageIconFrom(Icons.get("error", size, size)));
			}
			lblIcon.setIcon(errorIcons.get(size));
			label.setBackground(ValidationComponentUtils.getErrorBackground());
			pnlIcon.setBackground(ValidationComponentUtils.getErrorBackground());
			pnl2.setBackground(ValidationComponentUtils.getErrorBackground());
			pnl3.setBackground(ValidationComponentUtils.getErrorBackground());
			pnl.setBorder(BorderFactory.createLineBorder(ValidationComponentUtils.getErrorBackground().darker()));
			break;
		case NotificationElement.SUCCESS:
			if (!successIcons.containsKey(size)) {
				successIcons.put(size, ImageUtil.getImageIconFrom(Icons.get("default", size, size)));
			}
			lblIcon.setIcon(successIcons.get(size));
			label.setBackground(ValidationUtil.getSuccessBackground());
			pnlIcon.setBackground(ValidationUtil.getSuccessBackground());
			pnl2.setBackground(ValidationUtil.getSuccessBackground());
			pnl3.setBackground(ValidationUtil.getSuccessBackground());
			pnl.setBorder(BorderFactory.createLineBorder(ValidationUtil.getSuccessBackground().darker()));
			break;
		default:
			break;
		}
		pnlGrid.add(pnl);
		test.put(pnl, pnl);
		btnHideMessage.addActionListener(new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				removeNotificationElement(pnl);
			}
		});
		UIUtil.revalidateAndRepaint(pnlGrid);

		// int value = ScreenSizeUtil.adjustValueToResolution(6);
		// add(Box.createRigidArea(new Dimension(0, value)));
		notificationElements.add(element3);
	}

	public void removeNotificationElement(JPanel pnl) {
		if (test.containsKey(pnl)) {
			pnlGrid.remove(test.get(pnl));
			test.remove(pnl);
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
		pnlGrid = new JPanel(new GridLayout(0, 1));
		lblGameCover.setVisible(false);
		lblGameCover.setFocusable(false);
		setToolTipTexts();
	}

	private void setToolTipTexts() {
		lblGameCover.setToolTipText("Hier klicken um Cover hinzuzufügen");
	}

	private void createUI() {
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