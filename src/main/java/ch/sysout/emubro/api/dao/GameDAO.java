package ch.sysout.emubro.api.dao;

import java.sql.SQLException;
import java.util.List;

import ch.sysout.emubro.api.model.Game;
import ch.sysout.emubro.impl.BroGameAlreadyExistsException;
import ch.sysout.emubro.impl.model.BroGame;

public interface GameDAO {
	void updateGame(Game game) throws SQLException;

	void removeGame(int gameId) throws SQLException;

	void renameGame(int gameId, String newTitle) throws SQLException;

	void addGame(Game game) throws SQLException, BroGameAlreadyExistsException;

	boolean hasGame(Game game) throws SQLException;

	boolean hasGames();

	BroGame getGameAt(int gameId) throws SQLException;

	List<Game> getGames() throws SQLException;

	boolean hasGame(String gamePath) throws SQLException;

	void updateLastPlayed(Game game) throws SQLException;

	void updatePlayCount(Game game) throws SQLException;

	int getLastAddedGameId() throws SQLException;

	void setEmulatorForGame(int gameId, int emulatorId) throws SQLException;

	void setRate(int gameId, int newRate) throws SQLException;

	void setIconPath(int gameId, String iconPath) throws SQLException;

	void setCoverPath(int id, String coverPath) throws SQLException;
}
