package ch.sysout.emubro.ui;

import java.awt.event.MouseEvent;

import javax.swing.JList;

import ch.sysout.emubro.api.model.Game;

public class GameList extends JList<Game> {
	private static final long serialVersionUID = 1L;

	public GameList() {
		super();

		// Attach a mouse motion adapter to let us know the mouse is over an
		// item and to show the tip.

	}

	// Expose the getToolTipText event of our JList
	@Override
	public String getToolTipText(MouseEvent e) {
		return super.getToolTipText();
	}
}
