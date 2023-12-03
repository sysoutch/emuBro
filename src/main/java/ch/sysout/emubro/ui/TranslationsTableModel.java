package ch.sysout.emubro.ui;

import ch.sysout.emubro.api.model.Explorer;
import ch.sysout.emubro.util.Translation;

import javax.swing.*;
import javax.swing.event.TableModelListener;
import javax.swing.table.DefaultTableCellRenderer;
import javax.swing.table.DefaultTableModel;
import java.awt.*;
import java.util.ArrayList;
import java.util.List;

public class TranslationsTableModel extends DefaultTableModel {
	private static final long serialVersionUID = 1L;

	public static final int TITLE_COLUMN_INDEX = 0;
	public static final int PLATFORM_COLUMN_INDEX = 1;
	public static final int RATING_COLUMN_INDEX = 2;
	public static final int DATE_ADDED_COLUMN_INDEX = 3;
	public static final int LAST_PLAYED_COLUMN_INDEX = 4;
	private String[] columnNames = { "Key", "Value", "New Value", "OK?", "Comment" };
	private List<Translation> translations = new ArrayList<>();

	private Explorer explorer;

	private int currentCoverSize;

	private LabelIcon lblIcon = new LabelIcon(null, null);

	public TranslationsTableModel(Explorer explorer) {
		this.explorer = explorer;
	}

	@Override
	public int findColumn(String columnName) {
		return super.findColumn(columnName);
	}

	@Override
	public int getColumnCount() {
		return columnNames.length;
	}

	@Override
	public Object getValueAt(int rowIndex, int columnIndex) {
		if (rowIndex == -1) {
			return null;
		}
		if (translations != null && translations.size() > rowIndex) {
			Translation translation = translations.get(rowIndex);
			if (translation != null) {
				if (columnIndex == -1) {
					return translation;
				}
				Object value = "??";
				switch (columnIndex) {
				case 0:
					value = translation.getKeyName();
					break;
				case 1:
					value = translation.getValue();
					break;
				case 2:
					value = translation.getNewValue();
					break;
				case 3:
					value = translation.getOkCheckBox();
					break;
				case 4:
					value = translation.getComment();
					break;
				}
				return value;
			}
		}
		return null;
	}

	@Override
	public String getColumnName(int column) {
		return columnNames[column];
	}

	@Override
	public Class<?> getColumnClass(int columnIndex) {
		switch (columnIndex) {
		case 0:
			return String.class;
		case 1:
			return String.class;
		case 2:
			return String.class;
		case 3:
			return Boolean.class;
		case 4:
			return String.class;
		default:
			return super.getColumnClass(columnIndex);
		}
	}

	public static class LabelIcon {
		Icon icon;
		String text;

		public LabelIcon(Icon icon, String text) {
			this.icon = icon;
			this.text = text;
		}

		public void setIcon(ImageIcon icon) {
			this.icon = icon;
		}

		public void setText(String text) {
			this.text = text;
		}

		@Override
		public String toString() {
			return text;
		}
	}

	public static class LabelIconRenderer extends DefaultTableCellRenderer {
		private static final long serialVersionUID = 1L;

		public LabelIconRenderer() {
			setHorizontalTextPosition(JLabel.RIGHT);
			setVerticalTextPosition(JLabel.CENTER);
		}

		@Override
		public Component getTableCellRendererComponent(JTable table, Object
				value, boolean isSelected, boolean hasFocus, int row, int col) {
			JLabel r = (JLabel) super.getTableCellRendererComponent(
					table, value, isSelected, hasFocus, row, col);
			setIcon(((LabelIcon) value).icon);
			setText(((LabelIcon) value).text);
			return r;
		}
	}

	@Override
	public void setValueAt(Object aValue, int rowIndex, int columnIndex) {
		if (columnIndex == 0 || columnIndex == 1) {
			return;
		}
		Translation translation = translations.get(rowIndex);
		if (columnIndex == 2) {
			translation.setNewValue((String) aValue);
			translations.set(rowIndex, translation);
		}
		if (columnIndex == 3) {
			boolean oldState = translation.getOkCheckBox();
			translation.setOkCheckBox(!oldState);
			translations.set(rowIndex, translation);
		}
	}

	@Override
	public boolean isCellEditable(int row, int column) {
        return column != 0 && column != 1;
    }

	public void addRow(Translation translation) {
		translations.add(translation);
		Object[] translationRow = new Object[] { translation.getKeyName(), translation.getValue(), translation.getNewValue(), translation.getOkCheckBox(), translation.getComment() };
		super.addRow(translationRow);
		//		fireTableRowsInserted(getRowCount() - 1, getRowCount() - 1);
	}

	public void removeAllElements() {
		translations.clear();
		if (getRowCount() > 0) {
			fireTableRowsDeleted(0, 0);
			while (getRowCount() > 0) {
				super.removeRow(0);
			}
		}
	}

	@Override
	public void addTableModelListener(TableModelListener l) {
		listenerList.add(TableModelListener.class, l);
	}

	@Override
	public void removeTableModelListener(TableModelListener l) {
		listenerList.remove(TableModelListener.class, l);
	}

	@Override
	public void removeRow(int row) {
		super.removeRow(row);
		translations.remove(row);
	}

	public void removeGame(Translation translation) {
		for (int i = 0; i < translations.size(); i++) {
			if (translations.get(i) == translation) {
				removeRow(i);
				break;
			}
		}
	}

	public void languageChanged() {
//		for (int i = 0; i < columnNames.length; i++) {
//			switch (i) {
//			case TITLE_COLUMN_INDEX:
//				columnNames[i] = Messages.get(MessageConstants.COLUMN_TITLE);
//				break;
//			case PLATFORM_COLUMN_INDEX:
//				columnNames[i] = Messages.get(MessageConstants.COLUMN_PLATFORM);
//				break;
//			case RATING_COLUMN_INDEX:
//				columnNames[i] = Messages.get(MessageConstants.COLUMN_RATING);
//				break;
//			case DATE_ADDED_COLUMN_INDEX:
//				columnNames[i] = Messages.get(MessageConstants.COLUMN_DATE_ADDED);
//				break;
//			case LAST_PLAYED_COLUMN_INDEX:
//				columnNames[i] = Messages.get(MessageConstants.COLUMN_LAST_PLAYED);
//				break;
//			}
//		}
	}

	public void setColumnIdentifiersNow() {
		setColumnIdentifiers(columnIdentifiers);
	}

	public boolean contains(Translation translation) {
		return translations.contains(translation);
	}

	public List<Translation> getAllElements() {
		return translations;
	}
}