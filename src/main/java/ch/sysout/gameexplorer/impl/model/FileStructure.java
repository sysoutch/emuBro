package ch.sysout.gameexplorer.impl.model;

import java.util.Arrays;
import java.util.List;

public class FileStructure {
	private int id;
	private String folderName;
	private List<String> files;

	public FileStructure(int id, String folderName, List<String> files) {
		this.id = id;
		this.folderName = folderName;
		this.files = files;
	}

	public FileStructure(int id2, String name, String[] files2) {
		this(id2, name, Arrays.asList(files2));
	}

	public void setId(int id) {
		this.id = id;
	}

	public int getId() {
		return id;
	}

	public List<String> getFiles() {
		return files;
	}

	public String getFolderName() {
		return folderName;
	}
}
