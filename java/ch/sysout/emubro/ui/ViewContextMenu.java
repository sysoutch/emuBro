package ch.sysout.emubro.ui;

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

import ch.sysout.emubro.controller.ViewConstants;
import ch.sysout.emubro.util.MessageConstants;
import ch.sysout.ui.ImageUtil;
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
	private JMenuItem itmSetFilter;
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
				new JSeparator(), itmHideExtensions, itmTouchScreenOptimizedScroll,
				new JSeparator(), itmFullScreen);
		addComponentsToJComponent(mnuAdd, itmAddFiles, itmAddFolders, new JSeparator(), itmFilesFromClipboard);
		addComponentsToJComponent(mnuChangeTo, itmChangeToAll, itmChangeToFavorites, itmChangeToRecentlyPlayed);
		addComponentsToJComponent(mnuSort, itmSortTitle, itmSortPlatform, new JSeparator(), itmSortAscending,
				itmSortDescending);
		addComponentsToJComponent(mnuGroup, itmGroupBlank, itmGroupTitle, itmGroupPlatform, new JSeparator(),
				itmGroupAscending, itmGroupDescending);
	}

	private void initComponents() {
		mnuAdd = new JMenu(Messages.get("add"));
		mnuSort = new JMenu(Messages.get("sortBy"));
		mnuGroup = new JMenu(Messages.get("groupBy"));
		itmAddFiles = new JMenuItem(Messages.get(MessageConstants.FILES, "") + "...");
		itmAddFolders = new JMenuItem(Messages.get(MessageConstants.FOLDERS, "") + "...");
		itmFilesFromClipboard = new JMenuItem(Messages.get(MessageConstants.FILES_FROM_CLIPBOARD));
		itmSetColumnWidth = new JMenuItem(Messages.get("setColumnWidth"));
		itmSetRowHeight = new JMenuItem(Messages.get("setRowHeight"));
		itmRefresh = new JMenuItem(Messages.get("refresh"));
		mnuChangeTo = new JMenu(Messages.get("changeTo"));
		itmSetFilter = new JMenuItem(Messages.get("setFilter"));
		itmChooseDetails = new JMenuItem(Messages.get("chooseDetails"));
		itmRenameGames = new JMenuItem(Messages.get("renameGames") + "...");
		itmTagsSearch = new JMenuItem(Messages.get(MessageConstants.TAG_FROM_WEB) + "...");
		itmCoverSearch = new JMenuItem(Messages.get(MessageConstants.COVER_FROM_WEB) + "...");
		itmTrailerSearch = new JMenuItem(Messages.get("trailerSearch") + "...");
		itmWebSearchSettings = new JMenuItem(Messages.get("webSearchSettings") + "...");
		itmFullScreen = new JCheckBoxMenuItem(Messages.get("fullscreen"));
		//		itmWelcomeView = new JRadioButtonMenuItem();
		//		itmListView = new JRadioButtonMenuItem(Messages.get("viewListHorizontalSb"));
		//		itmElementView = new JRadioButtonMenuItem(Messages.get("viewListVerticalSb"));
		//		itmListViewOneColumn = new JRadioButtonMenuItem(Messages.get("viewListOneColumn"));
		//		itmTableView = new JRadioButtonMenuItem(Messages.get("viewDetails"));
		//		itmContentView = new JRadioButtonMenuItem(Messages.get("viewContent"));
		//		itmCoverView = new JRadioButtonMenuItem(Messages.get("viewCovers"));
		itmSortTitle = new JRadioButtonMenuItem(Messages.get("byTitle"));
		itmSortPlatform = new JRadioButtonMenuItem(Messages.get("byPlatform"));
		itmSortAscending = new JRadioButtonMenuItem(Messages.get("ascending"));
		itmSortDescending = new JRadioButtonMenuItem(Messages.get("descending"));
		itmGroupBlank = new JRadioButtonMenuItem(Messages.get("byNothing"));
		itmGroupTitle = new JRadioButtonMenuItem(Messages.get("byTitle"));
		itmGroupPlatform = new JRadioButtonMenuItem(Messages.get("byPlatform"));
		itmGroupAscending = new JRadioButtonMenuItem(Messages.get("ascending"));
		itmGroupDescending = new JRadioButtonMenuItem(Messages.get("descending"));
		itmChangeToAll = new JRadioButtonMenuItem(Messages.get("allGames"));
		itmChangeToFavorites = new JRadioButtonMenuItem(Messages.get("favorites"));
		itmChangeToRecentlyPlayed = new JRadioButtonMenuItem(Messages.get("recentlyPlayed"));
		itmHideExtensions = new JCheckBoxMenuItem(Messages.get("hideExtensions"));
		itmTouchScreenOptimizedScroll = new JCheckBoxMenuItem(Messages.get(MessageConstants.TOUCH_SCREEN_SCROLL));
	}

	private void setAccelerators() {
		itmChangeToAll.setAccelerator(KeyStroke.getKeyStroke("control 1"));
		itmChangeToFavorites.setAccelerator(KeyStroke.getKeyStroke("control 2"));
		itmChangeToRecentlyPlayed.setAccelerator(KeyStroke.getKeyStroke("control 3"));
		itmRefresh.setAccelerator(KeyStroke.getKeyStroke("F5"));
		itmFullScreen.setAccelerator(KeyStroke.getKeyStroke("F11"));
	}

	private void setButtonGroups() {
		addToButtonGroup(new ButtonGroup(), itmSortTitle, itmSortPlatform);
		addToButtonGroup(new ButtonGroup(), itmSortAscending, itmSortDescending);
		addToButtonGroup(new ButtonGroup(), itmGroupTitle, itmGroupPlatform, itmGroupBlank);
		addToButtonGroup(new ButtonGroup(), itmGroupAscending, itmGroupDescending);
		addToButtonGroup(new ButtonGroup(), itmChangeToAll, itmChangeToRecentlyPlayed, itmChangeToFavorites);
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
		itmAddFiles.setIcon(ImageUtil.getImageIconFrom(Icons.get("addFile", size, size)));
		itmAddFolders.setIcon(ImageUtil.getImageIconFrom(Icons.get("addFolder", size, size)));
		itmFilesFromClipboard.setIcon(ImageUtil.getImageIconFrom(Icons.get("filesFromClipboard", size, size)));
		itmChangeToAll.setIcon(ImageUtil.getImageIconFrom(Icons.get("allGames", size, size)));
		itmChangeToFavorites.setIcon(ImageUtil.getImageIconFrom(Icons.get("favorites", size, size)));
		itmChangeToRecentlyPlayed.setIcon(ImageUtil.getImageIconFrom(Icons.get("recentlyPlayed", size, size)));
		itmSetFilter.setIcon(ImageUtil.getImageIconFrom(Icons.get("setFilter", size, size)));
		itmRenameGames.setIcon(ImageUtil.getImageIconFrom(Icons.get("rename", size, size)));
		itmTagsSearch.setIcon(ImageUtil.getImageIconFrom(Icons.get("tags", size, size)));
		itmCoverSearch.setIcon(ImageUtil.getImageIconFrom(Icons.get("picture", size, size)));
		itmTrailerSearch.setIcon(ImageUtil.getImageIconFrom(Icons.get("video", size, size)));
		itmSetColumnWidth.setIcon(ImageUtil.getImageIconFrom(Icons.get("columnWidth", size, size)));
		itmSetRowHeight.setIcon(ImageUtil.getImageIconFrom(Icons.get("rowHeight", size, size)));
		itmRefresh.setIcon(ImageUtil.getImageIconFrom(Icons.get("refresh", size, size)));
		itmFullScreen.setIcon(ImageUtil.getImageIconFrom(Icons.get("fullscreen", size, size)));
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
		mnuAdd.setText(Messages.get("add"));
		mnuSort.setText(Messages.get("sortBy"));
		mnuGroup.setText(Messages.get("groupBy"));
		itmAddFiles.setText(Messages.get(MessageConstants.FILES, "") + "...");
		itmAddFolders.setText(Messages.get(MessageConstants.FOLDERS, "") + "...");
		itmFilesFromClipboard.setText(Messages.get(MessageConstants.FILES_FROM_CLIPBOARD));
		itmSetColumnWidth.setText(Messages.get("setColumnWidth"));
		itmSetRowHeight.setText(Messages.get("setRowHeight"));
		itmRefresh.setText(Messages.get("refresh"));
		mnuChangeTo.setText(Messages.get("changeTo"));
		itmSetFilter.setText(Messages.get("setFilter"));
		itmChooseDetails.setText(Messages.get("chooseDetails"));
		itmRenameGames.setText(Messages.get("renameGames") + "...");
		itmTagsSearch.setText(Messages.get(MessageConstants.TAG_FROM_WEB) + "...");
		itmCoverSearch.setText(Messages.get(MessageConstants.COVER_FROM_WEB) + "...");
		itmTrailerSearch.setText(Messages.get("trailerSearch") + "...");
		itmWebSearchSettings.setText(Messages.get(MessageConstants.WEB_SEARCH_SETTINGS) + "...");
		itmFullScreen.setText(Messages.get("fullscreen"));
		//		itmWelcomeView.setText(Messages.get(MessageConstants.VIEW_WELCOME));
		//		itmListView.setText(Messages.get("viewListHorizontalSb"));
		//		itmElementView.setText(Messages.get("viewListVerticalSb"));
		//		itmListViewOneColumn.setText(Messages.get("viewListOneColumn"));
		//		itmTableView.setText(Messages.get("viewDetails"));
		//		itmContentView.setText(Messages.get("viewContent"));
		//		itmCoverView.setText(Messages.get("viewCovers"));
		itmSortTitle.setText(Messages.get("byTitle"));
		itmSortPlatform.setText(Messages.get("byPlatform"));
		itmSortAscending.setText(Messages.get("ascending"));
		itmSortDescending.setText(Messages.get("descending"));
		itmGroupBlank.setText(Messages.get("byNothing"));
		itmGroupTitle.setText(Messages.get("byTitle"));
		itmGroupPlatform.setText(Messages.get("byPlatform"));
		itmGroupAscending.setText(Messages.get("ascending"));
		itmGroupDescending.setText(Messages.get("descending"));
		itmChangeToAll.setText(Messages.get("allGames"));
		itmChangeToFavorites.setText(Messages.get("favorites"));
		itmChangeToRecentlyPlayed.setText(Messages.get("recentlyPlayed"));
		itmHideExtensions.setText(Messages.get(MessageConstants.HIDE_EXTENSIONS));
		itmTouchScreenOptimizedScroll.setText(Messages.get(MessageConstants.TOUCH_SCREEN_SCROLL));
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
}
