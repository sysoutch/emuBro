package ch.sysout.emubro.ui;

import java.awt.Color;
import java.awt.Component;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;

import javax.swing.AbstractButton;
import javax.swing.Action;
import javax.swing.ButtonGroup;
import javax.swing.JCheckBoxMenuItem;
import javax.swing.JComponent;
import javax.swing.JMenu;
import javax.swing.JMenuItem;
import javax.swing.JPopupMenu;
import javax.swing.JRadioButtonMenuItem;
import javax.swing.JSeparator;
import javax.swing.KeyStroke;
import javax.swing.event.MenuEvent;
import javax.swing.event.MenuListener;

import ch.sysout.emubro.controller.ViewConstants;
import ch.sysout.emubro.util.ColorConstants;
import ch.sysout.emubro.util.MessageConstants;
import ch.sysout.ui.util.ImageUtil;
import ch.sysout.util.FileUtil;
import ch.sysout.util.Icons;
import ch.sysout.util.Messages;
import ch.sysout.util.ScreenSizeUtil;

public class ViewContextMenu extends JPopupMenu implements ActionListener {
	private static final long serialVersionUID = 1L;

	private JMenu mnuAdd;
	private JMenu mnuSort;
	private JMenu mnuGroup;
	private JMenu mnuChangeTo;

	private JMenuItem itmAddFiles;
	private JMenuItem itmAddFolders;
	private JMenuItem itmFilesFromClipboard;
	private JMenuItem itmRefresh;
	private JCheckBoxMenuItem itmSetFilter;
	private JMenuItem itmSetColumnWidth;
	private JMenuItem itmSetRowHeight;
	private JMenuItem itmChooseDetails;
	private JMenuItem itmRenameGames;
	private JMenuItem itmTagsSearch;
	private JMenuItem itmCoverSearch;
	private JMenuItem itmTrailerSearch;
	private JMenuItem itmWebSearchSettings;
	private JCheckBoxMenuItem itmHideExtensions;
	private JCheckBoxMenuItem itmFullScreen;
	//	private JRadioButtonMenuItem itmWelcomeView;
	//	private JRadioButtonMenuItem itmListView;
	//	private JRadioButtonMenuItem itmElementView;
	//	private JRadioButtonMenuItem itmListViewOneColumn;
	//	private JRadioButtonMenuItem itmTableView;
	//	private JRadioButtonMenuItem itmContentView;
	//	private JRadioButtonMenuItem itmCoverView;
	private JRadioButtonMenuItem itmSortTitle;
	private JRadioButtonMenuItem itmSortPlatform;
	private JRadioButtonMenuItem itmSortAscending;
	private JRadioButtonMenuItem itmSortDescending;
	private JRadioButtonMenuItem itmGroupTitle;
	private JRadioButtonMenuItem itmGroupPlatform;
	private JRadioButtonMenuItem itmGroupBlank;
	private JRadioButtonMenuItem itmGroupAscending;
	private JRadioButtonMenuItem itmGroupDescending;
	private JRadioButtonMenuItem itmChangeToAll;
	private JRadioButtonMenuItem itmChangeToFavorites;
	private JRadioButtonMenuItem itmChangeToRecentlyPlayed;
	private JRadioButtonMenuItem itmChangeToRecycleBin;
	private JCheckBoxMenuItem itmShowToolTipTexts;
	private JCheckBoxMenuItem itmTouchScreenOptimizedScroll;

	public ViewContextMenu() {
		initComponents();
		setAccelerators();
		setButtonGroups();
		setIcons();
		addComponentsToJComponent(this,
				//				itmWelcomeView,
				//				new JSeparator(), itmListView, itmElementView, itmTableView, itmContentView, itmCoverView,
				mnuAdd,
				new JSeparator(), mnuSort, mnuGroup,
				new JSeparator(), itmRefresh,
				new JSeparator(), itmSetFilter, /* itmChooseDetails,*/
				/*new JSeparator(), */mnuChangeTo,
				new JSeparator(), itmTagsSearch, itmCoverSearch, itmTrailerSearch/*, itmWebSearchSettings*/,
				new JSeparator(), itmRenameGames,
				new JSeparator(), itmSetColumnWidth, itmSetRowHeight,
				new JSeparator(), itmShowToolTipTexts, itmTouchScreenOptimizedScroll,
				new JSeparator(), itmFullScreen);
		addComponentsToJComponent(mnuAdd, itmAddFiles, itmAddFolders, new JSeparator(), itmFilesFromClipboard);
		addComponentsToJComponent(mnuChangeTo, itmChangeToAll, itmChangeToFavorites, itmChangeToRecentlyPlayed, new JSeparator(), itmChangeToRecycleBin);
		addComponentsToJComponent(mnuSort, itmSortTitle, itmSortPlatform, new JSeparator(), itmSortAscending,
				itmSortDescending);
		addComponentsToJComponent(mnuGroup, itmGroupBlank, itmGroupTitle, itmGroupPlatform, new JSeparator(),
				itmGroupAscending, itmGroupDescending);
	}

	private void initComponents() {
		mnuAdd = new JMenu(Messages.get(MessageConstants.ADD));
		mnuSort = new JMenu(Messages.get(MessageConstants.SORT_BY));
		mnuGroup = new JMenu(Messages.get(MessageConstants.GROUP_BY));
		itmAddFiles = new JMenuItem(Messages.get(MessageConstants.FILES, "") + "...");
		itmAddFolders = new JMenuItem(Messages.get(MessageConstants.FOLDERS, "") + "...");
		itmFilesFromClipboard = new JMenuItem(Messages.get(MessageConstants.FILES_FROM_CLIPBOARD));
		itmSetColumnWidth = new JMenuItem(Messages.get(MessageConstants.SET_COLUMN_WIDTH));
		itmSetRowHeight = new JMenuItem(Messages.get(MessageConstants.SET_ROW_HEIGHT));
		itmRefresh = new JMenuItem(Messages.get(MessageConstants.REFRESH));
		mnuChangeTo = new JMenu(Messages.get(MessageConstants.CHANGE_TO));
		itmSetFilter = new JCheckBoxMenuItem(Messages.get(MessageConstants.SET_FILTER));
		itmChooseDetails = new JMenuItem(Messages.get(MessageConstants.CHOOSE_DETAILS));
		itmRenameGames = new JMenuItem(Messages.get(MessageConstants.RENAME_GAMES) + "...");
		itmTagsSearch = new JMenuItem(Messages.get(MessageConstants.TAG_FROM_WEB) + "...");
		itmCoverSearch = new JMenuItem(Messages.get(MessageConstants.COVER_FROM_WEB) + "...");
		itmTrailerSearch = new JMenuItem(Messages.get(MessageConstants.TRAILER_SEARCH) + "...");
		itmWebSearchSettings = new JMenuItem(Messages.get(MessageConstants.WEB_SEARCH_SETTINGS) + "...");
		itmFullScreen = new JCheckBoxMenuItem(Messages.get(MessageConstants.FULLSCREEN));
		//		itmWelcomeView = new JRadioButtonMenuItem();
		//		itmListView = new JRadioButtonMenuItem(Messages.get("viewListHorizontalSb"));
		//		itmElementView = new JRadioButtonMenuItem(Messages.get("viewListVerticalSb"));
		//		itmListViewOneColumn = new JRadioButtonMenuItem(Messages.get("viewListOneColumn"));
		//		itmTableView = new JRadioButtonMenuItem(Messages.get("viewDetails"));
		//		itmContentView = new JRadioButtonMenuItem(Messages.get("viewContent"));
		//		itmCoverView = new JRadioButtonMenuItem(Messages.get("viewCovers"));
		itmSortTitle = new JRadioButtonMenuItem(Messages.get(MessageConstants.BY_TITLE));
		itmSortPlatform = new JRadioButtonMenuItem(Messages.get(MessageConstants.BY_PLATFORM));
		itmSortAscending = new JRadioButtonMenuItem(Messages.get(MessageConstants.ASCENDING));
		itmSortDescending = new JRadioButtonMenuItem(Messages.get(MessageConstants.DESCENDING));
		itmGroupBlank = new JRadioButtonMenuItem(Messages.get(MessageConstants.BY_NOTHING));
		itmGroupTitle = new JRadioButtonMenuItem(Messages.get(MessageConstants.BY_TITLE));
		itmGroupPlatform = new JRadioButtonMenuItem(Messages.get(MessageConstants.BY_PLATFORM));
		itmGroupAscending = new JRadioButtonMenuItem(Messages.get(MessageConstants.ASCENDING));
		itmGroupDescending = new JRadioButtonMenuItem(Messages.get(MessageConstants.DESCENDING));
		itmChangeToAll = new JRadioButtonMenuItem(Messages.get(MessageConstants.ALL_GAMES));
		itmChangeToFavorites = new JRadioButtonMenuItem(Messages.get(MessageConstants.FAVORITES));
		itmChangeToRecentlyPlayed = new JRadioButtonMenuItem(Messages.get(MessageConstants.RECENTLY_PLAYED));
		itmChangeToRecycleBin= new JRadioButtonMenuItem(Messages.get(MessageConstants.RECYCLE_BIN));
		itmHideExtensions = new JCheckBoxMenuItem(Messages.get(MessageConstants.HIDE_EXTENSIONS));
		itmTouchScreenOptimizedScroll = new JCheckBoxMenuItem(Messages.get(MessageConstants.TOUCH_SCREEN_SCROLL));
		itmShowToolTipTexts = new JCheckBoxMenuItem(Messages.get(MessageConstants.SHOW_TOOL_TIP_TEXTS));
		mnuAdd.addMenuListener(new MenuListener() {

			@Override
			public void menuSelected(MenuEvent e) {
				boolean fileInClipboard = FileUtil.hasFileInClipboard();
				itmFilesFromClipboard.setEnabled(fileInClipboard);
			}

			@Override
			public void menuDeselected(MenuEvent e) {
			}

			@Override
			public void menuCanceled(MenuEvent e) {
			}
		});
	}

	private void setAccelerators() {
		itmChangeToAll.setAccelerator(KeyStroke.getKeyStroke("control 1"));
		itmChangeToFavorites.setAccelerator(KeyStroke.getKeyStroke("control 2"));
		itmChangeToRecentlyPlayed.setAccelerator(KeyStroke.getKeyStroke("control 3"));
		itmChangeToRecycleBin.setAccelerator(KeyStroke.getKeyStroke("control 4"));
		itmRefresh.setAccelerator(KeyStroke.getKeyStroke("F5"));
		itmFullScreen.setAccelerator(KeyStroke.getKeyStroke("F11"));
	}

	private void setButtonGroups() {
		addToButtonGroup(new ButtonGroup(), itmSortTitle, itmSortPlatform);
		addToButtonGroup(new ButtonGroup(), itmSortAscending, itmSortDescending);
		addToButtonGroup(new ButtonGroup(), itmGroupTitle, itmGroupPlatform, itmGroupBlank);
		addToButtonGroup(new ButtonGroup(), itmGroupAscending, itmGroupDescending);
		addToButtonGroup(new ButtonGroup(), itmChangeToAll, itmChangeToFavorites, itmChangeToRecentlyPlayed, itmChangeToRecycleBin);
	}

	private void addToButtonGroup(ButtonGroup grp, AbstractButton... buttons) {
		for (AbstractButton btn : buttons) {
			grp.add(btn);
		}
	}

	private void setIcons() {
		int size = ScreenSizeUtil.is3k() ? 24 : 16;
		//		itmWelcomeView.setIcon(ImageUtil.getImageIconFrom(Icons.get("viewWelcome", size, size)));
		//		itmListView.setIcon(ImageUtil.getImageIconFrom(Icons.get("viewList", size, size)));
		//		itmElementView.setIcon(ImageUtil.getImageIconFrom(Icons.get("viewList", size, size)));
		//		itmListViewOneColumn.setIcon(ImageUtil.getImageIconFrom(Icons.get("viewList", size, size)));
		//		itmTableView.setIcon(ImageUtil.getImageIconFrom(Icons.get("viewTable", size, size)));
		//		itmCoverView.setIcon(ImageUtil.getImageIconFrom(Icons.get("viewCovers", size, size)));
		itmAddFiles.setIcon(ImageUtil.getFlatSVGIconFrom(Icons.get("addFile"), size, ColorStore.current().getColor(ColorConstants.SVG_NO_COLOR)));
		itmAddFolders.setIcon(ImageUtil.getFlatSVGIconFrom(Icons.get("addFolder"), size, new Color(255, 195, 0)));
		itmFilesFromClipboard.setIcon(ImageUtil.getFlatSVGIconFrom(Icons.get("filesFromClipboard"), size, ColorStore.current().getColor(ColorConstants.SVG_NO_COLOR)));

		itmChangeToAll.setIcon(ImageUtil.getFlatSVGIconFrom(Icons.get("allGames"), size, ColorStore.current().getColor(ColorConstants.SVG_NO_COLOR)));
		itmChangeToFavorites.setIcon(ImageUtil.getFlatSVGIconFrom(Icons.get("favorites"), size, new Color(255, 220, 125)));
		itmChangeToRecentlyPlayed.setIcon(ImageUtil.getFlatSVGIconFrom(Icons.get("recentlyPlayed"), size, new Color(181, 201, 255)));
		itmChangeToRecycleBin.setIcon(ImageUtil.getFlatSVGIconFrom(Icons.get("allGames"), size, ColorStore.current().getColor(ColorConstants.SVG_NO_COLOR)));
		itmSetFilter.setIcon(ImageUtil.getFlatSVGIconFrom(Icons.get("setFilter"), size, ColorStore.current().getColor(ColorConstants.SVG_NO_COLOR)));
		itmRenameGames.setIcon(ImageUtil.getFlatSVGIconFrom(Icons.get("rename"), size, ColorStore.current().getColor(ColorConstants.SVG_NO_COLOR)));
		itmTagsSearch.setIcon(ImageUtil.getFlatSVGIconFrom(Icons.get("tag"), size, new Color(168, 124, 160)));
		itmCoverSearch.setIcon(ImageUtil.getFlatSVGIconFrom(Icons.get("picture"), size, new Color(181, 201, 255)));
		itmTrailerSearch.setIcon(ImageUtil.getImageIconFrom(Icons.get("video", size, size)));
		itmSetColumnWidth.setIcon(ImageUtil.getFlatSVGIconFrom(Icons.get("columnWidth"), size, ColorStore.current().getColor(ColorConstants.SVG_NO_COLOR)));
		itmSetRowHeight.setIcon(ImageUtil.getFlatSVGIconFrom(Icons.get("rowHeight"), size, ColorStore.current().getColor(ColorConstants.SVG_NO_COLOR)));
		itmRefresh.setIcon(ImageUtil.getFlatSVGIconFrom(Icons.get("refresh"), size, ColorStore.current().getColor(ColorConstants.SVG_NO_COLOR)));
		itmFullScreen.setIcon(ImageUtil.getFlatSVGIconFrom(Icons.get("fullscreen"), size, new Color(144, 238, 144)));
	}

	private void addComponentsToJComponent(JComponent component, Component... components) {
		for (Component o : components) {
			component.add(o);
		}
	}

	@Override
	public void actionPerformed(ActionEvent e) {
		e.getSource();
	}

	public void languageChanged() {
		mnuAdd.setText(Messages.get(MessageConstants.ADD));
		mnuSort.setText(Messages.get(MessageConstants.SORT_BY));
		mnuGroup.setText(Messages.get(MessageConstants.GROUP_BY));
		itmAddFiles.setText(Messages.get(MessageConstants.FILES, "") + "...");
		itmAddFolders.setText(Messages.get(MessageConstants.FOLDERS, "") + "...");
		itmFilesFromClipboard.setText(Messages.get(MessageConstants.FILES_FROM_CLIPBOARD));
		itmSetColumnWidth.setText(Messages.get(MessageConstants.SET_COLUMN_WIDTH));
		itmSetRowHeight.setText(Messages.get(MessageConstants.SET_ROW_HEIGHT));
		itmRefresh.setText(Messages.get(MessageConstants.REFRESH));
		mnuChangeTo.setText(Messages.get(MessageConstants.CHANGE_TO));
		itmSetFilter.setText(Messages.get(MessageConstants.SET_FILTER));
		itmChooseDetails.setText(Messages.get(MessageConstants.CHOOSE_DETAILS));
		itmRenameGames.setText(Messages.get(MessageConstants.RENAME_GAMES) + "...");
		itmTagsSearch.setText(Messages.get(MessageConstants.TAG_FROM_WEB) + "...");
		itmCoverSearch.setText(Messages.get(MessageConstants.COVER_FROM_WEB) + "...");
		itmTrailerSearch.setText(Messages.get(MessageConstants.TRAILER_SEARCH) + "...");
		itmWebSearchSettings.setText(Messages.get(MessageConstants.WEB_SEARCH_SETTINGS) + "...");
		itmFullScreen.setText(Messages.get(MessageConstants.FULLSCREEN));
		//		itmWelcomeView.setText(Messages.get(MessageConstants.VIEW_WELCOME));
		//		itmListView.setText(Messages.get("viewListHorizontalSb"));
		//		itmElementView.setText(Messages.get("viewListVerticalSb"));
		//		itmListViewOneColumn.setText(Messages.get("viewListOneColumn"));
		//		itmTableView.setText(Messages.get("viewDetails"));
		//		itmContentView.setText(Messages.get("viewContent"));
		//		itmCoverView.setText(Messages.get("viewCovers"));
		itmSortTitle.setText(Messages.get(MessageConstants.BY_TITLE));
		itmSortPlatform.setText(Messages.get(MessageConstants.BY_PLATFORM));
		itmSortAscending.setText(Messages.get(MessageConstants.ASCENDING));
		itmSortDescending.setText(Messages.get(MessageConstants.DESCENDING));
		itmGroupBlank.setText(Messages.get(MessageConstants.BY_NOTHING));
		itmGroupTitle.setText(Messages.get(MessageConstants.BY_TITLE));
		itmGroupPlatform.setText(Messages.get(MessageConstants.BY_PLATFORM));
		itmGroupAscending.setText(Messages.get(MessageConstants.ASCENDING));
		itmGroupDescending.setText(Messages.get(MessageConstants.DESCENDING));
		itmChangeToAll.setText(Messages.get(MessageConstants.ALL_GAMES));
		itmChangeToFavorites.setText(Messages.get(MessageConstants.FAVORITES));
		itmChangeToRecentlyPlayed.setText(Messages.get(MessageConstants.RECENTLY_PLAYED));
		itmChangeToRecycleBin.setText(Messages.get(MessageConstants.RECYCLE_BIN));
		itmHideExtensions.setText(Messages.get(MessageConstants.HIDE_EXTENSIONS));
		itmTouchScreenOptimizedScroll.setText(Messages.get(MessageConstants.TOUCH_SCREEN_SCROLL));
		itmTouchScreenOptimizedScroll.setToolTipText(Messages.get(MessageConstants.TOUCH_SCREEN_SCROLL_TOOL_TIP));
		itmShowToolTipTexts.setText(Messages.get(MessageConstants.SHOW_TOOL_TIP_TEXTS));
	}

	public void addAddFilesListener(ActionListener l) {
		itmAddFiles.addActionListener(l);
	}

	public void addAddFoldersListener(ActionListener l) {
		itmAddFolders.addActionListener(l);
	}

	public void addAddGameOrEmulatorFromClipboardListener(Action l) {
		itmFilesFromClipboard.addActionListener(l);
	}

	public void addSortByTitleListener(ActionListener l) {
		itmSortTitle.addActionListener(l);
	}

	public void addSortByPlatformListener(ActionListener l) {
		itmSortPlatform.addActionListener(l);
	}

	public void addSortAscendingListener(ActionListener l) {
		itmSortAscending.addActionListener(l);
	}

	public void addSortDescendingListener(ActionListener l) {
		itmSortDescending.addActionListener(l);
	}

	public void addGroupByNoneListener(ActionListener l) {
		itmGroupBlank.addActionListener(l);
	}

	public void addGroupByTitleListener(ActionListener l) {
		itmGroupTitle.addActionListener(l);
	}

	public void addGroupByPlatformListener(ActionListener l) {
		itmGroupPlatform.addActionListener(l);
	}

	public void sortBy(int sortBy) {
		switch (sortBy) {
		case ViewConstants.SORT_BY_PLATFORM:
			itmSortPlatform.setSelected(true);
			break;
		case ViewConstants.SORT_BY_TITLE:
			itmSortTitle.setSelected(true);
			break;
		}
	}

	public void sortOrder(int sortOrder) {
		switch (sortOrder) {
		case ViewConstants.SORT_ASCENDING:
			itmSortAscending.setSelected(true);
			break;
		case ViewConstants.SORT_DESCENDING:
			itmSortDescending.setSelected(true);
			break;
		}
	}

	public void addSetFilterListener(ActionListener l) {
		itmSetFilter.addActionListener(l);
	}

	public void addHideExtensionsListener(ActionListener l) {
		itmHideExtensions.addActionListener(l);
	}

	public void addTouchScreenOptimizedScrollListener(ActionListener l) {
		itmTouchScreenOptimizedScroll.addActionListener(l);
	}

	public void addShowToolTipTextsListener(ActionListener l) {
		itmShowToolTipTexts.addActionListener(l);
	}

	public void setRefreshGameListListener(ActionListener l) {
		itmRefresh.addActionListener(l);
	}

	public void addFullScreenListener(ActionListener l) {
		itmFullScreen.addActionListener(l);
	}

	public void showFilterPanel(boolean b) {
		itmSetFilter.setSelected(b);
	}
}
