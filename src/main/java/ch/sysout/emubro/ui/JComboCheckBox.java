/* * The following code is adapted from Java Forums - JCheckBox in JComboBox URL: http://forum.java.sun.com/thread.jspa?forumID=257&threadID=364705 Date of Access: July 28 2005 */
package ch.sysout.emubro.ui;

import java.awt.Component;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.util.Vector;

import javax.swing.ComboBoxModel;
import javax.swing.JCheckBox;
import javax.swing.JComboBox;
import javax.swing.JLabel;
import javax.swing.JList;
import javax.swing.ListCellRenderer;

public class JComboCheckBox extends JComboBox {
	private static final long serialVersionUID = 1L;

	public JComboCheckBox() {
		addStuff();
	}

	public JComboCheckBox(JCheckBox[] items) {
		super(items);
		addStuff();
	}

	public JComboCheckBox(Vector<?> items) {
		super(items);
		addStuff();
	}

	public JComboCheckBox(ComboBoxModel aModel) {
		super(aModel);
		addStuff();
	}

	private void addStuff() {
		setRenderer(new ComboBoxRenderer());
		addActionListener(new ActionListener() {
			@Override
			public void actionPerformed(ActionEvent ae) {
				itemSelected();
			}
		});
	}

	private void itemSelected() {
		if (getSelectedItem() instanceof JCheckBox) {
			JCheckBox jcb = (JCheckBox) getSelectedItem();
			jcb.setSelected(!jcb.isSelected());
		}
	}

	class ComboBoxRenderer implements ListCellRenderer {
		private JLabel defaultLabel;

		public ComboBoxRenderer() {
			setOpaque(true);
		}

		@Override
		public Component getListCellRendererComponent(JList list, Object value, int index, boolean isSelected,
				boolean cellHasFocus) {
			if (value instanceof Component) {
				Component c = (Component) value;
				if (isSelected) {
					c.setBackground(list.getSelectionBackground());
					c.setForeground(list.getSelectionForeground());
				} else {
					c.setBackground(list.getBackground());
					c.setForeground(list.getForeground());
				}
				return c;
			} else {
				if (defaultLabel == null) {
					defaultLabel = new JLabel(value.toString());
				} else {
					defaultLabel.setText(value.toString());
				}
				return defaultLabel;
			}
		}
	}
}