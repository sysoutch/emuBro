package ch.sysout.emubro.api.event;

import ch.sysout.emubro.api.filter.Criteria;

public interface FilterEvent {
	Criteria getCriteria();
	int getPlatformId();
	boolean isPlatformFilterSet();
	boolean isGameFilterSet();
	boolean hasTags();
}
