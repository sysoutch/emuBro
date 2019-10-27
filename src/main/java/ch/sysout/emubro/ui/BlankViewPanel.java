package ch.sysout.emubro.ui;

import java.awt.BorderLayout;
import java.awt.Color;
import java.awt.Component;
import java.awt.Dimension;
import java.awt.GradientPaint;
import java.awt.Graphics;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.dnd.DropTargetListener;
import java.awt.event.ActionListener;
import java.awt.event.MouseListener;
import java.awt.event.MouseWheelListener;
import java.awt.image.BufferedImage;
import java.util.List;

import javax.swing.Action;
import javax.swing.BorderFactory;
import javax.swing.JButton;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.border.Border;
import javax.swing.border.CompoundBorder;
import javax.swing.border.TitledBorder;

import com.jgoodies.forms.factories.Paddings;
import com.jgoodies.forms.layout.CellConstraints;
import com.jgoodies.forms.layout.FormLayout;

import ch.sysout.emubro.api.TagListener;
import ch.sysout.emubro.api.TagsFromGamesListener;
import ch.sysout.emubro.api.event.FilterEvent;
import ch.sysout.emubro.api.event.GameAddedEvent;
import ch.sysout.emubro.api.event.GameRemovedEvent;
import ch.sysout.emubro.api.event.GameRenamedEvent;
import ch.sysout.emubro.api.event.GameSelectionEvent;
import ch.sysout.emubro.api.model.Game;
import ch.sysout.emubro.api.model.PlatformComparator;
import ch.sysout.emubro.controller.GameSelectionListener;
import ch.sysout.emubro.controller.ViewConstants;
import ch.sysout.emubro.impl.event.NavigationEvent;
import ch.sysout.emubro.util.MessageConstants;
import ch.sysout.ui.util.JCustomButton;
import ch.sysout.util.Icons;
import ch.sysout.util.ImageUtil;
import ch.sysout.util.Messages;
import ch.sysout.util.ScreenSizeUtil;
import ch.sysout.util.UIUtil;

public class BlankViewPanel extends ViewPanel {
	private static final long serialVersionUID = 1L;

	private JButton lnkBrowseComputer = new JCustomButton(Messages.get(MessageConstants.BROWSE_COMPUTER));
	private JButton lnkAddFiles = new JCustomButton(Messages.get(MessageConstants.ADD_FILES));
	private JButton lnkAddFolders = new JCustomButton(Messages.get(MessageConstants.ADD_FOLDERS));
	private JButton lnkConfigure = new JCustomButton(Messages.get(MessageConstants.CONFIGURE));

	private JButton lnkListView = new JCustomButton(Messages.get(MessageConstants.VIEW_LIST));
	private JButton lnkElementView = new JCustomButton(Messages.get(MessageConstants.VIEW_ELEMENTS));
	private JButton lnkTableView = new JCustomButton(Messages.get(MessageConstants.VIEW_TABLE));
	private JButton lnkContentView = new JCustomButton(Messages.get(MessageConstants.VIEW_CONTENT));
	private JButton lnkSliderView = new JCustomButton(Messages.get(MessageConstants.VIEW_SLIDER));
	private JButton lnkCoverView = new JCustomButton(Messages.get(MessageConstants.VIEW_COVERS));

	private JButton lnkHelp = new JCustomButton(Messages.get(MessageConstants.HELP));
	private JButton lnkDiscord = new JCustomButton(Messages.get(MessageConstants.EMUBRO_DISCORD));
	private JButton lnkConfigWizard = new JCustomButton(Messages.get(MessageConstants.CONFIGURE_WIZARD, Messages.get(MessageConstants.APPLICATION_TITLE)));

	private JButton lnkUpdateEmubro = new JCustomButton(Messages.get(MessageConstants.SEARCH_FOR_UPDATES));
	private JButton lnkAbout = new JCustomButton(Messages.get(MessageConstants.ABOUT, Messages.get(MessageConstants.APPLICATION_TITLE)));

	private Border titledBorderAction = BorderFactory.createTitledBorder(Messages.get(MessageConstants.RUN_ACTION));
	private Border titledBorderView = BorderFactory.createTitledBorder(Messages.get(MessageConstants.CHOOSE_VIEW));
	private Border titledBorderHelp = BorderFactory.createTitledBorder(Messages.get(MessageConstants.HELP));

	public BlankViewPanel() {
		super(new BorderLayout());
		setIcons();
		setOpaque(false);
		setBorder(Paddings.TABBED_DIALOG);
		Border boarder = Paddings.DLU4;
		JPanel pnlAction = new JPanel(new FormLayout("left:default:grow",
				"fill:pref, min, fill:pref, min, fill:pref, min, fill:pref"));
		pnlAction.setOpaque(false);
		pnlAction.setMinimumSize(new Dimension(0, 0));
		pnlAction.setBorder(new CompoundBorder(titledBorderAction, boarder));
		pnlAction.setBackground(Color.WHITE);
		CellConstraints cc2 = new CellConstraints();
		pnlAction.add(lnkBrowseComputer, cc2.xy(1, 1));
		pnlAction.add(lnkAddFiles, cc2.xy(1, 3));
		pnlAction.add(lnkAddFolders, cc2.xy(1, 5));
		pnlAction.add(lnkConfigure, cc2.xy(1, 7));

		JPanel pnlView = new JPanel(new FormLayout("left:default:grow",
				"fill:pref, min, fill:pref, min, fill:pref, min, fill:pref, min, fill:pref, min, fill:pref"));
		pnlView.setOpaque(false);
		pnlView.setMinimumSize(new Dimension(0, 0));
		pnlView.setBorder(new CompoundBorder(titledBorderView, boarder));
		pnlView.setBackground(Color.WHITE);
		CellConstraints cc = new CellConstraints();
		pnlView.add(lnkListView, cc.xy(1, 1));
		pnlView.add(lnkElementView, cc.xy(1, 3));
		pnlView.add(lnkTableView, cc.xy(1, 5));
		pnlView.add(lnkContentView, cc.xy(1, 7));
		pnlView.add(lnkSliderView, cc.xy(1, 9));
		pnlView.add(lnkCoverView, cc.xy(1, 11));

		JPanel pnlHelp = new JPanel(new FormLayout("left:default:grow",
				"fill:pref, min, fill:pref, min, fill:pref, min, fill:pref, min, fill:pref"));
		pnlHelp.setOpaque(false);
		pnlHelp.setMinimumSize(new Dimension(0, 0));
		pnlHelp.setBorder(new CompoundBorder(titledBorderHelp, boarder));
		pnlHelp.setBackground(Color.WHITE);
		CellConstraints cc4 = new CellConstraints();
		pnlHelp.add(lnkHelp, cc4.xy(1, 1));
		pnlHelp.add(lnkDiscord, cc4.xy(1, 3));
		pnlHelp.add(lnkConfigWizard, cc4.xy(1, 5));
		pnlHelp.add(lnkUpdateEmubro, cc2.xy(1, 7));
		pnlHelp.add(lnkAbout, cc4.xy(1, 9));

		//		JPanel pnl = new JPanel(new FormLayout("default, $rgap, default, $rgap, default",
		//				"top:default"));
		//		WrapLayout wl = new WrapLayout(FlowLayout.LEFT);
		//		JPanel pnl = new JPanel(wl);
		JPanel pnl = new JPanel(new BorderLayout());

		pnl.setBackground(Color.WHITE);
		//		CellConstraints cc3 = new CellConstraints();
		//		pnl.add(pnlAction, cc3.xy(1, 1));
		//		pnl.add(pnlView, cc3.xy(3, 1));
		//		pnl.add(pnlHelp, cc3.xy(5, 1));

		//		JTextArea txt = new JTextArea("\"Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.\"");
		//		txt.setOpaque(false);
		//		txt.setPreferredSize(new Dimension(0, 0));
		//		txt.setLineWrap(true);
		//		txt.setWrapStyleWord(true);
		//		pnl.add(txt, BorderLayout.CENTER);
		//		Icon icon = ImageUtil.getImageIconFrom("/images/source.gif");
		//		JLabel label = new JLabel(icon);
		//		pnl.add(label);

		JPanel pnlWrapper = new JPanel(new BorderLayout());
		pnlWrapper.setOpaque(false);
		pnlWrapper.add(pnlAction);
		pnlWrapper.add(pnlView, BorderLayout.EAST);
		pnl.add(pnlWrapper, BorderLayout.EAST);
		pnl.add(pnlHelp, BorderLayout.SOUTH);

		JScrollPane sp = new JCustomScrollPane(pnl);
		sp.setOpaque(false);
		sp.getViewport().setOpaque(false);
		pnl.setOpaque(false);
		sp.setBorder(BorderFactory.createEmptyBorder());
		sp.getHorizontalScrollBar().setUnitIncrement(16);
		sp.getVerticalScrollBar().setUnitIncrement(16);
		add(sp, BorderLayout.CENTER);
	}

	private void setIcons() {
		int size = ScreenSizeUtil.is3k() ? 32 : 32;
		lnkBrowseComputer.setIcon(ImageUtil.getImageIconFrom(Icons.get("search", size, size)));
		lnkConfigure.setIcon(ImageUtil.getImageIconFrom(Icons.get("settings", size, size)));
		lnkAddFiles.setIcon(ImageUtil.getImageIconFrom(Icons.get("addFile", size, size)));
		lnkAddFolders.setIcon(ImageUtil.getImageIconFrom(Icons.get("addFolder", size, size)));

		lnkListView.setIcon(ImageUtil.getImageIconFrom(Icons.get("viewList", size, size)));
		lnkElementView.setIcon(ImageUtil.getImageIconFrom(Icons.get("viewList", size, size)));
		lnkContentView.setIcon(ImageUtil.getImageIconFrom(Icons.get("viewList", size, size)));
		lnkTableView.setIcon(ImageUtil.getImageIconFrom(Icons.get("viewTable", size, size)));
		lnkCoverView.setIcon(ImageUtil.getImageIconFrom(Icons.get("viewCovers", size, size)));

		lnkHelp.setIcon(ImageUtil.getImageIconFrom(Icons.get("help", size, size)));
		lnkDiscord.setIcon(ImageUtil.getImageIconFrom(Icons.get("discord", size, size)));
		lnkConfigWizard.setIcon(ImageUtil.getImageIconFrom(Icons.get("configWizard", size, size)));
		lnkUpdateEmubro.setIcon(ImageUtil.getImageIconFrom(Icons.get("checkForUpdates", size, size)));
		lnkAbout.setIcon(ImageUtil.getImageIconFrom(Icons.get("about", size, size)));
	}

	@Override
	public void initGameList(List<Game> games, int currentNavView) {
	}

	@Override
	public void addGameDragDropListener(DropTargetListener l) {
	}

	@Override
	public void groupByNone() {
	}

	@Override
	public void groupByPlatform() {
	}

	@Override
	public void groupByTitle() {
	}

	@Override
	public void languageChanged() {
		((TitledBorder) titledBorderAction).setTitle(Messages.get(MessageConstants.RUN_ACTION));
		((TitledBorder) titledBorderView).setTitle(Messages.get(MessageConstants.CHOOSE_VIEW));
		((TitledBorder) titledBorderHelp).setTitle(Messages.get(MessageConstants.HELP));
		lnkBrowseComputer.setText(Messages.get(MessageConstants.BROWSE_COMPUTER));
		lnkAddFiles.setText(Messages.get(MessageConstants.ADD_FILES));
		lnkAddFolders.setText(Messages.get(MessageConstants.ADD_FOLDERS));
		lnkConfigure.setText(Messages.get(MessageConstants.CONFIGURE));
		lnkListView.setText(Messages.get(MessageConstants.VIEW_LIST));
		lnkElementView.setText(Messages.get(MessageConstants.VIEW_ELEMENTS));
		lnkTableView.setText(Messages.get(MessageConstants.VIEW_TABLE));
		lnkContentView.setText(Messages.get(MessageConstants.VIEW_CONTENT));
		lnkSliderView.setText(Messages.get(MessageConstants.VIEW_SLIDER));
		lnkCoverView.setText(Messages.get(MessageConstants.VIEW_COVERS));
		lnkHelp.setText(Messages.get(MessageConstants.HELP));
		lnkDiscord.setText(Messages.get(MessageConstants.EMUBRO_DISCORD));
		lnkConfigWizard.setText(Messages.get(MessageConstants.CONFIGURE_WIZARD, Messages.get(MessageConstants.APPLICATION_TITLE)));
		lnkUpdateEmubro.setText(Messages.get(MessageConstants.SEARCH_FOR_UPDATES));
		lnkAbout.setText(Messages.get(MessageConstants.ABOUT, Messages.get(MessageConstants.APPLICATION_TITLE)));
	}

	@Override
	public int getGroupBy() {
		return ViewConstants.GROUP_BY_NONE;
	}

	@Override
	public void sortOrder(int sortOrder) {
	}

	@Override
	public void sortBy(int sortBy, PlatformComparator platformComparator) {
	}

	@Override
	public void setFontSize(int fontSize) {
	}

	@Override
	public void navigationChanged(NavigationEvent e, FilterEvent filterEvent) {
	}

	@Override
	public void increaseFontSize() {
	}

	@Override
	public void decreaseFontSize() {
	}

	@Override
	public void pinColumnWidthSliderPanel(JPanel pnlColumnWidthSlider) {
		add(pnlColumnWidthSlider, BorderLayout.SOUTH);
		pnlColumnWidthSlider.setVisible(true);
		UIUtil.revalidateAndRepaint(this);
	}

	@Override
	public void unpinColumnWidthSliderPanel(JPanel pnlColumnWidthSlider) {
		remove(pnlColumnWidthSlider);
		UIUtil.revalidateAndRepaint(this);
	}

	@Override
	public void pinRowHeightSliderPanel(JPanel pnlRowHeightSlider) {
		add(pnlRowHeightSlider, BorderLayout.EAST);
		pnlRowHeightSlider.setVisible(true);
		UIUtil.revalidateAndRepaint(this);
	}

	@Override
	public void unpinRowHeightSliderPanel(JPanel pnlRowHeightSlider) {
		remove(pnlRowHeightSlider);
		UIUtil.revalidateAndRepaint(this);
	}

	@Override
	public void selectGame(int gameId) {

	}

	@Override
	public void gameSelected(GameSelectionEvent e) {
		// TODO Auto-generated method stub

	}

	@Override
	public void addSelectGameListener(GameSelectionListener l) {
		// TODO Auto-generated method stub

	}

	@Override
	public void gameRated(Game game) {
		// TODO Auto-generated method stub

	}

	@Override
	public void hideExtensions(boolean shouldHide) {
		// TODO Auto-generated method stub

	}

	@Override
	public void addRunGameListener(Action l) {
		// TODO Auto-generated method stub

	}

	@Override
	public void addRunGameListener(MouseListener l) {
		// TODO Auto-generated method stub

	}

	@Override
	public void addDecreaseFontListener(Action l) {
		// TODO Auto-generated method stub

	}

	@Override
	public void addIncreaseFontListener(Action l) {
		// TODO Auto-generated method stub

	}

	@Override
	public void addIncreaseFontListener2(MouseWheelListener l) {
		// TODO Auto-generated method stub

	}

	@Override
	public void addOpenGamePropertiesListener(Action l) {
		// TODO Auto-generated method stub

	}

	@Override
	public void addRemoveGameListener(Action l) {
		// TODO Auto-generated method stub

	}

	@Override
	public int getColumnWidth() {
		// TODO Auto-generated method stub
		return 0;
	}

	@Override
	public void setColumnWidth(int value) {
		// TODO Auto-generated method stub

	}

	@Override
	public int getRowHeight() {
		// TODO Auto-generated method stub
		return 0;
	}

	@Override
	public void setRowHeight(int value) {
		// TODO Auto-generated method stub

	}

	@Override
	public void addCommentListener(ActionListener l) {
		// TODO Auto-generated method stub

	}

	@Override
	public void addOpenGameFolderListener1(MouseListener l) {
		// TODO Auto-generated method stub

	}

	@Override
	public void addRateListener(RateListener l) {
		// TODO Auto-generated method stub

	}

	@Override
	public void addRenameGameListener(Action l) {
	}

	@Override
	public void gameAdded(GameAddedEvent e, FilterEvent event) {
	}

	@Override
	public void gameRemoved(GameRemovedEvent e) {
	}

	@Override
	public void selectNextGame() {
	}

	@Override
	public void selectPreviousGame() {
	}

	@Override
	public boolean isTouchScreenScrollEnabled() {
		return false;
	}

	@Override
	public void setTouchScreenScrollEnabled(boolean touchScreenScrollEnabled) {
	}

	@Override
	public void setViewStyle(int viewStyle) {
	}

	@Override
	public void addUpdateGameCountListener(UpdateGameCountListener l) {
	}

	@Override
	public void addAddGameOrEmulatorFromClipboardListener(Action l) {
	}

	@Override
	public void filterSet(FilterEvent event) {
	}

	@Override
	public void gameRenamed(GameRenamedEvent event) {
	}

	@Override
	public void addCoverDragDropListener(DropTargetListener l) {
	}

	@Override
	public Component getDefaultFocusableComponent() {
		return lnkBrowseComputer;
	}

	@Override
	public void addTagListener(TagListener l) {
	}

	@Override
	public void addTagsFromGamesListener(TagsFromGamesListener l) {
	}

	@Override
	public List<Game> getGames() {
		return null;
	}

	@Override
	public void coverSizeChanged(int currentCoverSize) {
	}

	public void addOpenPropertiesListener(ActionListener l) {
		lnkConfigure.addActionListener(l);
	}

	public void addChangeToListViewListener(ActionListener l) {
		lnkListView.addActionListener(l);
	}

	public void addChangeToElementViewListener(ActionListener l) {
		lnkElementView.addActionListener(l);
	}

	public void addChangeToTableViewListener(ActionListener l) {
		lnkTableView.addActionListener(l);
	}

	public void addChangeToContentViewListener(ActionListener l) {
		lnkContentView.addActionListener(l);
	}

	public void addChangeToSliderViewListener(ActionListener l) {
		lnkSliderView.addActionListener(l);
	}

	public void addChangeToCoverViewListener(ActionListener l) {
		lnkCoverView.addActionListener(l);
	}

	public void addOpenHelpListener(ActionListener l) {
		lnkHelp.addActionListener(l);
	}

	public void addDiscordInviteLinkListener(ActionListener l) {
		lnkDiscord.addActionListener(l);
	}

	public void addOpenConfigWizardListener(ActionListener l) {
		lnkConfigWizard.addActionListener(l);
	}

	public void addOpenAboutListener(ActionListener l) {
		lnkAbout.addActionListener(l);
	}

	public void addOpenUpdateListener(ActionListener l) {
		lnkUpdateEmubro.addActionListener(l);
	}

	public void addAutoSearchListener(ActionListener l) {
		lnkBrowseComputer.addActionListener(l);
	}

	public void addAddFilesListener(ActionListener l) {
		lnkAddFiles.addActionListener(l);
	}

	public void addAddFoldersListener(ActionListener l) {
		lnkAddFolders.addActionListener(l);
	}

	@Override
	protected void paintComponent(Graphics g) {
		super.paintComponent(g);
		Graphics2D g2d = (Graphics2D) g.create();
		int panelWidth = getWidth();
		int panelHeight = getHeight();
		Theme currentTheme = IconStore.current().getCurrentTheme();
		ThemeBackground currentBackground = currentTheme.getView();
		if (currentBackground.hasGradientPaint()) {
			GradientPaint p = currentBackground.getGradientPaint();
			g2d.setPaint(p);
		} else if (currentBackground.hasColor()) {
			g2d.setColor(currentBackground.getColor());
		}
		g2d.fillRect(0, 0, panelWidth, panelHeight);

		BufferedImage background = currentBackground.getImage();
		if (background != null) {
			g2d.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
			g2d.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
			g2d.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
			int imgWidth = background.getWidth();
			int imgHeight = background.getHeight();
			int x = 0;
			int y = 0;
			boolean shouldScale = currentBackground.isImageScaleEnabled();
			if (shouldScale) {
				int new_width = imgWidth;
				int new_height = imgHeight;
				boolean scaleProportionally = currentBackground.isScaleProportionallyEnabled();
				if (scaleProportionally) {
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
				} else {
					new_width = panelWidth;
					new_height = panelHeight;
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
			boolean addTransparencyPane = currentBackground.isAddTransparencyPaneEnabled();
			if (addTransparencyPane) {
				g2d.setColor(getTransparencyColor());
				g2d.fillRect(0, 0, panelWidth, panelHeight);
			}
			BufferedImage imgTransparentOverlay = currentTheme.getTransparentBackgroundOverlayImage();
			if (imgTransparentOverlay != null) {
				int width = imgTransparentOverlay.getWidth();
				int height = imgTransparentOverlay.getHeight();

				double factor = background.getWidth() / panelWidth;
				if (factor != 0) {
					int scaledWidth = (int) (width/factor);
					int scaledHeight = (int) (height/factor);
					width = scaledWidth;
					height = scaledHeight;
				}
				x = panelWidth-width;
				y = panelHeight-height;
				g2d.drawImage(imgTransparentOverlay, x, y, width, height, this);
			}
		}
		g2d.dispose();
	}
}