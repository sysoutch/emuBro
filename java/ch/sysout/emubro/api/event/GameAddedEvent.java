package ch.sysout.emubro.api.event;

import ch.sysout.emubro.api.model.Game;
import ch.sysout.emubro.api.model.Platform;

public interface GameAddedEvent {
	int getGameCount();
	Game getGame();
	Platform getPlatform();
	boolean isManuallyAdded();
}
