package ch.sysout.emubro.impl.model;

import java.util.Date;

import ch.sysout.emubro.api.model.Game;
import ch.sysout.util.ValidationUtil;

public class BroGame implements Game {
	private int id;
	private String name;
	private int defaultFileId;
	private int checksumId;
	private String iconPath;
	private String coverPath;
	private int rate;
	private Date dateAdded;
	private Date lastPlayed;
	private int playCount;
	private int emulatorId;
	private int platformId;
	private String platformIconFileName;

	public BroGame(int id, String name, int defaultFileId, int checksumId, String iconPath, String coverPath, int rate, Date dateAdded,
			Date lastPlayed, int playCount, int emulatorId, int platformId, String platformIconFileName) {
		ValidationUtil.checkNullOrEmpty(name, "name");
		this.id = id;
		this.name = name;
		this.defaultFileId = defaultFileId;
		this.checksumId = checksumId;
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
	public int getChecksumId() {
		return checksumId;
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

	@Override
	public boolean hasIcon() {
		return !iconPath.trim().isEmpty();
	}

	public void removeIcon() {
		iconPath = "";
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
	public String getCoverPath() {
		return coverPath;
	}

	@Override
	public boolean hasCover() {
		return !coverPath.trim().isEmpty();
	}

	public void removeCover() {
		coverPath = "";
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
	public Date getDateAdded() {
		return dateAdded;
	}

	@Override
	public Date getLastPlayed() {
		return lastPlayed;
	}

	@Override
	public void setLastPlayed(Date date) {
		lastPlayed = date;
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
	public int getEmulatorId() {
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
}