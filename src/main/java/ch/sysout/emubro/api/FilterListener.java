package ch.sysout.emubro.api;

import ch.sysout.emubro.api.event.FilterEvent;

public interface FilterListener {
	void filterSet(FilterEvent e);
}
