package ch.sysout.gameexplorer.ui;

import java.awt.Component;
import java.awt.event.ActionListener;

import javax.swing.Action;
import javax.swing.JComponent;
import javax.swing.JMenu;
import javax.swing.JMenuItem;
import javax.swing.JPopupMenu;
import javax.swing.JSeparator;

import ch.sysout.util.Icons;
import ch.sysout.util.Messages;
import ch.sysout.util.ScreenSizeUtil;

public class GameContextMenu extends JPopupMenu {
	private static final long serialVersionUID = 1L;

	private JMenuItem itmRunGame = new JMenuItem("<html><b>" + Messages.get("runGame") + "</b></html>");
	private JMenu mnuRunWith = new JMenu(Messages.get("runWith") + "...");
	private JMenuItem itmRunWithDefault = new JMenuItem("Default emulator");

	private JMenu mnuRateGame = new JMenu(Messages.get("rateGame"));
	private JMenuItem itmAddCoverComputer = new JMenuItem(Messages.get("addCoverFromComputer"));
	private JMenuItem itmAddCoverWeb = new JMenuItem(Messages.get("coverFromWeb"));
	private JMenuItem itmShowTrailer = new JMenuItem(Messages.get("showTrailer"));
	private JMenuItem itmRenameGame = new JMenuItem(Messages.get("rename"));
	private JMenuItem itmRemoveGame = new JMenuItem(Messages.get("remove"));
	private JMenuItem itmOpenGameFolder = new JMenuItem(Messages.get("openGamePath"));
	private JMenuItem itmGameProperties = new JMenuItem(Messages.get("gameProperties"));

	public GameContextMenu() {
		setIcons();
		addComponentsToJComponent(this, itmRunGame, mnuRunWith, new JSeparator(), mnuRateGame, itmAddCoverComputer, new JSeparator(),
				itmAddCoverWeb, itmShowTrailer, new JSeparator(),
				itmRemoveGame, itmRenameGame, new JSeparator(),
				itmOpenGameFolder, new JSeparator(), itmGameProperties);
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
		itmOpenGameFolder.setIcon(ImageUtil.getImageIconFrom(Icons.get("openGamePath", size, size)));
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
		itmRunGame.setText("<html><b>" + Messages.get("runGame") + "</b></html>");
		mnuRunWith.setText(Messages.get("runWith") + "...");
		itmRunWithDefault.setText("Default emulator");
		itmShowTrailer.setText(Messages.get("showTrailer"));
		mnuRateGame.setText(Messages.get("rateGame"));
		itmAddCoverComputer.setText(Messages.get("addCoverFromComputer"));
		itmAddCoverWeb.setText(Messages.get("coverFromWeb"));
		itmRenameGame.setText(Messages.get("rename"));
		itmRemoveGame.setText(Messages.get("remove"));
		itmOpenGameFolder.setText(Messages.get("openGamePath"));
		itmGameProperties.setText(Messages.get("gameProperties"));
	}

	public void addOpenGameFolder(ActionListener l) {
		itmOpenGameFolder.addActionListener(l);
	}
}
