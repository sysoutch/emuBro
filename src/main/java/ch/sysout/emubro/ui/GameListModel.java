package ch.sysout.emubro.ui;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;

import javax.swing.DefaultListModel;
import javax.swing.SwingUtilities;
import javax.swing.event.ListDataListener;

import ch.sysout.emubro.api.model.Game;

public class GameListModel extends DefaultListModel<Game> {
	private static final long serialVersionUID = 1L;

	private List<Game> games = new ArrayList<>();

	private int lastGameFired = -1;

	private long lastGameFiredAt;

	public void sort() {
		Collections.sort(games);
		fireContentsChanged(this, 0, games.size());
	}

	public void sortReverseOrder() {
		Collections.reverse(games);
		fireContentsChanged(this, 0, games.size());
	}

	public void sortByPlatform(Comparator<Game> comparator) {
		Collections.sort(games, comparator);
		fireContentsChanged(this, 0, games.size());
	}

	public void sortByPlatformReverseOrder(Comparator<Game> comparator) {
		Collections.sort(games, Collections.reverseOrder(comparator));
		fireContentsChanged(this, 0, games.size());
	}

	public List<Game> getAllElements() {
		return games;
	}

	@Override
	public void addElement(final Game element) {
		games.add(element);
		SwingUtilities.invokeLater(new Runnable() {

			@Override
			public void run() {
				long duration = System.currentTimeMillis() - lastGameFiredAt;
				if (duration > 500) {
					fireIntervalAdded(element, lastGameFired + 1, games.size() - 1);
					lastGameFiredAt = System.currentTimeMillis();
					lastGameFired = games.size();
				}
			}
		});
	}

	@Override
	public void add(final int index, final Game element) {
		games.add(index, element);
		SwingUtilities.invokeLater(new Runnable() {

			@Override
			public void run() {
				long duration = System.currentTimeMillis() - lastGameFiredAt;
				if (duration > 500) {
					fireIntervalAdded(element, index, index);
					lastGameFiredAt = System.currentTimeMillis();
					lastGameFired = games.size();
				}
			}
		});
	}

	public void addElements(final List<Game> games) {
		if (games.size() > 0) {
			this.games.addAll(games);
			SwingUtilities.invokeLater(new Runnable() {

				@Override
				public void run() {
					fireIntervalAdded(this, 0, games.size() - 1);
				}
			});
		}
	}

	@Override
	public void removeAllElements() {
		fireIntervalRemoved(games, 0, games.size());
		games.clear();
	}

	@Override
	public void removeElementAt(int index) {
		games.remove(index);
		fireContentsChanged(this, index, index);
	}

	@Override
	public boolean removeElement(Object obj) {
		int index = 0;
		for (int i = 0; i < games.size(); i++) {
			if (games.get(i) == obj) {
				index = i;
				break;
			}
		}
		boolean b = games.remove(obj);
		fireContentsChanged(this, index, index);
		return b;
	}

	@Override
	public Game getElementAt(int index) {
		if (index >= 0 && index < games.size()) {
			Game game = games.get(index);
			return game;
		}
		return null;
	}

	@Override
	public Game get(int index) {
		return games.get(index);
	}

	@Override
	public int getSize() {
		return games.size();
	}

	@Override
	public void addListDataListener(ListDataListener l) {
		listenerList.add(ListDataListener.class, l);
	}

	@Override
	public void removeListDataListener(ListDataListener l) {
		listenerList.remove(ListDataListener.class, l);
	}

	@Override
	public int size() {
		return games.size();
	}

	@Override
	public boolean contains(Object elem) {
		return games.contains(elem);
	}
}
