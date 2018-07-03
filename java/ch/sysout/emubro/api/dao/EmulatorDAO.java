package ch.sysout.emubro.api.dao;

import java.sql.SQLException;

import ch.sysout.emubro.api.model.Emulator;
import ch.sysout.emubro.impl.BroEmulatorDeletedException;

public interface EmulatorDAO {
	Emulator getEmulator(int id) throws SQLException;

	void addEmulator(int platformId, Emulator emulator) throws SQLException, BroEmulatorDeletedException;

	void removeEmulator(int platformId) throws SQLException;

	boolean hasEmulator(int platformId, String path) throws SQLException;

	int getLastAddedEmulatorId() throws SQLException;

	void restoreEmulator(Emulator emulator) throws SQLException;
}
