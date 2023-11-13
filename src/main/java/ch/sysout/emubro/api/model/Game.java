package ch.sysout.emubro.api.model;

import java.awt.Image;
import java.time.ZonedDateTime;
import java.util.List;

public interface Game extends Comparable<Game> {
	int getId();

	String getName();

	void setName(String title);

	int getChecksumId();

	String getIconPath();

	void setIconPath(String path);

	boolean hasIcon();

	String getCoverPath();

	void setCoverPath(String path);

	boolean hasCover();

	ZonedDateTime getLastPlayed();

	void setLastPlayed(ZonedDateTime date);

	String getFormattedLastPlayedDate();

	int getPlayCount();

	void setPlayCount(int count);

	boolean isFavorite();

	int getRate();

	void setRate(int rate);

	int getPlatformId();

	int getDefaultEmulatorId();

	void setEmulator(int emulatorId);

	boolean hasEmulator();

	void setId(int gameId);

	String getPlatformIconFileName();

	ZonedDateTime getDateAdded();

	String getFormattedDateAdded();

	int getDefaultFileId();

	void setDefaultFileId(int defaultFileId);

	List<Tag> getTags();

	void addTag(Tag tag);

	boolean hasTag(int tagId);

	void removeTag(int tagId);

	Tag getTag(int tagId);

	String getGameCode();

	void setGameCode(String gameCode);

	void setChecksumId(int defaultChecksumId);

	String getRegion();

	void setRegion(String string);

	String getLanguages();

	void setLanguages(String string);

	String getDescription();

	void setDescription(String synopsis);

	String getDeveloper();

	void setDeveloper(String string);

	String getPublisher();

	void setPublisher(String string);

	Image getBannerImage();

	void setBannerImage(Image img);
}
