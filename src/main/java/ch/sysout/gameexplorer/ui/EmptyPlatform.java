package ch.sysout.gameexplorer.ui;

import java.util.List;

import ch.sysout.gameexplorer.api.model.Emulator;
import ch.sysout.gameexplorer.api.model.Platform;
import ch.sysout.gameexplorer.impl.model.BroEmulator;
import ch.sysout.gameexplorer.impl.model.FileStructure;
import ch.sysout.util.Messages;

public class EmptyPlatform implements Platform {

	@Override
	public int compareTo(Platform arg0) {
		// TODO Auto-generated method stub
		return 0;
	}

	@Override
	public int getId() {
		// TODO Auto-generated method stub
		return 0;
	}

	@Override
	public String getName() {
		// TODO Auto-generated method stub
		return null;
	}

	@Override
	public String getSearchFor() {
		// TODO Auto-generated method stub
		return null;
	}

	@Override
	public void setSearchFor(String searchFor) {
		// TODO Auto-generated method stub

	}

	@Override
	public String getIconFileName() {
		// TODO Auto-generated method stub
		return null;
	}

	@Override
	public String getDefaultGameCover() {
		// TODO Auto-generated method stub
		return null;
	}

	@Override
	public boolean hasGameSearchMode(String searchMode) {
		// TODO Auto-generated method stub
		return false;
	}

	@Override
	public boolean isSupportedArchiveType(String fileName) {
		// TODO Auto-generated method stub
		return false;
	}

	@Override
	public boolean isSupportedImageType(String fileName) {
		// TODO Auto-generated method stub
		return false;
	}

	@Override
	public List<String> getGameSearchModes() {
		// TODO Auto-generated method stub
		return null;
	}

	@Override
	public List<String> getSupportedArchiveTypes() {
		// TODO Auto-generated method stub
		return null;
	}

	@Override
	public List<String> getSupportedImageTypes() {
		// TODO Auto-generated method stub
		return null;
	}

	@Override
	public List<BroEmulator> getEmulators() {
		// TODO Auto-generated method stub
		return null;
	}

	@Override
	public int getDefaultEmulatorId() {
		// TODO Auto-generated method stub
		return 0;
	}

	@Override
	public void setDefaultEmulatorId(int standardEmulatorId) {
		// TODO Auto-generated method stub

	}

	@Override
	public boolean hasDefaultEmulator() {
		// TODO Auto-generated method stub
		return false;
	}

	@Override
	public void setId(int platformId) {
		// TODO Auto-generated method stub

	}

	@Override
	public void addEmulator(BroEmulator emulator) {
		// TODO Auto-generated method stub

	}

	@Override
	public Emulator getDefaultEmulator() {
		// TODO Auto-generated method stub
		return null;
	}

	@Override
	public void removeEmulator(BroEmulator emulator) {
		// TODO Auto-generated method stub

	}

	@Override
	public boolean hasEmulator(String emulatorPath) {
		// TODO Auto-generated method stub
		return false;
	}

	@Override
	public boolean hasEmulatorByName(String emulatorName) {
		// TODO Auto-generated method stub
		return false;
	}

	@Override
	public List<FileStructure> getFileStructure() {
		// TODO Auto-generated method stub
		return null;
	}

	@Override
	public boolean isAutoSearchEnabled() {
		// TODO Auto-generated method stub
		return false;
	}

	@Override
	public void setAutoSearchEnabled(boolean autoSearchEnabled) {
		// TODO Auto-generated method stub

	}

	@Override
	public String toString() {
		return "<html><strong>* " + Messages.get("emptyPlatform") + " *</strong></html>";
	}
}
