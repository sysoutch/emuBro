package ch.sysout.gameexplorer.api.model;

import java.util.List;

public interface Emulator extends Comparable<Emulator> {
	int getId();

	void setId(int emulatorId);

	String getName();

	String getStartParameters();

	String getPath();

	String getSearchString();

	String getIconFilename();

	String getWebsite();

	List<String> getSupportedFileTypes();

	String getConfigFilePath();

	boolean isAutoSearchEnabled();

	void setAutoSearchEnabled(boolean autoSearchEnabled);

	boolean isInstalled();
}
