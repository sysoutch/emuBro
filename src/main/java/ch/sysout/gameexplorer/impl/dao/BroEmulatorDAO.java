package ch.sysout.gameexplorer.impl.dao;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

import ch.sysout.gameexplorer.api.dao.EmulatorDAO;
import ch.sysout.gameexplorer.api.model.Emulator;
import ch.sysout.gameexplorer.impl.model.BroEmulator;
import ch.sysout.gameexplorer.impl.model.EmulatorConstants;
import ch.sysout.util.SqlUtil;
import ch.sysout.util.ValidationUtil;

public class BroEmulatorDAO implements EmulatorDAO {
	private Connection conn;

	public BroEmulatorDAO(Connection conn) {
		this.conn = conn;
	}

	@Override
	public Emulator getEmulator(int id) throws SQLException {
		Statement stmt = conn.createStatement();
		stmt = conn.createStatement();

		String sql = "select * from emulator where emulator_id = " + id;
		ResultSet rset = stmt.executeQuery(sql);
		Emulator emulator = null;
		if (rset.next()) {
			try {
				int emulatorId = rset.getInt("emulator_id");
				String name = rset.getString("emulator_name");
				String path = rset.getString("emulator_path");
				String iconFilename = rset.getString("emulator_iconFilename");
				String configFilePath = rset.getString("emulator_configFilePath");
				String website = rset.getString("emulator_website");
				String startParameter = rset.getString("emulator_startParameters");
				String searchString = rset.getString("emulator_searchString");
				String[] supportedFileTypes = rset.getString("emulator_supportedFileTypes").split(" ");
				boolean autoSearchEnabled = rset.getBoolean("emulator_autoSearchEnabled");
				emulator = new BroEmulator(emulatorId, name, path, iconFilename, configFilePath, website,
						startParameter, supportedFileTypes, searchString, autoSearchEnabled);
			} catch (SQLException e) {
				e.printStackTrace();
			}
		}
		conn.commit();
		stmt.close();
		return emulator;
	}

	@Override
	public void addEmulator(int platformId, Emulator emulator) throws SQLException {
		ValidationUtil.checkNull(emulator, "emulator");
		if (!hasEmulator(platformId, emulator.getPath())) {
			Statement stmt = conn.createStatement();
			String supportedFileTypesString = "";
			for (String type : emulator.getSupportedFileTypes()) {
				supportedFileTypesString += type + " ";
			}
			String startParameter = emulator.getStartParameters();
			String sql = SqlUtil.insertIntoWithColumnsString("emulator", "emulator_name", "emulator_path",
					"emulator_iconFileName", "emulator_configFilePath", "emulator_website", "emulator_startParameters",
					"emulator_searchString", "emulator_supportedFileTypes", "emulator_autoSearchEnabled",
					"'" + emulator.getName() + "'", "'" + emulator.getPath() + "'",
					"'" + emulator.getIconFilename() + "'", "'" + emulator.getConfigFilePath() + "'",
					"'" + emulator.getWebsite() + "'", "'" + startParameter + "'",
					"'" + emulator.getSearchString() + "'", "'" + supportedFileTypesString + "'",
					emulator.isAutoSearchEnabled());
			System.out.println("sql BroEmulatorDAO: " + sql);
			try {
				stmt.executeQuery(sql);
			} catch (SQLException e) {
				// TODO Auto-generated catch block
				e.printStackTrace();
			}
			conn.commit();

			// FIXME if exception occurs, database will be in an inconsistent
			// state
			sql = SqlUtil.insertIntoWithColumnsString("platform_emulator", "platform_id", "emulator_id", platformId,
					getLastAddedEmulatorId());
			System.out.println("sql BroEmulatorDAO: " + sql);
			System.err.println(sql);
			stmt.executeQuery(sql);
			conn.commit();

			stmt.close();
		}
	}

	@Override
	public void removeEmulator(int emulatorId) throws SQLException {
		Statement stmt = conn.createStatement();
		String sql = "delete emulator where emulator_id=" + emulatorId;
		stmt.executeQuery(sql);
		conn.commit();
		stmt.close();
	}

	@Override
	public int getLastAddedEmulatorId() throws SQLException {
		Statement stmt = conn.createStatement();
		stmt = conn.createStatement();
		String sql = "select TOP 1 emulator_id from emulator order by emulator_id desc";
		ResultSet rset = stmt.executeQuery(sql);
		int emulatorId = EmulatorConstants.NO_EMULATOR;
		if (rset.next()) {
			emulatorId = rset.getInt("emulator_id");
		}
		stmt.close();
		return emulatorId;
	}

	/**
	 * FIXME check emulator only for specified platform
	 *
	 * @param path
	 * @return
	 * @throws SQLException
	 */
	@Override
	public boolean hasEmulator(final int platformId, String path) throws SQLException {
		if (path == null || path.trim().isEmpty()) {
			return false;
		}
		String pathEdited = path.toLowerCase().trim();

		String sql = "select * from platform_emulator where platform_id=" + platformId;
		Statement stmt = conn.createStatement();
		ResultSet rset = stmt.executeQuery(sql);
		List<Integer> rsetCopy = new ArrayList<>();
		while (rset.next()) {
			rsetCopy.add(rset.getInt("emulator_id"));
		}
		stmt.close();

		for (int i : rsetCopy) {
			stmt = conn.createStatement();
			sql = "select emulator_id, emulator_path from emulator where emulator_id =" + i
					+ " and lower(emulator_path) = '" + pathEdited + "'";
			rset = stmt.executeQuery(sql);
			if (rset.next()) {
				stmt.close();
				return true;
			}
			stmt.close();
		}
		return false;
	}
}
