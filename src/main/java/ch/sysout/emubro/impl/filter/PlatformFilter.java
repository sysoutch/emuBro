package ch.sysout.emubro.impl.filter;

import ch.sysout.emubro.api.filter.Criteria;
import ch.sysout.emubro.api.filter.Filter;
import ch.sysout.emubro.api.model.Platform;

public class PlatformFilter implements Filter<Platform> {

	// Filter<Game> filter = e.getSource();
	// List<Game> games = e.getObjects();
	// Criteria criteria = e.getCriteria();
	//
	// for (Game game : games) {
	// if (filter.match(criteria, game)) {
	// // ((GameTableModel) mdlTblGames).addGame(game);
	// }
	// }
	//
	@Override
	public boolean match(Criteria criteria, Platform platform) {
		int platformId = platform.getId();
		try {
			int criteriaText = Integer.valueOf(criteria.getText());
			if (platformId == criteriaText) {
				return true;
			}
			return false;
		} catch (NumberFormatException e) {
			return false;
		}
	}
}