package ch.sysout.emubro.api.dao;

import java.sql.SQLException;
import java.util.List;

import ch.sysout.emubro.api.model.Platform;
import ch.sysout.emubro.impl.model.BroEmulator;
import ch.sysout.emubro.impl.model.FileStructure;

public interface PlatformDAO {
	void addPlatform(Platform platform) throws SQLException;

	void removePlatform(int platformId) throws SQLException;

	Platform getPlatform(int platformId) throws SQLException;

	List<BroEmulator> getEmulators(int platformId) throws SQLException;

	int getLastAddedPlatformId() throws SQLException;

	void updatePlatform(Platform p) throws SQLException;

	void setDefaultEmulator(int platformId, int emulatorId) throws SQLException;

	int getDefaultEmulator(Platform platform) throws SQLException;

	boolean hasDefaultEmulator(int platformId) throws SQLException;

	FileStructure[] getFileStructureFromPlatform(int id) throws SQLException;

	int getLastAddedStructureId() throws SQLException;
}
