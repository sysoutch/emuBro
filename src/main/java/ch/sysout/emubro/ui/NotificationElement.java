package ch.sysout.emubro.ui;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.MissingResourceException;

import javax.swing.Action;

import ch.sysout.util.Messages;

public class NotificationElement {
	public static final int INFORMATION = 0;
	public static final int INFORMATION_MANDATORY = 1;
	public static final int WARNING = 2;
	public static final int ERROR = 3;
	public static final int SUCCESS = 4;

	private String[] messageKey;
	private String[] actionMessageKeys2;
	private Map<String, Action> actionMessageKeys;
	private int notificationType;
	private Action closeAction;

	public NotificationElement(String[] messageKey, Map<String, Action> actionMessageKeys, int notificationType,
			Action closeAction) {
		this.messageKey = messageKey;
		this.actionMessageKeys = actionMessageKeys;
		this.notificationType = notificationType;
		this.closeAction = closeAction;
	}

	public String getMessage() {
		String text = messageKey[0];
		if (messageKey.length > 1) {
			List<String> arguments = new ArrayList<>();
			for (int i = 1; i < messageKey.length; i++) {
				String key;
				try {
					key = Messages.get(messageKey[i]);
				} catch (MissingResourceException e) {
					key = messageKey[i];
				}
				arguments.add(key);
			}
			return Messages.get(text, arguments.toArray(new String[arguments.size()]));
		}
		return Messages.get(text);
	}

	public String[] getMessageKey() {
		return messageKey;
	}

	public Map<String, Action> getActionMessages() {
		return actionMessageKeys;
	}

	private List<String> translateActionMessageKeys(String[] keys) {
		List<String> messages = new ArrayList<>();
		String text = keys[0];
		if (keys.length > 1) {
			List<String> arguments = new ArrayList<>();
			for (int i = 1; i < keys.length; i++) {
				String key;
				try {
					key = Messages.get(keys[i]);
				} catch (MissingResourceException e) {
					key = keys[i];
				}
				arguments.add(key);
			}
			messages.add(Messages.get(text, arguments));
		} else {
			messages.add(Messages.get(text));
		}
		return messages;
	}

	public int getNotificationType() {
		return notificationType;
	}

	public Action getCloseAction() {
		return closeAction;
	}
}
