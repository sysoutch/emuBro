package ch.sysout.emubro.ui;

import java.awt.BorderLayout;
import java.awt.Color;
import java.awt.Dimension;
import java.awt.Font;
import java.awt.Point;
import java.awt.Rectangle;
import java.awt.dnd.DropTarget;
import java.awt.dnd.DropTargetListener;
import java.awt.event.MouseListener;
import java.util.ArrayList;
import java.util.List;

import javax.swing.Action;
import javax.swing.BorderFactory;
import javax.swing.ImageIcon;
import javax.swing.JLabel;
import javax.swing.JScrollPane;
import javax.swing.JTable;
import javax.swing.JViewport;
import javax.swing.KeyStroke;
import javax.swing.ListSelectionModel;
import javax.swing.RowSorter.SortKey;
import javax.swing.SortOrder;
import javax.swing.SwingConstants;
import javax.swing.SwingUtilities;
import javax.swing.UIManager;
import javax.swing.event.ListSelectionEvent;
import javax.swing.event.ListSelectionListener;
import javax.swing.event.RowSorterEvent;
import javax.swing.event.RowSorterListener;
import javax.swing.table.TableCellRenderer;
import javax.swing.table.TableColumn;
import javax.swing.table.TableColumnModel;
import javax.swing.table.TableModel;

import ch.sysout.emubro.api.FilterListener;
import ch.sysout.emubro.api.GameListener;
import ch.sysout.emubro.api.event.FilterEvent;
import ch.sysout.emubro.api.event.GameAddedEvent;
import ch.sysout.emubro.api.event.GameRemovedEvent;
import ch.sysout.emubro.api.event.GameSelectionEvent;
import ch.sysout.emubro.api.model.Game;
import ch.sysout.emubro.controller.ViewConstants;
import ch.sysout.emubro.impl.event.BroGameSelectionEvent;
import ch.sysout.emubro.impl.model.BroGame;
import ch.sysout.emubro.impl.model.GameConstants;
import ch.sysout.util.ScreenSizeUtil;

public class TableViewPanel extends ViewPanel implements ListSelectionListener, GameListener, FilterListener {
	private static final long serialVersionUID = 1L;

	private JTable tblGames;
	private TableColumnAdjuster columnAdjuster;
	private List<GameListener> listeners = new ArrayList<>();
	private JScrollPane spTblGames;

	// private int[] twok = { 24, 250, 180, 150, 80, 200 };
	// private int[] threek = { 32, 450, 300, 250, 120, 450 };

	private static final int rowHeight = ScreenSizeUtil.adjustValueToResolution(24);
	public static final int FIRST_COLUMN_WIDTH = rowHeight;

	private TableColumnModel columnModel;
	private List<BroGame> games;

	private int lastHorizontalScrollBarValue;

	private boolean hideExtensions = true;

	public TableViewPanel() {
		super(new BorderLayout());
		initComponents();
		createUI();
	}

	private void initComponents() {
		tblGames = new JTableDoubleClickOnHeaderFix();
		columnModel = tblGames.getColumnModel();
		columnAdjuster = new TableColumnAdjuster(tblGames);
		// columnModel.getColumn(0).setResizable(false);

		// minWidth = col.getWidth();
		spTblGames = new JScrollPane(tblGames);
		Color color = UIManager.getColor("Table.background");
		spTblGames.getViewport().setBackground(color);

		TableCellRenderer renderer = tblGames.getTableHeader().getDefaultRenderer();
		((JLabel) renderer).setHorizontalAlignment(SwingConstants.LEFT);
		tblGames.getTableHeader().setDefaultRenderer(renderer);
		tblGames.setShowGrid(false);
		tblGames.getColumnModel().setColumnMargin(0);
		tblGames.setAutoscrolls(false);
		tblGames.getTableHeader().setReorderingAllowed(false);
		tblGames.setFillsViewportHeight(true);
		tblGames.setPreferredScrollableViewportSize(tblGames.getPreferredSize());
		tblGames.setAutoResizeMode(JTable.AUTO_RESIZE_OFF);
		tblGames.setSelectionMode(ListSelectionModel.SINGLE_SELECTION);
		tblGames.setRowHeight(rowHeight);
		tblGames.setPreferredScrollableViewportSize(new Dimension(0, 0));
		tblGames.setAutoCreateRowSorter(true);
		tblGames.getRowSorter().addRowSorterListener(new RowSorterListener() {

			private int selectedIndex = tblGames.getSelectedRow();

			@Override
			public void sorterChanged(RowSorterEvent e) {
				// scrollToVisible(tblGames, selectedIndex, 0);
				// selectedIndex =
				// tblGames.convertRowIndexToView(tblGames.getSelectedRow());
			}
		});
		tblGames.getSelectionModel().addListSelectionListener(this);
	}

	public static void scrollToVisible(JTable table, int rowIndex, int vColIndex) {
		if (!(table.getParent() instanceof JViewport)) {
			return;
		}
		JViewport viewport = (JViewport) table.getParent();

		// This rectangle is relative to the table where the
		// northwest corner of cell (0,0) is always (0,0).
		Rectangle rect = table.getCellRect(rowIndex, vColIndex, true);

		// The location of the viewport relative to the table
		Point pt = viewport.getViewPosition();

		// Translate the cell location so that it is relative
		// to the view, assuming the northwest corner of the
		// view is (0,0)
		rect.setLocation(rect.x - pt.x, rect.y - pt.y);

		table.scrollRectToVisible(rect);

		// Scroll the area into view
		// viewport.scrollRectToVisible(rect);
	}

	public void adjustColumns() {
		columnAdjuster.adjustColumns();
		// columnModel.getColumn(0).setWidth(FIRST_COLUMN_WIDTH);
	}

	private void createUI() {
		spTblGames.setBorder(BorderFactory.createEmptyBorder());
		add(spTblGames);
		setPreferredSize(new Dimension(0, 0));
	}

	@Override
	public boolean requestFocusInWindow() {
		return tblGames.requestFocusInWindow();
	}

	@Override
	public void valueChanged(ListSelectionEvent e) {
		// int selectedRow = tblGames.getSelectedRow();
		// Game game = (selectedRow != -1) ? explorer.getGame(selectedRow) :
		// null;
		// GameEvent event = new GameSelectionEvent(game);
		// fireEvent(event);
		if (!e.getValueIsAdjusting()) {
			int index = tblGames.getSelectedRow();
			boolean b = index != GameConstants.NO_GAME;
			Game game = null;
			// mnuRunWith.removeAll();
			if (b) {
				game = (Game) ((GameTableModel) tblGames.getModel())
						.getValueAt(tblGames.convertRowIndexToModel(tblGames.getSelectedRow()), -1);
				// mnuRunWith.add(new JMenuItem(""+game.getEmulatorId()));
			}

			// lstGames.setComponentPopupMenu(b ? popup : null);

			GameSelectionEvent event = new BroGameSelectionEvent(game, null);
			for (GameListener l : listeners) {
				l.gameSelected(event);
			}

			// Game game = b ? mdlLstAllGames.getElementAt(index) : null;
			// BroGameSelectionEvent event = new BroGameSelectionEvent(game);
			// fireEvent(event);
		}
		spTblGames.getHorizontalScrollBar().setValue(lastHorizontalScrollBarValue);
		lastHorizontalScrollBarValue = spTblGames.getHorizontalScrollBar().getValue();
		int selectedRow = tblGames.getSelectedRow();
		tblGames.getSelectionModel().setSelectionInterval(selectedRow, selectedRow);
		tblGames.scrollRectToVisible(new Rectangle(tblGames.getCellRect(selectedRow, 0, true)));
	}

	public boolean isInitialized() {
		return games != null;
	}

	@Override
	public void gameSelected(GameSelectionEvent e) {
	}

	/*
	 * (non-Javadoc)
	 *
	 * @see
	 * ch.sysout.gameexplorer.api.GameListener#gameAdded(ch.sysout.gameexplorer.
	 * api.GameAddedEvent)
	 *
	 * FIXME Exception in thread "Thread-5" java.lang.IndexOutOfBoundsException:
	 * Invalid range at javax.swing.DefaultRowSorter.checkAgainstModel(Unknown
	 * Source) at javax.swing.DefaultRowSorter.rowsInserted(Unknown Source) at
	 * javax.swing.JTable.notifySorter(Unknown Source) at
	 * javax.swing.JTable.sortedTableChanged(Unknown Source) at
	 * javax.swing.JTable.tableChanged(Unknown Source) at
	 * javax.swing.table.AbstractTableModel.fireTableChanged(Unknown Source) at
	 * javax.swing.table.AbstractTableModel.fireTableRowsInserted(Unknown
	 * Source) at javax.swing.table.DefaultTableModel.insertRow(Unknown Source)
	 * at javax.swing.table.DefaultTableModel.addRow(Unknown Source) at
	 * javax.swing.table.DefaultTableModel.addRow(Unknown Source) at
	 * ch.sysout.gameexplorer.ui.GameTableModel.addRow(GameTableModel.java:121)
	 * at
	 * ch.sysout.gameexplorer.ui.TableViewPanel.gameAdded(TableViewPanel.java:
	 * 184) at ch.sysout.gameexplorer.ui.MainPanel.gameAdded(MainPanel.java:395)
	 * at ch.sysout.gameexplorer.ui.MainFrame.gameAdded(MainFrame.java:652) at
	 * ch.sysout.gameexplorer.impl.BroExplorer.fireGameAddedEvent(BroExplorer.
	 * java:486) at
	 * ch.sysout.gameexplorer.impl.BroExplorer.searchForGames(BroExplorer.java:
	 * 471) at
	 * ch.sysout.gameexplorer.impl.BroExplorer.searchForPlatform(BroExplorer.
	 * java:425) at
	 * ch.sysout.gameexplorer.impl.controller.BroController.searchForPlatforms(
	 * BroController.java:496) at
	 * ch.sysout.gameexplorer.impl.controller.BroController.searchForPlatforms(
	 * BroController.java:494) at
	 * ch.sysout.gameexplorer.impl.controller.BroController.searchForPlatforms(
	 * BroController.java:494) at
	 * ch.sysout.gameexplorer.impl.controller.BroController.searchForPlatforms(
	 * BroController.java:494) at
	 * ch.sysout.gameexplorer.impl.controller.BroController.searchForPlatforms(
	 * BroController.java:494) at
	 * ch.sysout.gameexplorer.impl.controller.BroController.access$17(
	 * BroController.java:481) at
	 * ch.sysout.gameexplorer.impl.controller.BroController$4.run(BroController.
	 * java:469) at java.lang.Thread.run(Unknown Source)
	 */
	@Override
	public void gameAdded(final GameAddedEvent e) {
		// tblGames.revalidate();
		// tblGames.repaint();
	}

	@Override
	public void gameRemoved(GameRemovedEvent e) {
		// tblGames.revalidate();
		// tblGames.repaint();
	}

	@Override
	public void filterSet(FilterEvent e) {
		// Filter<Game> filter = e.getGame();
		// List<Game> games = e.getObjects();
		// Criteria criteria = e.getCriteria();
		// // mdlTblGames.removeall
		// for (Game game : games) {
		// if (filter.match(criteria, game)) {
		// // addgame
		// }
		// }
	}

	public void addSelectGameListener(GameListener l) {
		listeners.add(l);
	}

	public void addRunGameListener(MouseListener l) {
		tblGames.addMouseListener(l);
	}

	public void addRunGameListener(Action l) {
		tblGames.getInputMap().put(KeyStroke.getKeyStroke("pressed ENTER"), "actionRunGame");
		tblGames.getActionMap().put("actionRunGame", l);
	}

	public void setSortOrder(int order) {
		tblGames.getRowSorter().toggleSortOrder(order);
	}

	public TableModel getTableModel() {
		return tblGames.getModel();
	}

	public void setTableModel(TableModel mdl) {
		if (tblGames.getModel() != mdl) {
			tblGames.setModel(mdl);
		}
	}

	public void increaseFontSize() {
		int newRowHeight = getRowHeight() + 4;
		int newColumnWidth = getColumnWidth() + 64;
		setRowHeight(newRowHeight);
		setColumnWidth(newColumnWidth);
		Font font = tblGames.getFont();
		tblGames.setFont(new Font(font.getFontName(), font.getStyle(), font.getSize() + 2));
	}

	public void decreaseFontSize() {
		int newRowHeight = getRowHeight() - 4;
		int newColumnWidth = getColumnWidth() - 64;
		if (newRowHeight > 0) {
			setRowHeight(newRowHeight);
			setColumnWidth(newColumnWidth);
			Font font = tblGames.getFont();
			tblGames.setFont(new Font(font.getFontName(), font.getStyle(), font.getSize() - 2));
		}
	}

	public int getColumnWidth() {
		return tblGames.getColumnModel().getColumn(1).getWidth();
	}

	public void setColumnWidth(int value) {
		tblGames.getColumnModel().getColumn(1).setWidth(value);
	}

	public int getRowHeight() {
		return tblGames.getRowHeight();
	}

	public void setRowHeight(int value) {
		tblGames.setRowHeight(value);
	}

	@Override
	public void addGameDragDropListener(DropTargetListener l) {
		new DropTarget(spTblGames, l);
	}

	@Override
	public void languageChanged() {
		List<Integer> columnWidths = new ArrayList<>();

		for (int i = 0; i < tblGames.getColumnModel().getColumnCount(); i++) {
			TableColumn nextElement = columnModel.getColumn(i);
			int columnWidth = nextElement.getWidth();
			columnWidths.add(columnWidth);
		}

		List<? extends SortKey> sortKeys = tblGames.getRowSorter().getSortKeys();
		SortKey key = null;
		for (int i = 0; i < sortKeys.size(); i++) {
			key = sortKeys.get(i);
			if (key.getSortOrder() != SortOrder.UNSORTED) {
				break;
			}
		}

		final SortKey keyFinal = key;
		// FIXME this runnable has been done because otherwise language isnt
		// changed yet. dirty.
		Runnable runnableResetColumns = new Runnable() {

			@Override
			public void run() {
				((GameTableModel) tblGames.getModel()).setColumnIdentifiersNow();
				if (keyFinal.getColumn() != -1) {
					SortOrder sortOrder = keyFinal.getSortOrder();
					tblGames.getRowSorter().toggleSortOrder(keyFinal.getColumn());
					if (sortOrder == SortOrder.DESCENDING) {
						tblGames.getRowSorter().toggleSortOrder(keyFinal.getColumn());
					}
				}

				for (int i = tblGames.getColumnModel().getColumnCount() - 1; i >= 0; i--) {
					TableColumn nextElement = columnModel.getColumn(i);
					int minWidth = nextElement.getMinWidth();
					nextElement.setMinWidth(columnWidths.get(i));
					nextElement.setMinWidth(minWidth);

					int maxWidth = columnModel.getColumn(i).getMaxWidth();
					columnModel.getColumn(i).setMaxWidth(columnWidths.get(i));
					columnModel.getColumn(i).setMaxWidth(maxWidth);
				}

			}
		};
		SwingUtilities.invokeLater(runnableResetColumns);
	}

	public void platformIconAdded(int platformId, ImageIcon platformIcon) {
		((GameTableModel) tblGames.getModel()).addPlatformIcon(platformId, platformIcon);
	}

	@Override
	public void groupByNone() {
	}

	@Override
	public void groupByPlatform() {
	}

	public void hideExtensions(boolean selected) {
		hideExtensions = selected;
	}

	public int getfontSize() {
		return tblGames.getFont().getSize();
	}

	public void setFontSize(int value) {
		Font font = tblGames.getFont();
		tblGames.setFont(new Font(font.getFontName(), font.getStyle(), value));
	}

	@Override
	public int getGroupBy() {
		return ViewConstants.GROUP_BY_NONE;
		//			return ViewConstants.GROUP_BY_PLATFORM;
		//		throw new IllegalStateException("current viewport not known");
	}
}