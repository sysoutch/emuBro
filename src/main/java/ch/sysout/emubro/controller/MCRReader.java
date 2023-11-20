package ch.sysout.emubro.controller;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.util.List;

import ch.sysout.emubro.controller.MCRObject.SaveBlock;

public class MCRReader {
	private static final int HEADER_SIZE = 128;
	private static final int SAVE_BLOCK_SIZE = 8192;

	public static List<SaveBlock> readGames(String path) {
		File file = new File(path);
		try (FileInputStream fis = new FileInputStream(file)) {
			byte[] header = new byte[HEADER_SIZE];
			fis.read(header);
			MCRObject mcrObject = new MCRObject(header);
			
////			 Parse the header data
//			String systemIdentifier = new String(header, 0, 32).trim();
//			String blockCountString = new String(header, 127, 1).trim();
//			int blockCount = Integer.parseInt(blockCountString);
//			System.out.println("System Identifier: " + systemIdentifier);
//			System.out.println("Block Count: " + blockCount);

			byte[] startOfBlocks = new byte[8];
			fis.read(startOfBlocks);

			// Parse the save block data
			for (int i = 0; i <= 14; i++) {
				// byte[] saveBlock = new byte[SAVE_BLOCK_SIZE];
				byte[] saveBlock = new byte[128];
				fis.read(saveBlock);
				mcrObject.addBlock(saveBlock);
			}
			return mcrObject.getSaveBlocks();
		} catch (IOException e) {
			e.printStackTrace();
		}
		return null;
	}
}