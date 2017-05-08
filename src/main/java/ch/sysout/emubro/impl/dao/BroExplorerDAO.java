package ch.sysout.emubro.impl.dao;

import java.io.BufferedReader;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

import ch.sysout.emubro.Main;
import ch.sysout.emubro.api.dao.EmulatorDAO;
import ch.sysout.emubro.api.dao.ExplorerDAO;
import ch.sysout.emubro.api.dao.GameDAO;
import ch.sysout.emubro.api.dao.PlatformDAO;
import ch.sysout.emubro.api.model.Emulator;
import ch.sysout.emubro.api.model.Game;
import ch.sysout.emubro.api.model.Platform;
import ch.sysout.emubro.controller.HSQLDBConnection;
import ch.sysout.emubro.impl.BroGameAlreadyExistsException;
import ch.sysout.emubro.impl.model.BroEmulator;
import ch.sysout.emubro.impl.model.BroGame;
import ch.sysout.emubro.impl.model.BroPlatform;
import ch.sysout.emubro.impl.model.FileStructure;
import ch.sysout.emubro.impl.model.GameConstants;
import ch.sysout.emubro.impl.model.PlatformConstants;
import ch.sysout.util.Messages;

public class BroExplorerDAO implements ExplorerDAO {
	private Connection conn;
	private String userHome = System.getProperty("user.home");
	private String applicationHome = userHome += userHome.endsWith(File.separator) ? "" : File.separator + ".emubro";
	private String databasePath = applicationHome += applicationHome.endsWith(File.separator) ? ""
			: File.separator + "db";
	private String databaseName = Messages.get("applicationTitle").toLowerCase();

	private PlatformDAO platformDAO;
	private GameDAO gameDAO;
	private EmulatorDAO emulatorDAO;
	private final int explorerId;

	public BroExplorerDAO(int explorerId) throws IOException, SQLException {
		this.explorerId = explorerId;
		HSQLDBConnection hsqldbConnection = new HSQLDBConnection(databasePath, databaseName);
		Main.dlgSplashScreen.updateText(Messages.get("startUp"));
		conn = hsqldbConnection.getConnection();
		platformDAO = new BroPlatformDAO(conn);
		gameDAO = new BroGameDAO(conn);
		emulatorDAO = new BroEmulatorDAO(conn);

		Statement stmt;
		InputStream stream = getClass().getResourceAsStream("/create_emu_tables.sql");
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
			conn.commit();
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
			String sql = "insert into explorer (explorer_configWizardHiddenAtStartup, explorer_searchProcessComplete, explorer_lastSelectedGameId)"
					+ " values ('false', 'false', " + GameConstants.NO_GAME + ")";
			System.out.println(databasePath + " ~~ " + databaseName);
			stmt.executeQuery(sql);
			stmt.close();
		}
	}

	private boolean hasExplorer() throws SQLException {
		boolean hasExplorer = doSelect("explorer_id", explorerId);
		return hasExplorer;
	}

	private boolean doSelect(String string, int explorerId2) throws SQLException {
		Statement stmt = null;
		stmt = conn.createStatement();
		String sql = "select * from explorer where explorer_id=" + explorerId;
		ResultSet rset = stmt.executeQuery(sql);
		stmt.close();
		if (rset.next()) {
			return true;
		}
		return false;
	}

	@Override
	public boolean isSearchProcessComplete() {
		Statement stmt;
		try {
			stmt = conn.createStatement();
			ResultSet rs = stmt.executeQuery(
					"select explorer_searchProcessComplete from explorer where explorer_id=" + explorerId);
			if (rs.next()) {
				boolean complete = rs.getBoolean("explorer_searchProcessComplete");
				return complete;
			}
		} catch (SQLException e) {
			return false;
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
	public Platform getPlatform(int platformId) throws SQLException {
		return platformDAO.getPlatform(platformId);
	}

	@Override
	public List<Game> getGames() throws SQLException {
		return gameDAO.getGames();
	}

	/**
	 * FIXME CHECK ' ''
	 *
	 * @param gamePath
	 * @return
	 * @throws SQLException
	 */
	@Override
	public boolean hasGame(String gamePath) throws SQLException {
		return gameDAO.hasGame(gamePath);
	}

	/**
	 * @param game
	 * @throws SQLException
	 * @throws BroGameAlreadyExistsException
	 */
	@Override
	public void addGame(Game game) throws SQLException, BroGameAlreadyExistsException {
		gameDAO.addGame(game);
	}

	@Override
	public void addEmulator(int platformId, Emulator emulator) throws SQLException {
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
		String sql = "select * from platform where lower(platform_name) = '" + platformName.toLowerCase() + "'";
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
		String sql = "select platform_id, platform_name from platform where lower(platform_name) = '" + name + "'";
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
			Platform platform = new BroPlatform(id, name, iconFilename, defaultGameCover, gameSearchModes, searchFor,
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
				"select explorer_configWizardHiddenAtStartup from explorer where explorer_id=" + explorerId);
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
		doUpdate("explorer", key, value, getWhereClause("explorer_id", explorerId));
	}

	private void doExplorerUpdate(String key, int value) throws SQLException {
		doUpdate("explorer", key, value, getWhereClause("explorer_id", explorerId));
	}

	private void doExplorerUpdate(String key, boolean value) throws SQLException {
		doUpdate("explorer", key, value, getWhereClause("explorer_id", explorerId));
	}

	private void doUpdate(String table, String key, String value, String whereClause) throws SQLException {
		Statement stmt = conn.createStatement();
		String sql = "update " + table + " set " + key + "='" + value + "'" + whereClause;
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
		String sql = "update " + table + " set " + key + "=" + value + whereClause;
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
}
