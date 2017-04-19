package ch.sysout.gameexplorer.controller;

import java.io.File;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

import org.hsqldb.HsqlException;
import org.hsqldb.jdbcDriver;

public class HSQLDBConnection {
	private Connection connection;

	public HSQLDBConnection(String databasePath, String databaseName) throws SQLException, HsqlException {
		String fullPath = databasePath + (databasePath.endsWith("" + File.separatorChar) ? "" : File.separatorChar)
				+ databaseName;
		DriverManager.registerDriver(new jdbcDriver());
		connection = DriverManager.getConnection("jdbc:hsqldb:file:" + fullPath, "SA", "");
	}

	public Connection getConnection() {
		return connection;
	}
}
