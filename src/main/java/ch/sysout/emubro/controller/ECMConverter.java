package ch.sysout.emubro.controller;

import java.io.IOException;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

public class ECMConverter {

	public ECMConverter(Path path) {
		String outputFile = path.toString() + ".iso";
		try {
			byte[] ecmData = Files.readAllBytes(path);
			byte[] isoData = decompress(ecmData);
			Files.write(Paths.get(outputFile), isoData);
		} catch (IOException e) {
			e.printStackTrace();
		}
	}

	public ECMConverter(String inputFile) {
		this(Paths.get(inputFile));
	}

	public ECMConverter(URI inputFile) {
		this(Paths.get(inputFile));
	}

	private byte[] decompress(byte[] data) throws IOException {
		if (data == null || data.length == 0) {
			throw new IllegalArgumentException("Input data array is null or empty.");
		}
		int headerSize = data[0x80] & 0xff | (data[0x81] & 0xff) << 8;
		byte[] header = new byte[headerSize];
		System.arraycopy(data, 0, header, 0, headerSize);

		byte[] ecmData = new byte[data.length - headerSize];
		System.arraycopy(data, headerSize, ecmData, 0, ecmData.length);

		if (ecmData.length == 0) {
			throw new IllegalArgumentException("ECM data array is empty.");
		}

		int outSize = header[0x10] & 0xff | (header[0x11] & 0xff) << 8 | (header[0x12] & 0xff) << 16
				| (header[0x13] & 0xff) << 24;

		byte[] outData = new byte[outSize];
		int outIndex = 0;

		int mode = header[0x14] & 0xff;
		int j = 0;
		for (int i = 0; i < ecmData.length && outIndex < outSize; i++) {
			int control = ecmData[i] & 0xff;
			for (int k = 0; k < 8; k++) {
				if ((control & 0x80) != 0) {
					outData[outIndex++] = ecmData[++i];
				} else {
					int index = ecmData[++i] & 0xff | (ecmData[++i] & 0xff) << 8;
					if (mode == 2) {
						index >>= 1;
					}
					int length = (index >> 12) + 2;
					if ((index & 0x800) != 0) {
						length++;
					}
					index &= 0x7ff;
					for (int l = 0; l < length && outIndex < outSize; l++) {
						outData[outIndex] = outData[outIndex - index - 1];
						outIndex++;
					}
				}
				control <<= 1;
				j++;
			}
		}
		return outData;
	}
}
