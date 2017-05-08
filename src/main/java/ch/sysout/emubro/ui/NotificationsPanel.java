package ch.sysout.emubro.ui;

import java.awt.BorderLayout;
import java.awt.Color;
import java.awt.Cursor;
import java.awt.Dimension;
import java.awt.FlowLayout;
import java.awt.Font;
import java.awt.GridLayout;
import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import javax.swing.AbstractButton;
import javax.swing.BorderFactory;
import javax.swing.Icon;
import javax.swing.ImageIcon;
import javax.swing.JButton;
import javax.swing.JLabel;
import javax.swing.JPanel;
import javax.swing.JTextPane;
import javax.swing.SwingConstants;
import javax.swing.border.Border;
import javax.swing.border.CompoundBorder;
import javax.swing.border.EmptyBorder;
import javax.swing.text.DefaultStyledDocument;
import javax.swing.text.Style;
import javax.swing.text.StyleConstants;
import javax.swing.text.StyleContext;
import javax.swing.text.StyledDocument;

import com.jgoodies.forms.factories.Paddings;
import com.jgoodies.validation.view.ValidationComponentUtils;

import ch.sysout.util.Icons;
import ch.sysout.util.ScreenSizeUtil;
import ch.sysout.util.ValidationUtil;

public class NotificationsPanel extends JPanel {
	private static final long serialVersionUID = 1L;

	private JLabel lblGameCover = new JLabel();
	private HashMap<JPanel, JPanel> test = new HashMap<>();

	private List<NotificationElement> notificationElements = new ArrayList<>();
	private Map<JTextPane, NotificationElement> labels = new HashMap<>();
	private Map<List<JLabel>, NotificationElement> links = new HashMap<>();

	private Map<Integer, ImageIcon> infoIcons = new HashMap<>();
	private Map<Integer, ImageIcon> infoImportantIcons = new HashMap<>();
	private Map<Integer, ImageIcon> warningIcons = new HashMap<>();
	private Map<Integer, ImageIcon> errorIcons = new HashMap<>();
	private Map<Integer, ImageIcon> successIcons = new HashMap<>();

	private JPanel pnlGrid;

	private Icon iconHideMessage = ImageUtil.getImageIconFrom(Icons.get("hideDetailsPane", 16, 16));
	private Icon iconHideMessageHover = ImageUtil.getImageIconFrom(Icons.get("hideDetailsPaneHover", 16, 16));

	private Dimension minimumNotificationsHeight = new Dimension(0, ScreenSizeUtil.adjustValueToResolution(96));

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
		String message = element3.getMessage();
		element3.getMessageKey();
		List<String> actionMessages = element3.getActionMessages();
		int notificationType = element3.getNotificationType();
		element3.getListener();

		if (notificationElements != null && notificationElements.contains(element3)) {
			return;
		}
		// LayoutManager formLayout = new FormLayout("min:grow");
		final JPanel pnl = new JPanel(new GridLayout(0, 1));
		// pnl.setBackground(backgroundColor);

		JTextPane label = new JTextPane();
		Font oldFont = label.getFont();
		label.setContentType("text/html");
		label.setFont(oldFont);
		label.setEditable(false);
		label.setText(message);
		labels.put(label, element3);

		int size = ScreenSizeUtil.adjustValueToResolution(16);
		final JPanel pnl2 = new JPanel(new BorderLayout(0, 2));
		pnl2.setBorder(Paddings.DLU4);
		pnl2.add(label, BorderLayout.NORTH);

		// HTMLEditorKit kit = new HTMLEditorKit();
		// StyleSheet styleSheet = kit.getStyleSheet();
		// styleSheet.addRule("a {color:#ff0000;}");
		WrapLayout wrapLayout = new WrapLayout();
		wrapLayout.setAlignment(FlowLayout.LEFT);
		JPanel pnl3 = new JPanel(wrapLayout);
		List<JLabel> links2 = new ArrayList<>();
		for (String s : actionMessages) {
			JLabel lnk = new JLabel();
			links2.add(lnk);
			lnk.setText("<html><a href=''>" + s + "</a></html>");
			lnk.addMouseListener(new MouseAdapter() {
				@Override
				public void mouseEntered(MouseEvent e) {
					setCursor(Cursor.getPredefinedCursor(Cursor.HAND_CURSOR));
				}

				@Override
				public void mouseExited(MouseEvent e) {
					setCursor(Cursor.getPredefinedCursor(Cursor.DEFAULT_CURSOR));
				}
			});
			// lnk.setIcon(ImageUtil.getImageIconFrom(Icons.get("blank", size,
			// size)));
			JPanel pnlLnk = new JPanel();
			pnlLnk.setOpaque(false);
			Border border = pnlLnk.getBorder();
			Border margin = new EmptyBorder(0, 10, 0, 0);
			pnlLnk.setBorder(new CompoundBorder(border, margin));
			pnlLnk.add(lnk);
			pnl3.add(pnlLnk);
		}
		links.put(links2, element3);

		pnl2.add(pnl3, BorderLayout.WEST);

		AbstractButton btnHideMessage = new JButton(iconHideMessage);
		btnHideMessage.setBorderPainted(false);
		btnHideMessage.setContentAreaFilled(false);
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
		pnl.add(pnl2);
		StyleContext context = new StyleContext();
		StyledDocument document = new DefaultStyledDocument(context);
		Style labelStyle = context.getStyle(StyleContext.DEFAULT_STYLE);
		Icon icon = null;
		switch (notificationType) {
		case NotificationElement.INFORMATION:
			if (!infoIcons.containsKey(size)) {
				infoIcons.put(size, ImageUtil.getImageIconFrom(Icons.get("info", size, size)));
			}
			icon = infoIcons.get(size);
			//			label.setIcon(infoIcons.get(size));
			label.setBackground(Color.WHITE);
			pnl2.setBackground(Color.WHITE);
			pnl3.setBackground(Color.WHITE);
			pnl.setBorder(BorderFactory.createLineBorder(Color.white.darker()));
			break;
		case NotificationElement.INFORMATION_MANDATORY:
			if (!infoImportantIcons.containsKey(size)) {
				infoImportantIcons.put(size, ImageUtil.getImageIconFrom(Icons.get("infoImportant", size, size)));
			}
			icon = infoImportantIcons.get(size);
			//			label.setIcon(infoImportantIcons.get(size));
			// pnl2.setBackground(ValidationComponentUtils.getMandatoryBackground());
			// pnl3.setBackground(ValidationComponentUtils.getMandatoryBackground());
			label.setBackground(Color.WHITE);
			pnl2.setBackground(Color.WHITE);
			pnl3.setBackground(Color.WHITE);
			pnl.setBorder(BorderFactory.createLineBorder(ValidationComponentUtils.getMandatoryBackground().darker()));
			break;
		case NotificationElement.WARNING:
			if (!warningIcons.containsKey(size)) {
				warningIcons.put(size, ImageUtil.getImageIconFrom(Icons.get("warning", size, size)));
			}
			icon = warningIcons.get(size);
			//			label.setIcon(warningIcons.get(size));
			label.setBackground(ValidationComponentUtils.getWarningBackground());
			pnl2.setBackground(ValidationComponentUtils.getWarningBackground());
			pnl3.setBackground(ValidationComponentUtils.getWarningBackground());
			pnl.setBorder(BorderFactory.createLineBorder(ValidationComponentUtils.getWarningBackground().darker()));
			break;
		case NotificationElement.ERROR:
			if (!errorIcons.containsKey(size)) {
				errorIcons.put(size, ImageUtil.getImageIconFrom(Icons.get("error", size, size)));
			}
			icon = errorIcons.get(size);
			//			label.setIcon(errorIcons.get(size));
			label.setBackground(ValidationComponentUtils.getErrorBackground());
			pnl2.setBackground(ValidationComponentUtils.getErrorBackground());
			pnl3.setBackground(ValidationComponentUtils.getErrorBackground());
			pnl.setBorder(BorderFactory.createLineBorder(ValidationComponentUtils.getErrorBackground().darker()));
			break;
		case NotificationElement.SUCCESS:
			if (!successIcons.containsKey(size)) {
				successIcons.put(size, ImageUtil.getImageIconFrom(Icons.get("default", size, size)));
			}
			icon = successIcons.get(size);
			//			label.setIcon(successIcons.get(size));
			label.setBackground(ValidationUtil.getSuccessBackground());
			pnl2.setBackground(ValidationUtil.getSuccessBackground());
			pnl3.setBackground(ValidationUtil.getSuccessBackground());
			pnl.setBorder(BorderFactory.createLineBorder(ValidationUtil.getSuccessBackground().darker()));
			break;
		default:
			break;
		}
		JLabel lbl = new JLabel(message, icon, SwingConstants.LEFT);
		StyleConstants.setComponent(labelStyle, lbl);
		label.setDocument(document);
		pnlGrid.add(pnl);
		pnlGrid.revalidate();
		pnlGrid.repaint();

		// int value = ScreenSizeUtil.adjustValueToResolution(6);
		// add(Box.createRigidArea(new Dimension(0, value)));
		notificationElements.add(element3);
	}

	public void removeNotificationElement(JPanel pnl) {
		if (test.containsKey(pnl)) {
			remove(test.get(pnl));
			test.remove(pnl);

			revalidate();
			repaint();
		}
	}

	private void initComponents() {
		pnlGrid = new JPanel(new GridLayout(0, 1));
		lblGameCover.setVisible(false);
		lblGameCover.setFocusable(false);
		setToolTipTexts();
	}

	/**
	 *
	 */
	private void setToolTipTexts() {
		lblGameCover.setToolTipText("Hier klicken um Cover hinzuzufügen");
	}

	private void createUI() {
		add(pnlGrid, BorderLayout.NORTH);
		// setBorder(Paddings.TABBED_DIALOG);
	}

	public int getElementCount() {
		return pnlGrid.getComponentCount();
	}

	public void languageChanged() {
		for (JTextPane lbl : labels.keySet()) {
			NotificationElement messageKey = labels.get(lbl);
			String text = messageKey.getMessage();
			lbl.setText(text);
		}
		for (List<JLabel> lnk : links.keySet()) {
			NotificationElement messageKey = links.get(lnk);
			List<String> text = messageKey.getActionMessages();
			int counter = 0;
			for (JLabel lbl : lnk) {
				lbl.setText("<html><a href=''>" + text.get(counter) + "</a></html>");
				counter++;
			}
		}
	}
}