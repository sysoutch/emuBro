package ch.sysout.emubro.ui;

import java.util.ArrayList;
import java.util.List;
import java.util.MissingResourceException;

import ch.sysout.emubro.controller.NotificationElementListener;
import ch.sysout.util.Messages;

public class NotificationElement {
	public static final int INFORMATION = 0;
	public static final int INFORMATION_MANDATORY = 1;
	public static final int WARNING = 2;
	public static final int ERROR = 3;
	public static final int SUCCESS = 4;

	private String[] messageKey;
	private String[] actionMessageKeys2;
	private String[][] actionMessageKeys;
	private int notificationType;
	private NotificationElementListener listener;

	public NotificationElement(String[] messageKey, String[][] actionMessageKeys, int notificationType,
			NotificationElementListener listener) {
		this.messageKey = messageKey;
		this.actionMessageKeys = actionMessageKeys;
		this.notificationType = notificationType;
		this.listener = listener;
	}

	public NotificationElement(String[] messageKey, String[] actionMessageKeys, int notificationType,
			NotificationElementListener listener) {
		this.messageKey = messageKey;
		actionMessageKeys2 = actionMessageKeys;
		this.notificationType = notificationType;
		this.listener = listener;
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

	public List<String> getActionMessages() {
		if (actionMessageKeys2 != null) {
			return translateActionMessageKeys(actionMessageKeys2);
		} else {
			if (actionMessageKeys != null) {
				List<String> sArr2 = new ArrayList<>();
				for (String[] sArr : actionMessageKeys) {
					List<String> bla = translateActionMessageKeys(sArr);
					for (String bla2 : bla) {
						sArr2.add(bla2);
					}
				}
				return sArr2;
			}
		}
		return null;
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

	public NotificationElementListener getListener() {
		return listener;
	}
}
