package ch.sysout.emubro.controller;

import java.io.File;
import java.sql.Connection;
import java.sql.Driver;
import java.sql.DriverManager;
import java.sql.DriverPropertyInfo;
import java.sql.SQLException;
import java.sql.SQLFeatureNotSupportedException;
import java.util.Properties;
import java.util.logging.Logger;

public class HSQLDBConnection {
	private Connection connection;

	public HSQLDBConnection(String databasePath, String databaseName) throws SQLException {
		String fullPath = databasePath + (databasePath.endsWith("" + File.separatorChar) ? "" : File.separatorChar)
				+ databaseName;
		Driver driver = new Driver() {

			@Override
			public boolean jdbcCompliant() {
				// TODO Auto-generated method stub
				return false;
			}

			@Override
			public DriverPropertyInfo[] getPropertyInfo(String url, Properties info) throws SQLException {
				// TODO Auto-generated method stub
				return null;
			}

			@Override
			public Logger getParentLogger() throws SQLFeatureNotSupportedException {
				// TODO Auto-generated method stub
				return null;
			}

			@Override
			public int getMinorVersion() {
				// TODO Auto-generated method stub
				return 0;
			}

			@Override
			public int getMajorVersion() {
				// TODO Auto-generated method stub
				return 0;
			}

			@Override
			public Connection connect(String url, Properties info) throws SQLException {
				// TODO Auto-generated method stub
				return null;
			}

			@Override
			public boolean acceptsURL(String url) throws SQLException {
				// TODO Auto-generated method stub
				return false;
			}
		};
		try {
			Class.forName("org.hsqldb.jdbc.JDBCDriver");
			connection = DriverManager.getConnection("jdbc:hsqldb:file:" + fullPath, "SA", "");
		} catch (ClassNotFoundException e) {
			e.printStackTrace(System.out);
		}
	}

	public Connection getConnection() {
		return connection;
	}
}
