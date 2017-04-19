package ch.sysout.gameexplorer.ui;

import java.awt.Component;

import javax.swing.JComponent;
import javax.swing.JMenuItem;
import javax.swing.JPopupMenu;
import javax.swing.JSeparator;
import javax.swing.JTextField;

public class JExtendedTextField extends JTextField {
	private static final long serialVersionUID = 1L;

	private JMenuItem itmCut = new JMenuItem("Ausschneiden");
	private JMenuItem itmCopy = new JMenuItem("Kopieren");
	private JMenuItem itmPaste = new JMenuItem("Einfügen");
	private JMenuItem itmDelete = new JMenuItem("Löschen");
	private JMenuItem itmSelectAll = new JMenuItem("Alles markieren");

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
	}

	private void addComponentsToJComponent(JComponent component, Component... components) {
		for (Component o : components) {
			component.add(o);
		}
	}
}
