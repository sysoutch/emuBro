package ch.sysout.emubro.impl.event;

import ch.sysout.emubro.api.event.FilterEvent;
import ch.sysout.emubro.api.filter.Criteria;

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
