package ch.sysout.gameexplorer.ui;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import javax.swing.ImageIcon;
import javax.swing.event.TableModelListener;
import javax.swing.table.DefaultTableModel;

import ch.sysout.gameexplorer.api.model.Game;
import ch.sysout.gameexplorer.api.model.Platform;
import ch.sysout.gameexplorer.impl.model.EmulatorConstants;
import ch.sysout.gameexplorer.impl.model.PlatformConstants;
import ch.sysout.util.Messages;

public class GameTableModel extends DefaultTableModel {
	private static final long serialVersionUID = 1L;

	private String[] columnNames = { "", Messages.get("columnTitle"), "", Messages.get("columnPlatform"),
			Messages.get("columnLastPlayed"), Messages.get("columnFilePath") };
	private Map<Integer, Platform> platforms = new HashMap<>();
	private Map<Integer, Game> games = new HashMap<>();
	private Map<Integer, ImageIcon> platformIcons = new HashMap<>();
	private Map<Integer, ImageIcon> gameIcons = new HashMap<>();
	private Map<Integer, ImageIcon> emulatorIcons = new HashMap<>();

	public GameTableModel() {
	}

	@Override
	public int findColumn(String columnName) {
		return super.findColumn(columnName);
	}

	@Override
	public int getColumnCount() {
		return columnNames.length;
	}

	@Override
	public Object getValueAt(int rowIndex, int columnIndex) {
		Object value = "??";
		Game game = games.get(rowIndex);
		if (columnIndex == -1) {
			return game;
		}
		if (game != null) {
			int platformId = game.getPlatformId();
			Platform platform = (platformId == PlatformConstants.NO_PLATFORM) ? null : platforms.get(platformId);
			String lastPlayed = game.getLastPlayed() != null ? game.getLastPlayed().toString()
					: Messages.get("neverPlayed");
			switch (columnIndex) {
			case 0:
				ImageIcon icon = null;
				if (game.hasIcon()) {
					icon = gameIcons.get(game.getId());
				} else {
					int emulatorId = game.getEmulatorId();
					if (emulatorId == EmulatorConstants.NO_EMULATOR) {
						emulatorId = platform.getDefaultEmulatorId();
					}
					icon = emulatorIcons.get(emulatorId);
				}
				value = icon;
				break;
			case 1:
				value = game.getName();
				break;
			case 2:
				ImageIcon icon2 = platformIcons.get(game.getPlatformId());
				value = icon2;
				break;
			case 3:
				value = platform;
				break;
			case 4:
				value = lastPlayed;
				break;
			case 5:
				value = game.getPath();
				break;
			}
			return value;
		}
		return null;
	}

	@Override
	public String getColumnName(int column) {
		return columnNames[column];
	}

	@Override
	public Class<?> getColumnClass(int columnIndex) {
		if (columnIndex == 0) {
			return ImageIcon.class;
		}
		if (columnIndex == 1) {
			return String.class;
		}
		if (columnIndex == 2) {
			return ImageIcon.class;
		}
		if (columnIndex == 3) {
			return Platform.class;
		}
		if (columnIndex == 4) {
			return String.class;
		}
		if (columnIndex == 5) {
			return String.class;
		}
		return String.class;
	}

	/*
	 * Override this if you want the values to be editable...
	 *
	 * @Override public void setValueAt(Object aValue, int rowIndex, int
	 * columnIndex) { //.... }
	 */

	@Override
	public boolean isCellEditable(int row, int column) {
		return false;
	}

	public void addRow(Game game) {
		games.put(games.size(), game);

		// if (!emulatorIconPaths.containsKey(game.getEmulatorId())) {
		// String emuBroCoverHome = System.getProperty("user.home")
		// + File.separator + ".emubro" + File.separator
		// + "emulators";
		// String coverPath = emuBroCoverHome + File.separator
		// + game.getEmulatorId()
		// + ".png";
		// emulatorIconPaths.put(game.getEmulatorId(), coverPath);
		// }
		// if (game.hasIcon()) {
		// if (!gameIconPaths.containsKey(game.getId())) {
		// gameIconPaths.put(game.getId(), game.getIconPath());
		// }
		// }
		// if (!gameIconPaths.containsKey(game.getEmulatorId())) {
		// gameIconPaths.put(game.getEmulatorId(),
		// "C:\\Users\\heribert\\.emubro\\emulators\\"+game.getEmulatorId()+".png");
		// }

		String lastPlayed = game.getLastPlayed() != null ? game.getLastPlayed().toString()
				: Messages.get("neverPlayed");
		int emulatorId = game.getEmulatorId();
		if (emulatorId == EmulatorConstants.NO_EMULATOR) {
			int platformId = game.getPlatformId();
			if (platforms != null && !platforms.isEmpty()) {
				Platform platform = platforms.get(platformId);
				if (platform != null) {
					emulatorId = platform.getDefaultEmulatorId();
				} else {
					// platforms are not up to date !!
				}
			} else {
				// you forgot to initialize the platforms !!
			}
		}
		Object[] gameArr = new Object[] { getEmulatorIcon(emulatorId), game.getName(), null,
				platforms.get(game.getPlatformId()), lastPlayed, game.getPath() };
		super.addRow(gameArr);
		// System.out.println((getRowCount()-1) + ", "+(getRowCount()-1));
		fireTableRowsInserted(getRowCount() - 1, getRowCount() - 1);
	}

	private ImageIcon getEmulatorIcon(int emulatorId) {
		return emulatorIcons.get(emulatorId);
	}

	public void removeAllElements() {
		final int elementCount = games.size();
		games.clear();
		if (getRowCount() > 0) {
			System.err.println(elementCount);
			fireTableRowsDeleted(0, elementCount);
			while (getRowCount() > 0) {
				super.removeRow(0);
			}
		}
	}

	@Override
	public void addTableModelListener(TableModelListener l) {
		listenerList.add(TableModelListener.class, l);
	}

	@Override
	public void removeTableModelListener(TableModelListener l) {
		listenerList.remove(TableModelListener.class, l);
	}

	public void removeGame(Game game) {
		// games.remove(game.getId());
		// fireTableRowsDeleted(0, games.size());
	}

	public void languageChanged() {
		for (int i = 0; i < columnNames.length; i++) {
			switch (i) {
			case 0:
				columnNames[i] = "";
				break;
			case 1:
				columnNames[i] = Messages.get("columnTitle");
				break;
			case 2:
				columnNames[i] = "";
				break;
			case 3:
				columnNames[i] = Messages.get("columnPlatform");
				break;
			case 4:
				columnNames[i] = Messages.get("columnLastPlayed");
				break;
			case 5:
				columnNames[i] = Messages.get("columnFilePath");
				break;
			}
		}
	}

	public void setColumnIdentifiersNow() {
		setColumnIdentifiers(columnIdentifiers);
	}

	public boolean contains(Game game) {
		return games.containsValue(game);
	}

	public void addGameIcon(int gameId, ImageIcon gameIcon) {
		gameIcons.put(gameId, gameIcon);
	}

	public void addEmulatorIcon(int emulatorId, ImageIcon emulatorIcon) {
		emulatorIcons.put(emulatorId, emulatorIcon);
	}

	public void addPlatformIcon(int platformId, ImageIcon platformIcon) {
		platformIcons.put(platformId, platformIcon);
	}

	public void initPlatforms(List<Platform> platforms) {
		for (Platform p : platforms) {
			this.platforms.put(p.getId(), p);
		}
	}
}