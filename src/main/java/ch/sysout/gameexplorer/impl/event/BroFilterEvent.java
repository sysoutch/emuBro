package ch.sysout.gameexplorer.impl.event;

import ch.sysout.gameexplorer.api.event.FilterEvent;
import ch.sysout.gameexplorer.api.filter.Criteria;

public class BroFilterEvent implements FilterEvent {
	private Criteria criteria;

	public BroFilterEvent(Criteria criteria) {
		this.criteria = criteria;
	}

	@Override
	public Criteria getCriteria() {
		return criteria;
	}
}
