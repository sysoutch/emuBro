package ch.sysout.gameexplorer.ui;

import java.awt.LayoutManager;
import java.awt.dnd.DropTargetListener;
import java.util.HashMap;
import java.util.Map;

import javax.swing.ImageIcon;
import javax.swing.JPanel;

import ch.sysout.util.ScreenSizeUtil;

public abstract class ViewPanel extends JPanel {
	private static final long serialVersionUID = 1L;

	public static final int BLANK_VIEW = GameViewConstants.BLANK_VIEW;
	public static final int LIST_VIEW = GameViewConstants.LIST_VIEW;
	public static final int TABLE_VIEW = GameViewConstants.TABLE_VIEW;
	public static final int COVER_VIEW = GameViewConstants.COVER_VIEW;

	private Map<Integer, ImageIcon> platformIcons = new HashMap<>();

	private Map<Integer, String> emulatorIconPaths = new HashMap<>();
	private Map<Integer, ImageIcon> emulatorIcons = new HashMap<>();

	private Map<Integer, String> gameIconPaths = new HashMap<>();
	private Map<Integer, ImageIcon> gameIcons = new HashMap<>();

	private Map<Integer, ImageIcon> platformCovers = new HashMap<>();

	// private BufferedImage bgImg;

	public ViewPanel() {
		super();
	}

	public ViewPanel(LayoutManager layout) {
		super(layout);
		// try {
		// bgImg = ImageIO.read(new File("D:\\files\\pics\\bla.png"));
		// } catch (IOException ex) {
		// ex.printStackTrace();
		// }
	}

	// @Override
	// protected void paintComponent(Graphics g) {
	// super.paintComponent(g);
	// if (bgImg != null) {
	// Graphics2D g2d = (Graphics2D) g.create();
	// g2d.setRenderingHint(RenderingHints.KEY_INTERPOLATION,
	// RenderingHints.VALUE_INTERPOLATION_BILINEAR);
	// g2d.setRenderingHint(RenderingHints.KEY_RENDERING,
	// RenderingHints.VALUE_RENDER_QUALITY);
	// g2d.setRenderingHint(RenderingHints.KEY_ANTIALIASING,
	// RenderingHints.VALUE_ANTIALIAS_ON);
	//
	// double scaleFactor = (double) bgImg.getWidth(null) / (double)
	// bgImg.getHeight(null);
	// int height = getHeight();
	// int width = (int) (height * scaleFactor);
	// if (width <= getWidth()) {
	// int x = 0;
	// int y = getHeight() / 2 - height / 2;
	// g2d.drawImage(bgImg, x, y, width, height, this);
	// // setSize(width, height);
	// } else {
	// int x = 0;
	// int y = (int) (getHeight() / 2 - ((getWidth() / scaleFactor) / 2));
	// g2d.drawImage(bgImg, x, y, getWidth(), (int) (getWidth() / scaleFactor),
	// this);
	// // setSize(getWidth(), (int) (getWidth() / scaleFactor));
	// }
	// g2d.dispose();
	// }
	// }

	void addPlatformIcon(int platformId, String iconFileName) {
		String iconFilePath = "/images/platforms/logos/" + iconFileName;
		if (!platformIcons.containsKey(platformId)) {
			int size = ScreenSizeUtil.adjustValueToResolution(16);
			ImageIcon ii = ImageUtil.getImageIconFrom(iconFilePath);
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

	void removeGameIcon(int gameId) {
		gameIcons.remove(gameId);
	}

	public ImageIcon getGameIcon(int gameId) {
		return gameIcons.get(gameId);
	}

	public ImageIcon getGameIcons(int gameId) {
		return gameIcons.get(gameId);
	}

	void addPlatformCover(int platformId, String coverFileName) {
		String coverFilePath = "/images/platforms/covers/" + coverFileName;
		if (!platformCovers.containsKey(platformId)) {
			int size = 200;

			ImageIcon ii = ImageUtil.getImageIconFrom(coverFilePath);
			int scaleOption = CoverConstants.SCALE_AUTO_OPTION;
			ImageIcon cover;
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

	public abstract void languageChanged();

	public abstract void addGameDragDropListener(DropTargetListener l);

	public abstract void groupByNone();

	public abstract void groupByPlatform();
}
