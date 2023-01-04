package ch.sysout.emubro.impl.event;

import ch.sysout.emubro.api.event.SearchCompleteEvent;

public class BroSearchCompleteEvent extends SearchCompleteEvent {

	public BroSearchCompleteEvent(long duration) {
		super(duration);
	}

}
