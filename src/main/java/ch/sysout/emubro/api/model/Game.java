package ch.sysout.emubro.api.model;

import java.util.Date;

public interface Game extends Comparable<Game> {
	/**
	 * returns the game id
	 *
	 * @return
	 */
	int getId();

	/**
	 * returns the game title
	 * 
	 * @return
	 */
	String getName();

	/**
	 * sets the game title
	 *
	 * @param title
	 */
	void setName(String title);

	/**
	 * returns the game path
	 *
	 * @return
	 */
	String getPath();

	/**
	 * sets the game path
	 *
	 * @param path
	 *            the path to the file this object refers to
	 */
	void setPath(String path);

	/**
	 * returns the game icon path
	 *
	 * @return
	 */
	String getIconPath();

	/**
	 * sets the game icon path
	 *
	 * @param path
	 *            the path of the icon file of this object
	 */
	void setIconPath(String path);

	/**
	 * returns true if getIconPath() is not empty
	 *
	 * @return
	 */
	boolean hasIcon();

	/**
	 * returns the game cover path
	 *
	 * @return
	 */
	String getCoverPath();

	/**
	 * sets the game cover path
	 *
	 * @param path
	 *            the path of the cover file of this object
	 */
	void setCoverPath(String path);

	/**
	 * returns true if getCoverPath() is not empty
	 *
	 * @return
	 */
	boolean hasCover();

	/**
	 * returns the date of when this game has been last played
	 *
	 * @return
	 */
	Date getLastPlayed();

	/**
	 * sets the game last played date to the specified <code>date</code>
	 *
	 * @param date
	 */
	void setLastPlayed(Date date);

	/**
	 * @return
	 */
	int getPlayCount();

	/**
	 * @param count
	 */
	void setPlayCount(int count);

	/**
	 * @return
	 */
	boolean isFavorite();

	/**
	 * @return
	 */
	int getRate();

	/**
	 * @param rate
	 */
	void setRate(int rate);

	/**
	 * @return
	 */
	int getPlatformId();

	/**
	 * @return
	 */
	int getEmulatorId();

	void setEmulator(int emulatorId);

	boolean hasEmulator();

	/**
	 * @param lastAddedGameId
	 */
	void setId(int gameId);

	/**
	 * @return
	 */
	String getPlatformIconFileName();

	Date getDateAdded();
}
