package ch.sysout.emubro.ui.event;

import ch.sysout.emubro.api.model.Game;
import ch.sysout.emubro.api.model.Platform;

public class CoverDownloaderEvent {
	private Platform platform;
	private Game game;

	public CoverDownloaderEvent(Platform platform, Game game) {
		this.platform = platform;
		this.game = game;
	}

	public Platform getPlatform() {
		return platform;
	}

	public Game getGame() {
		return game;
	}
}
