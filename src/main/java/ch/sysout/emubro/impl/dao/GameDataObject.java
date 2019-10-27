package ch.sysout.emubro.impl.dao;

import java.util.List;

public class GameDataObject {
	private String name;
	private String gameCode;
	private String synopsis;
	private String developer;
	private String publisher;
	private List<String> genres;

	public String getName() {
		return name;
	}

	public void setName(String name) {
		this.name = name;
	}

	public String getGameCode() {
		return gameCode;
	}

	public void setGameCode(String gameCode) {
		this.gameCode = gameCode;
	}

	public String getSynopsis() {
		return synopsis;
	}

	public void setSynopsis(String synopsis) {
		this.synopsis = synopsis;
	}

	public String getDeveloper() {
		return developer;
	}

	public void setDeveloper(String developer) {
		this.developer = developer;
	}

	public String getPublisher() {
		return publisher;
	}

	public void setPublisher(String publisher) {
		this.publisher = publisher;
	}

	public List<String> getGenres() {
		return genres;
	}

	public void setGenres(List<String> genres) {
		this.genres = genres;
	}

	public void clearGameInformations() {
		name = null;
		gameCode = null;
		synopsis = null;
		developer = null;
		publisher = null;
		genres = null;
	}

	@Override
	public String toString() {
		return gameCode + " " + synopsis;
	}
}
