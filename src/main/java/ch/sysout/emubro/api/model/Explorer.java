package ch.sysout.emubro.api.model;

import java.util.List;
import java.util.Map;

import ch.sysout.emubro.impl.model.BroGame;
import ch.sysout.emubro.impl.model.BroPlatform;

public interface Explorer {
	void addGame(Game game, String filePath);

	void removeGame(Game game);

	void renameGame(int id, String newName);

	Game getGame(int gameId);

	Game getCurrentGame();

	void setCurrentGame(int gameId);

	boolean hasCurrentGame();

	void setGames(List<Game> games);

	List<String> getExtensions();

	String getExtensionsRegexString();

	void setPlatforms(List<Platform> platforms);

	void addPlatform(Platform platform);

	void removePlatform(Platform platform);

	boolean hasPlatform(String name);

	Platform getPlatform(String name);

	// void addEmulator(Emulator emulator);
	//
	// void removeEmulator(Emulator emulator);
	//
	// Emulator getEmulator(String path);
	//
	// void setEmulators(List<Emulator> emulators);

	int getGameCount();

	int getPlatformCount();

	// int getEmulatorCount();

	// List<BroEmulator> getEmulators(int platformId);

	// Emulator getEmulator(int emulatorId);

	List<Platform> getPlatforms();

	Platform getPlatform(int platformId);

	List<Game> getGames();

	List<BroPlatform> getDefaultPlatforms();

	void setDefaultPlatforms(List<BroPlatform> platforms);

	boolean hasEmulator(String platformName, String emulatorPath);

	boolean hasEmulatorByName(String platformName, String emulatorName);

	boolean isSearchProcessComplete();

	void setSearchProcessComplete(boolean searchProcessComplete);

	Emulator getEmulatorFromGame(int gameId);

	Emulator getEmulatorFromPlatform(int platformId);

	int getGameCountFromPlatform(int id);

	boolean isConfigWizardHiddenAtStartup();

	void setConfigWizardHiddenAtStartup(boolean b);

	boolean hasGameWithSameName(int platformId, BroGame game);

	boolean isKnownExtension(String fileExtension);

	String getExtensionsString();

	List<Platform> getPlatformsFromCommonDirectory(String filePath);

	List<String> getGameDirectoriesFromPlatform(int platformId);

	boolean hasGamesWithSameChecksum();

	List<Game> getGamesWithSameChecksum();

	boolean hasFile(String absolutePath);

	Game getGameForFile(String path);

	List<String> getFiles(Game game);

	void setFilesForGame(int gameId, List<String> files);

	void addFile(int gameId, String filePath);

	String getChecksum(int checksumId);

	void addChecksum(int checksumId, String checksum);

	void setChecksums(Map<Integer, String> checksums);

	// void addEmulator(Emulator emulator);
	//
	// void removeEmulator(Emulator emulator);
	//
	// void setEmulators(List<Emulator> emulators);
}