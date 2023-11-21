package ch.sysout.emubro.controller;

import java.io.IOException;
import java.net.URI;
import java.nio.file.Path;
import java.nio.file.Paths;

public class ECMConverter {

	public ECMConverter(Path path) {
		this(path.toString());
	}

	public ECMConverter(String inputFile) {
		String outputFile = inputFile.toString().replaceAll("(?i)\\.ecm", "");
		if (!outputFile.toLowerCase().endsWith(".bin")) {
			outputFile += ".bin";
		}
		try {
			String[] cmd = {  "cmd.exe", "/c", "D:\\github\\ECMGUI\\unecm\\unecm.exe", inputFile, outputFile };
			ProcessBuilder pb = new ProcessBuilder(cmd);
			Process process = pb.start();
			//			String result = new String(process.getInputStream().readAllBytes());
			System.out.println("converting file from ecm to bin: " + inputFile);
			//			System.out.println(result);
		} catch (IOException e1) {
			// TODO Auto-generated catch block
			e1.printStackTrace();
		}
	}

	public ECMConverter(URI inputFile) {
		this(Paths.get(inputFile));
	}
}
