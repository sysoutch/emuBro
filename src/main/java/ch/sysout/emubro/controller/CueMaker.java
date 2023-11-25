package ch.sysout.emubro.controller;

import java.io.BufferedWriter;
import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;

import org.apache.commons.compress.utils.FileNameUtils;

public class CueMaker {

	public CueMaker() {
	}

	public void createCueFile(File binFile) {
		String binFileName = binFile.getName();
		if (!binFileName.toLowerCase().endsWith(".bin")) {
			throw new IllegalArgumentException("the file " + binFileName + " doesn't appear to be a .bin file");
		}
		String binFileNameWithoutExtension = FileNameUtils.getBaseName(binFileName);
		Path p = Paths.get(binFile.getAbsolutePath());
		Path folder = p.getParent();
		File cueFile = new File(folder + File.separator + binFileNameWithoutExtension + ".cue");
		if (cueFile.exists()) {
			System.out.println("cue file already exists. nothing to do here");
			return;
		}
		List<Integer> audioOffsets = findAudioOffsets(binFile);
		List<String> trackStartTimes = convertOffsetsToTime(audioOffsets);
		System.out.println("Track start times: " + trackStartTimes);
		createCueFileNow(binFile);
	}

	private void createCueFileNow(File binFile) {
		String binFileName = binFile.getName();
		String binFileNameWithoutExtension = FileNameUtils.getBaseName(binFileName);
		Path p = Paths.get(binFile.getAbsolutePath());
		Path folder = p.getParent();
		String cueFilePath = folder + File.separator + binFileNameWithoutExtension + ".cue";
		System.out.println("cue file path: " + cueFilePath);
		try (BufferedWriter bw = new BufferedWriter(new FileWriter(cueFilePath))) {
			bw.write("FILE \"" + binFileName + "\" BINARY");
			bw.newLine();
			bw.write("  TRACK 01 MODE1/2352");
			bw.newLine();
			bw.write("    INDEX 01 00:00:00");
		} catch (IOException e) {
			System.out.println("An error occurred while creating the .cue file");
			e.printStackTrace();
		}
	}

	private List<Integer> findAudioOffsets(File binFile) {
		List<Integer> audioOffsets = new ArrayList<>();
		try {
			byte[] data = Files.readAllBytes(binFile.toPath());
			for (int i = 0; i < data.length; i++) {
				if (data[i] == 0xFF && data[i + 1] == 0xFB) {
					audioOffsets.add(i);
				}
			}
		} catch (IOException e) {
			System.out.println("An error occurred while reading the .bin file");
			e.printStackTrace();
		}
		return audioOffsets;
	}

	private List<String> convertOffsetsToTime(List<Integer> offsets) {
		List<String> trackStartTimes = new ArrayList<>();
		int sectorSize = 2352;
		for (int offset : offsets) {
			int time = offset / sectorSize / 75;
			int minutes = time / 60;
			int seconds = time % 60;
			int frames = (offset / sectorSize) % 75;
			String timeString = String.format("%02d:%02d:%02d", minutes, seconds, frames);
			trackStartTimes.add(timeString);
		}
		return trackStartTimes;
	}
}
