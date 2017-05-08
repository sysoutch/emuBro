package ch.sysout.emubro.api.model;

import java.util.List;

import ch.sysout.emubro.impl.model.BroGame;
import ch.sysout.emubro.impl.model.BroPlatform;

public interface Explorer {
	void addGame(Game game);

	void removeGame(Game game);

	void renameGame(int id, String newName);

	boolean hasGame(String path);

	Game getGame(int gameId);

	Game getGame(String path);

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

	// void addEmulator(Emulator emulator);
	//
	// void removeEmulator(Emulator emulator);
	//
	// void setEmulators(List<Emulator> emulators);
}