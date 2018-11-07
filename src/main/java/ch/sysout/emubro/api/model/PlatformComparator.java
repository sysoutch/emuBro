package ch.sysout.emubro.api.model;

import java.util.Comparator;

public class PlatformComparator implements Comparator<Game> {
	private Explorer explorer;

	public PlatformComparator(Explorer explorer) {
		this.explorer = explorer;
	}

	@Override
	public int compare(Game gameOne, Game gameTwo) {
		int platformIdGameOne = gameOne.getPlatformId();
		int platformIdGameTwo = gameTwo.getPlatformId();
		Platform p1 = explorer.getPlatform(platformIdGameOne);
		Platform p2 = explorer.getPlatform(platformIdGameTwo);
		return p1.compareTo(p2);
	}
}
