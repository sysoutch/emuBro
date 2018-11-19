package ch.sysout.emubro.api.dao;

import java.sql.SQLException;
import java.util.List;

import ch.sysout.emubro.api.model.Game;
import ch.sysout.emubro.api.model.Tag;
import ch.sysout.emubro.impl.BroGameAlreadyExistsException;
import ch.sysout.emubro.impl.BroGameDeletedException;
import ch.sysout.emubro.impl.model.BroGame;

public interface GameDAO {
	void updateGame(Game game) throws SQLException;

	void removeGame(int gameId) throws SQLException;

	void renameGame(int gameId, String newTitle) throws SQLException;

	void addGame(Game game, String filePath) throws SQLException, BroGameAlreadyExistsException, BroGameDeletedException;

	boolean hasGames();

	BroGame getGameAt(int gameId) throws SQLException;

	List<Game> getGames() throws SQLException;

	void updateLastPlayed(Game game) throws SQLException;

	void updatePlayCount(Game game) throws SQLException;

	int getLastAddedGameId() throws SQLException;

	void setDefaultEmulatorId(Game game, int id) throws SQLException;

	void setRate(int gameId, int newRate) throws SQLException;

	void setIconPath(int gameId, String iconPath) throws SQLException;

	void setCoverPath(int id, String coverPath) throws SQLException;

	void restoreGame(Game game) throws SQLException;

	Game getGameByChecksumId(int checksumId) throws SQLException;

	void addTag(int gameId, Tag tag) throws SQLException;

	void removeTag(int gameId, int tagId) throws SQLException;

	List<Tag> getTags(int gameId) throws SQLException;

	void setGameCode(int id, String gameCode) throws SQLException;
}
