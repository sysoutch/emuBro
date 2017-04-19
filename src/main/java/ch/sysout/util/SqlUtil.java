package ch.sysout.util;

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

}
