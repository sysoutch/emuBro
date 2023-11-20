package ch.sysout.emubro.controller;

import java.util.ArrayList;
import java.util.List;

public class MCRObject {
	private String header;
	private List<SaveBlock> saveBlocks = new ArrayList<>();

	public MCRObject(byte[] header) {
		this.header = new String(header);
	}

	public void addBlock(byte[] saveBlock) {
		saveBlocks.add(new SaveBlock(saveBlock));
	}

	public class SaveBlock {
		private String blockString = "";
		private String gameName = "";

		public SaveBlock(byte[] saveBlock) {
			blockString = new String(saveBlock);
			gameName = blockString.substring(4, 14);
		}
		
		public String getBlockString() {
			return blockString;
		}
		
		public String getGameCode() {
			return gameName;
		}
		
		public String toString() {
			return gameName;
		}
	}
	
	public String getHeader() {
		return header;
	}
	
	public List<SaveBlock> getSaveBlocks() {
		return saveBlocks;
	}
}
