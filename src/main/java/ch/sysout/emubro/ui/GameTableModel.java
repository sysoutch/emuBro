package ch.sysout.emubro.ui;

import java.awt.Color;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import javax.swing.Icon;
import javax.swing.ImageIcon;
import javax.swing.event.TableModelListener;
import javax.swing.table.DefaultTableModel;

import ch.sysout.emubro.api.model.Explorer;
import ch.sysout.emubro.api.model.Game;
import ch.sysout.emubro.api.model.Platform;
import ch.sysout.emubro.impl.model.EmulatorConstants;
import ch.sysout.emubro.impl.model.PlatformConstants;
import ch.sysout.emubro.util.MessageConstants;
import ch.sysout.ui.util.ImageUtil;
import ch.sysout.ui.util.UIUtil;
import ch.sysout.util.Icons;
import ch.sysout.util.Messages;

public class GameTableModel extends DefaultTableModel {
	private static final long serialVersionUID = 1L;

	private String[] columnNames = {
			"",
			Messages.get(MessageConstants.COLUMN_TITLE),
			Messages.get(MessageConstants.COLUMN_PLATFORM),
			Messages.get(MessageConstants.COLUMN_RATING),
			Messages.get(MessageConstants.COLUMN_DATE_ADDED),
			Messages.get(MessageConstants.COLUMN_LAST_PLAYED)
	};
	private List<Game> games = new ArrayList<>();
	private Map<Integer, ImageIcon> gameIcons = new HashMap<>();
	private Map<Integer, ImageIcon> emulatorIcons = new HashMap<>();

	private Explorer explorer;

	private Icon icoStar = ImageUtil.getFlatSVGIconFrom(Icons.get("rating"), 16, new Color(255, 195, 0));
	private Icon icoStarBlank = ImageUtil.getFlatSVGIconFrom(Icons.get("rating"), 16, Color.LIGHT_GRAY);
	private Icon icoStarAdd = ImageUtil.getFlatSVGIconFrom(Icons.get("rating"), 16, new Color(40, 167, 69));
	private Icon icoStarRemove = ImageUtil.getFlatSVGIconFrom(Icons.get("rating"), 16, new Color(237, 67, 55));
	private CompoundIcon iconsStar0 = new CompoundIcon(icoStarBlank, icoStarBlank, icoStarBlank, icoStarBlank, icoStarBlank);
	private CompoundIcon iconsStar1 = new CompoundIcon(icoStar, icoStarBlank, icoStarBlank, icoStarBlank, icoStarBlank);
	private CompoundIcon iconsStar2 = new CompoundIcon(icoStar, icoStar, icoStarBlank, icoStarBlank, icoStarBlank);
	private CompoundIcon iconsStar3 = new CompoundIcon(icoStar, icoStar, icoStar, icoStarBlank, icoStarBlank);
	private CompoundIcon iconsStar4 = new CompoundIcon(icoStar, icoStar, icoStar, icoStar, icoStarBlank);
	private CompoundIcon iconsStar5 = new CompoundIcon(icoStar, icoStar, icoStar, icoStar, icoStar);

	public GameTableModel(Explorer explorer) {
		this.explorer = explorer;
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
		if (rowIndex == -1) {
			return null;
		}
		if (games != null && games.size() > rowIndex) {
			Game game = games.get(rowIndex);
			if (game != null) {
				if (columnIndex == -1) {
					return game;
				}
				Object value = "??";
				int platformId = game.getPlatformId();
				Platform platform = (platformId == PlatformConstants.NO_PLATFORM) ? null : explorer.getPlatform(platformId);
				int rate = game.getRate();
				String lastPlayed = game.getLastPlayed() != null ? UIUtil.format(game.getLastPlayed()) : "";
				String dateAdded = UIUtil.format(game.getDateAdded());
				switch (columnIndex) {
				case 0:
					value = IconStore.current().getPlatformIcon(game.getPlatformId());
					break;
				case 1:
					value = game.getName();
					break;
				case 2:
					value = platform;
					break;
				case 3:
					switch (rate) {
					case 0:
						value = iconsStar0;
						break;
					case 1:
						value = iconsStar1;
						break;
					case 2:
						value = iconsStar2;
						break;
					case 3:
						value = iconsStar3;
						break;
					case 4:
						value = iconsStar4;
						break;
					case 5:
						value = iconsStar5;
						break;
					default:
						value = iconsStar0;
					}
					//					String stars = ((rate == 1) ? Messages.get(MessageConstants.STAR) : Messages.get(MessageConstants.STARS, rate));
					//					value = (rate > 0) ? stars : "";
					break;
				case 4:
					value = dateAdded;
					break;
				case 5:
					value = lastPlayed;
					break;
				}
				return value;
			}
		}
		//		if (super.getRowCount() > rowIndex && super.getColumnCount() > columnIndex) {
		//			return super.getValueAt(rowIndex, columnIndex);
		//		}
		return null;
	}

	@Override
	public String getColumnName(int column) {
		return columnNames[column];
	}

	@Override
	public Class<?> getColumnClass(int columnIndex) {
		switch (columnIndex) {
		case 0:
			return ImageIcon.class;
		case 1:
			return String.class;
		case 2:
			return Platform.class;
		case 3:
			return Icon.class;
		case 4:
			return String.class;
		case 5:
			return String.class;
		default:
			return super.getColumnClass(columnIndex);
		}
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
		String lastPlayed = game.getLastPlayed() != null ? game.getLastPlayed().toString() : "";
		String dateAdded = game.getDateAdded().toString();
		int emulatorId = game.getDefaultEmulatorId();
		if (emulatorId == EmulatorConstants.NO_EMULATOR) {
			int platformId = game.getPlatformId();
			Platform platform = explorer.getPlatform(platformId);
			if (platform != null) {
				emulatorId = platform.getDefaultEmulatorId();
			} else {
				// platforms are not up to date !!
			}
		}
		games.add(game);
		Object[] gameArr = new Object[] { getEmulatorIcon(emulatorId), game.getName(), explorer.getPlatform(game.getPlatformId()), null, lastPlayed, dateAdded };
		super.addRow(gameArr);
		//		fireTableRowsInserted(getRowCount() - 1, getRowCount() - 1);
	}

	private ImageIcon getEmulatorIcon(int emulatorId) {
		return emulatorIcons.get(emulatorId);
	}

	public void removeAllElements() {
		games.clear();
		if (getRowCount() > 0) {
			fireTableRowsDeleted(0, 0);
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

	@Override
	public void removeRow(int row) {
		super.removeRow(row);
		games.remove(row);
	}

	public void removeGame(Game game) {
		for (int i = 0; i < games.size(); i++) {
			if (games.get(i) == game) {
				removeRow(i);
				break;
			}
		}
	}

	public void languageChanged() {
		for (int i = 0; i < columnNames.length; i++) {
			switch (i) {
			case 0:
				columnNames[i] = "";
				break;
			case 1:
				columnNames[i] = Messages.get(MessageConstants.COLUMN_TITLE);
				break;
			case 2:
				columnNames[i] = Messages.get(MessageConstants.COLUMN_PLATFORM);
				break;
			case 3:
				columnNames[i] = Messages.get(MessageConstants.COLUMN_RATING);
				break;
			case 4:
				columnNames[i] = Messages.get(MessageConstants.COLUMN_DATE_ADDED);
				break;
			case 5:
				columnNames[i] = Messages.get(MessageConstants.COLUMN_LAST_PLAYED);
				break;
			}
		}
	}

	public void setColumnIdentifiersNow() {
		setColumnIdentifiers(columnIdentifiers);
	}

	public boolean contains(Game game) {
		return games.contains(game);
	}

	public void addGameIcon(int gameId, ImageIcon gameIcon) {
		gameIcons.put(gameId, gameIcon);
	}

	public void addEmulatorIcon(int emulatorId, ImageIcon emulatorIcon) {
		emulatorIcons.put(emulatorId, emulatorIcon);
	}

	public List<Game> getAllElements() {
		return games;
	}
}