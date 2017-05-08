package ch.sysout.emubro.impl.model;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;

import org.apache.commons.io.FilenameUtils;

import ch.sysout.emubro.api.model.Emulator;
import ch.sysout.emubro.api.model.Explorer;
import ch.sysout.emubro.api.model.Game;
import ch.sysout.emubro.api.model.Platform;

public class BroExplorer implements Explorer {
	private Map<Integer, Game> games = new HashMap<>();
	private Map<String, Integer> games2 = new HashMap<>();

	private Map<Integer, Platform> platforms = new HashMap<>();
	private Map<String, Integer> platforms2 = new HashMap<>();

	private int currentGame;
	private List<BroPlatform> defaultPlatforms;
	private boolean searchProcessComplete;
	private boolean showConfigWizardAtStartup;
	private String extensionsString = "";
	private List<String> extensions;

	@Override
	public void addGame(Game game) {
		games.put(game.getId(), game);
		games2.put(game.getPath(), game.getId());
	}

	@Override
	public void removeGame(Game game) {
		games.remove(game.getId());
		games2.remove(game.getPath());
	}

	@Override
	public void renameGame(int id, String newName) {
		games.get(id).setName(newName);
	}

	@Override
	public List<BroPlatform> getDefaultPlatforms() {
		return defaultPlatforms;
	}

	@Override
	public void setDefaultPlatforms(List<BroPlatform> platforms) {
		defaultPlatforms = new ArrayList<>(platforms);
	}

	@Override
	public List<Game> getGames() {
		return new ArrayList<>(games.values());
	}

	@Override
	public Game getGame(int gameId) {
		return games.get(gameId);
	}

	@Override
	public Game getCurrentGame() {
		return games.get(currentGame);
	}

	@Override
	public void setCurrentGame(int gameId) {
		currentGame = gameId;
	}

	@Override
	public boolean hasCurrentGame() {
		return currentGame != GameConstants.NO_GAME;
	}

	@Override
	public void setGames(List<Game> games) {
		this.games.clear();
		games2.clear();
		for (Game g : games) {
			this.games.put(g.getId(), g);
			games2.put(g.getPath(), g.getId());
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
		List<String> extensions = new ArrayList<>();
		List<BroPlatform> platformsList = defaultPlatforms;
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
	public Game getGame(String path) {
		if (games2.containsKey(path)) {
			Integer gameId = games2.get(path);
			return games.get(gameId);
		}
		return null;
	}

	@Override
	public boolean hasGame(String path) {
		return games2.containsKey(path);
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
	public Platform getPlatform(String name) {
		if (platforms2.containsKey(name)) {
			int platformId = platforms2.get(name);
			return platforms.get(platformId);
		}
		return null;
	}

	@Override
	public Platform getPlatform(int platformId) {
		Platform p = platforms.get(platformId);
		return p;
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
	public Emulator getEmulatorFromPlatform(int platformId) {
		Platform platform = getPlatform(platformId);
		if (platform == null) {
			throw new IllegalArgumentException("no platform found with that id: " + platformId);
		}
		return platform.getDefaultEmulator();
	}

	@Override
	public Emulator getEmulatorFromGame(int id) {
		return getEmulatorFromPlatform(games.get(id).getPlatformId());
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

	// @Override
	// public void setEmulators(List<Emulator> emulators) {
	// this.emulators.clear();
	// emulators2.clear();
	// for (Emulator e : emulators) {
	// this.emulators.put(e.getId(), e);
	// emulators2.put(e.getPath(), e.getId());
	// }
	// }

	// @Override
	// public void addEmulator(Emulator emulator) {
	// emulators.put(emulator.getId(), emulator);
	// emulators2.put(emulator.getPath(), emulator.getId());
	// }
	//
	// @Override
	// public void removeEmulator(Emulator emulator) {
	// emulators.remove(emulator.getId());
	// emulators2.remove(emulator.getPath());
	// }
	//
	// @Override
	// public List<BroEmulator> getEmulators(int platformId) {
	// List<BroEmulator> emus = new ArrayList<BroEmulator>();
	// for (Emulator e : platforms.get(platformId).getEmulators()) {
	// emus.add((BroEmulator) e);
	// }
	// return emus;
	// }
	//
	// @Override
	// public Emulator getEmulator(int emulatorId) {
	// return emulators.get(emulatorId);
	// }
	//
	// @Override
	// public Emulator getEmulator(String path) {
	// return getEmulator2(path);
	// }
	//
	// private Emulator getEmulator2(String path) {
	// return emulators.get(emulators2.get(path));
	// }
	//
	// @Override
	// public int getEmulatorCount() {
	// return emulators.size();
	// }
}
