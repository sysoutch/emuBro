package ch.sysout.emubro.ui;

import java.awt.*;
import java.awt.dnd.DropTargetListener;
import java.awt.event.ActionListener;
import java.awt.event.KeyListener;
import java.awt.event.MouseListener;
import java.awt.event.MouseWheelListener;
import java.awt.image.BufferedImage;
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
import ch.sysout.emubro.ui.listener.RateListener;

public abstract class ViewPanel extends JPanel implements GameSelectionListener {
	private static final long serialVersionUID = 1L;

	public static final int LIST_VIEW = GameViewConstants.LIST_VIEW;
	public static final int ELEMENT_VIEW = GameViewConstants.ELEMENT_VIEW;
	public static final int TABLE_VIEW = GameViewConstants.TABLE_VIEW;
	public static final int CONTENT_VIEW = GameViewConstants.CONTENT_VIEW;
	public static final int SLIDER_VIEW = GameViewConstants.SLIDER_VIEW;
	public static final int COVER_VIEW = GameViewConstants.COVER_VIEW;

	private int lastDetailsHeight;

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

	 @Override
	 protected void paintComponent(Graphics g) {
	 	super.paintComponent(g);
		 Graphics2D g2d = (Graphics2D) g.create();
		 int panelWidth = getWidth();
		 int panelHeight = getHeight() + getDetailsPanelHeight();
		 Theme currentTheme = IconStore.current().getCurrentTheme();
		 ThemeBackground currentBackground = currentTheme.getView();
		 //		if (currentBackground.hasGradientPaint()) {
		 //			GradientPaint p = currentBackground.getGradientPaint();
		 //			g2d.setPaint(p);
		 //		} else if (currentBackground.hasColor()) {
		 //			g2d.setColor(currentBackground.getColor());
		 //		}
		 //		g2d.fillRect(0, 0, panelWidth, panelHeight);
		 if (currentBackground.hasColor()) {
			 Color backgroundColor = currentBackground.getColor();
			 g2d.setColor(backgroundColor);
			 g2d.fillRect(0, 0, panelWidth, panelHeight);
		 }
		 boolean addBehindBackgroundImage = false;
		 boolean addInFrontOfBackgroundImage = true;
		 if (addBehindBackgroundImage) {
			 addTransparencyPaneIfEnabled(g2d, currentBackground, panelWidth, panelHeight);
		 }
		 Image background = currentBackground.getImage();
		 if (background != null) {
			 g2d.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
			 g2d.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
			 g2d.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
			 int imgWidth = background.getWidth(null);
			 int imgHeight = background.getHeight(null);
			 int x = 0;
			 int y = 0;
			 boolean shouldScale = currentBackground.isImageScaleEnabled();
			 if (shouldScale) {
				 int new_width = imgWidth;
				 int new_height = imgHeight;
				 boolean stretchToView = currentBackground.isStretchToViewEnabled();
				 if (stretchToView) {
					 new_width = panelWidth;
					 new_height = panelHeight;
				 } else {
					 // first check if we need to scale width
					 if (imgWidth > panelWidth) {
						 //scale width to fit
						 new_width = panelWidth;
						 //scale height to maintain aspect ratio
						 new_height = (new_width * imgHeight) / imgWidth;
					 }

					 // then check if we need to scale even with the new height
					 if (new_height > panelHeight) {
						 //scale height to fit instead
						 new_height = panelHeight;
						 //scale width to maintain aspect ratio
						 new_width = (new_height * imgWidth) / imgHeight;
					 }
					 if (new_width < panelWidth) {
						 x += (panelWidth-new_width) / 2;
					 }
					 if (new_height < panelHeight) {
						 y += (panelHeight-new_height) / 2; // image centered
						 //					y = panelHeight-new_height; // image bottom
					 }
				 }
				 g2d.drawImage(background, x, y, new_width, new_height, this);
				 //				boolean addTransparencyPane = true;
				 //				if (addTransparencyPane) {
				 //					g2d.setColor(getTransparencyColor());
				 //					g2d.fillRect(x, y, new_width, new_height);
				 //				}
			 } else {
				 boolean shouldVerticalCenterImage = currentBackground.isVerticalCenterImageEnabled();
				 boolean shouldHorizontalCenterImage = currentBackground.isHorizontalCenterImageEnabled();
				 if (shouldVerticalCenterImage) {
					 if (imgWidth > panelWidth) {
						 x -= (imgWidth-panelWidth) / 2;
					 }
				 }
				 if (shouldHorizontalCenterImage) {
					 if (imgHeight > panelHeight) {
						 y -= (imgHeight-panelHeight) / 2;
					 }
				 }
				 g2d.drawImage(background, x, y, imgWidth, imgHeight, this);
				 //				boolean addTransparencyPane = true;
				 //				if (addTransparencyPane) {
				 //					g2d.setColor(getTransparencyColor());
				 //					g2d.fillRect(x, y, imgWidth, imgHeight);
				 //				}
			 }
			 if (addInFrontOfBackgroundImage) {
				 addTransparencyPaneIfEnabled(g2d, currentBackground, panelWidth, panelHeight);
			 }
//			 addTransparencyOverlayImage(g2d, true, panelWidth, panelHeight, currentTheme, background.getWidth(null), x, y);
		 } else {
//			 addTransparencyOverlayImage(g2d, false, panelWidth, panelHeight, currentTheme, 1, 0, 0);
		 }
		 g2d.dispose();
	 }

	private void addTransparencyPaneIfEnabled(Graphics2D g2d, ThemeBackground currentBackground, int panelWidth,
											  int panelHeight) {
		boolean addTransparencyPane = currentBackground.isAddTransparencyPaneEnabled();
		if (addTransparencyPane) {
			g2d.setColor(currentBackground.getTransparencyColor());
			g2d.fillRect(0, 0, panelWidth, panelHeight);
		}
	}

	private void addTransparencyOverlayImage(Graphics2D g2d, boolean overImageOnly, int panelWidth, int panelHeight, Theme currentTheme, int baseImageWidth, int posX, int posY) {
		BufferedImage imgTransparentOverlay = currentTheme.getTransparentBackgroundOverlayImage();
		if (imgTransparentOverlay != null) {
			int width = imgTransparentOverlay.getWidth();
			int height = imgTransparentOverlay.getHeight();

			double factor = baseImageWidth / panelWidth;
			if (factor != 0) {
				int scaledWidth = (int) (width/factor);
				int scaledHeight = (int) (height/factor);
				width = scaledWidth;
				height = scaledHeight;
			}
			posX = panelWidth-width;
			posY = panelHeight-height;
			g2d.drawImage(imgTransparentOverlay, posX, posY, width, height, this);
		}
	}

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

	public abstract void addSuperImportantKeyListener(KeyListener l);

	public abstract void addDecreaseFontListener(Action l);

	public abstract void addIncreaseFontListener(Action l);

	public abstract void addSwitchViewByMouseWheelListener(MouseWheelListener l);

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

	public int getDetailsPanelHeight() {
		return lastDetailsHeight;
	}

	public void setDetailsPanelHeight(int lastDetailsHeight) {
		this.lastDetailsHeight = lastDetailsHeight;
	}

	//	public abstract void setDetailsPanelHeight(int detailsPanelHeight);
}
