package ch.sysout.gameexplorer.impl.model;

public class GameDirectory {
	private String path = "";
	private boolean subfolderSearchIncluded;

	public GameDirectory(String path, boolean subfoldersIncluded) {
		this.path = path;
		subfolderSearchIncluded = subfoldersIncluded;
	}

	public String getPath() {
		return path;
	}

	public boolean isSubfolderSearchIncluded() {
		return subfolderSearchIncluded;
	}
}
