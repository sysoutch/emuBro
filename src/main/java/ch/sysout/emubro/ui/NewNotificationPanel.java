package ch.sysout.emubro.ui;

import javax.swing.JButton;
import javax.swing.JPanel;

import ch.sysout.ui.util.ImageUtil;
import ch.sysout.util.Icons;

public class NewNotificationPanel extends JPanel {
	private static final long serialVersionUID = 1L;

	public NewNotificationPanel() {

	}

	public void addNotification(NotificationElement element3) {
		JButton btn = new JCustomButtonNew(element3.getMessage());
		switch (element3.getNotificationType()) {
		case NotificationElement.INFORMATION:
			btn.setIcon(ImageUtil.getFlatSVGIconFrom(Icons.get("info"), 32));
			break;
		case NotificationElement.WARNING:
			btn.setIcon(ImageUtil.getFlatSVGIconFrom(Icons.get("warning"), 32));
			break;
		case NotificationElement.ERROR:
			btn.setIcon(ImageUtil.getFlatSVGIconFrom(Icons.get("error"), 32));
			break;
		}
		add(btn);
	}
}
