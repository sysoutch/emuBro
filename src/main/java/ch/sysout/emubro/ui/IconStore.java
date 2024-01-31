package ch.sysout.emubro.ui;

import java.awt.Color;
import java.awt.image.BufferedImage;
import java.io.*;
import java.net.JarURLConnection;
import java.net.URI;
import java.net.URL;
import java.nio.file.FileSystem;
import java.nio.file.FileSystems;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;
import java.util.jar.JarEntry;
import java.util.jar.JarFile;
import java.util.stream.Stream;

import javax.swing.ImageIcon;

import ch.sysout.emubro.util.EmuBroUtil;
import com.google.gson.JsonElement;
import com.google.gson.JsonIOException;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.google.gson.JsonSyntaxException;
import com.google.gson.stream.JsonReader;

import ch.sysout.ui.util.ImageUtil;
import ch.sysout.util.ScreenSizeUtil;

public class IconStore {
	public class TransparencyObjects {
		private List<TransparencyObject> objects = new ArrayList<>();

		public void addObject(TransparencyObject obj) {
			objects.add(obj);
		}

		public boolean hasObjectWithValue(int value) {
			for (TransparencyObject obj : objects) {
				if (obj.getValue() == value) {
					return true;
				}
			}
			return false;
		}

		public List<TransparencyObject> getObjects() {
			return objects;
		}

		public ImageIcon getIcoOfSize(int value) {
			for (TransparencyObject obj : objects) {
				if (obj.getValue() == value) {
					return obj.getIco();
				}
			}
			return null;
		}
	}

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

	private int currentGameCoverTransparencyValue = 90; // 0 - 255

	private Map<Integer, TransparencyObjects> transparentGameCovers = new HashMap<>();
	private Map<Integer, TransparencyObjects> transparentPlatformCovers = new HashMap<>();

	private IconStore() {
		// prevent instantiation of this class
	}

	public void loadDefaultTheme(String themeDirectory, String themeNameToLoad) throws IOException, JsonIOException, JsonSyntaxException {
		//System.err.println(getResourceFiles("/themes/"));
		String themeDirectory2 = themeDirectory + "/" + themeNameToLoad;
		InputStream in = new FileInputStream(themeDirectory2 + "/theme.json");
		Theme theme = new Theme(themeNameToLoad);
		Color backgroundColor = null;
		Color menuBarColor = null;
		Color viewColor = null;
		String viewImage = null;
		Color previewPaneColor = null;
		String previewPaneImage = null;
		try (JsonReader jsonReader = new JsonReader(new InputStreamReader(in))) {
			JsonObject json;
			json = JsonParser.parseReader(jsonReader).getAsJsonObject();
			System.out.println(json);
			JsonElement colorElement = null;
			if (json.has("color")) {
				colorElement = json.get("color");
			}
			backgroundColor = (colorElement == null) ? Color.WHITE : Color.decode(colorElement.getAsString());
			JsonElement menuBar = json.get("menuBar");
			if (menuBar != null) {
				JsonObject jsonObject = menuBar.getAsJsonObject();
				if (jsonObject.has("color")) {
					menuBarColor = Color.decode(jsonObject.get("color").getAsString());
				}
			}
			JsonElement view = json.get("view");
			if (view != null) {
				JsonObject jsonObject = view.getAsJsonObject();
				if (jsonObject.has("color")) {
					viewColor = Color.decode(jsonObject.get("color").getAsString());
				}
				if (jsonObject.has("image")) {
					viewImage = jsonObject.get("image").getAsString();
				}
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
			ThemeBackground themeBackGround = ThemeFactory
					.createThemeBackground(themeDirectory2 + File.separator + "images" + File.separator + viewImage);
			themeBackGround.setColor(viewColor);
			theme.setView(themeBackGround);
		} else {
			theme.setView(ThemeFactory.createThemeBackground(viewColor));
		}
		theme.setNavigationPane(ThemeFactory.createThemeBackground(navigationColor));
		theme.setDetailsPane(ThemeFactory.createThemeBackground(detailsPaneColor));
		theme.setTabs(ThemeFactory.createThemeBackground(tabsColor));
		if (previewPaneImage != null) {
			ThemeBackground themeBackGround = ThemeFactory.createThemeBackground(
					themeDirectory2 + File.separator + "images" + File.separator + previewPaneImage);
			themeBackGround.setColor(previewPaneColor);
			theme.setPreviewPane(themeBackGround);
		} else {
			theme.setPreviewPane(ThemeFactory.createThemeBackground(previewPaneColor));
		}
		theme.setStatusBar(ThemeFactory.createThemeBackground(statusBarColor));
		currentTheme = theme;
	}

	public String[] getDefaultThemes() throws IOException {
		File themeDirectory = new File(EmuBroUtil.getResourceDirectory() + "/themes/");
		return themeDirectory.list(new FilenameFilter() {
			@Override
			public boolean accept(File current, String name) {
				return new File(current, name).isDirectory();
			}
		});
	}

	public static final IconStore current() {
		return instance == null ? instance = new IconStore() : instance;
	}

	public void addPlatformCover(int platformId, String platformCoversDirectory) {
		addPlatformCover(platformId, platformCoversDirectory, "");
	}

	public void addPlatformCover(int platformId, String platformCoversDirectory, String coverFileName) {
		if (coverFileName == null || coverFileName.isEmpty()) {
			coverFileName = "default.jpg";
		}
		// String coverFilePath = platformCoversDirectory + File.separator + coverType +
		// File.separator + coverFileName;
		String coverFilePath = platformCoversDirectory + File.separator + coverFileName;
		if (!platformCovers.containsKey(platformId)) {
			int size = ScreenSizeUtil.adjustValueToResolution(200);
			ImageIcon ii = ImageUtil.getImageIconFrom(coverFilePath);
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
				cover = ImageUtil.get3dVersionOf(cover, platformId);
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
		return getTransparentPlatformCover(platformId, 1);
	}

	public ImageIcon getScaledTransparentPlatformCover(int platformId, int coverSize, int transparencyValue) {
		ImageIcon cover = getScaledPlatformCover(platformId, coverSize);
		return getTransparentPlatformCoverFrom(cover, platformId, transparencyValue);
	}

	public ImageIcon getTransparentPlatformCover(int platformId, int transparencyValue) {
		ImageIcon cover = platformCovers.get(platformId);
		if (transparencyValue == 1) {
			return cover;
		}
		return getTransparentPlatformCoverFrom(cover, platformId, transparencyValue);
	}

	private ImageIcon getTransparentPlatformCoverFrom(ImageIcon cover, int platformId, int transparencyValue) {
		ImageIcon transparentCover = null;
		if (cover != null) {
			BufferedImage bi = ImageUtil.createTransparentImageFrom(cover.getImage(),
					currentGameCoverTransparencyValue);
			if (bi != null) {
				transparentCover = new ImageIcon(bi);
				if (!transparentPlatformCovers.containsKey(platformId)) {
					transparentPlatformCovers.put(platformId, new TransparencyObjects());
					transparentCover = doTransparentThingsWithPlatformCover(platformId, transparentCover);
				} else {
					if (hasPlatformCoverOfThisTransparencyValue(platformId, currentGameCoverTransparencyValue)) {
						transparentCover = transparentPlatformCovers.get(platformId)
								.getIcoOfSize(currentGameCoverTransparencyValue);
					} else {
						transparentCover = doTransparentThingsWithPlatformCover(platformId, cover);
					}
				}
			}
		}
		return transparentCover;
	}

	public ImageIcon getScaledPlatformCover(int platformId, int currentCoverSize) {
		ImageIcon icon = getPlatformCover(platformId);
		Map<Integer, ImageIcon> scaledIconMap = scaledPlatformCovers.get(platformId);
		if (scaledIconMap != null) {
			if (scaledIconMap.containsKey(currentCoverSize)) {
				icon = scaledIconMap.get(currentCoverSize);
			} else {
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
			String iconFilePath = currentPlatformLogosDirectory + "/" + iconFileName;
			System.err.println("icon file path: " +iconFilePath);
			ImageIcon ii = ImageUtil.getImageIconFrom(iconFilePath);
			System.err.println("ii null? " + (ii == null));
			if (ii != null) {
				ImageIcon ico = ImageUtil.scaleCover(ii, size, CoverConstants.SCALE_WIDTH_OPTION);
				platformIcons.put(platformId, ico);
			} else {
				platformIcons.put(platformId, null);
			}
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
			ImageIcon ico = ImageUtil.getImageIconFrom(iconFilePath);
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

	public void setGameCoverTransparencyValue(int value) {
		currentGameCoverTransparencyValue = value;
	}

	public ImageIcon getGameCover(int gameId) {
		return getTransparentGameCover(gameId, 1);
	}

	public ImageIcon getTransparentGameCover(int gameId, int transparencyValue) {
		if (!gameCovers.containsKey(gameId)) {
			if (!gameCoverPaths.containsKey(gameId)) {
				return null;
			}
			String coverFilePath = gameCoverPaths.get(gameId);
			ImageIcon ico = ImageUtil.getImageIconFrom(coverFilePath, true);
			gameCovers.put(gameId, ico);
		}
		ImageIcon gameCover = gameCovers.get(gameId);
		if (transparencyValue == 1) {
			return gameCover;
		}
		ImageIcon transparentCover = doTransparentThingsWithGameCover(gameId, gameCover);
		if (gameCover != null) {
			BufferedImage bi = ImageUtil.createTransparentImageFrom(gameCover.getImage(),
					currentGameCoverTransparencyValue);
			transparentCover = new ImageIcon(bi);
			if (!transparentGameCovers.containsKey(gameId)) {
				transparentGameCovers.put(gameId, new TransparencyObjects());
				transparentCover = doTransparentThingsWithGameCover(gameId, transparentCover);
			} else {
				if (hasGameCoverOfThisTransparencyValue(gameId, currentGameCoverTransparencyValue)) {
					transparentCover = transparentGameCovers.get(gameId)
							.getIcoOfSize(currentGameCoverTransparencyValue);
				} else {
					transparentCover = doTransparentThingsWithGameCover(gameId, gameCover);
				}
			}
		}
		return transparentCover;
	}

	private ImageIcon doTransparentThingsWithGameCover(int gameId, ImageIcon ico) {
		BufferedImage bi = ImageUtil.createTransparentImageFrom(ico.getImage(), currentGameCoverTransparencyValue);
		ImageIcon ico2 = new ImageIcon(bi);
		TransparencyObject transparencyObject = new TransparencyObject(currentGameCoverTransparencyValue, ico2);
		transparentGameCovers.get(gameId).addObject(transparencyObject);
		// transparentGameCovers.put(gameId, trans)
		return ico2;
	}

	private ImageIcon doTransparentThingsWithPlatformCover(int platformId, ImageIcon ico) {
		BufferedImage bi = ImageUtil.createTransparentImageFrom(ico.getImage(), currentGameCoverTransparencyValue);
		ImageIcon ico2 = new ImageIcon(bi);
		TransparencyObject transparencyObject = new TransparencyObject(currentGameCoverTransparencyValue, ico2);
		transparentPlatformCovers.get(platformId).addObject(transparencyObject);
		// transparentPlatformCovers.put(platformId, trans)
		return ico2;
	}

	private boolean hasGameCoverOfThisTransparencyValue(int gameId, int currentGameCoverTransparencyValue) {
		return transparentGameCovers.get(gameId).hasObjectWithValue(currentGameCoverTransparencyValue);
	}

	private boolean hasPlatformCoverOfThisTransparencyValue(int platformId, int currentGameCoverTransparencyValue) {
		return transparentPlatformCovers.get(platformId).hasObjectWithValue(currentGameCoverTransparencyValue);
	}

	public ImageIcon getScaledGameCover(int gameId, int currentCoverSize) {
		ImageIcon gameCover = getGameCover(gameId);
		Map<Integer, ImageIcon> scaledIconMap = scaledGameCovers.get(gameId);
		if (scaledIconMap != null) {
			if (scaledIconMap.containsKey(currentCoverSize)) {
				gameCover = scaledIconMap.get(currentCoverSize);
			} else {
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

	public class TransparencyObject {
		private int value;
		private ImageIcon ico;

		public TransparencyObject(int value, ImageIcon ico) {
			this.value = value;
			this.ico = ico;
		}

		public int getValue() {
			return value;
		}

		public ImageIcon getIco() {
			return ico;
		}
	}
}
