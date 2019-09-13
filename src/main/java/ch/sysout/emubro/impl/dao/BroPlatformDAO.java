package ch.sysout.emubro.impl.dao;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import ch.sysout.emubro.api.dao.PlatformDAO;
import ch.sysout.emubro.api.model.Emulator;
import ch.sysout.emubro.api.model.Platform;
import ch.sysout.emubro.impl.model.BroEmulator;
import ch.sysout.emubro.impl.model.BroPlatform;
import ch.sysout.emubro.impl.model.EmulatorConstants;
import ch.sysout.emubro.impl.model.FileStructure;
import ch.sysout.emubro.impl.model.PlatformConstants;
import ch.sysout.util.SqlUtil;
import ch.sysout.util.ValidationUtil;

public class BroPlatformDAO implements PlatformDAO {
	private Connection conn;

	public BroPlatformDAO(Connection conn) {
		this.conn = conn;
	}

	@Override
	public void addPlatform(Platform platform) throws SQLException {
		ValidationUtil.checkNull(platform, "platform");
		String gameSearchModesString = "";
		String supportedArchiveTypesString = "";
		String supportedImageTypesString = "";
		String gameCodeRegexesString = "";
		for (String searchMode : platform.getGameSearchModes()) {
			gameSearchModesString += searchMode + " ";
		}
		for (String archiveType : platform.getSupportedArchiveTypes()) {
			supportedArchiveTypesString += archiveType + " ";
		}
		for (String imageType : platform.getSupportedImageTypes()) {
			supportedImageTypesString += imageType + " ";
		}
		for (String gameCodeRegex : platform.getGameCodeRegexes()) {
			gameCodeRegexesString += gameCodeRegex + " ";
		}
		Statement stmt = conn.createStatement();
		int structureId = (!platform.getFileStructure().isEmpty()) ? platform.getFileStructure().get(0).getId() : -2;
		String sql = SqlUtil.insertIntoWithColumnsString(
				"platform",
				"platform_name",
				"platform_shortName",
				"platform_iconFilename",
				"platform_defaultGameCover",
				"platform_gameSearchModes",
				"platform_searchFor",
				"platform_fileStructure",
				"platform_supportedArchiveTypes",
				"platform_supportedImageTypes",
				"platform_defaultEmulatorId",
				"platform_autoSearchEnabled",
				"platform_gameCodeRegexes",
				"platform_deleted",
				SqlUtil.getQuotedString(platform.getName()),
				SqlUtil.getQuotedString(platform.getShortName()),
				SqlUtil.getQuotedString(platform.getIconFileName()),
				SqlUtil.getQuotedString(platform.getDefaultGameCover()),
				SqlUtil.getQuotedString(gameSearchModesString),
				SqlUtil.getQuotedString(platform.getSearchFor()),
				structureId,
				SqlUtil.getQuotedString(supportedArchiveTypesString),
				SqlUtil.getQuotedString(supportedImageTypesString),
				platform.getDefaultEmulatorId(),
				platform.isAutoSearchEnabled(),
				SqlUtil.getQuotedString(gameCodeRegexesString),
				false);
		stmt.executeQuery(sql);
		conn.commit();

		if (structureId != -2) {
			FileStructure fs = platform.getFileStructure().get(0);
			List<String> files = fs.getFiles();
			String filesString = "";
			for (String s : files) {
				filesString += (s + " ");
			}
			sql = SqlUtil.insertIntoWithColumnsString("fileStructure",
					"structure_folderName",
					"structure_files",
					SqlUtil.getQuotedString(fs.getFolderName()),
					SqlUtil.getQuotedString(filesString));
			stmt.executeQuery(sql);
			conn.commit();

			structureId = getLastAddedStructureId();
			platform.getFileStructure().get(0).setId(structureId);

			// FIXME if exception occurs, database will be in an inconsistent
			// state
			sql = SqlUtil.insertIntoWithColumnsString("platform_structure", "platform_id", "structure_id",
					getLastAddedPlatformId(), structureId);
			stmt.executeQuery(sql);
			conn.commit();
		}

		stmt.close();
	}

	/**
	 * @param index
	 * @throws SQLException
	 */
	@Override
	public void removePlatform(int platformId) throws SQLException {
		Statement stmt = conn.createStatement();
		String sql = "update platform platform_deleted="+true+" where platform_id=" + platformId;
		stmt.executeQuery(sql);
		conn.commit();
		stmt.close();
	}

	@Override
	public Platform getPlatform(int platformId) throws SQLException {
		Statement stmt = conn.createStatement();
		stmt = conn.createStatement();

		String sql = "select * from platform where platform_id = " + platformId + " and platform_deleted != "+true;
		ResultSet rset = stmt.executeQuery(sql);
		Platform platform = null;
		if (rset.next()) {
			int id = rset.getInt("platform_id");
			String name = rset.getString("platform_name");
			String shortName = rset.getString("platform_shortName");
			String iconFilename = rset.getString("platform_iconFilename");
			String defaultGameCover = rset.getString("platform_defaultGameCover");
			String[] gameSearchModes = rset.getString("platform_gameSearchModes").split(" ");
			String searchFor = rset.getString("platform_searchFor");
			FileStructure[] fileStructure = getFileStructureFromPlatform(platformId);
			String[] supportedArchiveTypes = rset.getString("platform_supportedArchiveTypes").split(" ");
			String[] supportedImageTypes = rset.getString("platform_supportedImageTypes").split(" ");
			List<BroEmulator> emulators = getEmulators(platformId);
			Collections.sort(emulators);
			int defaultEmulatorId = rset.getInt("platform_defaultEmulatorId");
			boolean autoSearchEnabled = rset.getBoolean("platform_autoSearchEnabled");
			String[] gameCodeRegexes = rset.getString("platform_gameCodeRegexes").split(" ");
			platform = new BroPlatform(id, name, shortName, iconFilename, defaultGameCover, gameSearchModes, searchFor,
					fileStructure, supportedArchiveTypes, supportedImageTypes, emulators, defaultEmulatorId,
					autoSearchEnabled, gameCodeRegexes);
		}
		stmt.close();
		return platform;
	}

	@Override
	public List<BroEmulator> getEmulators(int platformId) throws SQLException {
		List<BroEmulator> emulators = new ArrayList<>();
		Statement stmt = conn.createStatement();
		stmt = conn.createStatement();

		String sql = "select * from platform_emulator where platform_id = " + platformId
				+ " order by platform_id, emulator_id";
		ResultSet rset = stmt.executeQuery(sql);
		while (rset.next()) {
			int emulatorId = rset.getInt("emulator_id");
			Emulator emulator = getEmulator(emulatorId);
			if (emulator != null) {
				emulators.add((BroEmulator) emulator);
			}
		}
		stmt.close();
		Collections.sort(emulators);
		return emulators;
	}

	/**
	 * FIXME reduntant method to {@link EmulatorDAO.getEmulator(int}
	 *
	 * @param emulatorId
	 * @return
	 * @throws SQLException
	 */
	private Emulator getEmulator(int emulatorId) throws SQLException {
		Statement stmt = conn.createStatement();
		stmt = conn.createStatement();

		String sql = "select * from emulator where emulator_id = " + emulatorId + " and emulator_deleted != "+true;
		ResultSet rset = stmt.executeQuery(sql);
		Emulator emulator = null;
		if (rset.next()) {
			try {
				int id = rset.getInt("emulator_id");
				String name = rset.getString("emulator_name");
				String shortName = rset.getString("emulator_shortName");
				String path = rset.getString("emulator_path");
				String iconFilename = rset.getString("emulator_iconFilename");
				String configFilePath = rset.getString("emulator_configFilePath");
				String website = rset.getString("emulator_website");
				String startParameter = rset.getString("emulator_startParameters");
				String searchString = rset.getString("emulator_searchString");
				String setupFileMatch = rset.getString("emulator_setupFileMatch");
				String[] supportedFileTypes = rset.getString("emulator_supportedFileTypes").split(" ");
				boolean autoSearchEnabled = rset.getBoolean("emulator_autoSearchEnabled");
				emulator = new BroEmulator(id, name, shortName, path, iconFilename, configFilePath, website, startParameter,
						supportedFileTypes, searchString, setupFileMatch, autoSearchEnabled);
			} catch (SQLException e) {
				e.printStackTrace();
			}
		}
		conn.commit();
		stmt.close();
		return emulator;
	}

	@Override
	public int getLastAddedPlatformId() throws SQLException {
		Statement stmt = conn.createStatement();
		stmt = conn.createStatement();
		String sql = "select TOP 1 platform_id from platform order by platform_id desc";
		ResultSet rset = stmt.executeQuery(sql);
		int platformId = PlatformConstants.NO_PLATFORM;
		if (rset.next()) {
			platformId = rset.getInt("platform_id");
		}
		stmt.close();
		return platformId;
	}

	@Override
	public void updatePlatform(Platform p) throws SQLException {
		System.out.println(p.getName());
		System.out.println(p.getDefaultEmulatorId());

		String gameSearchModesString = "";
		String supportedArchiveTypesString = "";
		String supportedImageTypesString = "";
		String gameCodeRegexesString = "";
		for (String searchMode : p.getGameSearchModes()) {
			gameSearchModesString += searchMode + " ";
		}
		for (String archiveType : p.getSupportedArchiveTypes()) {
			supportedArchiveTypesString += archiveType + " ";
		}
		for (String imageType : p.getSupportedImageTypes()) {
			supportedImageTypesString += imageType + " ";
		}
		for (String gameCodeRegex : p.getGameCodeRegexes()) {
			gameCodeRegexesString += gameCodeRegex + " ";
		}
		Statement stmt = conn.createStatement();
		String sql2 = "update platform set platform_name='" + p.getName() + "'," + "platform_iconFilename='"
				+ p.getIconFileName() + "'," + "platform_defaultGameCover='" + p.getDefaultGameCover() + "',"
				+ "platform_gameSearchModes='" + gameSearchModesString + "'," + "platform_searchFor='"
				+ p.getSearchFor() + "'," + "platform_supportedArchiveTypes='" + supportedArchiveTypesString + "',"
				+ "platform_supportedImageTypes='" + supportedImageTypesString + "'," + "platform_defaultEmulatorId="
				+ p.getDefaultEmulatorId() + "," + "platform_autoSearchEnabled=" + p.isAutoSearchEnabled() + "platform_gameCodeRegexes='" + gameCodeRegexesString + "'"
				+ " where platform_id=" + p.getId();
		stmt.executeQuery(sql2);
		conn.commit();
		stmt.close();
		for (Emulator e : p.getEmulators()) {
			System.out.println(e.getPath());
		}
	}

	@Override
	public int getLastAddedStructureId() throws SQLException {
		Statement stmt = conn.createStatement();
		stmt = conn.createStatement();
		String sql = "select TOP 1 structure_id from fileStructure order by structure_id desc";
		ResultSet rset = stmt.executeQuery(sql);
		int structureId = PlatformConstants.NO_PLATFORM;
		if (rset.next()) {
			structureId = rset.getInt("structure_id");
		}
		stmt.close();
		return structureId;
	}

	@Override
	public int getDefaultEmulator(Platform platform) throws SQLException {
		int platformId = platform.getId();
		int defaultEmulatorId = getPlatform(platformId).getDefaultEmulatorId();
		int emulatorId = defaultEmulatorId != EmulatorConstants.NO_EMULATOR ? defaultEmulatorId
				: getEmulators(platformId).get(0).getId();
		return emulatorId;
	}

	@Override
	public boolean hasDefaultEmulator(int platformId) throws SQLException {
		String sql = "select platform_defaultEmulatorId from platform where platform_id=" + platformId;
		Statement stmt = conn.createStatement();
		ResultSet rset = stmt.executeQuery(sql);
		if (rset.next()) {
			int id = rset.getInt("platform_defaultEmulatorId");
			boolean b = id != EmulatorConstants.NO_EMULATOR;
			stmt.close();
			return b;
		}
		stmt.close();
		return false;
	}

	@Override
	public void setDefaultEmulatorId(Platform platform, int id) throws SQLException {
		String sql = "update platform set platform_defaultEmulatorId="+id+" where platform_id=" + platform.getId();
		Statement stmt = conn.createStatement();
		stmt.executeQuery(sql);
		conn.commit();
		stmt.close();
	}

	@Override
	public void setDefaultEmulator(int platformId, int emulatorId) throws SQLException {
		Statement stmt = conn.createStatement();
		String sql = "update platform set platform_defaultEmulatorId=" + emulatorId + " where platform_id="
				+ platformId;
		stmt.executeQuery(sql);
		conn.commit();
		stmt.close();
	}

	@Override
	public FileStructure[] getFileStructureFromPlatform(int id) throws SQLException {
		List<FileStructure> fs = new ArrayList<>();
		Statement stmt = conn.createStatement();
		stmt = conn.createStatement();

		String sql = "select * from platform_structure where platform_id = " + id
				+ " order by platform_id, structure_id";
		ResultSet rset = stmt.executeQuery(sql);
		while (rset.next()) {
			int structureId = rset.getInt("structure_id");
			FileStructure structure = getFileStructure(structureId);
			fs.add(structure);
		}
		stmt.close();

		return fs.toArray(new FileStructure[fs.size()]);
	}

	private FileStructure getFileStructure(int emulatorId) throws SQLException {
		Statement stmt = conn.createStatement();
		stmt = conn.createStatement();

		String sql = "select * from fileStructure where structure_id = " + emulatorId;
		ResultSet rset = stmt.executeQuery(sql);
		FileStructure fs = null;
		if (rset.next()) {
			try {
				int id = rset.getInt("structure_id");
				String name = rset.getString("structure_folderName");
				String[] files = rset.getString("structure_files").split(" ");
				fs = new FileStructure(id, name, files);
			} catch (SQLException e) {
				e.printStackTrace();
			}
		}
		conn.commit();
		stmt.close();
		return fs;
	}

	@Override
	public void addSearchFor(int platformId, String newSearchFor) throws SQLException {
		String searchFor = getPlatform(platformId).getSearchFor();
		if (searchFor.isEmpty()) {
			searchFor = newSearchFor;
		} else {
			searchFor += "|"+newSearchFor;
		}
		String sql = "update platform set platform_searchFor='"+searchFor+"' where platform_id=" + platformId;
		Statement stmt = conn.createStatement();
		stmt.executeQuery(sql);
		conn.commit();
		stmt.close();
	}
}
