package ch.sysout.util;

import java.io.Closeable;
import java.io.IOException;
import java.io.InputStream;
import java.io.StringWriter;
import java.util.HashMap;
import java.util.Map;

public class RegistryUtil {

	public static String readValue(String key, String valueName) throws IOException, InterruptedException {
		String execString[] = { "reg", "query", key, "/v", valueName };
		Process process = Runtime.getRuntime().exec(execString);
		StreamReader reader = new StreamReader(process.getInputStream());
		reader.start();
		process.waitFor();
		reader.join();
		String output = reader.getResult();
		return output;
	}

	public static Map<String, String> listAllKeysAndValues(String key) throws IOException, InterruptedException {
		String execString[] = { "reg", "query", key, "/s" };
		Process process = Runtime.getRuntime().exec(execString);
		StreamReader reader = new StreamReader(process.getInputStream());
		reader.start();
		process.waitFor();
		reader.join();
		String output = reader.getResult();
		String[] arr = output.split("\r\n");
		Map<String, String> keyValueMap = new HashMap<>();
		String regex = "(REG_SZ|REG_DWORD|REG_DWORD_LITTLE_ENDIAN|REG_DWORD_BIG_ENDIAN|REG_QWORD|REG_QWORD_LITTLE_ENDIAN|REG_QWORD_BIG_ENDIAN|REG_BINARY|REG_EXPAND_SZ|REG_LINK|REG_MULTI_SZ|REG_NONE|REG_RESOURCE_LIST|REG_SZ)";
		for (String entry : arr) {
			if (!entry.trim().isEmpty()) {
				String[] arr2 = entry.split(regex);
				if (arr2 != null && arr2.length > 1) {
					String valueName = arr2[0].trim();
					String value = arr2[1].trim();
					keyValueMap.put(valueName, value);
				}
			}
		}
		return keyValueMap;
	}

	public static void createRegistryLocation(String key) {

	}

	public static void createOrOverwriteRegistryKey(String key, String valueName, String value) throws IOException {
		String execString[] = { "reg", "add", key, "/v", valueName, "/d", value, "/f" };
		Runtime.getRuntime().exec(execString);
	}

	public static void createOrOverwriteRegistryKey(String key, String valueName, String value, String dataType) throws IOException {
		String execString[] = { "reg", "add", key, "/v", valueName, "/t", dataType, "/d", value, "/f" };
		Runtime.getRuntime().exec(execString);
	}

	public static void createOrOverwriteRegistryKey(String key, String valueName, int value) throws IOException {
		createOrOverwriteRegistryKey(key, valueName, value, "REG_DWORD");
	}

	public static void createOrOverwriteRegistryKey(String key, String valueName, int value, String dataType) throws IOException {
		String execString[] = { "reg", "add", key, "/v", valueName, "/t", dataType, "/d", ""+value, "/f" };
		Runtime.getRuntime().exec(execString);
	}

	public static void renameRegistryLocation(String valueName, String newValueName) throws IOException {
		String execString[] = { "reg", "copy", valueName, newValueName, "/s", "/f" };
		String execString2[] = { "reg", "delete", valueName, "/f" };
		Runtime.getRuntime().exec(execString);
		Runtime.getRuntime().exec(execString2);
	}

	public static void close(Closeable c) {
		try {
			c.close();
		} catch (IOException e) {}
	}

	private static class StreamReader extends Thread {
		private InputStream is;
		private StringWriter sw = new StringWriter();

		public StreamReader(InputStream is) {
			this.is = is;
		}

		@Override
		public void run() {
			try {
				int c;
				while ((c = is.read()) != -1) {
					sw.write(c);
				}
			} catch (IOException e) {
				e.printStackTrace();
			} finally {
				close(is);
				close(sw);
			}
		}

		public String getResult() {
			return sw.toString();
		}
	}

	public static void importRegFile(String absolutePath) throws IOException {
		String execString[] = { "reg", "import", absolutePath };
		Runtime.getRuntime().exec(execString);
	}
}