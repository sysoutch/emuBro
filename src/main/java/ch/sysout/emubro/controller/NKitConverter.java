package ch.sysout.emubro.controller;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.zip.DataFormatException;
import java.util.zip.Inflater;

public class NKitConverter {

	public NKitConverter() {
		String inputFile = "input.nkit.iso";
		String outputFile = "output.iso";

		try {
			byte[] compressedData = Files.readAllBytes(Paths.get(inputFile));
			byte[] decompressedData = decompress(compressedData);
			Files.write(Paths.get(outputFile), decompressedData);
		} catch (IOException | DataFormatException e) {
			e.printStackTrace();
		}
	}

	public static byte[] decompress(byte[] data) throws IOException, DataFormatException {
		Inflater inflater = new Inflater();
		inflater.setInput(data);
		ByteArrayOutputStream outputStream = new ByteArrayOutputStream(data.length);
		byte[] buffer = new byte[1024];
		while (!inflater.finished()) {
			int count = inflater.inflate(buffer);
			outputStream.write(buffer, 0, count);
		}
		outputStream.close();
		return outputStream.toByteArray();
	}
}