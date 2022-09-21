package ch.sysout.emubro.api.model;

import java.util.List;

public interface Emulator extends Comparable<Emulator> {
	int getId();

	void setId(int emulatorId);

	String getName();

	String getShortName();

	String getStartParameters();

	String getPath();

	String getSearchString();

	String getSetupFileMatch();

	String getIconFilename();

	String getWebsite();

	List<String> getSupportedFileTypes();

	String getConfigFilePath();

	boolean isAutoSearchEnabled();

	void setAutoSearchEnabled(boolean autoSearchEnabled);

	boolean isInstalled();

	String getParentFolder();
}
