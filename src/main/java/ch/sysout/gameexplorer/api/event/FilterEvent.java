package ch.sysout.gameexplorer.api.event;

import ch.sysout.gameexplorer.api.filter.Criteria;

public interface FilterEvent {
	Criteria getCriteria();
}
