package ch.sysout.emubro.ui;

import java.awt.image.BufferedImage;
import java.io.File;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import javax.swing.ImageIcon;

import ch.sysout.util.ImageUtil;
import ch.sysout.util.ScreenSizeUtil;

public class IconStore {
	private static IconStore instance;

	private BufferedImage imgButtonBarBackground;
	private BufferedImage imgTransparentOverlay;
	private BufferedImage imgNavigationBackground;
	private BufferedImage imgBackground;
	private BufferedImage imgPreviewPaneBackground;

	private String lightTheme = "light";
	private String darkTheme = "dark";

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

	private String coverType2d = "2d";


	private IconStore() {
		// prevent instantiation of this class
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
		String separator = File.separator;
		String coverFilePath = platformCoversDirectory + separator + coverType2d + separator + coverFileName;
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
			int size = ScreenSizeUtil.adjustValueToResolution(16);
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
		ImageIcon icon = getGameCover(gameId);
		Map<Integer, ImageIcon> scaledIconMap = scaledGameCovers.get(gameId);
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
			scaledGameCovers.put(gameId, newMap);
		}
		return icon;
	}

	public void addGameCoverListener(GameCoverListener l) {
		gameCoverListeners.add(l);
	}

	public BufferedImage getButtonBarBackgroundImage() {
		if (imgButtonBarBackground == null) {
			imgButtonBarBackground = ImageUtil.getBufferedImageFrom("/images/themes/"+darkTheme+"/buttonbar.jpg");
		}
		return imgButtonBarBackground;
	}

	public BufferedImage getNavigationBackgroundImage() {
		if (imgNavigationBackground == null) {
			imgNavigationBackground = ImageUtil.getBufferedImageFrom("/images/themes/"+darkTheme+"/nav.jpg");
		}
		return imgNavigationBackground;
	}

	public BufferedImage getBackgroundImage() {
		if (imgBackground == null) {
			imgBackground = ImageUtil.getBufferedImageFrom("/images/themes/"+darkTheme+"/bg-only.jpg");
		}
		return imgBackground;
	}

	public BufferedImage getTransparentBackgroundOverlayImage() {
		if (imgTransparentOverlay == null) {
			imgTransparentOverlay = ImageUtil.getBufferedImageFrom("/images/themes/logo-transparent.png");
		}
		return imgTransparentOverlay;
	}

	public BufferedImage getPreviewPaneBackgroundImage() {
		if (imgPreviewPaneBackground == null) {
			imgPreviewPaneBackground = ImageUtil.getBufferedImageFrom("/images/themes/"+darkTheme+"/bg-only.jpg");
		}
		return imgPreviewPaneBackground;
	}
}
