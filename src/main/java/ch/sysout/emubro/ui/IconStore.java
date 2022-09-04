package ch.sysout.emubro.ui;

import java.awt.Color;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import javax.swing.ImageIcon;

import com.google.gson.JsonElement;
import com.google.gson.JsonIOException;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.google.gson.JsonSyntaxException;
import com.google.gson.stream.JsonReader;

import ch.sysout.ui.util.ImageUtil;
import ch.sysout.util.ScreenSizeUtil;

public class IconStore {
	private static IconStore instance;

	private Theme currentTheme;

	private Map<Integer, ImageIcon> platformIcons = new HashMap<>();

	private Map<Integer, String> emulatorIconPaths = new HashMap<>();
	private Map<Integer, ImageIcon> emulatorIcons = new HashMap<>();

	private Map<Integer, String> gameIconPaths = new HashMap<>();
	private Map<Integer, String> gameCoverPaths = new HashMap<>();

	private Map<Integer, ImageIcon> gameIcons = new HashMap<>();
	private Map<Integer, ImageIcon> gameCovers = new HashMap<>();

	private Map<Integer, ImageIcon> platformCovers = new HashMap<>();

	private Map<Integer, Map<Integer, ImageIcon>> scaledPlatformCovers = new HashMap<>();
	private Map<Integer, Map<Integer, ImageIcon>> scaledGameCovers = new HashMap<>();

	private List<GameCoverListener> gameCoverListeners = new ArrayList<>();

	private String coverType = "2d";

	private IconStore() {
		// prevent instantiation of this class
	}

	public void loadDefaultTheme(String themeNameToLoad) throws IOException, JsonIOException, JsonSyntaxException {
		System.err.println(getResourceFiles("/themes/"));
		String themeDirectory = "themes/"+themeNameToLoad;
		File file = new File(getClass().getClassLoader().getResource(themeDirectory+"/theme.json").getFile());
		if (file.exists()) {
			Theme theme = new Theme(themeNameToLoad);
			Color backgroundColor = null;
			Color menuBarColor = null;
			Color viewColor = null;
			String viewImage = null;
			Color previewPaneColor = null;
			String previewPaneImage = null;
			try (JsonReader reader = new JsonReader(new InputStreamReader(new FileInputStream(file)))) {
				JsonObject json;
				json = JsonParser.parseReader(reader).getAsJsonObject();
				System.out.println(json);
				JsonElement colorElement = json.get("color");
				backgroundColor = (colorElement == null) ? Color.WHITE
						: Color.decode(colorElement.getAsString());
				JsonElement menuBar = json.get("menuBar");
				if (menuBar != null) {
					JsonObject jsonObject = menuBar.getAsJsonObject();
					menuBarColor = Color.decode(jsonObject.get("color").getAsString());
				}

				JsonElement view = json.get("view");
				if (view != null) {
					JsonObject jsonObject = view.getAsJsonObject();
					viewColor = Color.decode(jsonObject.get("color").getAsString());
					viewImage = jsonObject.get("image").getAsString();
				}

				JsonElement previewpane = json.get("previewpane");
				if (previewpane != null) {
					JsonObject jsonObject = previewpane.getAsJsonObject();
					previewPaneColor = Color.decode(jsonObject.get("color").getAsString());
					previewPaneImage = jsonObject.get("image").getAsString();
				}
			}
			if (menuBarColor == null) {
				menuBarColor = backgroundColor.darker();
			}
			if (viewColor == null) {
				viewColor = backgroundColor.brighter();
			}
			if (previewPaneColor == null) {
				previewPaneColor = backgroundColor;
			}
			Color buttonBarColor = backgroundColor;
			Color gameFilterPaneColor = backgroundColor;
			Color navigationColor = backgroundColor;
			Color detailsPaneColor = backgroundColor;
			Color tabsColor = backgroundColor.brighter();
			Color statusBarColor = backgroundColor.darker();
			theme.setBackground(ThemeFactory.createThemeBackground(backgroundColor));
			theme.setMenuBar(ThemeFactory.createThemeBackground(menuBarColor));
			theme.setButtonBar(ThemeFactory.createThemeBackground(buttonBarColor));
			theme.setGameFilterPane(ThemeFactory.createThemeBackground(gameFilterPaneColor));

			if (viewImage != null) {
				ThemeBackground themeBackGround = ThemeFactory.createThemeBackground(themeDirectory + File.separator + "images" + File.separator + viewImage);
				themeBackGround.setColor(viewColor);
				theme.setView(themeBackGround);
			} else {
				theme.setView(ThemeFactory.createThemeBackground(viewColor));
			}
			theme.setNavigationPane(ThemeFactory.createThemeBackground(navigationColor));
			theme.setDetailsPane(ThemeFactory.createThemeBackground(detailsPaneColor));
			theme.setTabs(ThemeFactory.createThemeBackground(tabsColor));
			if (previewPaneImage != null) {
				ThemeBackground themeBackGround = ThemeFactory.createThemeBackground(themeDirectory + File.separator + "images" + File.separator + previewPaneImage);
				themeBackGround.setColor(previewPaneColor);
				theme.setPreviewPane(themeBackGround);
			} else {
				theme.setPreviewPane(ThemeFactory.createThemeBackground(previewPaneColor));
			}
			theme.setStatusBar(ThemeFactory.createThemeBackground(statusBarColor));
			currentTheme = theme;
		}
	}

	public List<String> getDefaultThemes() throws IOException {
		return getResourceFiles("/themes/");
	}

	private List<String> getResourceFiles(String path) throws IOException {
		List<String> filenames = new ArrayList<>();
		try (InputStream in = getResourceAsStream(path);
				BufferedReader br = new BufferedReader(new InputStreamReader(in))) {
			String resource;
			while ((resource = br.readLine()) != null) {
				filenames.add(resource);
			}
		}
		return filenames;
	}

	private InputStream getResourceAsStream(String resource) {
		final InputStream in = getContextClassLoader().getResourceAsStream(resource);
		return in == null ? getClass().getResourceAsStream(resource) : in;
	}

	private ClassLoader getContextClassLoader() {
		return Thread.currentThread().getContextClassLoader();
	}

	public static final IconStore current() {
		return instance == null ? instance = new IconStore() : instance;
	}

	public void addPlatformCover(int platformId, String platformCoversDirectory) {
		addPlatformCover(platformId, platformCoversDirectory, "");
	}

	public void addPlatformCover(int platformId, String platformCoversDirectory, String coverFileName) {
		if (coverFileName == null || coverFileName.isEmpty()) {
			coverFileName = "front.jpg";
		}
		String coverFilePath = platformCoversDirectory + File.separator + coverType + File.separator + coverFileName;
		if (!platformCovers.containsKey(platformId)) {
			int size = ScreenSizeUtil.adjustValueToResolution(200);
			ImageIcon ii = ImageUtil.getImageIconFrom(coverFilePath, true);
			int scaleOption = CoverConstants.SCALE_AUTO_OPTION;
			ImageIcon cover = null;
			if (ii != null) {
				if (ii.getIconWidth() > size && ii.getIconWidth() >= ii.getIconHeight()) {
					scaleOption = CoverConstants.SCALE_WIDTH_OPTION;
				} else if (ii.getIconHeight() > size && ii.getIconWidth() < ii.getIconHeight()) {
					scaleOption = CoverConstants.SCALE_HEIGHT_OPTION;
				} else {
					cover = ii;
					platformCovers.put(platformId, cover);
					return;
				}
				cover = ImageUtil.scaleCover(ii, size, scaleOption);
			}
			platformCovers.put(platformId, cover);
		}
	}

	void removePlatformCover(int platformId) {
		platformCovers.remove(platformId);
	}

	public ImageIcon getPlatformIcon(int platformId) {
		return platformIcons.get(platformId);
	}

	public ImageIcon getPlatformCover(int platformId) {
		return platformCovers.get(platformId);
	}

	public ImageIcon getScaledPlatformCover(int platformId, int currentCoverSize) {
		ImageIcon icon = getPlatformCover(platformId);
		Map<Integer, ImageIcon> scaledIconMap = scaledPlatformCovers.get(platformId);
		if (scaledIconMap != null) {
			if (scaledIconMap.containsKey(currentCoverSize)) {
				icon = scaledIconMap.get(currentCoverSize);
			}
			else {
				int scaleOption = CoverConstants.SCALE_AUTO_OPTION;
				if (icon.getIconWidth() >= icon.getIconHeight()) {
					scaleOption = CoverConstants.SCALE_WIDTH_OPTION;
				} else if (icon.getIconWidth() < icon.getIconHeight()) {
					scaleOption = CoverConstants.SCALE_HEIGHT_OPTION;
				}
				icon = ImageUtil.scaleCover(icon, currentCoverSize, scaleOption);
				scaledIconMap.put(currentCoverSize, icon);
			}
		} else {
			if (icon == null) {
				return null;
			}
			Map<Integer, ImageIcon> newMap = new HashMap<>();
			int scaleOption = CoverConstants.SCALE_AUTO_OPTION;
			if (icon.getIconWidth() >= icon.getIconHeight()) {
				scaleOption = CoverConstants.SCALE_WIDTH_OPTION;
			} else if (icon.getIconWidth() < icon.getIconHeight()) {
				scaleOption = CoverConstants.SCALE_HEIGHT_OPTION;
			}
			icon = ImageUtil.scaleCover(icon, currentCoverSize, scaleOption);
			newMap.put(currentCoverSize, icon);
			scaledPlatformCovers.put(platformId, newMap);
		}
		return icon;
	}

	public void addPlatformIcon(int id, String platformsDirectory) {
		addPlatformIcon(id, platformsDirectory, "");
	}

	public void addPlatformIcon(int platformId, String currentPlatformLogosDirectory, String iconFileName) {
		if (iconFileName == null || iconFileName.isEmpty()) {
			iconFileName = "default.png";
		}
		if (!platformIcons.containsKey(platformId)) {
			int size = ScreenSizeUtil.adjustValueToResolution(24);
			String iconFilePath = currentPlatformLogosDirectory + File.separator + iconFileName;
			ImageIcon ii = ImageUtil.getImageIconFrom(iconFilePath, true);
			ImageIcon ico = ImageUtil.scaleCover(ii, size, CoverConstants.SCALE_WIDTH_OPTION);
			platformIcons.put(platformId, ico);
		}
	}

	void removePlatformIcon(int platformId) {
		platformIcons.remove(platformId);
	}

	public void addEmulatorIconPath(int emulatorId, String iconPath) {
		if (!emulatorIconPaths.containsKey(emulatorId)) {
			emulatorIconPaths.put(emulatorId, iconPath);
		}
	}

	void removeEmulatorIcon(int emulatorId) {
		emulatorIcons.remove(emulatorId);
	}

	public ImageIcon getEmulatorIcon(int emulatorId) {
		if (emulatorIconPaths.containsKey(emulatorId) && !emulatorIcons.containsKey(emulatorId)) {
			String iconFilePath = emulatorIconPaths.get(emulatorId);
			ImageIcon ico = ImageUtil.getImageIconFrom(iconFilePath, true);
			emulatorIcons.put(emulatorId, ico);
		}
		return emulatorIcons.get(emulatorId);
	}

	public void addGameIconPath(int gameId, String iconPath) {
		if (iconPath == null || iconPath.trim().isEmpty()) {
			return;
		}
		if (!gameIconPaths.containsKey(gameId)) {
			gameIconPaths.put(gameId, iconPath);
			String iconFilePath = gameIconPaths.get(gameId);
			ImageIcon ico = ImageUtil.getImageIconFrom(iconFilePath, true);
			gameIcons.put(gameId, ico);
		}
	}

	public void removeGameIconPath(int gameId) {
		gameIcons.remove(gameId);
	}

	public ImageIcon getGameIcon(int gameId) {
		return gameIcons.get(gameId);
	}

	public ImageIcon getGameIcons(int gameId) {
		return gameIcons.get(gameId);
	}

	public void addGameCoverPath(int gameId, String coverPath) {
		if (coverPath == null || coverPath.trim().isEmpty()) {
			return;
		}
		if (!gameCoverPaths.containsKey(gameId)) {
			gameCoverPaths.put(gameId, coverPath);
		}
	}

	public ImageIcon getGameCover(int gameId) {
		if (!gameCovers.containsKey(gameId)) {
			if (!gameCoverPaths.containsKey(gameId)) {
				return null;
			}
			String coverFilePath = gameCoverPaths.get(gameId);
			ImageIcon ico = ImageUtil.getImageIconFrom(coverFilePath, true);
			gameCovers.put(gameId, ico);
		}
		return gameCovers.get(gameId);
	}

	public ImageIcon getScaledGameCover(int gameId, int currentCoverSize) {
		ImageIcon gameCover = getGameCover(gameId);
		Map<Integer, ImageIcon> scaledIconMap = scaledGameCovers.get(gameId);
		if (scaledIconMap != null) {
			if (scaledIconMap.containsKey(currentCoverSize)) {
				gameCover = scaledIconMap.get(currentCoverSize);
			}
			else {
				int scaleOption = CoverConstants.SCALE_AUTO_OPTION;
				if (gameCover.getIconWidth() >= gameCover.getIconHeight()) {
					scaleOption = CoverConstants.SCALE_WIDTH_OPTION;
				} else if (gameCover.getIconWidth() < gameCover.getIconHeight()) {
					scaleOption = CoverConstants.SCALE_HEIGHT_OPTION;
				}
				gameCover = ImageUtil.scaleCover(gameCover, currentCoverSize, scaleOption);
				scaledIconMap.put(currentCoverSize, gameCover);
			}
		} else {
			if (gameCover == null) {
				return null;
			}
			Map<Integer, ImageIcon> newMap = new HashMap<>();
			int scaleOption = CoverConstants.SCALE_AUTO_OPTION;
			if (gameCover.getIconWidth() >= gameCover.getIconHeight()) {
				scaleOption = CoverConstants.SCALE_WIDTH_OPTION;
			} else if (gameCover.getIconWidth() < gameCover.getIconHeight()) {
				scaleOption = CoverConstants.SCALE_HEIGHT_OPTION;
			}
			gameCover = ImageUtil.scaleCover(gameCover, currentCoverSize, scaleOption);
			newMap.put(currentCoverSize, gameCover);
			scaledGameCovers.put(gameId, newMap);
		}
		return gameCover;
	}

	public void addGameCoverListener(GameCoverListener l) {
		gameCoverListeners.add(l);
	}

	public Theme getCurrentTheme() {
		return currentTheme;
	}

	public void setCurrentTheme(String theme) {
		currentTheme = new Theme(theme);
	}
}
