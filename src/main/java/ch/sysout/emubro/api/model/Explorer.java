package ch.sysout.emubro.api.model;

import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.Properties;

import ch.sysout.emubro.api.filter.FilterGroup;
import ch.sysout.emubro.impl.model.BroEmulator;
import ch.sysout.emubro.impl.model.BroGame;
import ch.sysout.emubro.impl.model.BroTag;

public interface Explorer {
	void addGame(Game game, String path);

	void removeGame(Game game);

	void renameGame(int id, String newName);

	Game getGame(int gameId);

	List<Game> getCurrentGames();

	void setCurrentGames(List<Game> games);

	void setCurrentGames(Game... games);

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

	List<Game> getGamesFromPlatform(int platformId);

	//	List<BroPlatform> getDefaultPlatforms();
	//
	//	void setDefaultPlatforms(List<BroPlatform> platforms);

	List<Tag> getUpdatedTags();

	void setUpdatedTags(List<BroTag> tags);

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

	String getChecksumById(int checksumId);

	void addChecksum(int checksumId, String checksum);

	void setChecksums(Map<Integer, String> checksums);

	boolean isExcludedFileOrDirectory(Path file);

	boolean hasTag(String name);

	List<Tag> getTags();

	void setTags(List<Tag> tags);

	void addTag(Tag tag);

	void removeTag(Tag tag);

	Tag getTag(int tagId);

	Tag getTag(String name);

	List<Tag> getTagsForGame(int id);

	void setTagsForGame(int id, List<Tag> tags);

	void addTagForGame(int gameId, Tag tag);

	List<Game> getGamesForTags(Tag... tag);

	void removeTagFromGame(int gameId, int tagId);

	void setGameCode(int id, String gameCode);

	List<Game> getGamesWithoutCovers();

	String getCurrentApplicationVersion();

	void setCurrentApplicationVersion(String currentApplicationVersion);

	String getResourcesPath();

	String getGameCoversPath();

	List<BroEmulator> getEmulatorsFromPlatform(int platformId);

	void setFilterGroups(List<FilterGroup> filterGroups);

	void addFilterGroup(FilterGroup filterGroup);

	Properties getGameTitlesFromPlatform(Platform platform);

	void setGameTitlesForPlatform(Platform p, Properties prop);

	String getPlatformsDirectory();

	boolean hasGamesOrEmulators(int platformId);

	String getCoverDownloadSource(Game game);

	String getRelativeTitlesSourceFilePath(Platform platform);

	// void addEmulator(Emulator emulator);
	//
	// void removeEmulator(Emulator emulator);
	//
	// void setEmulators(List<Emulator> emulators);
}