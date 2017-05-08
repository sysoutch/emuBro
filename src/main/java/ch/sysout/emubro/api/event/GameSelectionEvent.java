package ch.sysout.emubro.api.event;

import ch.sysout.emubro.api.model.Platform;

public interface GameSelectionEvent extends GameEvent {

	Platform getPlatform();

}
