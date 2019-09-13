package ch.sysout.emubro.impl.event;

import ch.sysout.emubro.api.event.FilterEvent;
import ch.sysout.emubro.api.filter.Criteria;
import ch.sysout.emubro.impl.model.PlatformConstants;

public class BroFilterEvent implements FilterEvent {
	private int platformId;
	private Criteria criteria;

	public BroFilterEvent(int platformId, Criteria criteria) {
		this.platformId = platformId;
		this.criteria = criteria;
	}

	@Override
	public int getPlatformId() {
		return platformId;
	}

	@Override
	public Criteria getCriteria() {
		return criteria;
	}

	@Override
	public boolean isPlatformFilterSet() {
		return platformId != PlatformConstants.NO_PLATFORM;
	}

	@Override
	public boolean isGameFilterSet() {
		return criteria != null && (!criteria.getText().isEmpty() || !criteria.getTags().isEmpty());
	}

	@Override
	public boolean hasTags() {
		return criteria.getTags().size() > 0;
	}
}
