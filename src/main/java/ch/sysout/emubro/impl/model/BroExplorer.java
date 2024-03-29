package ch.sysout.emubro.impl.model;

import java.io.File;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Properties;
import java.util.Set;

import javax.swing.filechooser.FileSystemView;

import ch.sysout.emubro.util.EmuBroUtil;
import org.apache.commons.io.FilenameUtils;

import ch.sysout.emubro.api.filter.FilterGroup;
import ch.sysout.emubro.api.model.Emulator;
import ch.sysout.emubro.api.model.Explorer;
import ch.sysout.emubro.api.model.Game;
import ch.sysout.emubro.api.model.Platform;
import ch.sysout.emubro.api.model.Tag;
import ch.sysout.util.FileUtil;

public class BroExplorer implements Explorer {
	private Map<Integer, Game> games = new HashMap<>();
	private List<Game> removedGames;
	private Map<String, Integer> files = new HashMap<>();

	private Map<Integer, Platform> platforms = new HashMap<>();
	private Map<String, Integer> platforms2 = new HashMap<>();

	private Map<Map<String, String>, Tag> tags = new HashMap<>();

	private Map<Tag, Integer> tagsForGames = new HashMap<>();

	private List<Integer> currentGameIds = new ArrayList<>();
	//	private List<BroPlatform> defaultPlatforms;
	private List<BroTag> defaultTags;
	private boolean searchProcessComplete;
	private boolean showConfigWizardAtStartup;
	private String extensionsString = "";
	private List<String> extensions;
	private Map<Integer, String> checksums = new HashMap<>();
	private String currentApplicationVersion;
	private boolean discordFeatureDisabled = false; // this is intended to be false per default until user decides to disable it
	private List<FilterGroup> filterGroups;
	private Map<String, Properties> gameTitles;

	private boolean showPlatformIconsEnabled = false;
	private boolean showGameNamesEnabled = true;

	public BroExplorer(String currentApplicationVersion) {
		this.currentApplicationVersion = currentApplicationVersion;
	}

	@Override
	public void addGame(Game game, String filePath) {
		games.put(game.getId(), game);
		files.put(filePath, game.getId());
	}

	@Override
	public void removeGame(Game game) {
		games.remove(game.getId());
		files.values().remove(game.getId());
	}

	@Override
	public void renameGame(int id, String newName) {
		games.get(id).setName(newName);
	}

	//	@Override
	//	public List<BroPlatform> getDefaultPlatforms() {
	//		return defaultPlatforms;
	//	}

	//	@Override
	//	public void setDefaultPlatforms(List<BroPlatform> platforms) {
	//		defaultPlatforms = new ArrayList<>(platforms);
	//	}

	@Override
	public List<BroTag> getUpdatedTags() {
		return defaultTags;
	}

	@Override
	public void setUpdatedTags(List<BroTag> tags) {
		defaultTags = new ArrayList<>(tags);
	}

	@Override
	public List<Game> getGames() {
		List<Game> list = new ArrayList<>(games.values());
		return list;
	}

	@Override
	public List<Game> getGamesWithoutCovers() {
		List<Game> gameList = new ArrayList<>();
		for (Entry<Integer, Game> entry : games.entrySet()) {
			Game game = entry.getValue();
			if (!game.hasCover()) {
				gameList.add(game);
			}
		}
		return gameList;
	}

	@Override
	public Game getGame(int gameId) {
		return games.get(gameId);
	}

	@Override
	public List<Game> getRemovedGames() {
		return removedGames;
	}

	@Override
	public void setRemovedGames(List<Game> removedGames) {
		if (removedGames == null) {
			removedGames = new ArrayList<>();
		}
		this.removedGames = removedGames;
	}

	@Override
	public List<Game> getCurrentGames() {
		List<Game> tmpCurrentGames = new ArrayList<>();
		for (Integer gameId : currentGameIds) {
			tmpCurrentGames.add(getGame(gameId));
		}
		return tmpCurrentGames;
	}

	@Override
	public void setCurrentGames(List<Game> games) {
		currentGameIds.clear();
		for (Game game : games) {
			currentGameIds.add(game.getId());
		}
	}

	@Override
	public void setCurrentGames(Game... games) {
		currentGameIds.clear();
		for (Game game : games) {
			currentGameIds.add(game.getId());
		}
	}

	@Override
	public boolean hasCurrentGame() {
		return !currentGameIds.isEmpty();
	}

	@Override
	public void setGames(List<Game> games) {
		this.games.clear();
		for (Game g : games) {
			if (g == null) {
				System.err.println("setGames(List<Game> games) in BroExplorer: game is null. this shouldn't happen, there is an issue elsewhere");
				continue;
			}
			this.games.put(g.getId(), g);
		}
	}

	@Override
	public void setFilesForGame(int gameId, List<String> files) {
		for (String file : files) {
			this.files.put(file, gameId);
		}
	}

	@Override
	public int getGameCount() {
		return games.size();
	}

	@Override
	public int getGameCountFromPlatform(int platformId) {
		int count = 0;
		for (Entry<Integer, Game> entry : games.entrySet()) {
			Game game = entry.getValue();
			if (game.getPlatformId() == platformId) {
				count++;
			}
		}
		return count;
	}

	@Override
	public List<Game> getGamesFromPlatform(int platformId) {
		List<Game> gameList = new ArrayList<>();
		for (Entry<Integer, Game> entry : games.entrySet()) {
			Game game = entry.getValue();
			if (game.getPlatformId() == platformId) {
				gameList.add(game);
			}
		}
		return gameList;
	}

	@Override
	public boolean isKnownExtension(String fileExtension) {
		if (fileExtension == null || fileExtension.trim().isEmpty()) {
			return false;
		}
		if (extensions == null) {
			extensions = Arrays.asList(getExtensionsString().split("\\|"));
		}
		return extensions.contains(fileExtension.trim().toLowerCase());
	}

	@Override
	public String getExtensionsRegexString() {
		List<String> extensions = getExtensions();
		int counter = 0;
		for (String s : extensions) {
			extensionsString += s;
			counter++;
			if (counter < extensions.size()) {
				extensionsString += "|";
			}
		}
		return extensionsString;
	}

	@Override
	public String getExtensionsString() {
		List<String> extensions = getExtensions();
		int counter = 0;
		for (String s : extensions) {
			extensionsString += FilenameUtils.getExtension(s).replace("$", "");
			counter++;
			if (counter < extensions.size()) {
				extensionsString += "|";
			}
		}
		return extensionsString;
	}

	@Override
	public List<String> getExtensions() {
		//		List<BroPlatform> platformsList = defaultPlatforms;
		//		List<String> extensions = getExtensions(platformsList);
		//		extensions.addAll(getExtensions2(getPlatforms()));
		return getExtensions2(getPlatforms());
	}

	private List<String> getExtensions2(List<Platform> platformsList) {
		List<String> extensions = new ArrayList<>();
		for (Platform p : platformsList) {
			boolean autoSearchEnabled = p.isAutoSearchEnabled();
			if (!autoSearchEnabled) {
				continue;
			}
			String searchFor = p.getSearchFor();
			String[] searchForArr = searchFor.split("\\|");
			for (String s : searchForArr) {
				if (!s.trim().isEmpty()) {
					if (!extensions.contains(s)) {
						extensions.add(s);
					}
				}
			}
			List<BroEmulator> emulatorsList = p.getEmulators();
			for (Emulator emu : emulatorsList) {
				boolean autoSearchEnabled2 = emu.isAutoSearchEnabled();
				if (!autoSearchEnabled2) {
					continue;
				}
				String searchString = emu.getSearchString();
				String[] searchStringArr = searchString.split("\\|");
				for (String s : searchStringArr) {
					if (!s.trim().isEmpty()) {
						if (!extensions.contains(s)) {
							extensions.add(s);
						}
					}
				}
				List<String> supportedFileTypes = emu.getSupportedFileTypes();
				for (int i = 0; i < supportedFileTypes.size(); i++) {
					String item = supportedFileTypes.get(i);
					if (!item.trim().isEmpty()) {
						if (!item.startsWith("^(.*)\\") && !item.endsWith("$")) {
							if (!item.startsWith(".")) {
								item = "." + item;
							}
							item = "^(.*)\\" + item + "$";
							supportedFileTypes.set(i, item);
						}
						if (!extensions.contains(item)) {
							extensions.add(item);
						}
					}
				}
			}
		}
		return extensions;
	}

	private List<String> getExtensions(List<BroPlatform> platformsList) {
		List<String> extensions = new ArrayList<>();
		for (Platform p : platformsList) {
			boolean autoSearchEnabled = p.isAutoSearchEnabled();
			if (!autoSearchEnabled) {
				continue;
			}
			String searchFor = p.getSearchFor();
			String[] searchForArr = searchFor.split("\\|");
			for (String s : searchForArr) {
				if (!s.trim().isEmpty()) {
					if (!extensions.contains(s)) {
						extensions.add(s);
					}
				}
			}
			List<BroEmulator> emulatorsList = p.getEmulators();
			for (Emulator emu : emulatorsList) {
				boolean autoSearchEnabled2 = emu.isAutoSearchEnabled();
				if (!autoSearchEnabled2) {
					continue;
				}
				String searchString = emu.getSearchString();
				String[] searchStringArr = searchString.split("\\|");
				for (String s : searchStringArr) {
					if (!s.trim().isEmpty()) {
						if (!extensions.contains(s)) {
							extensions.add(s);
						}
					}
				}
				List<String> supportedFileTypes = emu.getSupportedFileTypes();
				for (int i = 0; i < supportedFileTypes.size(); i++) {
					String item = supportedFileTypes.get(i);
					if (!item.trim().isEmpty()) {
						if (!item.startsWith("^(.*)\\") && !item.endsWith("$")) {
							if (!item.startsWith(".")) {
								item = "." + item;
							}
							item = "^(.*)\\" + item + "$";
							supportedFileTypes.set(i, item);
						}
						if (!extensions.contains(item)) {
							extensions.add(item);
						}
					}
				}
			}
		}
		return extensions;
	}

	@Override
	public void setPlatforms(List<Platform> platforms) {
		this.platforms.clear();
		platforms2.clear();
		for (Platform p : platforms) {
			this.platforms.put(p.getId(), p);
			platforms2.put(p.getName(), p.getId());
		}
	}

	@Override
	public void addPlatform(Platform platform) {
		platforms.put(platform.getId(), platform);
		platforms2.put(platform.getName(), platform.getId());
	}

	@Override
	public void removePlatform(Platform platform) {
		platforms.remove(platform.getId());
		platforms2.remove(platform.getName());
	}

	@Override
	public List<Platform> getPlatforms() {
		// FIXME maybe make this global and be sure to update the list
		List<Platform> list = new ArrayList<>(platforms.values());
		return list;
	}

	@Override
	public boolean hasPlatform(String name) {
		return platforms2.containsKey(name);
	}

	@Override
	public Platform getPlatform(String shortName) {
		if (platforms2.containsKey(shortName)) {
			int platformId = platforms2.get(shortName);
			return platforms.get(platformId);
		}
		return null;
	}

	@Override
	public Platform getPlatform(int platformId) {
		return platforms.get(platformId);
	}

	@Override
	public boolean hasGamesOrEmulators(int platformId) {
		return getGameCountFromPlatform(platformId) > 0
				|| getPlatform(platformId).hasDefaultEmulator();
	}

	@Override
	public boolean hasEmulator(String platformName, String emulatorPath) {
		Platform p = getPlatform(platformName);
		return p != null && p.hasEmulator(emulatorPath);
	}

	@Override
	public boolean hasEmulatorByName(String platformName, String emulatorName) {
		Platform p = getPlatform(platformName);
		return p != null && p.hasEmulatorByName(emulatorName);
	}

	@Override
	public int getPlatformCount() {
		return platforms.size();
	}

	@Override
	public boolean isSearchProcessComplete() {
		return searchProcessComplete;
	}

	@Override
	public void setSearchProcessComplete(boolean searchProcessComplete) {
		this.searchProcessComplete = searchProcessComplete;

	}

	@Override
	public List<BroEmulator> getEmulatorsFromPlatform(int platformId) {
		Platform platform = getPlatform(platformId);
		if (platform == null) {
			throw new IllegalArgumentException("no platform found with that id: " + platformId);
		}
		return platform.getEmulators();
	}

	@Override
	public Emulator getEmulatorFromPlatform(int platformId) {
		Platform platform = getPlatform(platformId);
		if (platform == null) {
			throw new IllegalArgumentException("no platform found with that id: " + platformId);
		}
		return platform.getDefaultEmulator();
	}

	@Override
	public Emulator getEmulatorFromGame(int id) {
		Game g = games.get(id);
		int platformId = g.getPlatformId();
		int defaultEmulatorId = g.getDefaultEmulatorId();
		if (defaultEmulatorId == EmulatorConstants.NO_EMULATOR) {
			return null;
		}
		List<BroEmulator> emulators = getPlatform(platformId).getEmulators();
		for (BroEmulator emu : emulators) {
			if (emu.getId() == defaultEmulatorId) {
				return emu;
			}
		}
		return null;
	}

	@Override
	public boolean isConfigWizardHiddenAtStartup() {
		return showConfigWizardAtStartup;
	}

	@Override
	public void setConfigWizardHiddenAtStartup(boolean b) {
		showConfigWizardAtStartup = b;
	}

	@Override
	public boolean hasGameWithSameName(int platformId, BroGame game) {
		for (Entry<Integer, Game> entry : games.entrySet()) {
			Game game2 = entry.getValue();
			if (game2.getPlatformId() == platformId) {
				if (game2.getId() != game.getId()
						&& game2.getName().trim().equalsIgnoreCase(game.getName().trim())) {
					return true;
				}
			}
		}
		return false;
	}

	@Override
	public List<Platform> getPlatformsFromCommonDirectory(String filePath) {
		List<Platform> matchedPlatformIds = new ArrayList<>();
		if (getGameCount() == 0) {
			return matchedPlatformIds;
		}
		String parentFolder = FileUtil.getParentDirPath(filePath);
		do {
			for (Game game : getGames()) {
				String parentFolderToCheck = FilenameUtils.getFullPath(getFiles(game).get(0));
				if  (parentFolderToCheck.startsWith(parentFolder)) {
					int platformId = game.getPlatformId();
					Platform platform = getPlatform(platformId);
					if (!matchedPlatformIds.contains(platform)) {
						matchedPlatformIds.add(platform);
					}
				}
			}
			if (matchedPlatformIds.isEmpty()) {
				parentFolder = FileUtil.getParentDirPath(parentFolder);
			}
		}
		while (matchedPlatformIds.isEmpty() && !parentFolder.isEmpty());
		return matchedPlatformIds;
	}

	@Override
	public List<String> getGameDirectoriesFromPlatform(int platformId) {
		List<String> directories = new ArrayList<>();
		for (Game game : getGamesFromPlatform(platformId)) {
			List<String> gameFiles = getFiles(game);
			if (gameFiles != null && gameFiles.size() > 0) {
				String gamePath = FileUtil.getParentDirPath(gameFiles.get(0));
				if (!directories.contains(gamePath)) {
					directories.add(gamePath);
				}
			}
		}
		return directories;
	}

	@Override
	public Game getGameForFile(String path) {
		return games.get(files.get(path));
	}

	@Override
	public List<String> getFiles(Game game) {
		List<String> filePaths = new ArrayList<>();
		for (Entry<String, Integer> entry : files.entrySet()) {
			if (entry.getValue() == game.getId()) {
				filePaths.add(entry.getKey());
			}
		}
		return filePaths;
	}

	@Override
	public boolean hasGamesWithSameChecksum() {
		return false;
	}

	@Override
	public List<Game> getGamesWithSameChecksum() {
		// TODO Auto-generated method stub
		return null;
	}

	@Override
	public boolean hasFile(String absolutePath) {
		return files.containsKey(absolutePath);
	}

	@Override
	public void addFile(int gameId, String filePath) {
		files.put(filePath, gameId);
	}

	@Override
	public void addChecksum(int checksumId, String checksum) {
		checksums.put(checksumId, checksum);
	}

	@Override
	public String getChecksumById(int checksumId) {
		return checksums.get(checksumId);
	}

	@Override
	public void setChecksums(Map<Integer, String> checksums) {
		this.checksums = checksums;
	}

	@Override
	public boolean isExcludedFileOrDirectory(Path f) {
		//		String path = f.getAbsolutePath().toLowerCase();
		//		String folder = f.getName();
		//		if (ValidationUtil.isUnix()) {
		//			return isOnBlackList(path, folder);
		//		} else if (ValidationUtil.isWindows()) {
		//			String winDir = System.getenv("WINDIR").toLowerCase();
		//			return folder.startsWith(".") || folder.startsWith("~") || folder.startsWith("$") || path.startsWith(winDir)
		//					|| folder.endsWith(".lnk")
		//					|| (path.matches("^(.+)\\\\AppData\\\\Local(.*)|"
		//							+ "^(.+)\\\\AppData\\\\LocalRow(.*)$|"
		//							+ "^(.+)\\\\AppData\\\\Roaming(.*)|"
		//							+ "^(.+)\\\\steam\\\\bin\\\\shaders$|"
		//							+ "^(.+)\\\\lenovo\\\\lenovo photo master\\\\shadercode$|"
		//							+ "^(.+)\\\\origin\\\\production.wad$"));
		//		} else if (ValidationUtil.isMac()) {
		//
		//		} else if (ValidationUtil.isSolaris()) {
		//
		//		}
		return false;
	}

	private boolean isOnBlackList(String path, String folder) {
		// FIXME get from json
		return folder.startsWith(".") || folder.startsWith("$") || path.matches("^(.*playonlinux.*virtual.*drive.*)$")
				|| path.matches("^(dosdevices)$")

				|| (path.matches("^\\/media\\/.+\\/.+\\/boot$") || path.matches("^\\/media\\/.+\\/.+\\/boot\\/.+$"))
				|| (path.matches("^\\/media\\/.+\\/.+\\/windows$")
						|| path.matches("^\\/media\\/.+\\/.+\\/windows\\/.+$"))
				|| (path.matches("^\\/media\\/.+\\/.+\\/system volume information$")
						|| path.matches("^\\/media\\/.+\\/.+\\/system volume information\\/.+$"))
				|| (path.matches("^\\/media\\/.+\\/.+\\/recovery$")
						|| path.matches("^\\/media\\/.+\\/.+\\/recover\\/.+$"))

				|| (!path.matches("^\\/home$") && !path.matches("^\\/home\\/.+$") && !path.matches("^\\/opt$")
						&& !path.matches("^\\/opt\\/.+$") && !path.matches("^\\/usr$") && !path.matches("^\\/usr\\/.+$")
						&& !path.matches("^\\/media$") && !path.matches("^\\/media\\/.+$"));
		//
		// || !doFileMatch(path);
	}

	@Override
	public List<Tag> getTags() {
		// FIXME maybe make this global and be sure to update the list
		List<Tag> list = new ArrayList<>(tags.values());
		return list;
	}

	@Override
	public void setTags(List<Tag> tags) {
		this.tags.clear();
		for (Tag t : tags) {
			Map<String, String> map = new HashMap<>();
			map.put("id", ""+t.getId());
			map.put("name", ""+t.getName());
			this.tags.put(map, t);
		}
	}

	@Override
	public void setTagsForGame(int gameId, List<Tag> tags) {
		//		for (Tag tag : tags) {
		//			addTagForGame(gameId, tag);
		//		}
	}

	@Override
	public void addTagForGame(int gameId, Tag tag) {
		//		tagsForGames.put(tag, gameId);
	}

	@Override
	public void removeTagFromGame(int gameId, int tagId) {
		//		if (tagsForGames.containsValue(tagId)) {
		//			Set<Tag> tmpTags = tagsForGames.keySet();
		//			Iterator<Tag> it = tmpTags.iterator();
		//			while (it.hasNext()) {
		//				Tag t = it.next();
		//				if (t.getId() == tagId) {
		//					tags.remove(t);
		//					break;
		//				}
		//			}
		//		}
	}

	@Override
	public void addTag(Tag tag) {
		Map<String, String> tagKeyValues = new HashMap<>();
		tagKeyValues.put("id", ""+tag.getId());
		tagKeyValues.put("name", ""+tag.getName());
		tags.put(tagKeyValues, tag);
	}

	@Override
	public void removeTag(Tag tag) {
		Map<String, String> removalKey = null;
		for (Entry<Map<String, String>, Tag> entry : tags.entrySet()) {
			if (tag.equals(entry.getValue())) {
				removalKey = entry.getKey();
				break;
			}
		}
		if (removalKey != null) {
			tags.remove(removalKey);
		}
	}

	@Override
	public Tag getTag(int tagId) {
		Set<Map<String, String>> tag = tags.keySet();
		Iterator<Map<String, String>> it = tag.iterator();
		while (it.hasNext()) {
			Map<String, String> map = it.next();
			String currentId = map.get("id");
			if (currentId.equals(""+tagId)) {
				return tags.get(map);
			}
		}
		return null;
	}

	@Override
	public Tag getTag(String name) {
		Set<Map<String, String>> tag = tags.keySet();
		Iterator<Map<String, String>> it = tag.iterator();
		while (it.hasNext()) {
			Map<String, String> map = it.next();
			String currentName = map.get("name");
			if (currentName.equalsIgnoreCase(name)) {
				return tags.get(map);
			}
		}
		return null;
	}

	@Override
	public boolean hasTag(String name) {
		Set<Map<String, String>> tag = tags.keySet();
		Iterator<Map<String, String>> it = tag.iterator();
		while (it.hasNext()) {
			Map<String, String> map = it.next();
			String currentChecksum = map.get("name");
			if (currentChecksum.equalsIgnoreCase(name)) {
				return true;
			}
		}
		return false;
	}

	@Override
	public List<Game> getGamesForTags(Tag... tags) {
		List<Game> gameList = new ArrayList<>();
		for (Entry<Integer, Game> entry : games.entrySet()) {
			Game game = entry.getValue();
			for (Tag tag : tags) {
				if (game.hasTag(tag.getId())) {
					gameList.add(game);
				}
			}
		}
		return gameList;
	}

	@Override
	public List<Tag> getTagsForGame(int gameId) {
		List<Tag> tmpTags = new ArrayList<>();
		for (Entry<Tag, Integer> entry : tagsForGames.entrySet()) {
			if (entry.getValue() == gameId) {
				tmpTags.add(entry.getKey());
			}
		}
		return tmpTags;
	}

	@Override
	public void setGameCode(int id, String gameCode) {
		games.get(id).setGameCode(gameCode);
	}

	public Tag getTagByName(String name) {
		Set<Map<String, String>> tag = tags.keySet();
		Iterator<Map<String, String>> it = tag.iterator();
		while (it.hasNext()) {
			Map<String, String> map = it.next();
			String currentName = map.get("name");
			if (currentName.equalsIgnoreCase(name)) {
				return tags.get(map);
			}
		}
		return null;
	}

	@Override
	public String getCurrentApplicationVersion() {
		return currentApplicationVersion;
	}

	@Override
	public void setCurrentApplicationVersion(String currentApplicationVersion) {
		this.currentApplicationVersion = currentApplicationVersion;
	}

	public boolean isDiscordFeatureInstalled() {
		return false;
	}

	public boolean isDiscordFeatureDisabled() {
		return isDiscordFeatureInstalled() && discordFeatureDisabled;
	}

	public void setDiscordFeatureDisabled(boolean discordFeatureDisabled) {
		this.discordFeatureDisabled = discordFeatureDisabled;
	}

	@Override
	public String getResourcesPath() {
		return EmuBroUtil.getResourceDirectory();
	}

	@Override
	public String getGameCoversPath() {
		return getResourcesPath() + File.separator + "covers";
	}

	@Override
	public void setFilterGroups(List<FilterGroup> filterGroups) {
		this.filterGroups = filterGroups;
	}

	@Override
	public void addFilterGroup(FilterGroup filterGroup) {
		filterGroups.add(filterGroup);
	}

	@Override
	public String getPlatformsDirectory() {
		return "/platforms";
	}

	@Override
	public String getLogosDirectoryFromPlatform(Platform platform) {
		return getPlatformsDirectory() + File.separator + platform.getShortName() + File.separator + "logos";
	}

	@Override
	public String getPlatformCoversDirectoryFromPlatform(Platform platform) {
		return getPlatformsDirectory() + File.separator + platform.getShortName() + File.separator + "covers";
	}

	@Override
	public Properties getGameTitlesFromPlatform(String shortName) {
		return gameTitles != null ? gameTitles.get(shortName) : null;
	}

	@Override
	public Properties getGameTitlesFromPlatform(Platform platform) {
		return getGameTitlesFromPlatform(platform.getShortName());
	}

	@Override
	public void setGameTitlesForPlatform(Platform platform, Properties prop) {
		if (gameTitles == null) {
			gameTitles = new HashMap<>();
		}
		gameTitles.put(platform.getShortName(), prop);
	}

	@Override
	public String getRelativeTitlesSourceFilePath(Platform platform) {
		return "gametdb/db.xml";
	}

	@Override
	public String getCoverDownloadSource(Game game) {
		return "http://art.gametdb.com/";
	}

	@Override
	public boolean isShowPlatformIconsEnabled() {
		return showPlatformIconsEnabled;
	}

	@Override
	public void setShowPlatformIconsEnabled(boolean showPlatformIconsEnabled) {
		this.showPlatformIconsEnabled = showPlatformIconsEnabled;
	}

	@Override
	public boolean isShowGameNamesEnabled() {
		return showGameNamesEnabled;
	}

	@Override
	public void setShowGameNamesEnabled(boolean showGameNamesEnabled) {
		this.showGameNamesEnabled = showGameNamesEnabled;
	}
}