package ch.sysout.emubro.ui;

import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
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

import ch.sysout.emubro.api.RunGameWithListener;
import ch.sysout.emubro.api.model.Emulator;
import ch.sysout.emubro.impl.model.BroEmulator;
import ch.sysout.ui.util.ImageUtil;
import ch.sysout.util.Icons;
import ch.sysout.util.Messages;
import ch.sysout.util.ScreenSizeUtil;

class GameSettingsPopupMenu extends JPopupMenu {
	private static final long serialVersionUID = 1L;

	private List<RunGameWithListener> runGameWithListeners = new ArrayList<>();

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

	public void addRunGameWithListener(RunGameWithListener l) {
		runGameWithListeners.add(l);
	}

	public void initEmulators(List<BroEmulator> emulators, int defaultEmulatorId) {
		removeAll();
		ScreenSizeUtil.adjustValueToResolution(32);
		ButtonGroup group = new ButtonGroup();
		List<JRadioButtonMenuItem> radios = new ArrayList<>();
		for (final Emulator emu : emulators) {
			if (!emu.isInstalled()) {
				continue;
			}
			String s = "<html><strong>" + emu.getName() + "</strong> <br>(" + emu.getPath() + ")</html>";
			//			String path = "/platforms/emulators/" + emu.getIconFilename();
			Icon icon = IconStore.current().getEmulatorIcon(emu.getId());;
			if (icon == null) {
				icon = FileSystemView.getFileSystemView().getSystemIcon(new File(emu.getPath()));
			}
			JRadioButtonMenuItem rdb = new JRadioButtonMenuItem(s, icon);
			if (defaultEmulatorId == emu.getId()) {
				rdb.setSelected(true);
			}
			rdb.addActionListener(new ActionListener() {

				@Override
				public void actionPerformed(ActionEvent e) {
					fireRunGameWithEvent(emu.getId());
				}
			});
			group.add(rdb);
			radios.add(rdb);
			add(rdb);
		}
		if (emulators.size() > 0) {
			add(new JSeparator());
		}
		ImageIcon iconBlank = ImageUtil.getImageIconFrom(Icons.get("blank", 48, 48));
		add(new JMenuItem(Messages.get("setEmulator") + "...", iconBlank));
	}

	private void fireRunGameWithEvent(int emulatorId) {
		for (RunGameWithListener l : runGameWithListeners) {
			l.runGameWith(emulatorId);
		}
	}
}