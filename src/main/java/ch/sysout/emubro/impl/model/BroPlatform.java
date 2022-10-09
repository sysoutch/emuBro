package ch.sysout.emubro.impl.model;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.List;

import ch.sysout.emubro.api.model.Emulator;
import ch.sysout.emubro.api.model.Platform;
import ch.sysout.util.ValidationUtil;

public class BroPlatform implements Platform {
	private int id;
	private String name;
	private String shortName;
	private String iconFilename;
	private String defaultGameCover;
	private List<String> gameSearchModes;
	private String searchFor = "";
	private List<FileStructure> fileStructure;
	private List<String> supportedArchiveTypes;
	private List<String> supportedImageTypes;
	/*
	 * element in list have to be of implementation type *diiirtyy* .. cause of
	 * gson wants it so
	 */
	private List<BroEmulator> emulators;
	private int defaultEmulatorId = EmulatorConstants.NO_EMULATOR;
	private boolean autoSearchEnabled = true;
	private List<String> gameCodeRegexes;

	public BroPlatform(int id, String name, String shortName, String iconFilename, String defaultGameCover, String[] gameSearchModes,
			String searchFor, FileStructure fileStructure[], String supportedArchiveTypes[],
			String supportedImageTypes[], BroEmulator[] emulators, int defaultEmulatorId, boolean autoSearchEnabled, String[] gameCodeRegexes) {
		ValidationUtil.checkNullOrEmpty(name, "name");
		this.id = id;
		this.name = name;
		this.shortName = shortName;
		this.iconFilename = (iconFilename == null) ? "" : iconFilename;
		this.defaultGameCover = (iconFilename == null) ? "" : defaultGameCover;
		this.gameSearchModes = new ArrayList<>(Arrays.asList(gameSearchModes));
		this.searchFor = (iconFilename == null) ? "" : searchFor;
		this.fileStructure = new ArrayList<>(Arrays.asList(fileStructure));
		this.supportedArchiveTypes = new ArrayList<>(Arrays.asList(supportedArchiveTypes));
		this.supportedImageTypes = new ArrayList<>(Arrays.asList(supportedImageTypes));
		this.emulators = new ArrayList<>(Arrays.asList(emulators));
		this.defaultEmulatorId = defaultEmulatorId;
		this.autoSearchEnabled = autoSearchEnabled;
		this.gameCodeRegexes = new ArrayList<>(Arrays.asList(gameCodeRegexes));
	}

	public BroPlatform(int id, String name, String shortName, String iconFilename, String defaultGameCover, String[] gameSearchModes,
			String searchFor, FileStructure fileStructure[], String supportedArchiveTypes[],
			String supportedImageTypes[], List<BroEmulator> emulators, int defaultEmulatorId,
			boolean autoSearchEnabled, String[] gameCodeRegexes) {
		ValidationUtil.checkNullOrEmpty(name, "name");
		this.id = id;
		this.name = name;
		this.shortName = shortName;
		this.iconFilename = (iconFilename == null) ? "" : iconFilename;
		this.defaultGameCover = (iconFilename == null) ? "" : defaultGameCover;
		this.gameSearchModes = new ArrayList<>(Arrays.asList(gameSearchModes));
		this.searchFor = (iconFilename == null) ? "" : searchFor;
		this.fileStructure = new ArrayList<>(Arrays.asList(fileStructure));
		this.supportedArchiveTypes = new ArrayList<>(Arrays.asList(supportedArchiveTypes));
		this.supportedImageTypes = new ArrayList<>(Arrays.asList(supportedImageTypes));
		this.emulators = new ArrayList<>(emulators);
		this.defaultEmulatorId = defaultEmulatorId;
		this.autoSearchEnabled = autoSearchEnabled;
		this.gameCodeRegexes = new ArrayList<>(Arrays.asList(gameCodeRegexes));
	}

	// public BroPlatform(int id, String name, String iconFilename,
	// String defaultGameCover, String gameSearchModes[],
	// String searchFor, String supportedArchiveTypes[],
	// String supportedImageTypes[]) {
	// this.id = id;
	// this.name = name;
	// this.iconFilename = iconFilename;
	// this.defaultGameCover = defaultGameCover;
	// this.gameSearchModes = new
	// ArrayList<String>(Arrays.asList(gameSearchModes));
	// this.searchFor = searchFor;
	// this.supportedArchiveTypes = new
	// ArrayList<String>(Arrays.asList(supportedArchiveTypes));
	// this.supportedImageTypes = new
	// ArrayList<String>(Arrays.asList(supportedImageTypes));
	// emulators = new ArrayList<BroEmulator>();
	// }

	public void addEmulators(Collection<Emulator> emulators) {
		// this.emulators.addAll(emulators);
	}

	@Override
	public void addEmulator(BroEmulator emulator) {
		ValidationUtil.checkNull(emulator, "emulator");
		if (!emulators.contains(emulator)) {
			emulators.add(emulator);
		}
	}

	@Override
	public void removeEmulator(BroEmulator emulator) {
		ValidationUtil.checkNull(emulator, "emulator");
		emulators.remove(emulator);
	}

	@Override
	public int getId() {
		return id;
	}

	/**
	 * @return the name
	 */
	@Override
	public String getName() {
		return name;
	}

	/**
	 * @param name
	 *            the name to set
	 */
	@Override
	public void setName(String name) {
		ValidationUtil.checkNullOrEmpty(name, "name");
		this.name = name;
	}

	@Override
	public String getShortName() {
		return shortName == null ? "" : shortName;
	}

	@Override
	public void setShortName(String shortName) {
		this.shortName = shortName;
	}

	/**
	 * @return
	 */
	public boolean hasIconFile() {
		return iconFilename != null && !iconFilename.trim().isEmpty();
	}

	/**
	 * @return
	 */
	@Override
	public String getIconFileName() {
		return iconFilename;
	}

	@Override
	public String getSearchFor() {
		return searchFor;
	}

	@Override
	public void setSearchFor(String searchFor) {
		ValidationUtil.checkNull(searchFor, "searchFor");
		this.searchFor = searchFor;
	}

	@Override
	public void addSearchFor(String searchFor) {
		ValidationUtil.checkNullOrEmpty(searchFor, "searchFor");
		if (searchFor.isEmpty()) {
			this.searchFor = searchFor;
		} else {
			this.searchFor += "|"+searchFor;
		}
	}

	@Override
	public String getDefaultGameCover() {
		return defaultGameCover;
	}

	@Override
	public String toString() {
		return name;
	}

	@Override
	public boolean hasGameSearchMode(String searchMode) {
		// TODO Auto-generated method stub
		return gameSearchModes.contains(searchMode);
	}

	@Override
	public boolean isSupportedArchiveType(String fileName) {
		String[] s = fileName.split("\\.");
		String type = "." + s[s.length - 1];
		return supportedArchiveTypes.contains(type);
	}

	@Override
	public boolean isSupportedImageType(String fileName) {
		String[] s = fileName.split("\\.");
		String type = "." + s[s.length - 1];
		return supportedImageTypes.contains(type);
	}

	@Override
	public List<String> getGameSearchModes() {
		return gameSearchModes;
	}

	@Override
	public List<FileStructure> getFileStructure() {
		return fileStructure;
	}

	@Override
	public List<String> getSupportedArchiveTypes() {
		return supportedArchiveTypes;
	}

	@Override
	public List<String> getSupportedImageTypes() {
		return supportedImageTypes;
	}

	@Override
	public Emulator getDefaultEmulator() {
		for (Emulator emulator : emulators) {
			if (emulator.getId() == defaultEmulatorId) {
				return emulator;
			}
		}
		return null;
	}

	@Override
	public List<BroEmulator> getEmulators() {
		return emulators;
	}

	@Override
	public int getDefaultEmulatorId() {
		return defaultEmulatorId;
	}

	@Override
	public void setDefaultEmulatorId(int standardEmulatorId) {
		defaultEmulatorId = standardEmulatorId;
	}

	@Override
	public boolean hasEmulator(String emulatorPath) {
		for (Emulator emu : emulators) {
			if (emu.getAbsolutePath().equals(emulatorPath)) {
				return true;
			}
		}
		return false;
	}

	@Override
	public boolean hasEmulatorByName(String emulatorName) {
		for (Emulator emu : emulators) {
			if (emu.getName().equalsIgnoreCase(emulatorName)) {
				return true;
			}
		}
		return false;
	}

	@Override
	public boolean hasDefaultEmulator() {
		return defaultEmulatorId != EmulatorConstants.NO_EMULATOR;
	}

	@Override
	public void setId(int platformId) {
		id = platformId;
	}

	@Override
	public boolean isAutoSearchEnabled() {
		return autoSearchEnabled;
	}

	@Override
	public void setAutoSearchEnabled(boolean autoSearchEnabled) {
		this.autoSearchEnabled = autoSearchEnabled;
	}

	@Override
	public boolean hasGameCodeRegexes() {
		return !gameCodeRegexes.isEmpty() && gameCodeRegexes.get(0) != null && !gameCodeRegexes.get(0).isEmpty();
	}

	@Override
	public List<String> getGameCodeRegexes() {
		return gameCodeRegexes;
	}

	@Override
	public int compareTo(Platform p) {
		String thisPlatform = getName().toLowerCase();
		String otherPlatform = p.getName().toLowerCase();
		return thisPlatform.compareTo(otherPlatform);
	}
}
