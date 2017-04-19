package ch.sysout.gameexplorer.ui;

import java.awt.Component;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;

import javax.swing.JComponent;
import javax.swing.JMenuItem;
import javax.swing.JPopupMenu;
import javax.swing.JSeparator;

import ch.sysout.util.Messages;
import ch.sysout.util.ScreenSizeUtil;

public class GroupContextMenu extends JPopupMenu implements ActionListener {
	private static final long serialVersionUID = 1L;

	private JMenuItem itmCollapse = new JMenuItem(Messages.get("collapse"));
	private JMenuItem itmExpand = new JMenuItem(Messages.get("expand"));
	private JMenuItem itmCollapseOthers = new JMenuItem(Messages.get("collapseOthers"));
	private JMenuItem itmExpandOthers = new JMenuItem(Messages.get("expandOthers"));
	private JMenuItem itmCollapseAll = new JMenuItem(Messages.get("collapseAll"));
	private JMenuItem itmExpandAll = new JMenuItem(Messages.get("expandAll"));

	public GroupContextMenu() {
		setIcons();
		addComponentsToJComponent(this, itmCollapse, new JSeparator(), itmCollapseOthers, itmExpandOthers,
				new JSeparator(), itmCollapseAll, itmExpandAll);
	}

	private void setIcons() {
		ScreenSizeUtil.is3k();
	}

	private void addComponentsToJComponent(JComponent component, Component... components) {
		for (Component o : components) {
			component.add(o);
		}
	}

	public void addRunGameListener(ActionListener l) {
		itmCollapse.addActionListener(l);
	}

	public void addOpenGameSettingsListener(ActionListener l) {
		itmExpandAll.addActionListener(l);
	}

	public void languageChanged() {
		itmCollapse.setText(Messages.get("collapse"));
		itmExpand.setText(Messages.get("expand"));
		itmCollapseOthers.setText(Messages.get("collapseOthers"));
		itmExpandOthers.setText(Messages.get("expandOthers"));
		itmCollapseAll.setText(Messages.get("collapseAll"));
		itmExpandAll.setText(Messages.get("expandAll"));
	}

	@Override
	public void actionPerformed(ActionEvent e) {
		Object source = e.getSource();
		if (source == itmExpandAll) {
			// Game game = explorer.getGameAt(0);
			// GameSettingsDialog dlg = new GameSettingsDialog(game,
			// explorer.getPlatform(game.getPlatformId()).getEmulators());
			// dlg.setLocationRelativeTo(this);
			// dlg.setVisible(true);
		}
	}
}
