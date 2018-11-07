package ch.sysout.util;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

public class SqlUtil {
	public static String insertIntoString(String table, String... values) {
		String formattedValues = "";
		for (String s : values) {
			s = s.replaceAll("'", "\'");
			formattedValues += "'" + s + "'";
			if (values.length > 1 && s != values[values.length - 1]) {
				formattedValues += ",";
			}
		}
		return "insert into " + table + " values (" + formattedValues + ")";
	}

	public static String insertIntoWithColumnsString(String table, Object... columnsAndValues) {
		String formattedColumns = "";
		String formattedValues = "";
		for (int i = 0; i < columnsAndValues.length; i++) {
			if (i < columnsAndValues.length / 2) {
				formattedColumns += "" + columnsAndValues[i] + "";
				if (columnsAndValues.length > 1 && i < (columnsAndValues.length / 2) - 1) {
					formattedColumns += ",";
				}
			} else {
				Object v = columnsAndValues[i];
				formattedValues += "" + v + "";
				if (columnsAndValues.length > 1 && i < columnsAndValues.length - 1) {
					formattedValues += ",";
				}
			}

		}
		return "insert into " + table + " (" + formattedColumns + ") values (" + formattedValues + ")";
	}

	public static String getQuotedString(String string) {
		return "'"+string+"'";
	}

	public static String getQuotationsMarkedString(String string) {
		return string.replaceAll("'", "''");
	}

	public static String where(String key, Object value) {
		return "where " + key + " = " + value;
	}

	public static ResultSet select(Connection conn, String string, Object where, String orderBy) throws SQLException {
		Statement stmt = conn.createStatement();
		stmt = conn.createStatement();
		String sql = "select * from "+ string + " " + where + " " + orderBy;
		ResultSet rset = stmt.executeQuery(sql);
		stmt.close();
		return rset;
	}

	public static String order(String... columns) {
		String tmp = "";
		for (String col : columns) {
			if (tmp.isEmpty()) {
				tmp = col;
			} else {
				tmp += ", " + col;
			}
		}
		return "order by " + tmp;
	}
}
