package ch.sysout.emubro.ui;

import java.awt.Component;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;

import javax.swing.JComponent;
import javax.swing.JMenuItem;
import javax.swing.JPopupMenu;
import javax.swing.JSeparator;
import javax.swing.JTextField;
import javax.swing.event.PopupMenuEvent;
import javax.swing.text.BadLocationException;

import ch.sysout.emubro.api.PopupMenuAdapter;
import ch.sysout.emubro.util.MessageConstants;
import ch.sysout.util.Messages;
import ch.sysout.util.UIUtil;

public class JExtendedTextField extends JTextField implements ActionListener {
	private static final long serialVersionUID = 1L;

	private JMenuItem itmCut = new JMenuItem(Messages.get(MessageConstants.CUT));
	private JMenuItem itmCopy = new JMenuItem(Messages.get(MessageConstants.COPY));
	private JMenuItem itmPaste = new JMenuItem(Messages.get(MessageConstants.PASTE));
	private JMenuItem itmDelete = new JMenuItem(Messages.get(MessageConstants.DELETE));
	private JMenuItem itmSelectAll = new JMenuItem(Messages.get(MessageConstants.SELECT_ALL2));

	public JExtendedTextField() {
		this("");
	}

	public JExtendedTextField(String text) {
		super(text);
		JPopupMenu popup = new JPopupMenu();
		addComponentsToJComponent(popup, itmCut, itmCopy, itmPaste, itmDelete, new JSeparator(), itmSelectAll);
		add(popup);
		setComponentPopupMenu(popup);
		for (Component c : popup.getComponents()) {
			c.setEnabled(false);
		}
		itmSelectAll.addActionListener(this);
		itmCopy.addActionListener(this);
		itmCut.addActionListener(this);
		itmDelete.addActionListener(this);
		itmPaste.addActionListener(this);
		popup.addPopupMenuListener(new PopupMenuAdapter() {

			@Override
			public void popupMenuWillBecomeVisible(PopupMenuEvent e) {
				checkText();
			}
		});
	}

	protected void deleteSelectedText() {
		replaceSelection("");
	}

	private void checkText() {
		String text = getText();
		boolean empty = text.isEmpty() || isSearchFieldEmpty();
		boolean clipboardEmpty = UIUtil.getClipboardText() == null || UIUtil.getClipboardText().isEmpty();
		boolean textSelected = getSelectedText() != null && !getSelectedText().isEmpty();
		itmCut.setEnabled(!empty && textSelected);
		itmCopy.setEnabled(!empty && textSelected);
		itmDelete.setEnabled(!empty && textSelected);
		itmSelectAll.setEnabled(!empty);
		itmPaste.setEnabled(!clipboardEmpty);
	}

	boolean isSearchFieldEmpty() {
		return getText().equals(Messages.get(MessageConstants.SEARCH_GAME) + " (Ctrl+F)");
	}

	private void addComponentsToJComponent(JComponent component, Component... components) {
		for (Component o : components) {
			component.add(o);
		}
	}

	@Override
	public void actionPerformed(ActionEvent e) {
		Object source = e.getSource();
		if (source == itmSelectAll) {
			requestFocusInWindow();
			selectAll();
		} else if (source == itmCopy) {
			requestFocusInWindow();
			UIUtil.copyTextToClipboard(getSelectedText());
		} else if (source == itmCut) {
			requestFocusInWindow();
			UIUtil.copyTextToClipboard(getSelectedText());
			deleteSelectedText();
		} else if (source == itmDelete) {
			requestFocusInWindow();
			deleteSelectedText();
		} else if (source == itmPaste) {
			try {
				if (!itmSelectAll.isEnabled()) {
					setText(UIUtil.getClipboardText());
				} else {
					if (getSelectedText() != null && !getSelectedText().isEmpty()) {
						replaceSelection(UIUtil.getClipboardText());
					} else {
						getDocument().insertString(getCaretPosition(), UIUtil.getClipboardText(), null);
					}
				}
			} catch (BadLocationException e1) {
				// TODO Auto-generated catch block
				e1.printStackTrace();
			}
		}
	}

	public void languageChanged() {
		itmCut.setText(Messages.get(MessageConstants.CUT));
		itmCopy.setText(Messages.get(MessageConstants.COPY));
		itmPaste.setText(Messages.get(MessageConstants.PASTE));
		itmDelete.setText(Messages.get(MessageConstants.DELETE));
		itmSelectAll.setText(Messages.get(MessageConstants.SELECT_ALL2));
	}
}
