package ch.sysout.emubro.impl.dao;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;

import ch.sysout.emubro.api.dao.GameDAO;
import ch.sysout.emubro.api.model.Game;
import ch.sysout.emubro.api.model.Tag;
import ch.sysout.emubro.impl.BroGameAlreadyExistsException;
import ch.sysout.emubro.impl.BroGameDeletedException;
import ch.sysout.emubro.impl.model.BroGame;
import ch.sysout.emubro.impl.model.BroTag;
import ch.sysout.emubro.impl.model.GameConstants;
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
		int defaultEmulatorId = game.getDefaultEmulatorId();

		//		long dateAddedLong = da == null ? new Date().getTime() : da.getTime();
		//		Timestamp dateAdded = new java.sql.Timestamp(dateAddedLong);

		//		Timestamp lastPlayed = null;
		//		if (lp != null) {
		//			long lastPlayedLong = lp.getTime();
		//			lastPlayed = new java.sql.Timestamp(lastPlayedLong);
		//		}
		String sql2 = "update game set"
				+ "game_name=" + SqlUtil.getQuotedString(SqlUtil.getQuotationsMarkedString(game.getName()))+","
				+ "game_coverPath=" + SqlUtil.getQuotedString(SqlUtil.getQuotationsMarkedString(coverPath))+","
				+ "game_rate=" + game.getRate() + ","
				//				+ "game_added='" + dateAdded + "',"
				//				+ ((lastPlayed == null) ? null : lastPlayed) + ","
				+ "game_playCount=" + game.getPlayCount() + ","
				+ "game_defaultEmulatorId=" + defaultEmulatorId + ","
				+ "game_platformId=" + game.getPlatformId() + ","
				+ "game_platformIconFileName=" + SqlUtil.getQuotedString(SqlUtil.getQuotationsMarkedString(game.getPlatformIconFileName()))
				+ " where game_id=" + game.getId();
		stmt.executeQuery(sql2);
		conn.commit();
		stmt.close();
	}

	@Override
	public void removeGame(int gameId) throws SQLException {
		Statement stmt = conn.createStatement();
		String sql = "update game set game_deleted=true where game_id=" + gameId;
		stmt.executeQuery(sql);
		conn.commit();
		stmt.close();
	}

	@Override
	public void renameGame(int gameId, String newTitle) throws SQLException {
		Statement stmt = conn.createStatement();
		String sql = "update game set game_name = '"+SqlUtil.getQuotationsMarkedString(newTitle)+"' where game_id=" + gameId;
		stmt.executeQuery(sql);
		conn.commit();
		stmt.close();
	}

	@Override
	public void addGame(Game game, String filePath) throws SQLException, BroGameAlreadyExistsException, BroGameDeletedException {
		ValidationUtil.checkNull(game, "game");
		Statement stmt = conn.createStatement();

		if (!hasFile(filePath)) {
			String sql2 = SqlUtil.insertIntoWithColumnsString("file", "file_path",
					SqlUtil.getQuotedString(SqlUtil.getQuotationsMarkedString(filePath)));
			stmt.executeQuery(sql2);
			conn.commit();
		}
		int gameId = GameConstants.NO_GAME;
		if ((gameId = hasGame(game)) != GameConstants.NO_GAME) {
			if (!hasGameFile(gameId, getFileId(filePath))) {
				String sql3 = SqlUtil.insertIntoWithColumnsString("game_file", "game_id", "file_id",
						gameId, getFileId(filePath));
				stmt = conn.createStatement();
				stmt.executeQuery(sql3);
				conn.commit();
			}
			stmt.close();
			BroGameAlreadyExistsException ex = new BroGameAlreadyExistsException("game or copy of game does already exist: " + filePath);
			ex.setGameId(gameId);
			throw ex;
		}

		if (isDeleted(game)) {
			throw new BroGameDeletedException("game was added already, but has been deleted: " + game.getName(), game);
		}

		String coverPath = SqlUtil.getQuotationsMarkedString(game.getCoverPath());
		int defaultEmulatorId = game.getDefaultEmulatorId();
		//		ZonedDateTime dateAdded = game.getDateAdded();
		ZonedDateTime lastPlayed = game.getLastPlayed();
		//		dateAdded = ZonedDateTime.of(LocalDate.now().atTime(11, 30), ZoneOffset.UTC);

		//		ZoneId swissZone = ZoneId.of("Europe/Zurich");
		//		ZonedDateTime swissZoned = dateAdded.withZoneSameInstant(swissZone);
		//		LocalDateTime swissLocal = swissZoned.toLocalDateTime();

		String gameName = game.getName();
		String platformIconFileName = game.getPlatformIconFileName();
		String sql = SqlUtil.insertIntoWithColumnsString("game",
				"game_name",
				"game_defaultFileId",
				"game_checksumId",
				"game_coverPath",
				"game_rate",
				"game_added",
				"game_lastPlayed",
				"game_playCount",
				"game_defaultEmulatorId",
				"game_platformId",
				"game_platformIconFileName",
				"game_deleted",
				SqlUtil.getQuotedString(SqlUtil.getQuotationsMarkedString(gameName)),
				game.getDefaultFileId(),
				game.getChecksumId(),
				SqlUtil.getQuotedString(coverPath),
				game.getRate(),
				"CURRENT_TIMESTAMP",
				((lastPlayed == null) ? null : lastPlayed),
				game.getPlayCount(),
				defaultEmulatorId,
				game.getPlatformId(),
				SqlUtil.getQuotedString(SqlUtil.getQuotationsMarkedString(platformIconFileName)),
				false);
		stmt.executeQuery(sql);
		conn.commit();

		String sql3 = SqlUtil.insertIntoWithColumnsString("game_file", "game_id", "file_id",
				getLastAddedGameId(), getLastAddedFileId());
		stmt.executeQuery(sql3);
		conn.commit();

		stmt.close();
	}

	@Override
	public void restoreGame(Game game) throws SQLException {
		Statement stmt = conn.createStatement();
		String sql = "update game set game_deleted=false where game_checksumId="+game.getChecksumId();
		stmt.executeQuery(sql);
		conn.commit();
		stmt.close();
	}

	private int getFileId(String filePath) throws SQLException {
		Statement stmt = conn.createStatement();
		stmt = conn.createStatement();
		String sql = "select file_id from file where file_path = " + SqlUtil.getQuotedString(SqlUtil.getQuotationsMarkedString(filePath));
		ResultSet rset = stmt.executeQuery(sql);
		int fileId = -1;
		if (rset.next()) {
			fileId = rset.getInt("file_id");
		}
		return fileId;
	}

	private boolean hasGameFile(int gameId, int fileId) throws SQLException {
		String sql = "select * from game_file where game_id=" + gameId + " and file_id=" + fileId;
		Statement stmt = conn.createStatement();
		ResultSet rset = stmt.executeQuery(sql);
		if (rset.next()) {
			stmt.close();
			return true;
		}
		stmt.close();
		return false;
	}

	private int getLastAddedFileId() throws SQLException {
		Statement stmt = conn.createStatement();
		stmt = conn.createStatement();
		String sql = "select TOP 1 file_id from file order by file_id desc";
		ResultSet rset = stmt.executeQuery(sql);
		int fileId = -1;
		if (rset.next()) {
			fileId = rset.getInt("file_id");
		}
		stmt.close();
		return fileId;
	}

	private boolean isDeleted(Game game) throws SQLException {
		Statement stmt = conn.createStatement();
		String sql = "select game_deleted from game where game_checksumId = " + game.getChecksumId();
		ResultSet rset = stmt.executeQuery(sql);
		if (rset.next()) {
			boolean gameDeleted = rset.getBoolean("game_deleted");
			stmt.close();
			return gameDeleted;
		}
		return false;
	}

	@Override
	public void setDefaultEmulatorId(Game game, int id) throws SQLException {
		Statement stmt = conn.createStatement();
		String sql = "update game set game_defaultEmulatorId = " + id + " where game_id = " + game.getId();
		stmt.executeQuery(sql);
		conn.commit();
		stmt.close();
	}

	@Override
	public boolean hasGames() {
		Statement stmt;
		try {
			stmt = conn.createStatement(ResultSet.TYPE_SCROLL_INSENSITIVE, ResultSet.CONCUR_READ_ONLY);
			ResultSet rs = stmt.executeQuery("select * from game where game_deleted != "+true);
			if (rs.next()) {
				rs.last();
				return rs.getRow() > 0;
			}
		} catch (SQLException e) {
			return false;
		}
		return false;
	}

	private int hasGame(Game game) throws SQLException {
		Statement stmt = conn.createStatement();
		String sql = "select game_id from game where game_checksumId = " + game.getChecksumId() + " and game_platformId = " + game.getPlatformId() + " and game_deleted != "+true;
		ResultSet rset = stmt.executeQuery(sql);
		int gameId = -1;
		if (rset.next()) {
			gameId = rset.getInt("game_id");
		}
		stmt.close();
		return gameId;
	}

	@Override
	public BroGame getGameAt(int gameId) throws SQLException {
		Statement stmt = conn.createStatement();
		stmt = conn.createStatement();

		String sql = "select * from game where game_id = " + gameId + " and game_deleted != "+true;
		ResultSet rset = stmt.executeQuery(sql);
		BroGame game = null;
		if (rset.next()) {
			int id = rset.getInt("game_id");
			String name = rset.getString("game_name");
			String gameCode = rset.getString("game_gameCode");
			int defaultFileId = rset.getInt("game_defaultFileId");
			int checksumId = rset.getInt("game_checksumId");
			String iconPath = rset.getString("game_iconPath");
			String coverPath = rset.getString("game_coverPath");
			int rate = rset.getInt("game_rate");

			Timestamp tmpDateAdded = rset.getTimestamp("game_added");
			Timestamp tmpLastPlayed = rset.getTimestamp("game_lastPlayed");
			ZonedDateTime dateAdded = null;
			ZonedDateTime lastPlayed = null;
			if (tmpDateAdded != null) {
				dateAdded = ZonedDateTime.ofInstant(tmpDateAdded.toInstant(), ZoneOffset.UTC);
			}
			if (tmpLastPlayed != null) {
				lastPlayed = ZonedDateTime.ofInstant(tmpLastPlayed.toInstant(), ZoneOffset.UTC);
			}
			int playCount = rset.getInt("game_playCount");
			int defaultEmulatorId = rset.getInt("game_defaultEmulatorId");
			int platformId = rset.getInt("game_platformId");
			String platformIconFileName = rset.getString("game_platformIconFileName");
			game = new BroGame(id, name, gameCode, defaultFileId, checksumId, iconPath, coverPath, rate, dateAdded, lastPlayed, playCount, defaultEmulatorId,
					platformId, platformIconFileName);
		}
		stmt.close();
		return game;
	}

	@Override
	public List<Tag> getTags(int gameId) throws SQLException {
		ResultSet rset = SqlUtil.select(conn, "game_tag", SqlUtil.where("game_id", gameId), SqlUtil.order("game_id", "tag_id"));
		List<Tag> tags = new ArrayList<>();
		while (rset.next()) {
			int tagId = rset.getInt("tag_id");
			Tag tag = getTag(tagId);
			tags.add(tag);
		}
		return tags;
	}

	private BroTag getTag(int tagId) throws SQLException {
		Statement stmt = conn.createStatement();
		stmt = conn.createStatement();
		String sql = "select * from tag where tag_id = " + tagId;
		ResultSet rset = stmt.executeQuery(sql);
		BroTag tag = null;
		if (rset.next()) {
			int id = rset.getInt("tag_id");
			String name = rset.getString("tag_name");
			String hexColor = rset.getString("tag_hexColor");
			tag = new BroTag(id, name, hexColor);
		}
		stmt.close();
		return tag;
	}

	@Override
	public BroGame getGameByChecksumId(int checksumId) throws SQLException {
		Statement stmt = conn.createStatement();
		stmt = conn.createStatement();

		String sql = "select * from game where game_checksumId = " + checksumId + " and game_deleted != "+true;
		ResultSet rset = stmt.executeQuery(sql);
		BroGame game = null;
		if (rset.next()) {
			int id = rset.getInt("game_id");
			String name = rset.getString("game_name");
			String gameCode = rset.getString("game_gameCode");
			int defaultFileId = rset.getInt("game_defaultFileId");
			String iconPath = rset.getString("game_iconPath");
			String coverPath = rset.getString("game_coverPath");
			int rate = rset.getInt("game_rate");
			Timestamp tmpDateAdded = rset.getTimestamp("game_added");
			Timestamp tmpLastPlayed = rset.getTimestamp("game_lastPlayed");
			ZonedDateTime dateAdded = null;
			ZonedDateTime lastPlayed = null;
			if (tmpDateAdded != null) {
				dateAdded = ZonedDateTime.ofInstant(tmpDateAdded.toInstant(), ZoneOffset.UTC);
			}
			if (tmpLastPlayed != null) {
				lastPlayed = ZonedDateTime.ofInstant(tmpLastPlayed.toInstant(), ZoneOffset.UTC);
			}
			int playCount = rset.getInt("game_playCount");
			int defaultEmulatorId = rset.getInt("game_defaultEmulatorId");
			int platformId = rset.getInt("game_platformId");
			String platformIconFileName = rset.getString("game_platformIconFileName");
			game = new BroGame(id, name, gameCode, defaultFileId, checksumId, iconPath, coverPath, rate, dateAdded, lastPlayed, playCount, defaultEmulatorId,
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
		String sql = "select * from game where game_deleted != "+true + " order by lower(game_name)";
		ResultSet rset = stmt.executeQuery(sql);
		while (rset.next()) {
			int id = rset.getInt("game_id");
			Game game = getGameAt(id);
			games.add(game);
		}
		stmt.close();
		return games;
	}

	//	@Override
	//	public boolean hasGame(int gameChecksumId) throws SQLException {
	//		Statement stmt = conn.createStatement();
	//		String sql = "select game_id, game_checksumId from game where game_checksumId = " + gameChecksumId + " and game_deleted != "+true;
	//		ResultSet rset = stmt.executeQuery(sql);
	//		boolean b = false;
	//		if (rset.next()) {
	//			int gameChecksumFromDb = rset.getInt("game_checksumId");
	//			if (gameChecksumFromDb == gameChecksumId) {
	//				b = true;
	//			}
	//		}
	//		stmt.close();
	//		return b;
	//	}

	public boolean hasFile(String gameFilePath) throws SQLException {
		Statement stmt = conn.createStatement();
		String sql = "select file_id, file_path from file where file_path = " + SqlUtil.getQuotedString(SqlUtil.getQuotationsMarkedString(gameFilePath));
		ResultSet rset = stmt.executeQuery(sql);
		boolean b = false;
		if (rset.next()) {
			String gameChecksumFromDb = rset.getString("file_path");
			if (gameChecksumFromDb.equals(gameFilePath)) {
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
		ZonedDateTime lastPlayed = game.getLastPlayed();
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

	@Override
	public void addTag(int gameId, Tag tag) throws SQLException {
		ValidationUtil.checkNull(tag, "tag");
		Statement stmt = conn.createStatement();
		String sql = SqlUtil.insertIntoWithColumnsString("game_tag", "game_id", "tag_id",
				gameId, tag.getId());
		stmt = conn.createStatement();
		stmt.executeQuery(sql);
		conn.commit();
		stmt.close();
	}

	@Override
	public void removeTag(int gameId, int tagId) throws SQLException {
		Statement stmt = conn.createStatement();
		String sql = "delete from game_tag where game_id="+gameId+" and tag_id="+tagId;
		stmt = conn.createStatement();
		stmt.executeQuery(sql);
		conn.commit();
		stmt.close();
	}

	@Override
	public void setGameCode(int gameId, String gameCode) throws SQLException {
		Statement stmt = conn.createStatement();
		String sql = "update game set game_gameCode = '"+SqlUtil.getQuotationsMarkedString(gameCode)+"' where game_id=" + gameId;
		stmt.executeQuery(sql);
		conn.commit();
		stmt.close();
	}
}
