package ch.sysout.emubro.controller;

import ch.sysout.emubro.util.EmuBroUtil;

import java.io.BufferedReader;
import java.io.File;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.URI;
import java.nio.file.Path;
import java.nio.file.Paths;

public class ECMConverter {

	public ECMConverter(Path path) {
		this(path.toString());
	}

	public ECMConverter(String inputFile) {
		String outputFile = inputFile.replaceAll("(?i)\\.ecm", "");
		if (!outputFile.toLowerCase().endsWith(".bin")) {
			outputFile += ".bin";
		}
		try {
			System.out.println("converting file from ecm to bin: " + inputFile);
			String[] cmd = {  "cmd.exe", "/c", EmuBroUtil.getResourceDirectory()+"/tools/unecm/unecm.exe", inputFile, outputFile };
			ProcessBuilder pb = new ProcessBuilder(cmd);

			pb.redirectOutput(ProcessBuilder.Redirect.INHERIT);
			pb.redirectError(ProcessBuilder.Redirect.INHERIT);
			Process process = pb.start();

			System.out.println("process ended ");


			//			String result = new String(process.getInputStream().readAllBytes());
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
