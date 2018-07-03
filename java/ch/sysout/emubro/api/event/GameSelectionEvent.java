package ch.sysout.emubro.api.event;

import java.util.List;
import java.util.Map;

import ch.sysout.emubro.api.model.Game;
import ch.sysout.emubro.api.model.Platform;

public interface GameSelectionEvent {
	List<Game> getGames();

	Map<Integer, Platform> getPlatforms();
}
