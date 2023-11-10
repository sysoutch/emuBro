package ch.sysout.emubro.ui.util;

import com.jgoodies.forms.layout.ColumnSpec;
import com.jgoodies.forms.layout.FormLayout;
import com.jgoodies.forms.layout.RowSpec;

public class FormLayoutUtils {

	public static void addRow(FormLayout layout) {
		layout.appendRow(RowSpec.decode("min"));
	}

	public static void addGrowRow(FormLayout layout) {
		layout.appendRow(RowSpec.decode("fill:min:grow"));
	}

	public static void appendColumn(FormLayout layout) {
		layout.appendColumn(ColumnSpec.decode("min"));
	}

	public static void appendGrowColumn(FormLayout layout) {
		layout.appendColumn(ColumnSpec.decode("min:grow"));
	}

}
