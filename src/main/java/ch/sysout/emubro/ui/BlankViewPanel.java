package ch.sysout.emubro.ui;

import java.awt.Color;
import java.awt.dnd.DropTargetListener;
import java.awt.event.ActionListener;
import java.awt.event.MouseListener;
import java.awt.event.MouseWheelListener;
import java.util.List;

import javax.swing.Action;
import javax.swing.ImageIcon;
import javax.swing.JPanel;

import ch.sysout.emubro.api.event.GameAddedEvent;
import ch.sysout.emubro.api.event.GameRemovedEvent;
import ch.sysout.emubro.api.event.GameSelectionEvent;
import ch.sysout.emubro.api.model.Game;
import ch.sysout.emubro.api.model.PlatformComparator;
import ch.sysout.emubro.controller.GameSelectionListener;
import ch.sysout.emubro.controller.ViewConstants;
import ch.sysout.emubro.impl.event.NavigationEvent;

public class BlankViewPanel extends ViewPanel {
	private static final long serialVersionUID = 1L;

	public BlankViewPanel() {
		setBackground(Color.WHITE);
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
	public void navigationChanged(NavigationEvent e) {
	}

	@Override
	public void increaseFontSize() {
	}

	@Override
	public void decreaseFontSize() {
	}

	@Override
	public void pinColumnWidthSliderPanel(JPanel pnlColumnWidthSlider) {
		// TODO Auto-generated method stub

	}

	@Override
	public void unpinColumnWidthSliderPanel(JPanel pnlColumnWidthSlider) {
		// TODO Auto-generated method stub

	}

	@Override
	public void pinRowHeightSliderPanel(JPanel pnlRowHeightSlider) {
		// TODO Auto-generated method stub

	}

	@Override
	public void unpinRowHeightSliderPanel(JPanel pnlRowHeightSlider) {
		// TODO Auto-generated method stub

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
		// TODO Auto-generated method stub

	}

	@Override
	public void gameAdded(GameAddedEvent e) {
		// TODO Auto-generated method stub

	}

	@Override
	public void gameRemoved(GameRemovedEvent e) {
		// TODO Auto-generated method stub

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
	public void gameCoverAdded(int gameId, ImageIcon ico) {
	}

	@Override
	public void addAddGameOrEmulatorFromClipboardListener(Action l) {
	}
}
