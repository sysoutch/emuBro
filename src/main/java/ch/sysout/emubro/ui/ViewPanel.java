package ch.sysout.emubro.ui;

import java.awt.Component;
import java.awt.LayoutManager;
import java.awt.dnd.DropTargetListener;
import java.awt.event.ActionListener;
import java.awt.event.MouseListener;
import java.awt.event.MouseWheelListener;
import java.util.List;

import javax.swing.Action;
import javax.swing.JPanel;

import ch.sysout.emubro.api.TagListener;
import ch.sysout.emubro.api.TagsFromGamesListener;
import ch.sysout.emubro.api.event.FilterEvent;
import ch.sysout.emubro.api.event.GameAddedEvent;
import ch.sysout.emubro.api.event.GameRemovedEvent;
import ch.sysout.emubro.api.event.GameRenamedEvent;
import ch.sysout.emubro.api.model.Game;
import ch.sysout.emubro.api.model.PlatformComparator;
import ch.sysout.emubro.controller.GameSelectionListener;
import ch.sysout.emubro.impl.event.NavigationEvent;

public abstract class ViewPanel extends JPanel implements GameSelectionListener {
	private static final long serialVersionUID = 1L;

	public static final int BLANK_VIEW = GameViewConstants.BLANK_VIEW;
	public static final int LIST_VIEW = GameViewConstants.LIST_VIEW;
	public static final int ELEMENT_VIEW = GameViewConstants.ELEMENT_VIEW;
	public static final int TABLE_VIEW = GameViewConstants.TABLE_VIEW;
	public static final int CONTENT_VIEW = GameViewConstants.CONTENT_VIEW;
	public static final int SLIDER_VIEW = GameViewConstants.SLIDER_VIEW;
	public static final int COVER_VIEW = GameViewConstants.COVER_VIEW;

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

	public abstract void languageChanged();

	public abstract void addGameDragDropListener(DropTargetListener l);

	public abstract void groupByNone();

	public abstract void groupByPlatform();

	public abstract void groupByTitle();

	public abstract int getGroupBy();

	public abstract boolean isTouchScreenScrollEnabled();

	public abstract void setTouchScreenScrollEnabled(boolean touchScreenScrollEnabled);

	public abstract void sortBy(int sortBy, PlatformComparator platformComparator);

	public abstract void sortOrder(int sortOrder);

	public abstract void setFontSize(int fontSize);

	public abstract void navigationChanged(NavigationEvent e, FilterEvent filterEvent);

	public abstract void increaseFontSize();

	public abstract void decreaseFontSize();

	public abstract void pinColumnWidthSliderPanel(JPanel pnlColumnWidthSlider);

	public abstract void unpinColumnWidthSliderPanel(JPanel pnlColumnWidthSlider);

	public abstract void pinRowHeightSliderPanel(JPanel pnlRowHeightSlider);

	public abstract void unpinRowHeightSliderPanel(JPanel pnlRowHeightSlider);

	public abstract void selectGame(int gameId);

	public abstract void initGameList(List<Game> games, int currentNavView);

	public abstract void addSelectGameListener(GameSelectionListener l);

	public abstract void addRunGameListener(Action l);

	public abstract void addRunGameListener(MouseListener l);

	public abstract void gameRated(Game list);

	public abstract void hideExtensions(boolean hideExtensions);

	public abstract void addDecreaseFontListener(Action l);

	public abstract void addIncreaseFontListener(Action l);

	public abstract void addIncreaseFontListener2(MouseWheelListener l);

	public abstract void addOpenGamePropertiesListener(Action l);

	public abstract void addRemoveGameListener(Action l);

	public abstract int getColumnWidth();

	public abstract void setColumnWidth(int value);

	public abstract int getRowHeight();

	public abstract void setRowHeight(int value);

	public abstract void addOpenGameFolderListener1(MouseListener l);

	public abstract void addRateListener(RateListener l);

	public abstract void addCommentListener(ActionListener l);

	public abstract void addRenameGameListener(Action l);

	public abstract void gameAdded(GameAddedEvent e, FilterEvent filterEvent);

	public abstract void gameRemoved(GameRemovedEvent e);

	public abstract void selectNextGame();

	public abstract void selectPreviousGame();

	public abstract void setViewStyle(int viewStyle);

	public abstract void addUpdateGameCountListener(UpdateGameCountListener l);

	public abstract void addAddGameOrEmulatorFromClipboardListener(Action l);

	public abstract void filterSet(FilterEvent e);

	public abstract void gameRenamed(GameRenamedEvent event);

	public abstract void addCoverDragDropListener(DropTargetListener l);

	public abstract Component getDefaultFocusableComponent();

	public abstract void addTagListener(TagListener l);

	public abstract void addTagsFromGamesListener(TagsFromGamesListener l);

	public abstract List<Game> getGames();

	public abstract void coverSizeChanged(int currentCoverSize);

	public abstract void scrollToSelectedGames();

	public abstract void themeChanged();

	//	public abstract void setDetailsPanelHeight(int detailsPanelHeight);
}
