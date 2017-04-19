package ch.sysout.gameexplorer.api.model;

import java.util.Comparator;

public class PlatformComparator implements Comparator<Game> {
	private Explorer explorer;

	public PlatformComparator(Explorer explorer) {
		this.explorer = explorer;
	}

	@Override
	public int compare(Game o1, Game o2) {
		// int cmp = o1.getPlatformId() > o2.getPlatformId() ? +1 :
		// o1.getPlatformId() < o2.getPlatformId() ? -1 : 0;
		return explorer.getPlatform(o1.getPlatformId()).compareTo(explorer.getPlatform(o2.getPlatformId()));
	}
}
