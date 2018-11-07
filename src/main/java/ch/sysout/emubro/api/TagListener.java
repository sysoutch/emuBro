package ch.sysout.emubro.api;

import ch.sysout.emubro.api.event.TagEvent;

public interface TagListener {
	void tagAdded(TagEvent e);

	void tagRemoved(TagEvent e);
}
