package ch.sysout.emubro.api.dao;

import java.sql.Connection;
import java.sql.SQLException;
import java.util.List;
import java.util.Map;

import ch.sysout.emubro.api.filter.FilterGroup;
import ch.sysout.emubro.api.model.Emulator;
import ch.sysout.emubro.api.model.Game;
import ch.sysout.emubro.api.model.Platform;
import ch.sysout.emubro.api.model.Tag;
import ch.sysout.emubro.impl.BroEmulatorDeletedException;
import ch.sysout.emubro.impl.BroGameAlreadyExistsException;
import ch.sysout.emubro.impl.BroGameDeletedException;
import ch.sysout.emubro.impl.model.BroEmulator;

public interface ExplorerDAO {
	List<Platform> getPlatforms() throws SQLException;

	Game getGameAt(int index) throws SQLException;

	List<Game> getGames() throws SQLException;

	void addGame(Game game, String filePath)
			throws SQLException, BroGameAlreadyExistsException, BroGameDeletedException;

	void renameGame(int gameId, String newTitle) throws SQLException;

	void removeGame(int gameId) throws SQLException;

	boolean hasPlatform(String name) throws SQLException;

	void addPlatform(Platform platform) throws SQLException;

	void removePlatform(int platformId) throws SQLException;

	void updatePlayCount(Game game) throws SQLException;

	void addEmulator(int platformId, Emulator emulator) throws SQLException, BroEmulatorDeletedException;

	Emulator getEmulator(int id) throws SQLException;

	Emulator getEmulatorFromGame(int gameId) throws SQLException;

	List<BroEmulator> getEmulatorsFromPlatform(int platformId) throws SQLException;

	void updateLastPlayed(Game game) throws SQLException;

	Platform getPlatformFromGame(int id) throws SQLException;

	boolean hasGames();

	void searchProcessInterrupted() throws SQLException;

	boolean isSearchProcessComplete();

	void searchProcessComplete() throws SQLException;

	int getDefaultEmulator(Platform platform) throws SQLException;

	void setDefaultEmulatorId(Platform platform, int id) throws SQLException;

	void setDefaultEmulatorId(Game game, int id) throws SQLException;

	void setSelectedGameId(int gameId) throws SQLException;

	int getSelectedGameId() throws SQLException;

	void changePlatform(Platform p) throws SQLException;

	int getLastAddedPlatformId() throws SQLException;

	Platform getPlatform(int platformId) throws SQLException;

	int getLastAddedEmulatorId() throws SQLException;

	int getLastAddedGameId() throws SQLException;

	int getPlatformId(Platform platform) throws SQLException;

	int getGameCount();

	void closeConnection() throws SQLException;

	void removeEmulator(int emulatorId) throws SQLException;

	void setRate(int gameId, int newRate) throws SQLException;

	void setGameIconPath(int id, String iconPathString) throws SQLException;

	void setGameCoverPath(int id, String coverPath) throws SQLException;

	boolean isConfigWizardHiddenAtStartup() throws SQLException;

	void setConfigWizardHiddenAtStartup(boolean configWizardActiveAtStartup) throws SQLException;

	void rememberZipFile(String absolutePath);

	void rememberRarFile(String absolutePath);

	void rememberIsoFile(String absolutePath);

	void addChecksum(String checksum) throws SQLException;

	Map<Integer, String> getChecksums() throws SQLException;

	int getLastAddedChecksumId() throws SQLException;

	List<String> getFiles() throws SQLException;

	List<String> getFilesForGame(int gameId) throws SQLException;

	int getChecksumId(String checksum);

	void restoreGame(Game game) throws SQLException;

	Game getGameByChecksumId(int checksumId) throws SQLException;

	void addTag(Tag tag) throws SQLException;

	void removeTag(int tagId) throws SQLException;

	void addTag(int gameId, Tag tag) throws SQLException;

	void removeTag(int gameId, int tagId) throws SQLException;

	int getLastAddedTagId() throws SQLException;

	Tag getTag(int tagId) throws SQLException;

	List<Tag> getTags() throws SQLException;

	List<Tag> getTagsForGame(int gameId) throws SQLException;

	void addSearchFor(int platformId, String newSearchFor) throws SQLException;

	void restoreEmulator(Emulator emulator) throws SQLException;

	boolean isGreetingNotificationActive() throws SQLException;

	void showGreetingNotification(boolean b) throws SQLException;

	boolean isBrowseComputerNotificationActive() throws SQLException;

	void showBrowseComputerNotification(boolean b) throws SQLException;

	Connection getConnection();

	String getLastDirFromFileChooser() throws SQLException;

	void setLastDirFromFileChooser(String lastDirFromFileChooser) throws SQLException;

	String getLastDirFromFolderChooser() throws SQLException;

	void setLastDirFromFolderChooser(String absolutePath) throws SQLException;

	void setGameCode(int id, String realName) throws SQLException;

	List<FilterGroup> getFilterGroups() throws SQLException;

	void addFilterGroup(FilterGroup filterGroup) throws SQLException;

	String getRegion(int gameId) throws SQLException;

	void setRegion(int gameId, String string) throws SQLException;

	List<String> getLanguages(int gameId) throws SQLException;

	void setLanguages(int gameId, String... strings) throws SQLException;

	String getGameDescription(int gameId) throws SQLException;

	void setGameDescription(int gameId, String description) throws SQLException;

	String getDeveloper(int gameId) throws SQLException;

	void setDeveloper(int gameId, String description) throws SQLException;

	String getPublisher(int gameId) throws SQLException;

	void setPublisher(int gameId, String description) throws SQLException;
}
