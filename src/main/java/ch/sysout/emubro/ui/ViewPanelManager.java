package ch.sysout.emubro.ui;

import java.awt.dnd.DropTargetListener;
import java.awt.event.ActionListener;
import java.awt.event.MouseListener;
import java.awt.event.MouseWheelListener;
import java.io.File;
import java.util.ArrayList;
import java.util.List;

import javax.swing.Action;
import javax.swing.ImageIcon;
import javax.swing.JPanel;

import ch.sysout.emubro.api.event.GameAddedEvent;
import ch.sysout.emubro.api.event.GameRemovedEvent;
import ch.sysout.emubro.api.model.Emulator;
import ch.sysout.emubro.api.model.Game;
import ch.sysout.emubro.api.model.Platform;
import ch.sysout.emubro.api.model.PlatformComparator;
import ch.sysout.emubro.controller.GameSelectionListener;
import ch.sysout.emubro.impl.event.NavigationEvent;
import ch.sysout.emubro.impl.model.BroEmulator;
import ch.sysout.emubro.impl.model.GameConstants;
import ch.sysout.util.ScreenSizeUtil;

public class ViewPanelManager implements GameCoverListener {
	List<ViewPanel> panels = new ArrayList<>();
	private IconStore iconStore;
	private List<Platform> platforms;
	private int sortOrder;
	private int sortBy;
	private PlatformComparator platformComparator;
	private int fontSize;

	private ViewPanel currentViewPanel = new BlankViewPanel();
	private int selectedGameId = GameConstants.NO_GAME;

	private List<GameSelectionListener> selectGameListeners = new ArrayList<>();
	private List<Action> runGameListeners1 = new ArrayList<>();
	private List<MouseListener> runGameListeners2 = new ArrayList<>();
	private List<Action> renameGameListeners = new ArrayList<>();
	private List<Action> removeGameListeners = new ArrayList<>();
	private List<Action> increaseFontListeners = new ArrayList<>();
	private List<MouseWheelListener> increaseFontListeners2 = new ArrayList<>();
	private List<Action> decreaseFontListeners = new ArrayList<>();
	private List<ActionListener> openGamePropertiesListeners = new ArrayList<>();
	private List<ActionListener> addGameOrEmulatorFromClipboardListeners = new ArrayList<>();
	private List<ActionListener> openGameFolderListeners = new ArrayList<>();
	private List<MouseListener> openGameFolderListeners1 = new ArrayList<>();
	private List<RateListener> rateListeners = new ArrayList<>();
	private List<DropTargetListener> gameDragDropListeners = new ArrayList<>();
	private int currentNavView = NavigationPanel.ALL_GAMES;
	private boolean touchScreenScrollEnabled;
	private int viewStyle;
	private boolean hideExtensions;
	private int currentCoverSize = ScreenSizeUtil.adjustValueToResolution(CoverConstants.LARGE_COVERS);
	private List<String> unmountedDriveLetters = new ArrayList<>();

	public ViewPanelManager(IconStore iconStore) {
		this.iconStore = iconStore;
		iconStore.addGameCoverListener(this);
	}

	public void initGames(List<Game> games) {
		for (Game game : games) {
			if (game != null) {
				if (game.hasIcon()) {
					iconStore.addGameIconPath(game.getId(), game.getIconPath());
				}
				if (game.hasCover()) {
					iconStore.addGameCoverPath(game.getId(), game.getCoverPath());
				}
			}
		}
	}

	public void initPlatforms(List<Platform> platforms) {
		this.platforms = platforms;
		for (Platform p : platforms) {
			initEmulatorIcons(p.getEmulators());
			iconStore.addPlatformIcon(p.getId(), p.getIconFileName());
		}
		initPlatformCovers(platforms);
	}

	private void initPlatformCovers(List<Platform> platforms) {
		for (Platform p : platforms) {
			String defaultGameCover = p.getDefaultGameCover();
			int platformId = p.getId();
			iconStore.addPlatformCover(platformId, defaultGameCover);
		}
	}

	private void initEmulatorIcons(List<BroEmulator> list) {
		String emuBroCoverHome = System.getProperty("user.home") + File.separator + ".emubro" + File.separator
				+ "emulators";
		for (Emulator e : list) {
			String coverPath = emuBroCoverHome + File.separator + e.getId() + ".png";
			iconStore.addEmulatorIconPath(e.getId(), coverPath);
		}
	}

	public void initializeViewPanel(ViewPanel pnlView, List<Game> games) {
		panels.add(pnlView);
		pnlView.initGameList(games, currentNavView);
		pnlView.setViewStyle(viewStyle);
		pnlView.sortBy(sortBy, platformComparator);
		pnlView.sortOrder(sortOrder);
		pnlView.setFontSize(fontSize);
		pnlView.setTouchScreenScrollEnabled(touchScreenScrollEnabled);
		addListenersToViewPanel(pnlView);
	}

	private void addListenersToViewPanel(ViewPanel pnlView) {
		for (GameSelectionListener l : selectGameListeners) {
			pnlView.addSelectGameListener(l);
		}
		for (MouseListener l : runGameListeners2) {
			pnlView.addRunGameListener(l);
		}
		for (Action l : runGameListeners1) {
			pnlView.addRunGameListener(l);
		}
		for (Action l : renameGameListeners) {
			pnlView.addRenameGameListener(l);
		}
		for (Action l : removeGameListeners) {
			pnlView.addRemoveGameListener(l);
		}
		for (MouseWheelListener l : increaseFontListeners2) {
			pnlView.addIncreaseFontListener2(l);
		}
		for (MouseListener l : openGameFolderListeners1) {
			pnlView.addOpenGameFolderListener1(l);
		}
		for (RateListener l : rateListeners) {
			pnlView.addRateListener(l);
		}
		for (DropTargetListener l : gameDragDropListeners) {
			pnlView.addGameDragDropListener(l);
		}
	}

	public void sortBy(int sortBy, PlatformComparator platformComparator) {
		this.sortBy = sortBy;
		this.platformComparator = platformComparator;
		for (ViewPanel pnl : panels) {
			if (pnl != null) {
				pnl.sortBy(sortBy, platformComparator);
			}
		}
	}

	public void sortOrder(int sortOrder) {
		this.sortOrder = sortOrder;
		for (ViewPanel pnl : panels) {
			if (pnl != null) {
				pnl.sortOrder(sortOrder);
			}
		}
	}

	public int getFontSize() {
		return fontSize;
	}

	public void setFontSize(int fontSize) {
		this.fontSize = fontSize;
		for (ViewPanel pnl : panels) {
			if (pnl != null) {
				pnl.setFontSize(fontSize);
			}
		}
	}

	public void addSelectGameListener(GameSelectionListener l) {
		selectGameListeners.add(l);
		for (ViewPanel pnl : panels) {
			if (pnl != null) {
				pnl.addSelectGameListener(l);
			}
		}
	}

	public void addRunGameListener(Action l) {
		runGameListeners1.add(l);
		for (ViewPanel pnl : panels) {
			if (pnl != null) {
				pnl.addRunGameListener(l);
			}
		}
	}

	public void addRunGameListener(MouseListener l) {
		runGameListeners2.add(l);
		for (ViewPanel pnl : panels) {
			if (pnl != null) {
				pnl.addRunGameListener(l);
			}
		}
	}

	public void addRemoveGameListener(Action l) {
		removeGameListeners.add(l);
		for (ViewPanel pnl : panels) {
			if (pnl != null) {
				pnl.addRemoveGameListener(l);
			}
		}
	}

	public void addIncreaseFontListener(Action l) {
		increaseFontListeners.add(l);
		for (ViewPanel pnl : panels) {
			if (pnl != null) {
				pnl.addIncreaseFontListener(l);
			}
		}
	}

	public void addIncreaseFontListener2(MouseWheelListener l) {
		increaseFontListeners2.add(l);
		for (ViewPanel pnl : panels) {
			if (pnl != null) {
				pnl.addIncreaseFontListener2(l);
			}
		}
	}

	public void addDecreaseFontListener(Action l) {
		decreaseFontListeners.add(l);
		for (ViewPanel pnl : panels) {
			if (pnl != null) {
				pnl.addDecreaseFontListener(l);
			}
		}
	}

	public void addOpenGameFolderListener1(MouseListener l) {
		openGameFolderListeners1.add(l);
		for (ViewPanel pnl : panels) {
			if (pnl != null) {
				pnl.addOpenGameFolderListener1(l);
			}
		}
	}

	public void addRateListener(RateListener l) {
		rateListeners.add(l);
		for (ViewPanel pnl : panels) {
			if (pnl != null) {
				pnl.addRateListener(l);
			}
		}
	}

	public void navigationChanged(NavigationEvent e) {
		currentNavView = e.getView();
		for (ViewPanel pnl : panels) {
			if (pnl != null) {
				pnl.navigationChanged(e);
			}
		}
	}

	public void inreaseFontSize() {
		for (ViewPanel pnl : panels) {
			if (pnl != null) {
				pnl.increaseFontSize();
			}
		}
	}

	public void decreaseFontSize() {
		for (ViewPanel pnl : panels) {
			if (pnl != null) {
				pnl.decreaseFontSize();
			}
		}
	}

	public void pinColumnWidthSliderPanel(JPanel pnlColumnWidthSlider) {
		currentViewPanel.pinColumnWidthSliderPanel(pnlColumnWidthSlider);
	}

	public void unpinColumnWidthSliderPanel(JPanel pnlColumnWidthSlider) {
		currentViewPanel.unpinColumnWidthSliderPanel(pnlColumnWidthSlider);
	}

	public void pinRowHeightSliderPanel(JPanel pnlRowHeightSlider) {
		currentViewPanel.pinRowHeightSliderPanel(pnlRowHeightSlider);
	}

	public void unpinRowHeightSliderPanel(JPanel pnlRowHeightSlider) {
		currentViewPanel.unpinRowHeightSliderPanel(pnlRowHeightSlider);
	}

	public ViewPanel getCurrentViewPanel() {
		return currentViewPanel;
	}

	public void setCurrentViewPanel(ViewPanel currentViewPanel) {
		this.currentViewPanel = currentViewPanel;
	}

	public void addGameDragDropListener(DropTargetListener l) {
		gameDragDropListeners.add(l);
		for (ViewPanel pnl : panels) {
			if (pnl != null) {
				pnl.addGameDragDropListener(l);
			}
		}
	}

	public void gameRated(Game game) {
		for (ViewPanel pnl : panels) {
			if (pnl != null) {
				pnl.gameRated(game);
			}
		}
	}

	public void hideExtensions(boolean hideExtensions) {
		this.hideExtensions = hideExtensions;
		for (ViewPanel pnl : panels) {
			if (pnl != null) {
				pnl.hideExtensions(hideExtensions);
			}
		}
	}

	public IconStore getIconStore() {
		return iconStore;
	}

	public void addOpenGamePropertiesListener(Action l) {
		openGamePropertiesListeners.add(l);
		for (ViewPanel pnl : panels) {
			if (pnl != null) {
				pnl.addOpenGamePropertiesListener(l);
			}
		}
	}

	public void addAddGameOrEmulatorFromClipboardListener(Action l) {
		addGameOrEmulatorFromClipboardListeners.add(l);
		for (ViewPanel pnl : panels) {
			if (pnl != null) {
				pnl.addAddGameOrEmulatorFromClipboardListener(l);
			}
		}
	}

	public void addRenameGameListener(Action l) {
		renameGameListeners.add(l);
		for (ViewPanel pnl : panels) {
			if (pnl != null) {
				pnl.addRenameGameListener(l);
			}
		}
	}

	public void gameAdded(GameAddedEvent e) {
		iconStore.addGameIconPath(e.getGame().getId(), e.getGame().getIconPath());
		iconStore.addGameCoverPath(e.getGame().getId(), e.getGame().getCoverPath());
		Platform p = e.getPlatform();
		iconStore.addPlatformIcon(p.getId(), p.getIconFileName());
		for (ViewPanel pnl : panels) {
			if (pnl != null) {
				pnl.gameAdded(e);
			}
		}
	}

	public void gameRemoved(GameRemovedEvent e) {
		iconStore.removeGameIconPath(e.getGame().getId());
		for (ViewPanel pnl : panels) {
			if (pnl != null) {
				pnl.gameRemoved(e);
			}
		}
	}

	public void selectGame(int gameId) {
		selectedGameId = gameId;
		for (ViewPanel pnl : panels) {
			if (pnl != null) {
				pnl.selectGame(gameId);
			}
		}
	}

	public void selectNextGame() {
		for (ViewPanel pnl : panels) {
			if (pnl != null) {
				pnl.selectNextGame();
			}
		}
	}

	public void selectPreviousGame() {
		for (ViewPanel pnl : panels) {
			if (pnl != null) {
				pnl.selectPreviousGame();
			}
		}
	}

	public void setTouchScreenScrollEnabled(boolean touchScreenScroll) {
		touchScreenScrollEnabled = touchScreenScroll;
		for (ViewPanel pnl : panels) {
			if (pnl != null) {
				pnl.setTouchScreenScrollEnabled(touchScreenScroll);
			}
		}
	}

	public void setViewStyle(int viewStyle) {
		this.viewStyle = viewStyle;
		for (ViewPanel pnl : panels) {
			if (pnl != null) {
				pnl.setViewStyle(viewStyle);
			}
		}
	}

	public boolean isHideExtensionsEnabled() {
		return hideExtensions;
	}

	public int getGameCountOfCurrentView() {
		return 0;
	}

	public void addUpdateGameCountListener(UpdateGameCountListener l) {
		for (ViewPanel pnl : panels) {
			if (pnl != null) {
				pnl.addUpdateGameCountListener(l);
			}
		}
	}

	public void addGameCoverPath(int gameId, String gameCoverPath) {
		iconStore.addGameCoverPath(gameId, gameCoverPath);
	}

	@Override
	public void gameCoverAdded(int gameId, ImageIcon ico) {
		ico = iconStore.getScaledGameCover(gameId, currentCoverSize);
		for (ViewPanel pnl : panels) {
			if (pnl != null) {
				pnl.gameCoverAdded(gameId, ico);
			}
		}
	}

	public int getCurrentCoverSize() {
		return currentCoverSize;
	}

	public void setCurrentCoverSize(int currentCoverSize) {
		this.currentCoverSize = currentCoverSize;
	}

	public void addUnmountedDriveLetter(String unmountedDriveLetter) {
		if (!unmountedDriveLetters.contains(unmountedDriveLetter)) {
			unmountedDriveLetters.add(unmountedDriveLetter);
		}
	}

	public boolean isDriveUnmounted(String driveLetter) {
		return unmountedDriveLetters.contains(driveLetter);
	}
}