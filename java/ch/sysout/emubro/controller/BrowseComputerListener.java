package ch.sysout.emubro.controller;

import java.io.File;

public interface BrowseComputerListener {
	void steamFolderDetected(String absolutePath);
	void rememberZipFile(String filePath);
	void rememberRarFile(String filePath);
	void rememberIsoFile(String filePath);
	void searchForPlatform(File file);
	void searchProcessComplete();
}
