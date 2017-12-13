package ch.sysout.emubro.ui;

import java.awt.Component;
import java.awt.event.ActionListener;

import javax.swing.Action;
import javax.swing.JComponent;
import javax.swing.JMenu;
import javax.swing.JMenuItem;
import javax.swing.JPopupMenu;
import javax.swing.JSeparator;

import ch.sysout.emubro.api.event.GameSelectionEvent;
import ch.sysout.emubro.controller.GameSelectionListener;
import ch.sysout.emubro.util.MessageConstants;
import ch.sysout.util.Icons;
import ch.sysout.util.Messages;
import ch.sysout.util.ScreenSizeUtil;

public class GameContextMenu extends JPopupMenu implements GameSelectionListener {
	private static final long serialVersionUID = 1L;

	private JMenuItem itmRunGame = new JMenuItem("");
	private JMenu mnuRunWith = new JMenu("");
	private JMenuItem itmRunWithDefault = new JMenuItem();
	private JMenuItem itmConfigureEmulator = new JMenuItem();
	private JMenu mnuRateGame = new JMenu();
	private JMenuItem itmAddCoverComputer = new JMenuItem();
	private JMenuItem itmAddCoverWeb = new JMenuItem();
	private JMenuItem itmShowTrailer = new JMenuItem();
	private JMenuItem itmRenameGame = new JMenuItem();
	private JMenuItem itmRemoveGame = new JMenuItem();
	private JMenuItem itmOpenGameFolder = new JMenuItem();
	private JMenuItem itmGameProperties = new JMenuItem();
	private RatingBarPanel pnlRatingBar = new RatingBarPanel(null, false);
	private JMenuItem itmComment = new JMenuItem();

	public GameContextMenu() {
		setIcons();
		addComponentsToJComponent(this, itmRunGame, mnuRunWith, new JSeparator(), itmConfigureEmulator, new JSeparator(), mnuRateGame, itmAddCoverComputer, new JSeparator(),
				itmAddCoverWeb, itmShowTrailer, new JSeparator(),
				itmRemoveGame, itmRenameGame, new JSeparator(),
				itmOpenGameFolder, new JSeparator(), itmGameProperties);
		addComponentsToJComponent(mnuRateGame, pnlRatingBar, new JSeparator(), itmComment);
		//		addPopupMenuListener(new PopupMenuAdapter() {
		//			@Override
		//			public void popupMenuWillBecomeVisible(PopupMenuEvent e) {
		//				super.popupMenuWillBecomeVisible(e);
		//			}
		//		});
	}

	private void setIcons() {
		int size = ScreenSizeUtil.is3k() ? 24 : 16;
		itmShowTrailer.setIcon(ImageUtil.getImageIconFrom(Icons.get("video", size, size)));
		itmAddCoverWeb.setIcon(ImageUtil.getImageIconFrom(Icons.get("picture", size, size)));
		itmRunGame.setIcon(ImageUtil.getImageIconFrom(Icons.get("runGame", size, size)));
		itmConfigureEmulator.setIcon(ImageUtil.getImageIconFrom(Icons.get("settings", size, size)));
		itmComment.setIcon(ImageUtil.getImageIconFrom(Icons.get("gameComment", size, size)));
		itmOpenGameFolder.setIcon(ImageUtil.getImageIconFrom(Icons.get("openFolder", size, size)));
		itmRemoveGame.setIcon(ImageUtil.getImageIconFrom(Icons.get("remove", size, size)));
		itmRenameGame.setIcon(ImageUtil.getImageIconFrom(Icons.get("rename", size, size)));
		itmGameProperties.setIcon(ImageUtil.getImageIconFrom(Icons.get("gameProperties", size, size)));
	}

	private void addComponentsToJComponent(JComponent component, Component... components) {
		for (Component o : components) {
			component.add(o);
		}
	}

	public void addRunGameListener(ActionListener l) {
		itmRunGame.addActionListener(l);
	}

	public void addConfigureEmulatorListener(ActionListener l) {
		itmConfigureEmulator.addActionListener(l);
	}

	public void addCoverFromComputerListener(ActionListener l) {
		itmAddCoverComputer.addActionListener(l);
	}

	public void addCoverFromWebListener(ActionListener l) {
		itmAddCoverWeb.addActionListener(l);
	}

	public void addTrailerFromWebListener(ActionListener l) {
		itmShowTrailer.addActionListener(l);
	}

	public void addRemoveGameListener(Action l) {
		itmRemoveGame.addActionListener(l);
	}

	public void addRenameGameListener(Action l) {
		itmRenameGame.addActionListener(l);
	}

	public void addOpenGamePropertiesListener(ActionListener l) {
		itmGameProperties.addActionListener(l);
	}

	public void languageChanged() {
		itmRunGame.setText("<html><b>" + Messages.get(MessageConstants.RUN_GAME) + "</b></html>");
		mnuRunWith.setText(Messages.get(MessageConstants.RUN_WITH) + "...");
		itmRunWithDefault.setText(Messages.get(MessageConstants.SET_EMULATOR) + "...");
		itmConfigureEmulator.setText(Messages.get(MessageConstants.CONFIGURE_EMULATOR));
		itmShowTrailer.setText(Messages.get(MessageConstants.SHOW_TRAILER));
		mnuRateGame.setText(Messages.get(MessageConstants.RATE_GAME));
		itmComment.setText(Messages.get(MessageConstants.GAME_COMMENT)+"...");
		itmAddCoverComputer.setText(Messages.get(MessageConstants.ADD_COVER_FROM_COMPUTER));
		itmAddCoverWeb.setText(Messages.get(MessageConstants.COVER_FROM_WEB));
		itmRenameGame.setText(Messages.get(MessageConstants.RENAME));
		itmRemoveGame.setText(Messages.get(MessageConstants.REMOVE));
		itmOpenGameFolder.setText(Messages.get(MessageConstants.OPEN_GAME_PATH));
		itmGameProperties.setText(Messages.get(MessageConstants.GAME_PROPERTIES));
	}

	public void addOpenGameFolder(ActionListener l) {
		itmOpenGameFolder.addActionListener(l);
	}

	public void addRateListener(RateListener l) {
		pnlRatingBar.addRateListener(l);
	}

	public void addCommentListener(ActionListener l) {
		itmComment.addActionListener(l);
	}

	@Override
	public void gameSelected(GameSelectionEvent e) {
		pnlRatingBar.gameSelected(e);
	}
}
