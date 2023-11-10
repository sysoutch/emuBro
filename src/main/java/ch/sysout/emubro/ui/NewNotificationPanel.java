package ch.sysout.emubro.ui;

import java.awt.BorderLayout;
import java.awt.Color;

import javax.swing.JButton;
import javax.swing.JPanel;
import javax.swing.SwingConstants;

import ch.sysout.ui.util.ImageUtil;
import ch.sysout.util.Icons;

public class NewNotificationPanel extends JPanel {
	private static final long serialVersionUID = 1L;

	public NewNotificationPanel() {
		setLayout(new BorderLayout());
	}

	public void addNotification(NotificationElement element3) {
		JButton btn = new JCustomButtonNew(element3.getMessage());
		btn.setHorizontalAlignment(SwingConstants.LEFT);
		switch (element3.getNotificationType()) {
		case NotificationElement.INFORMATION:
			btn.setIcon(ImageUtil.getFlatSVGIconFrom(Icons.get("info"), 16, new Color(137, 207, 240)));
			break;
		case NotificationElement.WARNING:
			btn.setIcon(ImageUtil.getFlatSVGIconFrom(Icons.get("warning"), 16, new Color(255, 195, 0)));
			break;
		case NotificationElement.ERROR:
			btn.setIcon(ImageUtil.getFlatSVGIconFrom(Icons.get("error"), 16, new Color(40, 167, 69)));
			break;
		}
		add(btn);
	}
}
