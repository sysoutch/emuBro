package ch.sysout.gameexplorer.api.event;

import ch.sysout.gameexplorer.api.model.Platform;

public interface GameSelectionEvent extends GameEvent {

	Platform getPlatform();

}
