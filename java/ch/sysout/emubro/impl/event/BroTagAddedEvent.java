package ch.sysout.emubro.impl.event;

import ch.sysout.emubro.api.model.Tag;

public class BroTagAddedEvent implements TagAddedEvent {
	private Tag tag;

	public BroTagAddedEvent(Tag element) {
		tag = element;
	}

	@Override
	public Tag getTag() {
		return tag;
	}
}
