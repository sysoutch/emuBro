package ch.sysout.emubro.ui;

import java.awt.Component;

import javax.swing.DefaultComboBoxModel;
import javax.swing.JComboBox;
import javax.swing.JComponent;
import javax.swing.JMenuItem;
import javax.swing.JPopupMenu;
import javax.swing.JSeparator;

public class JExtendedComboBox<E> extends JComboBox<E> {
	private static final long serialVersionUID = 1L;

	private JMenuItem itmCut = new JMenuItem("Ausschneiden");
	private JMenuItem itmCopy = new JMenuItem("Kopieren");
	private JMenuItem itmPaste = new JMenuItem("Einfügen");
	private JMenuItem itmDelete = new JMenuItem("Löschen");
	private JMenuItem itmSelectAll = new JMenuItem("Alles markieren");

	public JExtendedComboBox(String[] arrReverseList) {
		setModel(new DefaultComboBoxModel<E>((E[]) arrReverseList));
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
