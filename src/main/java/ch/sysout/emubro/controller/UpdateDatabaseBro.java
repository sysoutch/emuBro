package ch.sysout.emubro.controller;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;

public class UpdateDatabaseBro {
	private Connection conn;

	public UpdateDatabaseBro(Connection conn) {
		this.conn = conn;
	}

	public void updateDatabaseFrom(String currentVersion) throws IllegalArgumentException, SQLException {
		System.out.println("/update_database_"+currentVersion+".sql");
		// add column here and initialize
		InputStream stream = getClass().getResourceAsStream("/update_database_"+currentVersion+".sql");
		boolean updateFileNotExists = stream == null;
		if (updateFileNotExists) {
			throw new IllegalArgumentException("passed wrong version or file not exists in jar");
		}
		BufferedReader br = null;
		String lines = "";
		String line;
		br = new BufferedReader(new InputStreamReader(stream));
		Statement stmt;
		try {
			while ((line = br.readLine()) != null) {
				lines += line;
			}
			if (br != null) {
				br.close();
			}
			stmt = conn.createStatement();
			stmt.executeQuery(lines);
			stmt.close();
		} catch (IOException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		} finally {
			if (br != null) {
				try {
					br.close();
				} catch (Exception e) {
					// ignore
				}
			}
		}
	}
}