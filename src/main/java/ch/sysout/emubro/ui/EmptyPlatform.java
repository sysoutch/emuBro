package ch.sysout.emubro.ui;

import java.util.List;

import ch.sysout.emubro.api.model.Emulator;
import ch.sysout.emubro.api.model.Platform;
import ch.sysout.emubro.impl.model.BroEmulator;
import ch.sysout.emubro.impl.model.EmulatorConstants;
import ch.sysout.emubro.impl.model.FileStructure;
import ch.sysout.emubro.impl.model.PlatformConstants;
import ch.sysout.util.Messages;

public class EmptyPlatform implements Platform {

	@Override
	public int compareTo(Platform platform) {
		return PlatformConstants.NO_PLATFORM;
	}

	@Override
	public int getId() {
		return PlatformConstants.NO_PLATFORM;
	}

	@Override
	public String getName() {
		return null;
	}

	@Override
	public void setName(String name) {
	}

	@Override
	public String getShortName() {
		return null;
	}

	@Override
	public void setShortName(String shortName) {

	}

	@Override
	public String getSearchFor() {
		return null;
	}

	@Override
	public void setSearchFor(String searchFor) {
	}

	@Override
	public String getIconFileName() {
		return null;
	}

	@Override
	public String getDefaultGameCover() {
		return null;
	}

	@Override
	public boolean hasGameSearchMode(String searchMode) {
		return false;
	}

	@Override
	public boolean isSupportedArchiveType(String fileName) {
		return false;
	}

	@Override
	public boolean isSupportedImageType(String fileName) {
		return false;
	}

	@Override
	public List<String> getGameSearchModes() {
		return null;
	}

	@Override
	public List<String> getSupportedArchiveTypes() {
		return null;
	}

	@Override
	public List<String> getSupportedImageTypes() {
		return null;
	}

	@Override
	public List<BroEmulator> getEmulators() {
		return null;
	}

	@Override
	public int getDefaultEmulatorId() {
		return EmulatorConstants.NO_EMULATOR;
	}

	@Override
	public void setDefaultEmulatorId(int standardEmulatorId) {


	}

	@Override
	public boolean hasDefaultEmulator() {
		return false;
	}

	@Override
	public void setId(int platformId) {
	}

	@Override
	public void addEmulator(BroEmulator emulator) {

	}

	@Override
	public Emulator getDefaultEmulator() {
		return null;
	}

	@Override
	public void removeEmulator(BroEmulator emulator) {
	}

	@Override
	public boolean hasEmulator(String emulatorPath) {
		return false;
	}

	@Override
	public boolean hasEmulatorByName(String emulatorName) {
		return false;
	}

	@Override
	public List<FileStructure> getFileStructure() {
		return null;
	}

	@Override
	public boolean isAutoSearchEnabled() {
		return false;
	}

	@Override
	public void setAutoSearchEnabled(boolean autoSearchEnabled) {
	}

	@Override
	public String toString() {
		return "<html><strong>* " + Messages.get("emptyPlatform") + " *</strong></html>";
	}
}
