package ch.sysout.emubro.ui;

import java.awt.Color;
import java.awt.Component;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import javax.swing.Icon;
import javax.swing.ImageIcon;
import javax.swing.JLabel;
import javax.swing.JTable;
import javax.swing.event.TableModelListener;
import javax.swing.table.DefaultTableCellRenderer;
import javax.swing.table.DefaultTableModel;

import ch.sysout.emubro.api.model.Explorer;
import ch.sysout.emubro.api.model.Game;
import ch.sysout.emubro.api.model.Platform;
import ch.sysout.emubro.impl.model.EmulatorConstants;
import ch.sysout.emubro.impl.model.PlatformConstants;
import ch.sysout.emubro.util.MessageConstants;
import ch.sysout.ui.util.ImageUtil;
import ch.sysout.util.Icons;
import ch.sysout.util.Messages;

public class GameTableModel extends DefaultTableModel {
	private static final long serialVersionUID = 1L;

	public static final int TITLE_COLUMN_INDEX = 0;
	public static final int PLATFORM_COLUMN_INDEX = 1;
	public static final int RATING_COLUMN_INDEX = 2;
	public static final int DATE_ADDED_COLUMN_INDEX = 3;
	public static final int LAST_PLAYED_COLUMN_INDEX = 4;

	private String[] columnNames = {
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

	private int currentCoverSize;

	private LabelIcon lblIcon = new LabelIcon(null, null);

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
				String lastPlayed = game.getLastPlayed() != null ? game.getFormattedLastPlayedDate() : "";
				String dateAdded = game.getFormattedDateAdded();
				switch (columnIndex) {
				case TITLE_COLUMN_INDEX:
					value = lblIcon;
					lblIcon.setText(game.getName());
					lblIcon.setIcon(IconStore.current().getScaledPlatformCover(platformId, currentCoverSize > 0 ? currentCoverSize : 16));
					break;
				case PLATFORM_COLUMN_INDEX:
					//					value = platform;
					value = lblIcon;
					lblIcon.setText(platform.getName());
					lblIcon.setIcon(IconStore.current().getPlatformIcon(platformId));
					break;
				case RATING_COLUMN_INDEX:
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
				case DATE_ADDED_COLUMN_INDEX:
					value = dateAdded;
					break;
				case LAST_PLAYED_COLUMN_INDEX:
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
		case TITLE_COLUMN_INDEX:
			return LabelIcon.class;
		case PLATFORM_COLUMN_INDEX:
			return LabelIcon.class;
		case RATING_COLUMN_INDEX:
			return Icon.class;
		case DATE_ADDED_COLUMN_INDEX:
			return String.class;
		case LAST_PLAYED_COLUMN_INDEX:
			return String.class;
		default:
			return super.getColumnClass(columnIndex);
		}
	}

	public static class LabelIcon {
		Icon icon;
		String text;

		public LabelIcon(Icon icon, String text) {
			this.icon = icon;
			this.text = text;
		}

		public void setIcon(ImageIcon icon) {
			this.icon = icon;
		}

		public void setText(String text) {
			this.text = text;
		}

		@Override
		public String toString() {
			return text;
		}
	}

	public static class LabelIconRenderer extends DefaultTableCellRenderer {
		private static final long serialVersionUID = 1L;

		public LabelIconRenderer() {
			setHorizontalTextPosition(JLabel.RIGHT);
			setVerticalTextPosition(JLabel.CENTER);
		}

		@Override
		public Component getTableCellRendererComponent(JTable table, Object
				value, boolean isSelected, boolean hasFocus, int row, int col) {
			JLabel r = (JLabel) super.getTableCellRendererComponent(
					table, value, isSelected, hasFocus, row, col);
			setIcon(((LabelIcon) value).icon);
			setText(((LabelIcon) value).text);
			return r;
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
			case TITLE_COLUMN_INDEX:
				columnNames[i] = Messages.get(MessageConstants.COLUMN_TITLE);
				break;
			case PLATFORM_COLUMN_INDEX:
				columnNames[i] = Messages.get(MessageConstants.COLUMN_PLATFORM);
				break;
			case RATING_COLUMN_INDEX:
				columnNames[i] = Messages.get(MessageConstants.COLUMN_RATING);
				break;
			case DATE_ADDED_COLUMN_INDEX:
				columnNames[i] = Messages.get(MessageConstants.COLUMN_DATE_ADDED);
				break;
			case LAST_PLAYED_COLUMN_INDEX:
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

	public void coverSizeChanged(int currentCoverSize) {
		this.currentCoverSize = currentCoverSize;
	}
}