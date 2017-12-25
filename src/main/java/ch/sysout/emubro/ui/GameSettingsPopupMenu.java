package ch.sysout.emubro.ui;

import java.io.File;
import java.util.ArrayList;
import java.util.List;

import javax.swing.ButtonGroup;
import javax.swing.Icon;
import javax.swing.ImageIcon;
import javax.swing.JMenuItem;
import javax.swing.JPopupMenu;
import javax.swing.JRadioButtonMenuItem;
import javax.swing.JSeparator;
import javax.swing.filechooser.FileSystemView;

import ch.sysout.emubro.api.model.Emulator;
import ch.sysout.emubro.impl.model.BroEmulator;
import ch.sysout.emubro.impl.model.EmulatorConstants;
import ch.sysout.ui.ImageUtil;
import ch.sysout.util.Icons;
import ch.sysout.util.Messages;
import ch.sysout.util.ScreenSizeUtil;

class GameSettingsPopupMenu extends JPopupMenu {
	private static final long serialVersionUID = 1L;

	public GameSettingsPopupMenu() {
		// super(6);
		setAccelerators();
		setIcons();
		addListeners();
	}

	private void setAccelerators() {
	}

	private void setIcons() {
	}

	private void addListeners() {
	}

	public void initEmulators(List<BroEmulator> emulators, int defaultEmulatorIndex) {
		removeAll();
		ScreenSizeUtil.adjustValueToResolution(32);
		ButtonGroup group = new ButtonGroup();
		List<JRadioButtonMenuItem> radios = new ArrayList<>();
		for (Emulator emu : emulators) {
			if (!emu.isInstalled()) {
				continue;
			}
			String s = "<html><strong>" + emu.getName() + "</strong> <br>(" + emu.getPath() + ")</html>";
			String path = "/images/emulators/" + emu.getIconFilename();
			Icon icon = ImageUtil.getImageIconFrom(path);
			if (icon == null) {
				icon = FileSystemView.getFileSystemView().getSystemIcon(new File(emu.getPath()));
			}
			JRadioButtonMenuItem rdb = new JRadioButtonMenuItem(s, icon);
			group.add(rdb);
			radios.add(rdb);
			add(rdb);
		}
		if (defaultEmulatorIndex != EmulatorConstants.NO_EMULATOR && radios.size() > defaultEmulatorIndex) {
			radios.get(defaultEmulatorIndex).setSelected(true);
		}
		if (emulators.size() > 0) {
			add(new JSeparator());
		}
		ImageIcon iconBlank = ImageUtil.getImageIconFrom(Icons.get("blank", 48, 48));
		add(new JMenuItem(Messages.get("setEmulator") + "...", iconBlank));
	}
}