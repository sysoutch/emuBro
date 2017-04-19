package ch.sysout.gameexplorer.api.model;

public interface GameId extends Comparable<GameId> {
	int getGameId();

	int getPlatformId();

	int getEmulatorId();
}
