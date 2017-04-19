package ch.sysout.gameexplorer.ui;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import javax.swing.DefaultListModel;

import ch.sysout.gameexplorer.api.model.Emulator;

public class EmulatorListModel<T> extends DefaultListModel<Emulator> {
	private static final long serialVersionUID = 1L;

	private List<Emulator> emulators = new ArrayList<>();

	@Override
	public void addElement(Emulator e) {
		super.addElement(e);
		emulators.add(e);
	}

	@Override
	public void removeElementAt(int index) {
		super.removeElementAt(index);
		emulators.remove(index);
	}

	@Override
	public void removeAllElements() {
		super.removeAllElements();
		emulators.clear();
	}

	public List<Emulator> getAllElements() {
		return emulators;
	}

	public void sort() {
		Collections.sort(emulators);
	}
}
