package ch.sysout.emubro.impl.event;

import ch.sysout.emubro.api.model.Tag;

public class BroTagRemovedEvent implements TagRemovedEvent {
	private Tag tag;

	public BroTagRemovedEvent(Tag element) {
		tag = element;
	}

	@Override
	public Tag getTag() {
		return tag;
	}
}
