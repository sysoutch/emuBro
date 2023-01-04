package ch.sysout.emubro.controller;

import java.io.IOException;
import java.util.Properties;

public class SystemInformations {

	static Properties getModel() throws IOException {
		String[] command = { "wmic", "computersystem", "get", "model", "/FORMAT:LIST" };
		return getInformation(command);
	}

	public static Properties getName() throws IOException {
		String[] command = { "wmic", "computersystem", "get", "name", "/FORMAT:LIST" };
		return getInformation(command);
	}

	public static Properties getUserName() throws IOException {
		String[] command = { "wmic", "computersystem", "get", "username", "/FORMAT:LIST" };
		return getInformation(command);
	}

	public static Properties getManufacturer() throws IOException {
		String[] command = { "wmic", "computersystem", "get", "manufacturer", "/FORMAT:LIST" };
		return getInformation(command);
	}

	public static Properties getSystemType() throws IOException {
		String[] command = { "wmic", "computersystem", "get", "systemtype", "/FORMAT:LIST" };
		return getInformation(command);
	}

	static Properties getOsInformation() throws IOException {
		String[] command = { "wmic", "os", "get", "Caption,Version,BuildNumber,OSArchitecture", "/FORMAT:LIST" };
		return getInformation(command);
	}

	static Properties getCpuInformation() throws IOException {
		String[] command = { "wmic", "cpu", "list", "brief", "/FORMAT:LIST" };
		return getInformation(command);
	}

	static Properties getGpuInformation() throws IOException {
		String[] command = { "wmic", "path", "win32_VideoController", "get", "name", "/FORMAT:LIST" };
		return getInformation(command);
	}

	static Properties getRamInformation() throws IOException {
		String[] command = { "wmic", "MEMORYCHIP", "get",
				"BankLabel,DeviceLocator,MemoryType,TypeDetail,Capacity,Speed", "/FORMAT:LIST" };
		return getInformation(command);
	}

	static Properties getInformation(String[] command) throws IOException {
		Properties prop = new Properties();
		ProcessBuilder pb = new ProcessBuilder(command);
		pb.redirectErrorStream(true);
		Process process = pb.start();
		prop.load(process.getInputStream());
		return prop;
	}
}
