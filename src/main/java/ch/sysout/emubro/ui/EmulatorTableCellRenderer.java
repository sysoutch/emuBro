package ch.sysout.emubro.ui;

import java.awt.Component;
import java.io.File;
import java.util.HashMap;
import java.util.Map;

import javax.swing.ImageIcon;
import javax.swing.JTable;
import javax.swing.filechooser.FileSystemView;
import javax.swing.table.DefaultTableCellRenderer;

import ch.sysout.emubro.api.model.Emulator;
import ch.sysout.emubro.api.model.Platform;
import ch.sysout.util.ImageUtil;
import ch.sysout.util.ScreenSizeUtil;

public class EmulatorTableCellRenderer extends DefaultTableCellRenderer {
	private static final long serialVersionUID = 1L;
	private Map<Integer, ImageIcon> icons = new HashMap<>();
	private Platform platform;

	public EmulatorTableCellRenderer(Platform platform) {
		this.platform = platform;
	}

	@Override
	public Component getTableCellRendererComponent(JTable table, Object value, boolean isSelected,
			boolean hasFocus, int row, int column) {
		super.getTableCellRendererComponent(table, value, isSelected, hasFocus, row, column);
		EmulatorTableModel model = (EmulatorTableModel) table.getModel();
		Emulator emu = (Emulator) model.getValueAt(table.convertRowIndexToModel(row), -1);
		Platform plat = platform;
		if (plat.hasDefaultEmulator()) {
			Emulator defaultEmulator = plat.getDefaultEmulator();
			if (defaultEmulator != null && defaultEmulator.equals(emu)) {
				if (model.getDefaultEmulatorId() != row) {
					model.setDefaultEmulatorId(row);
				}
			}
		}
		if (emu != null) {
			ImageIcon ico = null;
			if (!icons.containsKey(emu.getId())) {
				String iconFilename = emu.getIconFilename();
				if (iconFilename.trim().isEmpty() || iconFilename.equalsIgnoreCase("blank.png")) {
					File file = new File(emu.getPath());
					ico = (ImageIcon) FileSystemView.getFileSystemView().getSystemIcon(file);
				} else {
					ico = IconStore.current().getEmulatorIcon(emu.getId());
				}
				if (ico == null) {
					throw new NullPointerException("ico should not be null in general.");
				}
				ico = ImageUtil.scaleCover(ico, ScreenSizeUtil.adjustValueToResolution(24), CoverConstants.SCALE_BOTH_OPTION);
				icons.put(emu.getId(), ico);
			}
			setIcon(icons.get(emu.getId()));
		}
		return this;
	}
}
