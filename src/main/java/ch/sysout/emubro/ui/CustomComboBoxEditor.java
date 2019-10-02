package ch.sysout.emubro.ui;

import java.awt.Color;
import java.awt.Component;

import javax.swing.plaf.basic.BasicComboBoxEditor;

public class CustomComboBoxEditor extends BasicComboBoxEditor {
	private Color color = IconStore.current().getCurrentTheme().getGameFilterPane().getColor();
	private Color color2 = Color.WHITE;

	@Override
	public Component getEditorComponent() {
		Component cmp = super.getEditorComponent();
		if (cmp != null) {
			if (color != null && cmp.getBackground() != null && !cmp.getBackground().equals(color)) {
				cmp.setBackground(color);
			}
			if (color2 != null && cmp.getForeground() != null && !cmp.getForeground().equals(color2)) {
				cmp.setForeground(color2);
			}
		}
		return cmp;
	}
}
