package ch.sysout.emubro.impl.model;

import java.awt.Image;
import java.io.File;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;

import ch.sysout.emubro.api.model.Game;
import ch.sysout.emubro.api.model.Tag;
import ch.sysout.emubro.util.EmuBroUtil;
import ch.sysout.ui.util.UIUtil;
import ch.sysout.util.ValidationUtil;

public class BroGame implements Game {
	private int id;
	private String name;
	private String gameCode;
	private int defaultFileId;
	private int checksumId;
	private String iconPath;
	private String coverPath;
	private int rate;
	private transient ZonedDateTime dateAdded;
	private String formattedDateAdded;
	private transient ZonedDateTime lastPlayed;
	private String formattedLastPlayedDate;
	private int playCount;
	private int emulatorId;
	private int platformId;
	private String platformIconFileName;
	private List<Tag> tags = new ArrayList<>();
	private String region;
	private String description;
	private String developer;
	private String publisher;
	private transient Image bannerImage;

	public BroGame(int id, String name, String gameCode, int defaultFileId, int defaultChecksumId, String iconPath, String coverPath, int rate, ZonedDateTime dateAdded,
			ZonedDateTime lastPlayed, int playCount, int emulatorId, int platformId, String platformIconFileName) {
		ValidationUtil.checkNullOrEmpty(name, "name");
		this.id = id;
		this.name = name;
		setGameCode(gameCode);
		this.defaultFileId = defaultFileId;
		checksumId = defaultChecksumId;
		this.iconPath = (iconPath == null) ? "" : iconPath;
		this.coverPath = (coverPath == null) ? "" : coverPath;
		this.rate = rate;
		this.dateAdded = dateAdded;
		this.lastPlayed = lastPlayed;
		this.playCount = playCount;
		this.emulatorId = emulatorId;
		this.platformId = platformId;
		this.platformIconFileName = (platformIconFileName == null) ? "" : platformIconFileName;
	}

	@Override
	public String getName() {
		return name;
	}

	@Override
	public void setName(String name) {
		ValidationUtil.checkNullOrEmpty(name, "name");
		this.name = name;
	}

	@Override
	public boolean hasGameCode() {
		return gameCode != null && !gameCode.isEmpty();
	}

	@Override
	public String getGameCode() {
		return gameCode;
	}

	@Override
	public void setGameCode(String gameCode) {
		this.gameCode = (gameCode == null) ? "" : gameCode.trim();
	}

	@Override
	public int getChecksumId() {
		return checksumId;
	}

	@Override
	public void setChecksumId(int checksumId) {
		this.checksumId = checksumId;
	}

	@Override
	public int getDefaultFileId() {
		return defaultFileId;
	}

	@Override
	public void setDefaultFileId(int defaultFileId) {
		this.defaultFileId = defaultFileId;
	}

	@Override
	public String getIconPath() {
		return iconPath;
	}

	/**
	 * @param iconPath
	 *            the path to the icon. may be empty but not null
	 */
	@Override
	public void setIconPath(String iconPath) {
		ValidationUtil.checkNull(iconPath, "iconPath");
		this.iconPath = iconPath;
	}

	@Override
	public boolean hasIcon() {
		return !iconPath.trim().isEmpty();
	}

	public void removeIcon() {
		iconPath = "";
	}

	@Override
	public boolean hasCover() {
		return !coverPath.trim().isEmpty();
	}

	public void removeCover() {
		coverPath = "";
	}

	@Override
	public String getCoverPath() {
		return coverPath;
	}

	/**
	 * @param coverPath
	 *            the path to the cover. may be empty but not null
	 */
	@Override
	public void setCoverPath(String coverPath) {
		ValidationUtil.checkNull(coverPath, "coverPath");
		this.coverPath = coverPath;
	}

	@Override
	public boolean isFavorite() {
		return rate > 0;
	}

	@Override
	public int getRate() {
		return rate;
	}

	@Override
	public void setRate(int rate) {
		this.rate = rate;
	}

	@Override
	public int getPlayCount() {
		return playCount;
	}

	@Override
	public ZonedDateTime getDateAdded() {
		return dateAdded;
	}

	@Override
	public String getFormattedDateAdded() {
		if (formattedDateAdded == null) {
			formattedDateAdded = UIUtil.format(dateAdded);
		}
		return formattedDateAdded;
	}

	@Override
	public ZonedDateTime getLastPlayed() {
		return lastPlayed;
	}

	@Override
	public void setLastPlayed(ZonedDateTime date) {
		lastPlayed = date;
		setFormattedLastPlayedDate(date);
	}

	@Override
	public String getFormattedLastPlayedDate() {
		if (formattedLastPlayedDate == null) {
			setFormattedLastPlayedDate(lastPlayed);
		}
		return formattedLastPlayedDate;
	}

	private void setFormattedLastPlayedDate(ZonedDateTime lastPlayed2) {
		formattedLastPlayedDate = UIUtil.format(lastPlayed);
	}

	@Override
	public String toString() {
		return getName();
	}

	@Override
	public int getPlatformId() {
		return platformId;
	}

	@Override
	public int getId() {
		return id;
	}

	@Override
	public void setId(int gameId) {
		id = gameId;
	}

	@Override
	public int getDefaultEmulatorId() {
		return emulatorId;
	}

	@Override
	public void setEmulator(int emulatorId) {
		this.emulatorId = emulatorId;
	}

	@Override
	public void setPlayCount(int playCount) {
		this.playCount = playCount;
	}

	@Override
	public boolean hasEmulator() {
		return emulatorId != EmulatorConstants.NO_EMULATOR;
	}

	@Override
	public int compareTo(Game g) {
		String thisGame = getName().toLowerCase();
		String otherGame = g.getName().toLowerCase();
		return thisGame.compareTo(otherGame);
	}

	@Override
	public String getPlatformIconFileName() {
		return platformIconFileName;
	}

	@Override
	public void addTag(Tag tag) {
		tags.add(tag);
	}

	@Override
	public void removeTag(int tagId) {
		for (int i = 0; i < tags.size(); i++) {
			Tag tag = tags.get(i);
			if (tag.getId() == tagId) {
				tags.remove(i);
				break;
			}
		}
	}

	@Override
	public List<Tag> getTags() {
		return tags;
	}

	@Override
	public Tag getTag(int tagId) {
		for (Tag tag : tags) {
			if (tag.getId() == tagId) {
				return tag;
			}
		}
		return null;
	}

	@Override
	public boolean hasTag(int tagId) {
		return getTag(tagId) != null;
	}

	@Override
	public String getRegion() {
		return region;
	}

	@Override
	public void setRegion(String region) {
		this.region = region;
	}

	@Override
	public String getLanguages() {
		return null;
	}

	@Override
	public void setLanguages(String string) {

	}

	@Override
	public String getDescription() {
		return description;
	}

	@Override
	public void setDescription(String description) {
		this.description = description;
	}

	@Override
	public String getDeveloper() {
		return developer;
	}

	@Override
	public void setDeveloper(String string) {
		developer = string;
	}

	@Override
	public String getPublisher() {
		return publisher;
	}

	@Override
	public void setPublisher(String string) {
		publisher = string;
	}

	@Override
	public Image getBannerImage() {
		return bannerImage;
	}

	@Override
	public void setBannerImage(Image bannerImage) {
		this.bannerImage = bannerImage;
	}
}