package ch.sysout.emubro.api.event;

import ch.sysout.emubro.api.model.Game;
import ch.sysout.emubro.api.model.Platform;

public interface GameEvent {
	Game getGame();
	Platform getPlatform();
}
