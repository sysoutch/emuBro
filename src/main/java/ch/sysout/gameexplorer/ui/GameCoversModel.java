package ch.sysout.gameexplorer.ui;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import javax.swing.ImageIcon;

import ch.sysout.gameexplorer.api.model.Game;
import ch.sysout.gameexplorer.api.model.Platform;
import ch.sysout.gameexplorer.ui.listener.CoversModelListener;

public class GameCoversModel {
	private Map<Integer, Platform> platforms = new HashMap<>();
	private Map<Integer, Game> games = new HashMap<>();
	private Map<Integer, ImageIcon> icons = new HashMap<>();

	private List<CoversModelListener> listeners = new ArrayList<>();

	public GameCoversModel() {
	}

	public void addElement(Game game) {
		games.put(game.getId(), game);
		fireElementAdded(game);
	}

	public void removeElement(Game game) {
		games.remove(game.getId());
		fireElementRemoved(game);
	}

	public void removeAllElements() {
		games.clear();
		fireAllElementsRemoved();
	}

	private void fireElementAdded(Game game) {
		for (CoversModelListener l : listeners) {
			l.elementAdded(game);
		}
	}

	private void fireElementRemoved(Game game) {
		for (CoversModelListener l : listeners) {
			l.elementRemoved(game);
		}
	}

	private void fireAllElementsRemoved() {
		for (CoversModelListener l : listeners) {
			l.allElementsRemoved();
		}
	}

	public void initPlatforms(List<Platform> platforms2) {
		for (Platform p : platforms2) {
			platforms.put(p.getId(), p);
		}
	}

	public void addCoversModelListener(CoversModelListener l) {
		listeners.add(l);
	}

	public void removeCoversModelListener(CoversModelListener l) {
		listeners.remove(l);
	}

	public int getSize() {
		return games.size();
	}

	public Game getElementAt(int index) {
		Game game = games.get(index);
		// if (game.getName().length() >= 50) {
		// game.setName(game.getName().substring(0, 46)+"...");
		// }
		return game;
	}

	public Game get(int index) {
		return games.get(index);
	}
}