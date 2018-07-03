package ch.sysout.emubro.impl.event;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import ch.sysout.emubro.api.event.GameSelectionEvent;
import ch.sysout.emubro.api.model.Game;
import ch.sysout.emubro.api.model.Platform;

public class BroGameSelectionEvent implements GameSelectionEvent {
	private List<Game> games;
	private Map<Integer, Platform> platforms;

	public BroGameSelectionEvent() {
		games = new ArrayList<>();
	}

	public BroGameSelectionEvent(List<Game> currentGames, Map<Integer, Platform> platforms) {
		games = new ArrayList<>();
		for (Game game : currentGames) {
			if (game != null) {
				games.add(game);
			}
		}
		this.platforms = platforms;
	}

	public BroGameSelectionEvent(Game game, Platform platform) {
		if (game != null) {
			games = new ArrayList<>();
			games.add(game);
		}
	}

	@Override
	public List<Game> getGames() {
		return games;
	}

	@Override
	public Map<Integer, Platform> getPlatforms() {
		return platforms;
	}
}
