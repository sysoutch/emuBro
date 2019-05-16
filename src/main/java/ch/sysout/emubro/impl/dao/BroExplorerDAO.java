package ch.sysout.emubro.impl.dao;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import ch.sysout.emubro.Main;
import ch.sysout.emubro.api.dao.EmulatorDAO;
import ch.sysout.emubro.api.dao.ExplorerDAO;
import ch.sysout.emubro.api.dao.GameDAO;
import ch.sysout.emubro.api.dao.PlatformDAO;
import ch.sysout.emubro.api.dao.TagDAO;
import ch.sysout.emubro.api.model.Emulator;
import ch.sysout.emubro.api.model.Game;
import ch.sysout.emubro.api.model.Platform;
import ch.sysout.emubro.api.model.Tag;
import ch.sysout.emubro.impl.BroDatabaseVersionMismatchException;
import ch.sysout.emubro.impl.BroEmulatorDeletedException;
import ch.sysout.emubro.impl.BroGameAlreadyExistsException;
import ch.sysout.emubro.impl.BroGameDeletedException;
import ch.sysout.emubro.impl.model.BroEmulator;
import ch.sysout.emubro.impl.model.BroGame;
import ch.sysout.emubro.impl.model.BroPlatform;
import ch.sysout.emubro.impl.model.BroTag;
import ch.sysout.emubro.impl.model.FileStructure;
import ch.sysout.emubro.impl.model.GameConstants;
import ch.sysout.emubro.impl.model.PlatformConstants;
import ch.sysout.util.SqlUtil;
import ch.sysout.util.ValidationUtil;

public class BroExplorerDAO implements ExplorerDAO {
	private Connection conn;

	private PlatformDAO platformDAO;
	private TagDAO tagDAO;
	private GameDAO gameDAO;
	private EmulatorDAO emulatorDAO;
	private final int explorer_id;
	private String expectedDbVersion = "0.2.0";

	public BroExplorerDAO(int explorer_id, Connection conn) throws IOException, SQLException, BroDatabaseVersionMismatchException {
		this.explorer_id = explorer_id;
		this.conn = conn;
		platformDAO = new BroPlatformDAO(conn);
		tagDAO = new BroTagDAO(conn);
		gameDAO = new BroGameDAO(conn);
		emulatorDAO = new BroEmulatorDAO(conn);

		String dbVersion = getDatabaseVersion();
		if (dbVersion != null) {
			if (dbVersion.isEmpty()) {
				updateDatabaseVersion();
			} else if (!dbVersion.equals(expectedDbVersion)) {
				Main.dlgSplashScreen.setText("checking database state...");
				throw new BroDatabaseVersionMismatchException("database version mismatch. expected: " + expectedDbVersion + " but is: " + dbVersion,
						expectedDbVersion, dbVersion);
			}
		}
		Statement stmt;
		InputStream stream = getClass().getResourceAsStream("/create_database.sql");
		BufferedReader br = null;
		try {
			String lines = "";
			String line;
			br = new BufferedReader(new InputStreamReader(stream));
			while ((line = br.readLine()) != null) {
				lines += line;
			}
			if (br != null) {
				br.close();
			}
			stmt = conn.createStatement();
			stmt.executeQuery(lines);
			stmt.close();
		} finally {
			if (br != null) {
				try {
					br.close();
				} catch (Exception e) {
					// ignore
				}
			}
		}
		if (!hasExplorer()) {
			initExplorer();
		}
	}

	private void updateDatabaseVersion() {
		Statement stmt = null;
		try {
			stmt = conn.createStatement();
			stmt.executeQuery("insert into emubro (emubro_dbVersion) values ('" + expectedDbVersion + "')");
			conn.commit();
		} catch (SQLException e) {
			// do nothing
		} finally {
			try {
				stmt.close();
			} catch (Exception e) {
			}
		}
	}

	private String getDatabaseVersion() {
		String version = "";
		Statement stmt;
		try {
			stmt = conn.createStatement();
			String sql = "select top 1 emubro_dbVersion from emubro order by emubro_dbVersion desc";
			ResultSet rset = stmt.executeQuery(sql);
			if (rset.next()) {
				version = rset.getString("emubro_dbVersion");
			}
			stmt.close();
		} catch (SQLException e) {
			return null;
		}
		return version;
	}

	@Override
	public void searchProcessComplete() throws SQLException {
		doExplorerUpdate("explorer_searchProcessComplete", "true");
	}

	@Override
	public void searchProcessInterrupted() throws SQLException {
		doExplorerUpdate("explorer_searchProcessComplete", false);
	}

	private void initExplorer() throws SQLException {
		if (!hasExplorer()) {
			Statement stmt = conn.createStatement();
			String sql = "insert into explorer"
					+ "(explorer_configWizardHiddenAtStartup,"
					+ "explorer_searchProcessComplete,"
					+ "explorer_showGreetingNotification,"
					+ "explorer_showBrowseComputerNotification,"
					+ "explorer_lastSelectedGameId)"
					+ " values ('false', 'false', 'true', 'true', " + GameConstants.NO_GAME + ")";
			stmt.executeQuery(sql);
			stmt.close();
		}
	}

	private boolean hasExplorer() throws SQLException {
		Statement stmt = null;
		stmt = conn.createStatement();
		String sql = "select * from explorer where explorer_id=" + explorer_id;
		ResultSet rset = stmt.executeQuery(sql);
		stmt.close();
		if (rset.next()) {
			return true;
		}
		return false;
	}

	@Override
	public boolean isSearchProcessComplete() {
		Statement stmt = null;
		try {
			stmt = conn.createStatement();
			ResultSet rs = stmt.executeQuery(
					"select explorer_searchProcessComplete from explorer where explorer_id=" + explorer_id);
			if (rs.next()) {
				boolean complete = rs.getBoolean("explorer_searchProcessComplete");
				rs.close();
				return complete;
			}
		} catch (SQLException e) {
			e.printStackTrace();
		} finally {
			try {
				stmt.close();
			} catch (Exception e) {
				e.printStackTrace();
			}
		}
		return false;
	}

	/**
	 * @param platform
	 * @throws SQLException
	 */
	@Override
	public void addPlatform(Platform platform) throws SQLException {
		platformDAO.addPlatform(platform);
	}

	/**
	 * @param index
	 * @throws SQLException
	 */
	@Override
	public void removePlatform(int platformId) throws SQLException {
		platformDAO.removePlatform(platformId);
	}

	@Override
	public void removeEmulator(int emulatorId) throws SQLException {
		emulatorDAO.removeEmulator(emulatorId);
	}

	@Override
	public BroGame getGameAt(int gameId) throws SQLException {
		return gameDAO.getGameAt(gameId);
	}

	@Override
	public Game getGameByChecksumId(int checksumId) throws SQLException {
		return gameDAO.getGameByChecksumId(checksumId);
	}

	@Override
	public Platform getPlatform(int platformId) throws SQLException {
		return platformDAO.getPlatform(platformId);
	}

	@Override
	public void addChecksum(String checksum) throws SQLException {
		ValidationUtil.checkNull(checksum, "checksum");
		if (!hasChecksum(checksum)) {
			Statement stmt = conn.createStatement();
			String sql = SqlUtil.insertIntoWithColumnsString("checksum", "checksum_checksum",
					SqlUtil.getQuotedString(checksum));
			try {
				stmt.executeQuery(sql);
			} catch (SQLException e) {
				// TODO Auto-generated catch block
				e.printStackTrace();
			}
			conn.commit();
		}
	}

	private boolean hasChecksum(String checksum) throws SQLException {
		if (checksum == null || checksum.trim().isEmpty()) {
			return false;
		}
		Statement stmt = conn.createStatement();
		String sql = "select checksum_id, checksum_checksum from checksum where checksum_checksum =" + SqlUtil.getQuotedString(checksum);
		ResultSet rset = stmt.executeQuery(sql);
		if (rset.next()) {
			stmt.close();
			return true;
		}
		stmt.close();
		return false;
	}

	@Override
	public List<Game> getGames() throws SQLException {
		return gameDAO.getGames();
	}

	@Override
	public List<String> getFiles() throws SQLException {
		List<String> filesList = new ArrayList<>();
		Statement stmt = conn.createStatement();
		stmt = conn.createStatement();
		String sql = "select * from file order by file_path)";
		ResultSet rset = stmt.executeQuery(sql);
		while (rset.next()) {
			String path = rset.getString("file_path");
			filesList.add(path);
		}
		stmt.close();
		return filesList;
	}

	@Override
	public List<String> getFilesForGame(int gameId) throws SQLException {
		List<String> files = new ArrayList<>();
		Statement stmt = conn.createStatement();
		stmt = conn.createStatement();
		String sql = "select * from game_file where game_id = " + gameId
				+ " order by game_id, file_id";
		ResultSet rset = stmt.executeQuery(sql);
		while (rset.next()) {
			int fileId = rset.getInt("file_id");
			String file = getFile(fileId);
			files.add(file);
		}
		stmt.close();
		return files;
	}

	@Override
	public Map<Integer, String> getChecksums() throws SQLException {
		Map<Integer, String> checksums = new HashMap<>();
		Statement stmt = conn.createStatement();
		stmt = conn.createStatement();
		String sql = "select * from checksum order by checksum_id";
		ResultSet rset = stmt.executeQuery(sql);
		while (rset.next()) {
			int checksumId = rset.getInt("checksum_id");
			String checksum = rset.getString("checksum_checksum");
			checksums.put(checksumId, checksum);
		}
		stmt.close();
		return checksums;
	}

	@Override
	public int getChecksumId(String checksum) {
		try {
			Statement stmt = conn.createStatement();
			stmt = conn.createStatement();
			String sql = "select * from checksum where checksum_checksum = " + SqlUtil.getQuotedString(checksum);
			ResultSet rset = stmt.executeQuery(sql);
			int id = -1;
			if (rset.next()) {
				id = rset.getInt("checksum_id");
			}
			stmt.close();
			return id;
		} catch (SQLException e) {
			return -1;
		}
	}

	private String getFile(int fileId) throws SQLException {
		Statement stmt = conn.createStatement();
		stmt = conn.createStatement();
		String sql = "select * from file where file_id = " + fileId;
		ResultSet rset = stmt.executeQuery(sql);
		String path = null;
		if (rset.next()) {
			path = rset.getString("file_path");
		}
		stmt.close();
		return path;
	}

	/**
	 * @param game
	 * @throws SQLException
	 * @throws BroGameAlreadyExistsException
	 */
	@Override
	public void addGame(Game game, String filePath) throws SQLException, BroGameAlreadyExistsException, BroGameDeletedException {
		gameDAO.addGame(game, filePath);
	}

	@Override
	public void restoreGame(Game game) throws SQLException {
		gameDAO.restoreGame(game);
	}

	@Override
	public void restoreEmulator(Emulator emulator) throws SQLException {
		emulatorDAO.restoreEmulator(emulator);
	}

	@Override
	public void addEmulator(int platformId, Emulator emulator) throws SQLException, BroEmulatorDeletedException {
		emulatorDAO.addEmulator(platformId, emulator);
		int lastAddedEmulatorId = getLastAddedEmulatorId();
		if (emulator.isInstalled() && !hasDefaultEmulator(platformId)) {
			platformDAO.setDefaultEmulator(platformId, lastAddedEmulatorId);
		}
	}

	/**
	 * FIXME check emulator only for specified platform
	 *
	 * @param path
	 * @return
	 * @throws SQLException
	 */
	public boolean hasEmulator(final int platformId, String path) throws SQLException {
		return emulatorDAO.hasEmulator(platformId, path);
	}

	public boolean hasDefaultEmulator(final int platformId) throws SQLException {
		return platformDAO.hasDefaultEmulator(platformId);
	}

	@Override
	public int getPlatformId(Platform platform) throws SQLException {
		Statement stmt = conn.createStatement();
		stmt = conn.createStatement();
		String platformName = platform.getName();
		String sql = "select * from platform where lower(platform_name) = " +
				SqlUtil.getQuotedString(platformName.toLowerCase());
		ResultSet rset = stmt.executeQuery(sql);
		int platformId = PlatformConstants.NO_PLATFORM;
		if (rset.next()) {
			platformId = rset.getInt("platform_id");
		}
		stmt.close();
		return platformId;
	}

	@Override
	public int getLastAddedPlatformId() throws SQLException {
		return platformDAO.getLastAddedPlatformId();
	}

	@Override
	public int getLastAddedEmulatorId() throws SQLException {
		return emulatorDAO.getLastAddedEmulatorId();
	}

	@Override
	public int getLastAddedChecksumId() throws SQLException {
		Statement stmt = conn.createStatement();
		stmt = conn.createStatement();
		String sql = "select TOP 1 checksum_id from checksum order by checksum_id desc";
		ResultSet rset = stmt.executeQuery(sql);
		int checksumId = -1;
		if (rset.next()) {
			checksumId = rset.getInt("checksum_id");
		}
		stmt.close();
		return checksumId;
	}

	@Override
	public int getLastAddedGameId() throws SQLException {
		return gameDAO.getLastAddedGameId();
	}

	@Override
	public void removeGame(int gameId) throws SQLException {
		gameDAO.removeGame(gameId);
	}

	@Override
	public void renameGame(int gameId, String newTitle) throws SQLException {
		gameDAO.renameGame(gameId, newTitle);
	}

	@Override
	public int getGameCount() {
		int gameCount = 0;
		try {
			String sql = "select count(*) from game";
			Statement stmt = conn.createStatement();
			ResultSet rset = stmt.executeQuery(sql);
			if (rset.next()) {
				gameCount = rset.getInt("count(*)");
			}
			rset.close();
			stmt.close();
			return gameCount;
		} catch (SQLException e) {
			return 0;
		}
	}

	@Override
	public boolean hasPlatform(String name) throws SQLException {
		name = name.toLowerCase().trim();
		Statement stmt = conn.createStatement();
		String sql = "select platform_id, platform_name from platform where lower(platform_name) = "
				+ SqlUtil.getQuotedString(name);
		ResultSet rset = stmt.executeQuery(sql);
		String rsetCopy = "";
		if (rset.next()) {
			rsetCopy = rset.getString("platform_name").toLowerCase().trim();
		}
		stmt.close();
		if (rsetCopy.equals(name)) {
			return true;
		}
		return false;
	}

	@Override
	public int getDefaultEmulator(Platform platform) throws SQLException {
		return platformDAO.getDefaultEmulator(platform);
	}

	@Override
	public void setDefaultEmulatorId(Platform platform, int id) throws SQLException {
		platformDAO.setDefaultEmulatorId(platform, id);
	}

	@Override
	public void setDefaultEmulatorId(Game game, int id) throws SQLException {
		gameDAO.setDefaultEmulatorId(game, id);
	}

	@Override
	public void updatePlayCount(Game game) throws SQLException {
		gameDAO.updatePlayCount(game);
	}

	@Override
	public void updateLastPlayed(Game game) throws SQLException {
		gameDAO.updateLastPlayed(game);
	}

	@Override
	public List<Platform> getPlatforms() throws SQLException {
		List<Platform> platforms = new ArrayList<>();
		Statement stmt = conn.createStatement();
		stmt = conn.createStatement();
		String sql = "select * from platform order by lower(platform_name)";
		ResultSet rset = stmt.executeQuery(sql);
		while (rset.next()) {
			int id = rset.getInt("platform_id");
			String name = rset.getString("platform_name");
			String shortName = rset.getString("platform_shortName");
			String iconFilename = rset.getString("platform_iconFilename");
			String defaultGameCover = rset.getString("platform_defaultGameCover");
			String[] gameSearchModes = rset.getString("platform_gameSearchModes").split(" ");
			String searchFor = rset.getString("platform_searchFor");
			FileStructure[] fileStructure = getFileStructureFromPlatform(id);
			String[] supportedArchiveTypes = rset.getString("platform_supportedArchiveTypes").split(" ");
			String[] supportedImageTypes = rset.getString("platform_supportedImageTypes").split(" ");
			List<BroEmulator> emulators = getEmulatorsFromPlatform(id);
			int defaultEmulatorId = rset.getInt("platform_defaultEmulatorId");
			boolean autoSearchEnabled = rset.getBoolean("platform_autoSearchEnabled");
			Platform platform = new BroPlatform(id, name, shortName, iconFilename, defaultGameCover, gameSearchModes, searchFor,
					fileStructure, supportedArchiveTypes, supportedImageTypes, emulators, defaultEmulatorId,
					autoSearchEnabled);
			platforms.add(platform);
		}
		conn.commit();
		stmt.close();
		return platforms;
	}

	private FileStructure[] getFileStructureFromPlatform(int id) throws SQLException {
		return platformDAO.getFileStructureFromPlatform(id);
	}

	@Override
	public Platform getPlatformFromGame(int gameId) throws SQLException {
		Statement stmt = conn.createStatement();
		stmt = conn.createStatement();

		String sql = "select game_platformId from game where game_id=" + gameId;
		ResultSet rset = stmt.executeQuery(sql);
		int platformId = PlatformConstants.NO_PLATFORM;
		if (rset.next()) {
			platformId = rset.getInt("game_platformId");
		}
		stmt.close();
		return getPlatform(platformId);
	}

	@Override
	public List<BroEmulator> getEmulatorsFromPlatform(int platformId) throws SQLException {
		return platformDAO.getEmulators(platformId);
	}

	@Override
	public Emulator getEmulatorFromGame(int gameId) throws SQLException {
		Emulator emulator = null;
		Statement stmt = conn.createStatement();
		stmt = conn.createStatement();
		String sql = "select * from game where game_id = " + gameId;
		ResultSet rset = stmt.executeQuery(sql);
		if (rset.next()) {
			int emulatorId = rset.getInt("game_emulatorId");
			emulator = getEmulator(emulatorId);
		}
		conn.commit();
		stmt.close();

		return emulator;
	}

	@Override
	public Emulator getEmulator(int id) throws SQLException {
		return emulatorDAO.getEmulator(id);
	}

	@Override
	public boolean hasGames() {
		return gameDAO.hasGames();
	}

	@Override
	public void setSelectedGameId(int gameId) throws SQLException {
		doExplorerUpdate("explorer_lastSelectedGameId", gameId);
	}

	@Override
	public void setGameIconPath(int gameId, String iconPath) throws SQLException {
		gameDAO.setIconPath(gameId, iconPath);
	}

	@Override
	public void setGameCoverPath(int gameId, String coverPath) throws SQLException {
		gameDAO.setCoverPath(gameId, coverPath);
	}

	@Override
	public int getSelectedGameId() throws SQLException {
		Statement stmt = conn.createStatement();
		int gameId = GameConstants.NO_GAME;
		String sql = "select explorer_lastSelectedGameId from explorer where explorer_id = " + 0;
		ResultSet rset = stmt.executeQuery(sql);
		if (rset.next()) {
			gameId = rset.getInt("explorer_lastSelectedGameId");
		}
		stmt.close();
		return gameId;
	}

	@Override
	public void setRate(int gameId, int newRate) throws SQLException {
		gameDAO.setRate(gameId, newRate);
	}

	@Override
	public void changePlatform(Platform p) throws SQLException {
		platformDAO.updatePlatform(p);
	}

	@Override
	public void closeConnection() throws SQLException {
		conn.close();
	}

	@Override
	public boolean isConfigWizardHiddenAtStartup() throws SQLException {
		Statement stmt;
		stmt = conn.createStatement();
		ResultSet rs = stmt.executeQuery(
				"select explorer_configWizardHiddenAtStartup from explorer where explorer_id=" + explorer_id);
		if (rs.next()) {
			boolean complete = rs.getBoolean("explorer_configWizardHiddenAtStartup");
			return complete;
		}
		return false;
	}

	@Override
	public void setConfigWizardHiddenAtStartup(boolean configWizardActiveAtStartup) throws SQLException {
		doExplorerUpdate("explorer_configWizardHiddenAtStartup", "true");
	}

	private void doExplorerUpdate(String key, String value) throws SQLException {
		doUpdate("explorer", key, value, getWhereClause("explorer_id", explorer_id));
	}

	private void doExplorerUpdate(String key, int value) throws SQLException {
		doUpdate("explorer", key, value, getWhereClause("explorer_id", explorer_id));
	}

	private void doExplorerUpdate(String key, boolean value) throws SQLException {
		doUpdate("explorer", key, value, getWhereClause("explorer_id", explorer_id));
	}

	private void doUpdate(String table, String key, String value, String whereClause) throws SQLException {
		Statement stmt = conn.createStatement();
		String sql = "update " + table + " set " + key + "=" + SqlUtil.getQuotedString(value) + whereClause;
		stmt.executeQuery(sql);
		conn.commit();
		stmt.close();
	}

	private void doUpdate(String table, String key, int value, String whereClause) throws SQLException {
		Statement stmt = conn.createStatement();
		String sql = "update " + table + " set " + key + "=" + value + whereClause;
		stmt.executeQuery(sql);
		conn.commit();
		stmt.close();
	}

	private void doUpdate(String table, String key, boolean value, String whereClause) throws SQLException {
		Statement stmt = conn.createStatement();
		String sql = "update " + table + " set " + key + "=" + value + " where " + whereClause;
		stmt.executeQuery(sql);
		conn.commit();
		stmt.close();
	}

	private String getWhereClause(String key, int value) {
		return " where " + key + "=" + value;
	}

	@Override
	public void rememberZipFile(String absolutePath) {
		// TODO Auto-generated method stub

	}

	@Override
	public void rememberRarFile(String absolutePath) {
		// TODO Auto-generated method stub

	}

	@Override
	public void rememberIsoFile(String absolutePath) {
		// TODO Auto-generated method stub

	}

	@Override
	public void addTag(Tag tag) throws SQLException {
		tagDAO.addTag(tag);
	}

	@Override
	public void addTag(int gameId, Tag tag) throws SQLException {
		gameDAO.addTag(gameId, tag);
	}

	@Override
	public void removeTag(int tagId) throws SQLException {
		tagDAO.removeTag(tagId);
	}

	@Override
	public void removeTag(int gameId, int tagId) throws SQLException {
		gameDAO.removeTag(gameId, tagId);
	}

	@Override
	public int getLastAddedTagId() throws SQLException {
		return tagDAO.getLastAddedTagId();
	}

	@Override
	public BroTag getTag(int tagId) throws SQLException {
		return tagDAO.getTag(tagId);
	}

	@Override
	public List<Tag> getTags() throws SQLException {
		List<Tag> tags = new ArrayList<>();
		Statement stmt = conn.createStatement();
		stmt = conn.createStatement();
		String sql = "select * from tag order by lower(tag_name)";
		ResultSet rset = stmt.executeQuery(sql);
		while (rset.next()) {
			int id = rset.getInt("tag_id");
			String name = rset.getString("tag_name");
			String hexColor = rset.getString("tag_hexColor");
			Tag tag = new BroTag(id, name, hexColor);
			tags.add(tag);
		}
		conn.commit();
		stmt.close();
		return tags;
	}

	@Override
	public List<Tag> getTagsForGame(int gameId) throws SQLException {
		return gameDAO.getTags(gameId);
	}

	@Override
	public void addSearchFor(int platformId, String newSearchFor) throws SQLException {
		platformDAO.addSearchFor(platformId, newSearchFor);
	}

	@Override
	public boolean isGreetingNotificationActive() throws SQLException {
		boolean greetingNotificationActive = true;
		try {
			String sql = "select explorer_showGreetingNotification from explorer where explorer_id=0";
			Statement stmt = conn.createStatement();
			ResultSet rset = stmt.executeQuery(sql);
			if (rset.next()) {
				greetingNotificationActive = rset.getBoolean("explorer_showGreetingNotification");
			}
			rset.close();
			stmt.close();
			return greetingNotificationActive;
		} catch (SQLException e) {
			return true;
		}
	}

	@Override
	public void showGreetingNotification(boolean b) throws SQLException {
		doUpdate("explorer", "explorer_showGreetingNotification", b, "explorer_id=0");
	}

	@Override
	public boolean isBrowseComputerNotificationActive() throws SQLException {
		boolean browseComputerNotificationActive = true;
		try {
			String sql = "select explorer_showBrowseComputerNotification from explorer where explorer_id=0";
			Statement stmt = conn.createStatement();
			ResultSet rset = stmt.executeQuery(sql);
			if (rset.next()) {
				browseComputerNotificationActive = rset.getBoolean("explorer_showBrowseComputerNotification");
			}
			rset.close();
			stmt.close();
			return browseComputerNotificationActive;
		} catch (SQLException e) {
			return true;
		}
	}
	@Override
	public void showBrowseComputerNotification(boolean b) throws SQLException {
		doUpdate("explorer", "explorer_showBrowseComputerNotification", b, "explorer_id=0");
	}

	@Override
	public Connection getConnection() {
		return conn;
	}

	@Override
	public String getLastDirFromFileChooser() throws SQLException {
		Statement stmt = conn.createStatement();
		stmt = conn.createStatement();
		String sql = "select explorer_lastDirFromFileChooser from explorer where explorer_id=0";
		ResultSet rset = stmt.executeQuery(sql);
		String lastDirFromFileChooser = null;
		if (rset.next()) {
			lastDirFromFileChooser = rset.getString("explorer_lastDirFromFileChooser");
		}
		conn.commit();
		stmt.close();
		return lastDirFromFileChooser;
	}

	@Override
	public void setLastDirFromFileChooser(String lastDirFromFileChooser) throws SQLException {
		doUpdate("explorer", "explorer_lastDirFromFileChooser", lastDirFromFileChooser, "explorer_id=0");
	}

	@Override
	public String getLastDirFromFolderChooser() throws SQLException {
		Statement stmt = conn.createStatement();
		stmt = conn.createStatement();
		String sql = "select explorer_lastDirFromFolderChooser from explorer where explorer_id=0";
		ResultSet rset = stmt.executeQuery(sql);
		String lastDirFromFileChooser = null;
		if (rset.next()) {
			lastDirFromFileChooser = rset.getString("explorer_lastDirFromFolderChooser");
		}
		conn.commit();
		stmt.close();
		return lastDirFromFileChooser;
	}

	@Override
	public void setLastDirFromFolderChooser(String lastDirFromFolderChooser) throws SQLException {
		doUpdate("explorer", "explorer_lastDirFromFolderChooser", lastDirFromFolderChooser, "explorer_id=0");
	}

	@Override
	public void setGameCode(int id, String gameCode) throws SQLException {
		gameDAO.setGameCode(id, gameCode);
	}
}
