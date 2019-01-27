package ch.sysout.emubro.plugin.api;

import java.nio.file.Path;
import java.util.List;

public interface PluginManager {
	public void openWindow(String msg);

	public void addGame(Path filePath);

	public void addGames(Path... filePath);

	public void addGames(List<Path> filePath);

	public void addGamesFromDirectory(Path dirPath);

	public void addEmulator(Path filePath);

	public void addEmulators(Path... filePath);

	public void addEmulators(List<Path> filePath);

	public void addEmulatorsFromDirectory(Path dirPath);

}
