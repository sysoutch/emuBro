package ch.sysout.gameexplorer.impl.dao;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

import ch.sysout.gameexplorer.api.dao.GameDAO;
import ch.sysout.gameexplorer.api.model.Game;
import ch.sysout.gameexplorer.impl.BroGameAlreadyExistsException;
import ch.sysout.gameexplorer.impl.model.BroGame;
import ch.sysout.gameexplorer.impl.model.GameConstants;
import ch.sysout.util.SqlUtil;
import ch.sysout.util.ValidationUtil;

public class BroGameDAO implements GameDAO {
	private Connection conn;

	public BroGameDAO(Connection connection) {
		conn = connection;
	}

	@Override
	public void updateGame(Game game) throws SQLException {
		Statement stmt = conn.createStatement();

		String coverPath = game.getCoverPath();
		int emulatorId = game.getEmulatorId();

		Date da = game.getDateAdded();
		Date lp = game.getLastPlayed();

		long dateAddedLong = da == null ? new Date().getTime() : da.getTime();
		Timestamp dateAdded = new java.sql.Timestamp(dateAddedLong);

		Timestamp lastPlayed = null;
		if (lp != null) {
			long lastPlayedLong = lp.getTime();
			lastPlayed = new java.sql.Timestamp(lastPlayedLong);
		}

		String gamePath = game.getPath().trim();

		String sql2 = "update game set game_name='" + game.getName().replaceAll("'", "''") + "'," + "game_path='"
				+ gamePath.replaceAll("'", "''") + "'," + "game_coverPath='" + coverPath.replaceAll("'", "''") + "',"
				+ "game_rate=" + game.getRate() + "," + "game_added='" + dateAdded + "',"
				+ ((lastPlayed == null) ? null : lastPlayed) + "," + "game_playCount=" + game.getPlayCount() + ","
				+ "game_emulatorId=" + emulatorId + "," + "game_platformId=" + game.getPlatformId() + ","
				+ "game_platformIconFileName='" + game.getPlatformIconFileName().replaceAll("'", "''") + "'"
				+ " where game_id=" + game.getId();
		stmt.executeQuery(sql2);
		conn.commit();
		stmt.close();
	}

	@Override
	public void removeGame(int gameId) throws SQLException {
		Statement stmt = conn.createStatement();
		String sql = "delete from game where game_id=" + gameId;
		stmt.executeQuery(sql);
		conn.commit();
		stmt.close();
	}

	@Override
	public void renameGame(int gameId, String newTitle) throws SQLException {
		Statement stmt = conn.createStatement();
		String sql = "update game set game_name = '"+newTitle.replaceAll("'", "''")+"' where game_id=" + gameId;
		stmt.executeQuery(sql);
		conn.commit();
		stmt.close();
	}

	@Override
	public void addGame(Game game) throws SQLException, BroGameAlreadyExistsException {
		ValidationUtil.checkNull(game, "game");
		if (hasGame(game)) {
			throw new BroGameAlreadyExistsException("game path: " + game.getPath());
		}
		Statement stmt = conn.createStatement();
		String coverPath = game.getCoverPath().replaceAll("'", "''");
		int emulatorId = game.getEmulatorId();
		Date da = game.getDateAdded();
		Date lp = game.getLastPlayed();
		long dateAddedLong = da == null ? new Date().getTime() : da.getTime();
		Timestamp dateAdded = new java.sql.Timestamp(dateAddedLong);
		Timestamp lastPlayed = null;
		if (lp != null) {
			long lastPlayedLong = lp.getTime();
			lastPlayed = new java.sql.Timestamp(lastPlayedLong);
		}
		String gamePath = game.getPath().trim();
		String gameName = game.getName();
		String platformIconFileName = game.getPlatformIconFileName();
		String sql = SqlUtil.insertIntoWithColumnsString("game", "game_name", "game_path", "game_coverPath",
				"game_rate", "game_added", "game_lastPlayed", "game_playCount", "game_emulatorId", "game_platformId",
				"game_platformIconFileName", "'" + gameName.replaceAll("'", "''") + "'",
				"'" + gamePath.replaceAll("'", "''") + "'", "'" + coverPath + "'", game.getRate(),
				"'" + dateAdded + "'", ((lastPlayed == null) ? null : lastPlayed), game.getPlayCount(), emulatorId,
				game.getPlatformId(), "'" + platformIconFileName.replaceAll("'", "''") + "'");
		stmt.executeQuery(sql);
		conn.commit();
		stmt.close();
	}

	@Override
	public void setEmulatorForGame(int gameId, int emulatorId) throws SQLException {
		Statement stmt = conn.createStatement();
		String sql = "update game set game_emulatorId = " + emulatorId + " where game_id = " + gameId;
		stmt.executeQuery(sql);
		conn.commit();
		stmt.close();
	}

	@Override
	public boolean hasGames() {
		Statement stmt;
		try {
			stmt = conn.createStatement(ResultSet.TYPE_SCROLL_INSENSITIVE, ResultSet.CONCUR_READ_ONLY);
			ResultSet rs = stmt.executeQuery("select * from game");
			if (rs.next()) {
				rs.last();
				return rs.getRow() > 0;
			}
		} catch (SQLException e) {
			return false;
		}
		return false;
	}

	@Override
	public boolean hasGame(Game game) throws SQLException {
		String gamePath = game.getPath().toLowerCase();
		// String gamePathToMatch = gamePath.replaceAll("'",
		// "''").toLowerCase().trim();
		Statement stmt = conn.createStatement();
		String sql = "select game_id, game_path from game where lower(game_path) = '" + gamePath.replaceAll("'", "''")
		+ "'";
		ResultSet rset = stmt.executeQuery(sql);
		boolean b = false;
		if (rset.next()) {
			String gamePathFromDb = rset.getString("game_path").toLowerCase().trim();
			if (gamePathFromDb.equals(gamePath)) {
				b = true;
			}
		}
		stmt.close();
		return b;
	}

	@Override
	public BroGame getGameAt(int gameId) throws SQLException {
		Statement stmt = conn.createStatement();
		stmt = conn.createStatement();

		String sql = "select * from game where game_id = " + gameId;
		ResultSet rset = stmt.executeQuery(sql);
		BroGame game = null;
		if (rset.next()) {
			int id = rset.getInt("game_id");
			String name = rset.getString("game_name");
			String path = rset.getString("game_path");
			String iconPath = rset.getString("game_iconPath");
			String coverPath = rset.getString("game_coverPath");
			int rate = rset.getInt("game_rate");
			java.util.Date dateAdded = rset.getDate("game_added");
			java.util.Date lastPlayed = rset.getDate("game_lastPlayed");
			int playCount = rset.getInt("game_playCount");
			int emulatorId = rset.getInt("game_emulatorId");
			int platformId = rset.getInt("game_platformId");
			String platformIconFileName = rset.getString("game_platformIconFileName");
			game = new BroGame(id, name, path, iconPath, coverPath, rate, dateAdded, lastPlayed, playCount, emulatorId,
					platformId, platformIconFileName);
		}
		stmt.close();
		return game;
	}

	@Override
	public List<Game> getGames() throws SQLException {
		List<Game> games = new ArrayList<>();
		Statement stmt = conn.createStatement();
		stmt = conn.createStatement();
		String sql = "select * from game order by lower(game_name)";
		ResultSet rset = stmt.executeQuery(sql);
		while (rset.next()) {
			int id = rset.getInt("game_id");
			Game game = getGameAt(id);
			games.add(game);
		}
		stmt.close();
		return games;
	}

	@Override
	public boolean hasGame(String gamePath) throws SQLException {
		String gamePathToMatch = gamePath.toLowerCase().trim();
		Statement stmt = conn.createStatement();
		String sql = "select game_id, game_path from game where lower(game_path) = '"
				+ gamePathToMatch.replaceAll("'", "''") + "'";
		ResultSet rset = stmt.executeQuery(sql);
		boolean b = false;
		if (rset.next()) {
			String gamePathFromDb = rset.getString("game_path").toLowerCase().trim();
			if (gamePathFromDb.equals(gamePathToMatch)) {
				b = true;
			}
		}
		stmt.close();
		return b;
	}

	@Override
	public void updatePlayCount(Game game) throws SQLException {
		Statement stmt = conn.createStatement();
		stmt = conn.createStatement();
		String sql = "update game set game_playCount=" + game.getPlayCount() + " where game_id=" + game.getId();
		stmt.executeQuery(sql);
		stmt.close();
	}

	@Override
	public void updateLastPlayed(Game game) throws SQLException {
		Date date = game.getLastPlayed();
		long lastPlayedLong = date == null ? null : date.getTime();
		Timestamp lastPlayed = new java.sql.Timestamp(lastPlayedLong);

		Statement stmt = conn.createStatement();
		String sql = "update game set game_lastPlayed='" + lastPlayed + "' where game_id = " + game.getId();
		stmt.executeQuery(sql);
		stmt.close();
	}

	@Override
	public int getLastAddedGameId() throws SQLException {
		Statement stmt = conn.createStatement();
		stmt = conn.createStatement();
		String sql = "select TOP 1 game_id from game order by game_id desc";
		ResultSet rset = stmt.executeQuery(sql);
		int gameId = GameConstants.NO_GAME;
		if (rset.next()) {
			gameId = rset.getInt("game_id");
		}
		stmt.close();
		return gameId;
	}

	@Override
	public void setRate(int gameId, int newRate) throws SQLException {
		Statement stmt = conn.createStatement();
		String sql = "update game set game_rate = " + newRate + " where game_id = " + gameId;
		stmt.executeQuery(sql);
		conn.commit();
		stmt.close();
	}

	@Override
	public void setIconPath(int gameId, String iconPath) throws SQLException {
		Statement stmt = conn.createStatement();
		String sql = "update game set game_iconPath = '" + iconPath + "' where game_id = " + gameId;
		stmt.executeQuery(sql);
		conn.commit();
		stmt.close();
	}

	@Override
	public void setCoverPath(int gameId, String coverPath) throws SQLException {
		Statement stmt = conn.createStatement();
		String sql = "update game set game_coverPath = '" + coverPath + "' where game_id = " + gameId;
		stmt.executeQuery(sql);
		conn.commit();
		stmt.close();
	}
}
