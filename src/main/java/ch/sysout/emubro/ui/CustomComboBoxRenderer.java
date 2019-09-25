package ch.sysout.emubro.ui;

import java.awt.Color;
import java.awt.Component;

import javax.swing.JLabel;
import javax.swing.JList;
import javax.swing.ListCellRenderer;

import ch.sysout.emubro.api.model.Platform;

public class CustomComboBoxRenderer extends JLabel implements ListCellRenderer {
	private static final long serialVersionUID = 1L;

	private Color colorBackground = IconStore.current().getCurrentTheme().getButtonBar().getColor();

	public CustomComboBoxRenderer() {
		setOpaque(true);
		//		setFont(new Font("Arial", Font.BOLD | Font.ITALIC, 54));
		setBackground(colorBackground);
		//		setForeground(Color.YELLOW);
	}

	@Override
	public Component getListCellRendererComponent(JList list, Object value,
			int index, boolean isSelected, boolean cellHasFocus) {
		setText(value.toString());
		setIcon(IconStore.current().getPlatformIcon(((Platform) value).getId()));
		return this;
	}
}
