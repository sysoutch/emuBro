package ch.sysout.emubro.impl.dao;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

import ch.sysout.emubro.api.dao.EmulatorDAO;
import ch.sysout.emubro.api.model.Emulator;
import ch.sysout.emubro.impl.BroEmulatorDeletedException;
import ch.sysout.emubro.impl.model.BroEmulator;
import ch.sysout.emubro.impl.model.EmulatorConstants;
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

		String sql = "select * from emulator where emulator_id = " + id + " and emulator_deleted != "+true;
		ResultSet rset = stmt.executeQuery(sql);
		Emulator emulator = null;
		if (rset.next()) {
			try {
				int emulatorId = rset.getInt("emulator_id");
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
				boolean biosRequired = rset.getBoolean("emulator_biosRequired");
				String[] runCommandsBefore = rset.getString("emulator_runCommandsBefore").split(" ");
				emulator = new BroEmulator(emulatorId, name, shortName, path, iconFilename, configFilePath, website,
						startParameter, supportedFileTypes, searchString, setupFileMatch, autoSearchEnabled, biosRequired, runCommandsBefore);
			} catch (SQLException e) {
				e.printStackTrace();
			}
		}
		conn.commit();
		stmt.close();
		return emulator;
	}

	@Override
	public void addEmulator(int platformId, Emulator emulator) throws BroEmulatorDeletedException, SQLException {
		ValidationUtil.checkNull(emulator, "emulator");
		if (!hasEmulator(platformId, emulator.getAbsolutePath())) {
			if (isDeleted(platformId, emulator)) {
				throw new BroEmulatorDeletedException("emulator was added already, but has been deleted: " + emulator.getName(), emulator);
			}
			Statement stmt = conn.createStatement();
			String supportedFileTypesString = "";
			for (String type : emulator.getSupportedFileTypes()) {
				supportedFileTypesString += type + " ";
			}

			String runCommandsBeforeString = "";
			var runCommandsBefore = emulator.getRunCommandsBefore();
			if (runCommandsBefore != null) {
				for (String type : runCommandsBefore) {
					runCommandsBeforeString += type + " ";
				}
			}
			String startParameter = emulator.getStartParameters();
			/**
			 * TODO implement runCommandsBefore
			 */
			String sql = SqlUtil.insertIntoWithColumnsString("emulator", "emulator_name", "emulator_path",
					"emulator_iconFileName", "emulator_configFilePath", "emulator_website", "emulator_startParameters",
					"emulator_searchString", "emulator_supportedFileTypes", "emulator_autoSearchEnabled", "emulator_biosRequired", "emulator_runCommandsBefore",
					"emulator_deleted",
					SqlUtil.getQuotedString(emulator.getName()),
					SqlUtil.getQuotedString(emulator.getAbsolutePath()),
					SqlUtil.getQuotedString(emulator.getIconFilename()),
					SqlUtil.getQuotedString(emulator.getConfigFilePath()),
					SqlUtil.getQuotedString(emulator.getWebsite()),
					SqlUtil.getQuotedString(startParameter),
					SqlUtil.getQuotedString(emulator.getSearchString()),
					SqlUtil.getQuotedString(supportedFileTypesString),
					emulator.isAutoSearchEnabled(),
					emulator.isBiosRequired(),
					SqlUtil.getQuotedString(runCommandsBeforeString),
					false);
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

	private boolean isDeleted(int platformId, Emulator emulator) throws SQLException {
		String sql = "select * from platform_emulator where platform_id=" + platformId;
		Statement stmt = conn.createStatement();
		ResultSet rset = stmt.executeQuery(sql);
		List<Integer> rsetCopy = new ArrayList<>();
		while (rset.next()) {
			rsetCopy.add(rset.getInt("emulator_id"));
		}
		stmt.close();
		String emulatorPath = emulator.getAbsolutePath();
		if (emulatorPath != null) {
			String pathEdited = emulatorPath.toLowerCase().trim();
			for (int i : rsetCopy) {
				stmt = conn.createStatement();
				sql = "select emulator_id, emulator_path from emulator where emulator_id="+i
						+ " and lower(emulator_path)="+SqlUtil.getQuotedString(pathEdited) + " and emulator_deleted="+true;
				rset = stmt.executeQuery(sql);
				if (rset.next()) {
					stmt.close();
					return true;
				}
				stmt.close();
			}
		}
		return false;
	}

	@Override
	public void removeEmulator(int emulatorId) throws SQLException {
		Statement stmt = conn.createStatement();
		String sql = "update emulator set emulator_deleted="+true+" where emulator_id=" + emulatorId;
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
	public boolean hasEmulator(int platformId, String path) throws SQLException {
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
					+ " and lower(emulator_path) = " + SqlUtil.getQuotedString(pathEdited) + " and emulator_deleted != "+true;
			rset = stmt.executeQuery(sql);
			if (rset.next()) {
				stmt.close();
				return true;
			}
			stmt.close();
		}
		return false;
	}

	@Override
	public void restoreEmulator(Emulator emulator) throws SQLException {
		Statement stmt = conn.createStatement();
		String pathEdited = emulator.getAbsolutePath().toLowerCase().trim();
		String sql = "update emulator set emulator_deleted=false where lower(emulator_path)="+SqlUtil.getQuotedString(pathEdited);
		stmt.executeQuery(sql);
		conn.commit();
		stmt.close();
	}
}
