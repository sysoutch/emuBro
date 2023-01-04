package ch.sysout.emubro.ui;

import java.awt.Color;
import java.awt.event.ActionListener;

import javax.swing.JCheckBoxMenuItem;
import javax.swing.JMenu;
import javax.swing.JMenuItem;
import javax.swing.JPopupMenu;
import javax.swing.JSeparator;

import ch.sysout.ui.util.ImageUtil;
import ch.sysout.util.Icons;
import ch.sysout.util.Messages;
import ch.sysout.util.ScreenSizeUtil;

class OrganizePopupMenu extends JPopupMenu {
	private static final long serialVersionUID = 1L;

	private JMenu mnuLayout = new JMenu(Messages.get("layout"));
	private JCheckBoxMenuItem itmShowMenuBar = new JCheckBoxMenuItem(Messages.get("menuBar"));
	private JCheckBoxMenuItem itmMenuBarEmbedded = new JCheckBoxMenuItem(Messages.get("menuBarEmbedded"));
	private JCheckBoxMenuItem itmShowNavigationPanel = new JCheckBoxMenuItem(Messages.get("navigationPanel"));
	private JCheckBoxMenuItem itmShowPreviewPanel = new JCheckBoxMenuItem(Messages.get("previewPanel"));
	private JCheckBoxMenuItem itmShowGameDetailsPanel = new JCheckBoxMenuItem(Messages.get("informationPanel"));
	private JCheckBoxMenuItem itmShowStatusBar = new JCheckBoxMenuItem(Messages.get("statusBar"));

	private JMenuItem itmExit = new JMenuItem(Messages.get("exit"));

	public OrganizePopupMenu() {
		itmShowMenuBar.setSelected(true);
		itmMenuBarEmbedded.setSelected(true);
		itmShowNavigationPanel.setSelected(true);
		itmShowPreviewPanel.setSelected(true);
		itmShowGameDetailsPanel.setSelected(true);
		itmShowStatusBar.setSelected(true);
		mnuLayout.add(itmShowMenuBar);
		mnuLayout.add(itmMenuBarEmbedded);
		mnuLayout.add(new JSeparator());
		mnuLayout.add(itmShowNavigationPanel);
		mnuLayout.add(itmShowPreviewPanel);
		mnuLayout.add(itmShowGameDetailsPanel);
		mnuLayout.add(itmShowStatusBar);
		add(mnuLayout);
		add(new JSeparator());
		add(itmExit);
		setAccelerators();
		setIcons();
		addListeners();
	}

	private void setAccelerators() {
	}

	private void setIcons() {
		int size = ScreenSizeUtil.is3k() ? 24 : 16;
		itmExit.setIcon(ImageUtil.getFlatSVGIconFrom(Icons.get("exit"), size, new Color(237, 67, 55)));

		// setIcon(mnuLayout, "/images/"+size+"/edit-layout.png");
		// setIcon(mnuLayout, "/images/"+size+"/layout-content.png");

		// ImageIcon icon = ImageUtil.getImageIconFrom(svgFile);
		// itmShowNavigationPanel.setIcon(icon);

		// setIcon(itmShowNavigationPanel,
		// "/images/"+resolution+"/layout-sidebar.png");
		// setIcon(itmShowPreviewPanel,
		// "/images/"+resolution+"/layout-preview-pane.png");
		// setIcon(itmShowGameDetailsPanel,
		// "/images/"+resolution+"/view-icons.png");
		// setIcon(itmProperties, "/images/"+resolution+"/settings.png");
		// setIcon(itmExit, "/images/"+resolution+"/application-exit-3.png");
	}

	private void addListeners() {
		// addPopupMenuListener(new PopupMenuAdapter() {
		// @Override
		// public void popupMenuWillBecomeVisible(PopupMenuEvent e) {
		// super.popupMenuWillBecomeVisible(e);
		// // boolean enabled = currentGame.hasCover();
		// // itmRemoveCover.setEnabled(enabled);
		// // itmSaveCover.setEnabled(enabled);
		// itmShowGameDetailsPanel.setSelected(bla.isGameOptionsPanelVisible());
		// }
		// });
	}

	public void addShowNavigationPanelListener(ActionListener l) {
		itmShowNavigationPanel.addActionListener(l);
	}

	public void addShowMenuBarListener(ActionListener l) {
		itmShowMenuBar.addActionListener(l);
	}

	public void addMenuBarEmbeddedListener(ActionListener l) {
		itmMenuBarEmbedded.addActionListener(l);
	}

	public void addShowNavigationListener(ActionListener l) {
		itmShowNavigationPanel.addActionListener(l);
	}

	public void addShowPreviewListener(ActionListener l) {
		itmShowPreviewPanel.addActionListener(l);
	}

	public void addShowGameDetailsListener(ActionListener l) {
		itmShowGameDetailsPanel.addActionListener(l);
	}

	public void addShowStatusBarListener(ActionListener l) {
		itmShowStatusBar.addActionListener(l);
	}

	public void addExitListener(ActionListener l) {
		itmExit.addActionListener(l);
	}

	public void languageChanged() {
		mnuLayout.setText(Messages.get("layout"));
		itmShowMenuBar.setText(Messages.get("menuBar"));
		itmShowNavigationPanel.setText(Messages.get("navigationPanel"));
		itmShowPreviewPanel.setText(Messages.get("previewPanel"));
		itmShowGameDetailsPanel.setText(Messages.get("informationPanel"));
		itmShowStatusBar.setText(Messages.get("statusBar"));
		itmExit.setText(Messages.get("exit"));
	}

	public void showPreviewPane(boolean b) {
		itmShowPreviewPanel.setSelected(b);
		itmShowPreviewPanel.setActionCommand(!b ? GameViewConstants.SHOW_PREVIEW_PANE
				: GameViewConstants.HIDE_PREVIEW_PANE);
	}

	public void showDetailsPane(boolean b) {
		itmShowGameDetailsPanel.setSelected(b);
	}

	public void showMenuBar(boolean b) {
		itmShowMenuBar.setSelected(b);
	}

	public void showNavigationPane(boolean b) {
		itmShowNavigationPanel.setSelected(b);
		itmShowNavigationPanel.setActionCommand(!b ? GameViewConstants.SHOW_NAVIGATION_PANE
				: GameViewConstants.HIDE_NAVIGATION_PANE);
	}

	public void showStatusBar(boolean b) {
		itmShowStatusBar.setSelected(b);
	}
}