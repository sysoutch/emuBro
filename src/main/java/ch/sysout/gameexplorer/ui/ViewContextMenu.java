package ch.sysout.gameexplorer.ui;

import java.awt.Component;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;

import javax.swing.JCheckBoxMenuItem;
import javax.swing.JComponent;
import javax.swing.JMenu;
import javax.swing.JMenuItem;
import javax.swing.JPopupMenu;
import javax.swing.JRadioButtonMenuItem;
import javax.swing.JSeparator;

import ch.sysout.util.Icons;
import ch.sysout.util.Messages;
import ch.sysout.util.ScreenSizeUtil;

public class ViewContextMenu extends JPopupMenu implements ActionListener {
	private static final long serialVersionUID = 1L;

	private JMenu mnuSort;
	private JMenu mnuGroup;
	private JMenu mnuChangeTo;

	private JMenuItem itmSetFilter;
	private JMenuItem itmSetColumnWidth;
	private JMenuItem itmSetRowHeight;
	private JMenuItem itmChooseDetails;
	private JMenuItem itmRefresh;
	private JCheckBoxMenuItem itmFullScreen;

	private JRadioButtonMenuItem itmListView;
	private JRadioButtonMenuItem itmElementView;
	private JRadioButtonMenuItem itmListViewOneColumn;
	private JRadioButtonMenuItem itmTableView;
	private JRadioButtonMenuItem itmCoverView;
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
	private JRadioButtonMenuItem itmChangeToRecentlyPlayed;
	private JRadioButtonMenuItem itmChangeToFavorites;

	public ViewContextMenu() {
		initComponents();
		setIcons();
		addComponentsToJComponent(this, itmListView, itmElementView, itmTableView, itmCoverView, new JSeparator(),
				mnuSort, mnuGroup, new JSeparator(), itmSetFilter, itmChooseDetails, new JSeparator(),
				itmSetColumnWidth, itmSetRowHeight, new JSeparator(), mnuChangeTo, itmRefresh, new JSeparator(),
				itmFullScreen);
	}

	private void initComponents() {
		mnuSort = new JMenu(Messages.get("sortBy"));
		mnuGroup = new JMenu(Messages.get("groupBy"));
		itmSetColumnWidth = new JMenuItem(Messages.get("setColumnWidth"));
		itmSetRowHeight = new JMenuItem(Messages.get("setRowHeight"));
		mnuChangeTo = new JMenu(Messages.get("changeTo"));
		itmSetFilter = new JMenuItem(Messages.get("setFilter"));
		itmChooseDetails = new JMenuItem(Messages.get("chooseDetails"));
		itmRefresh = new JMenuItem(Messages.get("refresh"));
		itmFullScreen = new JCheckBoxMenuItem(Messages.get("fullscreen"));
		itmListView = new JRadioButtonMenuItem(Messages.get("viewListHorizontalSb"));
		itmElementView = new JRadioButtonMenuItem(Messages.get("viewListVerticalSb"));
		itmListViewOneColumn = new JRadioButtonMenuItem(Messages.get("viewListOneColumn"));
		itmTableView = new JRadioButtonMenuItem(Messages.get("viewDetails"));
		itmCoverView = new JRadioButtonMenuItem(Messages.get("viewCovers"));
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
		itmChangeToRecentlyPlayed = new JRadioButtonMenuItem(Messages.get("recentlyPlayed"));
		itmChangeToFavorites = new JRadioButtonMenuItem(Messages.get("favorites"));
	}

	private void setIcons() {
		int size = ScreenSizeUtil.is3k() ? 24 : 16;
		itmListView.setIcon(ImageUtil.getImageIconFrom(Icons.get("viewList", size, size)));
		itmElementView.setIcon(ImageUtil.getImageIconFrom(Icons.get("viewList", size, size)));
		itmListViewOneColumn.setIcon(ImageUtil.getImageIconFrom(Icons.get("viewList", size, size)));
		itmTableView.setIcon(ImageUtil.getImageIconFrom(Icons.get("viewTable", size, size)));
		itmCoverView.setIcon(ImageUtil.getImageIconFrom(Icons.get("viewCovers", size, size)));
		itmChangeToAll.setIcon(ImageUtil.getImageIconFrom(Icons.get("allGames", size, size)));
		itmChangeToRecentlyPlayed.setIcon(ImageUtil.getImageIconFrom(Icons.get("recentlyPlayed", size, size)));
		itmChangeToFavorites.setIcon(ImageUtil.getImageIconFrom(Icons.get("favorites", size, size)));
		itmSetFilter.setIcon(ImageUtil.getImageIconFrom(Icons.get("setFilter", size, size)));
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
		mnuSort.setText(Messages.get("sortBy"));
		mnuGroup.setText(Messages.get("groupBy"));
		itmSetColumnWidth.setText(Messages.get("setColumnWidth"));
		itmSetRowHeight.setText(Messages.get("setRowHeight"));
		mnuChangeTo.setText(Messages.get("changeTo"));
		itmSetFilter.setText(Messages.get("setFilter"));
		itmChooseDetails.setText(Messages.get("chooseDetails"));
		itmRefresh.setText(Messages.get("refresh"));
		itmFullScreen.setText(Messages.get("fullscreen"));
		itmListView.setText(Messages.get("viewListHorizontalSb"));
		itmElementView.setText(Messages.get("viewListVerticalSb"));
		itmListViewOneColumn.setText(Messages.get("viewListOneColumn"));
		itmTableView.setText(Messages.get("viewDetails"));
		itmCoverView.setText(Messages.get("viewCovers"));
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
		itmChangeToRecentlyPlayed.setText(Messages.get("recentlyPlayed"));
		itmChangeToFavorites.setText(Messages.get("favorites"));
	}
}
