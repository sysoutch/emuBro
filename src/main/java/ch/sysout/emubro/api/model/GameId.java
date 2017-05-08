package ch.sysout.emubro.api.model;

public interface GameId extends Comparable<GameId> {
	int getGameId();

	int getPlatformId();

	int getEmulatorId();
}
