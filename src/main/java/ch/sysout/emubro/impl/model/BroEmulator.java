package ch.sysout.emubro.impl.model;

import java.io.File;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import org.apache.commons.io.FilenameUtils;

import ch.sysout.emubro.api.model.Emulator;
import ch.sysout.util.ValidationUtil;

public class BroEmulator implements Emulator {
	private int id;
	private String name;
	private String shortName;
	private String path;
	private String iconFilename;
	private String configFilePath;
	private String website;
	private String startParameters;
	private List<String> supportedFileTypes;
	private String searchString;
	private String setupFileMatch;
	private boolean autoSearchEnabled = true;

	public BroEmulator(int id, String name, String shortName, String path, String iconFilename, String configFilePath, String website,
			String startParameters, String[] supportedFileTypes, String searchString, String setupFileMatch, boolean autoSearchEnabled) {
		ValidationUtil.checkNullOrEmpty(name, "name");
		this.id = id;
		this.name = name;
		this.shortName = shortName;
		this.path = (path == null) ? "" : path;
		this.iconFilename = (iconFilename == null) ? "" : iconFilename;
		this.configFilePath = (configFilePath == null) ? "" : configFilePath;
		this.website = (website == null) ? "" : website;
		this.startParameters = (startParameters == null) ? "" : startParameters;
		this.supportedFileTypes = new ArrayList<>(Arrays.asList(supportedFileTypes));
		this.searchString = (searchString == null) ? "" : searchString;
		this.setupFileMatch = (setupFileMatch == null) ? "" : setupFileMatch;
		this.autoSearchEnabled = autoSearchEnabled;
	}

	public BroEmulator(int id, String name, String shortName, String path, String iconFilename, String configFilePath, String website,
			String startParameters, List<String> supportedFileTypes, String searchString, String setupFileMatch, boolean autoSearchEnabled) {
		ValidationUtil.checkNullOrEmpty(name, "name");
		ValidationUtil.checkNullOrEmpty(name, "shortName");
		ValidationUtil.checkNull(iconFilename, "iconFilename");
		ValidationUtil.checkNull(configFilePath, "configFilePath");
		ValidationUtil.checkNull(website, "website");
		ValidationUtil.checkNull(startParameters, "startParameters");
		this.id = id;
		this.name = name;
		this.shortName = shortName;
		this.path = (path == null) ? "" : path;
		this.iconFilename = (iconFilename == null) ? "" : iconFilename;
		this.configFilePath = (configFilePath == null) ? "" : configFilePath;
		this.website = (website == null) ? "" : website;
		this.startParameters = (startParameters == null) ? "" : startParameters;
		this.supportedFileTypes = new ArrayList<>(supportedFileTypes);
		this.searchString = (searchString == null) ? "" : searchString;
		this.setupFileMatch = (setupFileMatch == null) ? "" : setupFileMatch;
		this.autoSearchEnabled = autoSearchEnabled;
	}

	public BroEmulator(BroEmulator e) {
		id = e.id;
		name = e.name;
		shortName = e.shortName;
		path = e.path;
		iconFilename = e.getIconFilename();
		configFilePath = e.getConfigFilePath();
		website = e.website;
		startParameters = e.getStartParameters();
		supportedFileTypes = e.supportedFileTypes;
		searchString = e.searchString;
	}

	@Override
	public int getId() {
		return id;
	}

	@Override
	public void setId(int id) {
		this.id = id;
	}

	@Override
	public String getName() {
		return name;
	}

	@Override
	public String getShortName() {
		return shortName;
	}

	public void setName(String name) {
		ValidationUtil.checkNullOrEmpty(name, "name");
		this.name = name;
	}

	@Override
	public String getPath() {
		return path;
	}

	@Override
	public String getParentFolder() {
		String tempPath = FilenameUtils.getFullPath(path);
		String[] folderNames = tempPath.split((File.separator.equals("\\")) ? "\\\\" : File.separator);
		return folderNames[folderNames.length - 1];
	}

	public void setPath(String path) {
		ValidationUtil.checkNull(path, "path");
		this.path = path;
	}

	@Override
	public String getIconFilename() {
		return iconFilename;
	}

	@Override
	public String getConfigFilePath() {
		return configFilePath;
	}

	public void setConfigFilePath(String configFilePath) {
		ValidationUtil.checkNull(configFilePath, "configFilePath");
		this.configFilePath = configFilePath;
	}

	@Override
	public String getWebsite() {
		return website;
	}

	public void setWebsite(String website) {
		ValidationUtil.checkNull(website, "website");
		this.website = website;
	}

	@Override
	public String getStartParameters() {
		return startParameters;
	}

	public void setStartParameters(String startParameters) {
		ValidationUtil.checkNull(startParameters, "startParameters");
		this.startParameters = startParameters;
	}

	@Override
	public String getSearchString() {
		return searchString;
	}

	@Override
	public String getSetupFileMatch() {
		return setupFileMatch;
	}

	public void setSearchString(String searchString) {
		ValidationUtil.checkNull(searchString, "searchString");
		this.searchString = searchString;
	}

	@Override
	public List<String> getSupportedFileTypes() {
		return supportedFileTypes;
	}

	public boolean isSupportedFileType(String path) {
		String[] s = path.split("\\.");
		String type = "." + s[s.length - 1];
		return supportedFileTypes.contains(type);
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
	public boolean isInstalled() {
		return path != null && !path.trim().isEmpty();
	}

	@Override
	public String toString() {
		String postFix = (path == null || path.trim().isEmpty()) ? " (" + website + ")" : " (" + path + ")";
		return "<html><strong>" + name + "</strong>" + postFix + "</html>";
	}

	@Override
	public int compareTo(Emulator e) {
		String thisEmulator = getName().toLowerCase();
		String otherEmulator = e.getName().toLowerCase();
		return thisEmulator.compareTo(otherEmulator);
	}
}
