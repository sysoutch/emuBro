package ch.sysout.emubro.impl.model;

import ch.sysout.emubro.api.model.GameId;

public class BroGameId implements GameId {
	int gameId;
	int platformId;
	int emulatorId;

	public BroGameId(int platformId, int emulatorId) {
		this.platformId = platformId;
		this.emulatorId = emulatorId;
	}

	@Override
	public int getGameId() {
		return gameId;
	}

	@Override
	public int getPlatformId() {
		return platformId;
	}

	@Override
	public int getEmulatorId() {
		return emulatorId;
	}

	@Override
	public int compareTo(GameId id) {
		Integer thisId = gameId;
		Integer otherId = id.getGameId();
		return thisId.compareTo(otherId);
	}
}
