package ch.sysout.emubro.impl.filter;

import java.util.ArrayList;

import ch.sysout.emubro.api.event.FilterEvent;
import ch.sysout.emubro.api.filter.FilterGroup;
import ch.sysout.emubro.api.model.Tag;
import ch.sysout.emubro.impl.event.BroFilterEvent;
import ch.sysout.emubro.impl.model.PlatformConstants;
import ch.sysout.util.ValidationUtil;

public class BroFilterGroup implements FilterGroup {
	private String name;
	private FilterEvent filterEvent;

	public BroFilterGroup(String name, FilterEvent filterEvent) {
		setName(name);
		setFilterEvent(filterEvent);
	}

	@Override
	public String getName() {
		return name;
	}

	@Override
	public void setName(String name) {
		ValidationUtil.checkNullOrEmpty(name, "name");
		this.name = name;
	}

	@Override
	public FilterEvent getFilterEvent() {
		return filterEvent;
	}

	@Override
	public void setFilterEvent(FilterEvent filterEvent) {
		this.filterEvent = (filterEvent != null) ? filterEvent
				: new BroFilterEvent(PlatformConstants.NO_PLATFORM, new BroCriteria("", new ArrayList<Tag>()));
	}
}
