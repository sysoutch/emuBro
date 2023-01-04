package ch.sysout.emubro.controller;

import java.nio.file.Path;

import ch.sysout.emubro.api.event.SearchCompleteEvent;

public interface BrowseComputerListener {
	void steamFolderDetected(String absolutePath);
	void rememberZipFile(String filePath);
	void rememberRarFile(String filePath);
	void rememberIsoFile(String filePath);
	void searchForPlatform(Path entry);
	void searchProcessComplete(SearchCompleteEvent ev);
}
