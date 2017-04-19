package ch.sysout.gameexplorer.ui;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import javax.swing.ImageIcon;
import javax.swing.event.TableModelListener;
import javax.swing.table.DefaultTableModel;

import ch.sysout.gameexplorer.api.model.Emulator;
import ch.sysout.gameexplorer.api.model.Platform;
import ch.sysout.gameexplorer.impl.model.BroEmulator;
import ch.sysout.util.Icons;
import ch.sysout.util.Messages;
import ch.sysout.util.ScreenSizeUtil;

public class EmulatorTableModel extends DefaultTableModel {
	private static final long serialVersionUID = 1L;

	private String[] columnNames = { "", Messages.get("columnEmulator"), Messages.get("columnFilePath") };
	private Map<Integer, Platform> platforms = new HashMap<>();
	private List<BroEmulator> emulators;
	private Map<Integer, ImageIcon> icons = new HashMap<>();
	private ImageIcon iconDefault;

	private int defaultEmulator;

	public EmulatorTableModel(List<BroEmulator> emulators) {
		int size = (ScreenSizeUtil.is3k()) ? 24 : 16;
		iconDefault = ImageUtil.getImageIconFrom(Icons.get("default", size, size));

		// this.emulators = emulators;
		this.emulators = new ArrayList<>();
		if (emulators != null) {
			for (Emulator emu : emulators) {
				addRow(emu);
			}
		}
	}

	@Override
	public int findColumn(String columnName) {
		return super.findColumn(columnName);
	}

	@Override
	public int getColumnCount() {
		return columnNames.length;
	}

	public Emulator getEmulator(int rowIndex) {
		return emulators.get(rowIndex);
	}

	@Override
	public Object getValueAt(int rowIndex, int columnIndex) {
		Emulator emulator = emulators.get(rowIndex);
		switch (columnIndex) {
		case 0:
			return rowIndex == defaultEmulator ? iconDefault : null;
		case 1:
			return emulator.getName();
		case 2:
			return emulator.getPath();
		}
		return emulator;
	}

	@Override
	public void setValueAt(Object aValue, int rowIndex, int columnIndex) {
		super.setValueAt(aValue, rowIndex, columnIndex);
	}

	@Override
	public String getColumnName(int column) {
		return columnNames[column];
	}

	@Override
	public Class<?> getColumnClass(int columnIndex) {
		if (columnIndex == 0) {
			return ImageIcon.class;
		}
		if (columnIndex == 1) {
			return String.class;
		}
		if (columnIndex == 2) {
			return String.class;
		}
		return String.class;
	}

	@Override
	public boolean isCellEditable(int row, int column) {
		return false;
	}

	public void addRow(Emulator emulator) {
		if (emulator.isInstalled()) {
			emulators.add((BroEmulator) emulator);
			if (!icons.containsKey(emulator.getId())) {
				int size = ScreenSizeUtil.adjustValueToResolution(16);
				ImageIcon ico = ImageUtil.getImageIconFrom("/images/emulators/" + emulator.getIconFilename());
				ico = ImageUtil.scaleCover(ico, size, CoverConstants.SCALE_BOTH_OPTION);
				icons.put(emulator.getId(), ico);
			} else {
				icons.get(emulator.getId());
			}

			Object[] emulatorArr = new Object[] { icons.get(emulator.getId()), emulator.getName(), emulator.getPath() };
			super.addRow(emulatorArr);
			// System.out.println((getRowCount()-1) + ", "+(getRowCount()-1));
			fireTableRowsInserted(getRowCount() - 1, getRowCount() - 1);
		}
	}

	public void removeAllElements() {
		final int elementCount = emulators.size();
		emulators.clear();
		if (getRowCount() > 0) {
			fireTableRowsDeleted(0, elementCount - 1);
			while (getRowCount() > 0) {
				super.removeRow(0);
			}
		}
	}

	public void initPlatforms(List<Platform> platforms2) {
		for (Platform p : platforms2) {
			platforms.put(p.getId(), p);
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

	public void removeEmulator(Emulator emulator) {
		emulators.remove(emulator.getId());
	}

	public int getDefaultEmulator() {
		return defaultEmulator;
	}

	public void setDefault(int row) {
		defaultEmulator = row;
		for (int i = 0; i < getRowCount(); i++) {
			setValueAt(i == row ? iconDefault : null, i, 0);
		}
	}
}