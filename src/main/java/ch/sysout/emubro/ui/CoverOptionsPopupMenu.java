package ch.sysout.emubro.ui;

import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;

import javax.swing.AbstractButton;
import javax.swing.ImageIcon;
import javax.swing.JMenu;
import javax.swing.JMenuItem;
import javax.swing.JPopupMenu;
import javax.swing.JSeparator;
import javax.swing.SwingUtilities;
import javax.swing.event.PopupMenuEvent;

import ch.sysout.emubro.api.PopupMenuAdapter;
import ch.sysout.util.ScreenSizeUtil;

public class CoverOptionsPopupMenu extends JPopupMenu implements ActionListener {
	private static final long serialVersionUID = 1L;

	private JMenu mnuAddCover = new JMenu("Cover hinzufügen");
	private JMenuItem itmAddCoverComputer = new JMenuItem("vom Computer...");
	private JMenuItem itmAddCoverInternet = new JMenuItem("aus dem Internet...");

	private JMenuItem itmRemoveCover = new JMenuItem("Cover entfernen");
	private JMenuItem itmSaveCover = new JMenuItem("Cover speichern...");

	public CoverOptionsPopupMenu() {
		mnuAddCover.add(itmAddCoverComputer);
		mnuAddCover.add(itmAddCoverInternet);

		add(mnuAddCover);
		add(itmRemoveCover);
		add(new JSeparator());
		add(itmSaveCover);

		setAccelerators();
		setIcons();
		addListeners();
		setVisible(true);
	}

	private void setAccelerators() {
	}

	private void setIcons() {
		String resolution = ScreenSizeUtil.is3k() ? "32x32" : "16x16";
		setIcon(mnuAddCover, "/images/" + resolution + "/add.png");
		setIcon(itmAddCoverComputer, "/images/" + resolution + "/my_computer.png");
		setIcon(itmAddCoverInternet, "/images/" + resolution + "/internet-web-browser.png");
		setIcon(itmRemoveCover, "/images/" + resolution + "/remove.png");
		setIcon(itmSaveCover, "/images/" + resolution + "/save.png");
	}

	private void setIcon(AbstractButton btn, String pathToIcon) {
		btn.setIcon(new ImageIcon(getClass().getResource(pathToIcon)));
	}

	private void addListeners() {
		addActionListeners(itmAddCoverComputer, itmAddCoverInternet, itmRemoveCover, itmSaveCover);

		addPopupMenuListener(new PopupMenuAdapter() {
			@Override
			public void popupMenuWillBecomeVisible(PopupMenuEvent e) {
				super.popupMenuWillBecomeVisible(e);
				// boolean enabled = currentGame.hasCover();
				// itmRemoveCover.setEnabled(enabled);
				// itmSaveCover.setEnabled(enabled);
			}
		});
	}

	private void addActionListeners(AbstractButton... buttons) {
		for (AbstractButton btn : buttons) {
			btn.addActionListener(this);
		}
	}

	@Override
	public void actionPerformed(ActionEvent e) {
		Object source = e.getSource();
		if (source == itmAddCoverComputer) {
			SwingUtilities.invokeLater(new Runnable() {

				@Override
				public void run() {
					// showCoverFileChooser();
				}
			});
		} else if (source == itmAddCoverInternet) {
			// try {
			// String title = currentGame.getTitle().trim()
			// .split("\\(")[0].split("\\[")[0]
			// .replace(".iso", "")
			// .replace(".zip", "")
			// .replace(".rar", "")
			// .replace(".", " ")
			// .replace("_", " ")
			// .replace("&", "%26");
			//
			// while (title.contains(" ")) {
			// title = title.replace(" ", " ");
			// }
			// title = title.replace(" ", "+");
			// openUrl("https://www.google.com/search?q=" + title +
			// "+cover&tbm=isch");
			// } catch (IOException e1) {
			// e1.printStackTrace();
			// } catch (URISyntaxException e1) {
			// e1.printStackTrace();
			// }
			// showCoverUrlInputDialog();
		} else if (source == itmRemoveCover) {
			// currentGame.removeCover();
			// updateGameCoverIfVisible();
		} else if (source == itmSaveCover) {

		}
	}
}