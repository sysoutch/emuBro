package ch.sysout.gameexplorer.api.dao;

import java.sql.SQLException;

import ch.sysout.gameexplorer.api.model.Emulator;

public interface EmulatorDAO {
	Emulator getEmulator(int id) throws SQLException;

	void addEmulator(int platformId, Emulator emulator) throws SQLException;

	void removeEmulator(int platformId) throws SQLException;

	boolean hasEmulator(int platformId, String path) throws SQLException;

	int getLastAddedEmulatorId() throws SQLException;
}
