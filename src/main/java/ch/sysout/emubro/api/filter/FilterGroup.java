package ch.sysout.emubro.api.filter;

import ch.sysout.emubro.api.event.FilterEvent;

public interface FilterGroup {
	String getName();

	void setName(String name);

	/**
	 * @return returns the current FilterEvent
	 */
	FilterEvent getFilterEvent();

	/**
	 * sets the specified <code>filterEvent</code> for this FilterGroup.
	 *
	 * if <code>filterEvent</code> is <code>null</code>, an empty FilterEvent will be set
	 *
	 * @param filterEvent the filterEvent to set.
	 */
	void setFilterEvent(FilterEvent filterEvent);
}
