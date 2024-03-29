package ch.sysout.emubro.ui;

import java.awt.Color;
import java.io.File;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import javax.swing.ImageIcon;
import javax.swing.event.TableModelListener;
import javax.swing.filechooser.FileSystemView;
import javax.swing.table.DefaultTableModel;

import ch.sysout.emubro.api.model.Emulator;
import ch.sysout.emubro.api.model.Platform;
import ch.sysout.emubro.impl.model.BroEmulator;
import ch.sysout.emubro.impl.model.EmulatorConstants;
import ch.sysout.emubro.ui.GameTableModel.LabelIcon;
import ch.sysout.ui.util.ImageUtil;
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

	private int defaultEmulatorId = EmulatorConstants.NO_EMULATOR;

	/**
	 * @param emulators
	 * @param defaultEmulatorId when set it overrides the defaultEmulator from platform
	 */
	public EmulatorTableModel(List<BroEmulator> emulators, int defaultEmulatorId) {
		if (defaultEmulatorId != EmulatorConstants.NO_EMULATOR) {
			setDefaultEmulatorId(defaultEmulatorId);
		}
		int size = (ScreenSizeUtil.is3k()) ? 24 : 16;
		iconDefault = ImageUtil.getFlatSVGIconFrom(Icons.get("checkMark"), size, new Color(0, 129, 0));

		// this.emulators = emulators;
		this.emulators = new ArrayList<>();
		if (emulators != null) {
			for (Emulator emu : emulators) {
				addRow(emu);
			}
		}
	}

	public EmulatorTableModel(List<BroEmulator> emulators) {
		this(emulators, EmulatorConstants.NO_EMULATOR);
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
		return rowIndex == -1 ? null : emulators.get(rowIndex);
	}

	@Override
	public Object getValueAt(int rowIndex, int columnIndex) {
		Emulator emulator = emulators.get(rowIndex);
		String emulatorName = emulator.getName();
		String emulatorPath = emulator.getAbsolutePath();
		switch (columnIndex) {
		case 0:
			return rowIndex == defaultEmulatorId ? iconDefault : null;
		case 1:
			return "<html><strong>"+emulatorName+"</strong></html>";
		case 2:
			return emulatorPath;
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
		switch (columnIndex) {
		case 0:
			return ImageIcon.class;
		case 1:
			return LabelIcon.class;
		case 2:
			return String.class;
		default:
			break;
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
			ImageIcon ico = null;
			if (icons.containsKey(emulator.getId())) {
				ico = icons.get(emulator.getId());
			} else {
				int size = ScreenSizeUtil.adjustValueToResolution(16);
				String iconFilename = emulator.getIconFilename();
				if (iconFilename.trim().isEmpty() || iconFilename.equalsIgnoreCase("blank.png")) {
					File file = new File(emulator.getAbsolutePath());
					ico = (ImageIcon) FileSystemView.getFileSystemView().getSystemIcon(file);
					//					int width = ico.getIconWidth();
					//					int height = ico.getIconHeight();
					//
					//					double size2 = 32;
					//					double factor2 = (height / size2);
					//					if (height > size2) {
					//						height = (int) (height / factor2);
					//						width = (int) (width / factor2);
					//					}
					//					BufferedImage bi = new BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB);
					//					Graphics2D g2d = bi.createGraphics();
					//					g2d.addRenderingHints(new RenderingHints(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY));
					//					g2d.drawImage(ico.getImage(), 0, 0, width, height, null);
				}
				if (ico == null) {
					ico = IconStore.current().getEmulatorIcon(emulator.getId());
				}
				if (ico != null) {
					ico = ImageUtil.scaleCover(ico, size, CoverConstants.SCALE_BOTH_OPTION);
				}
				icons.put(emulator.getId(), ico);
			}
			LabelIcon iconLabel = new LabelIcon(ico, emulator.getName());
			Object[] emulatorArr = new Object[] { null, iconLabel, emulator.getAbsolutePath() };
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
		for (int i = 0; i < emulators.size(); i++) {
			Emulator emu = emulators.get(i);
			if (emu.getId() == emulator.getId()) {
				emulators.remove(i);
				super.removeRow(i);
				fireTableRowsDeleted(i, i);
				break;
			}
		}
	}

	public int getDefaultEmulatorId() {
		return defaultEmulatorId;
	}

	void setDefaultEmulatorId(int emulatorId) {
		defaultEmulatorId = emulatorId;
		for (int i = 0; i < getRowCount(); i++) {
			setValueAt(i == emulatorId ? iconDefault : null, i, 0);
		}
	}
}