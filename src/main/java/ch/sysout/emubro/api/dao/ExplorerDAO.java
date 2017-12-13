package ch.sysout.emubro.api.dao;

import java.sql.SQLException;
import java.util.List;

import ch.sysout.emubro.api.model.Emulator;
import ch.sysout.emubro.api.model.Game;
import ch.sysout.emubro.api.model.Platform;
import ch.sysout.emubro.impl.BroGameAlreadyExistsException;
import ch.sysout.emubro.impl.BroGameDeletedException;
import ch.sysout.emubro.impl.model.BroEmulator;

public interface ExplorerDAO {
	List<Platform> getPlatforms() throws SQLException;
	Game getGameAt(int index) throws SQLException;
	List<Game> getGames() throws SQLException;
	void addGame(Game game) throws SQLException, BroGameAlreadyExistsException, BroGameDeletedException;
	void renameGame(int gameId, String newTitle) throws SQLException;
	void removeGame(int gameId) throws SQLException;
	boolean hasPlatform(String name) throws SQLException;
	void addPlatform(Platform platform) throws SQLException;
	void removePlatform(int platformId) throws SQLException;
	void updatePlayCount(Game game) throws SQLException;
	void addEmulator(int platformId, Emulator emulator) throws SQLException;
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
	void setSelectedGameId(int gameId) throws SQLException;
	int getSelectedGameId() throws SQLException;
	void changePlatform(Platform p) throws SQLException;
	int getLastAddedPlatformId() throws SQLException;
	Platform getPlatform(int lastAddedPlatformId) throws SQLException;
	int getLastAddedEmulatorId() throws SQLException;
	int getLastAddedGameId() throws SQLException;
	int getPlatformId(Platform platform) throws SQLException;
	boolean hasGame(String path) throws SQLException;
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
}
