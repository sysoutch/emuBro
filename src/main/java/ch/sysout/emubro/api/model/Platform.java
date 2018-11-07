package ch.sysout.emubro.api.model;

import java.util.List;

import ch.sysout.emubro.impl.model.BroEmulator;
import ch.sysout.emubro.impl.model.FileStructure;

public interface Platform extends Comparable<Platform> {
	int getId();

	String getName();

	void setName(String name);

	String getShortName();

	void setShortName(String shortName);

	String getSearchFor();

	void setSearchFor(String searchFor);

	void addSearchFor(String searchFor);

	String getIconFileName();

	String getDefaultGameCover();

	boolean hasGameSearchMode(String searchMode);

	boolean isSupportedArchiveType(String fileName);

	boolean isSupportedImageType(String fileName);

	List<String> getGameSearchModes();

	List<String> getSupportedArchiveTypes();

	List<String> getSupportedImageTypes();

	List<BroEmulator> getEmulators();

	int getDefaultEmulatorId();

	void setDefaultEmulatorId(int standardEmulatorId);

	boolean hasDefaultEmulator();

	void setId(int platformId);

	void addEmulator(BroEmulator emulator);

	Emulator getDefaultEmulator();

	void removeEmulator(BroEmulator emulator);

	boolean hasEmulator(String emulatorPath);

	boolean hasEmulatorByName(String emulatorName);

	List<FileStructure> getFileStructure();

	boolean isAutoSearchEnabled();

	void setAutoSearchEnabled(boolean autoSearchEnabled);
}
