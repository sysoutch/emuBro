package ch.sysout.emubro.controller;

import java.nio.file.Path;

public interface BrowseComputerListener {
	void steamFolderDetected(String absolutePath);
	void rememberZipFile(String filePath);
	void rememberRarFile(String filePath);
	void rememberIsoFile(String filePath);
	void searchForPlatform(Path entry);
	void searchProcessComplete();
}
