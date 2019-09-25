package ch.sysout.emubro.ui;

import java.awt.Color;
import java.awt.Component;

import javax.swing.plaf.basic.BasicComboBoxEditor;

public class CustomComboBoxEditor extends BasicComboBoxEditor {
	private Color color = IconStore.current().getCurrentTheme().getButtonBar().getColor();
	private Color color2 = Color.WHITE;

	@Override
	public Component getEditorComponent() {
		Component cmp = super.getEditorComponent();
		if (!cmp.getBackground().equals(color)) {
			cmp.setBackground(color);
		}
		if (!cmp.getForeground().equals(color2)) {
			cmp.setForeground(color2);
		}
		return cmp;
	}
}
