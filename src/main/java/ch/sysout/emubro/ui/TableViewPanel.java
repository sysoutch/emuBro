package ch.sysout.emubro.ui;

import java.awt.BorderLayout;
import java.awt.Color;
import java.awt.Component;
import java.awt.Cursor;
import java.awt.Dimension;
import java.awt.Font;
import java.awt.Graphics;
import java.awt.Graphics2D;
import java.awt.Point;
import java.awt.Rectangle;
import java.awt.RenderingHints;
import java.awt.dnd.DropTarget;
import java.awt.dnd.DropTargetListener;
import java.awt.event.ActionListener;
import java.awt.event.InputEvent;
import java.awt.event.KeyAdapter;
import java.awt.event.KeyEvent;
import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;
import java.awt.event.MouseListener;
import java.awt.event.MouseMotionAdapter;
import java.awt.event.MouseWheelListener;
import java.awt.image.BufferedImage;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;

import javax.swing.Action;
import javax.swing.BorderFactory;
import javax.swing.ImageIcon;
import javax.swing.JComponent;
import javax.swing.JLabel;
import javax.swing.JPanel;
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
import javax.swing.table.DefaultTableCellRenderer;
import javax.swing.table.TableCellRenderer;
import javax.swing.table.TableColumn;
import javax.swing.table.TableColumnModel;
import javax.swing.table.TableModel;

import ch.sysout.emubro.api.FilterListener;
import ch.sysout.emubro.api.TagListener;
import ch.sysout.emubro.api.TagsFromGamesListener;
import ch.sysout.emubro.api.event.FilterEvent;
import ch.sysout.emubro.api.event.GameAddedEvent;
import ch.sysout.emubro.api.event.GameRemovedEvent;
import ch.sysout.emubro.api.event.GameRenamedEvent;
import ch.sysout.emubro.api.event.GameSelectionEvent;
import ch.sysout.emubro.api.filter.Criteria;
import ch.sysout.emubro.api.model.Emulator;
import ch.sysout.emubro.api.model.Explorer;
import ch.sysout.emubro.api.model.Game;
import ch.sysout.emubro.api.model.Platform;
import ch.sysout.emubro.api.model.PlatformComparator;
import ch.sysout.emubro.api.model.Tag;
import ch.sysout.emubro.controller.GameSelectionListener;
import ch.sysout.emubro.controller.ViewConstants;
import ch.sysout.emubro.impl.event.BroGameSelectionEvent;
import ch.sysout.emubro.impl.event.NavigationEvent;
import ch.sysout.emubro.impl.model.BroEmulator;
import ch.sysout.emubro.impl.model.BroGame;
import ch.sysout.emubro.impl.model.EmulatorConstants;
import ch.sysout.emubro.impl.model.GameConstants;
import ch.sysout.emubro.util.MessageConstants;
import ch.sysout.ui.util.UIUtil;
import ch.sysout.util.Messages;
import ch.sysout.util.ScreenSizeUtil;

public class TableViewPanel extends ViewPanel implements ListSelectionListener, GameSelectionListener, FilterListener {
	private static final long serialVersionUID = 1L;

	private TableModel mdlTblAllGames;
	private TableModel mdlTblRecentlyPlayed;
	private TableModel mdlTblFavorites;
	private TableModel mdlTblFiltered;

	private JTable tblGames;
	private TableColumnAdjuster columnAdjuster;
	private List<GameSelectionListener> selectGameListeners = new ArrayList<>();
	private JScrollPane spTblGames;

	// private int[] twok = { 24, 250, 180, 150, 80, 200 };
	// private int[] threek = { 32, 450, 300, 250, 120, 450 };

	private static final int rowHeight = ScreenSizeUtil.adjustValueToResolution(24);
	public static final int FIRST_COLUMN_WIDTH = rowHeight;

	private TableColumnModel columnModel;
	private List<BroGame> games;

	private int lastHorizontalScrollBarValue;

	private boolean hideExtensions = true;

	private boolean touchScreenScrollEnabled;

	private int viewStyle;

	private int currentView;

	private List<UpdateGameCountListener> gameCountListeners = new ArrayList<>();

	private List<Integer> columnWidths = new ArrayList<>();

	protected int mouseX;
	protected int mouseY;

	GameContextMenu popupGame;
	ViewContextMenu popupView;

	private Explorer explorer;

	private boolean doNotFireSelectGameEvent;

	private List<TagsFromGamesListener> tagsFromGamesListeners = new ArrayList<>();

	private CustomRenderer customRenderer;

	protected int mouseOver = -1;
	protected boolean dragging;
	private Cursor cursorDrag = Cursor.getPredefinedCursor(Cursor.MOVE_CURSOR);
	protected int lastVerticalScrollBarValue;
	protected int lastMouseX;
	protected int lastMouseY;
	protected int scrollDistanceX;
	protected int scrollDistanceY;
	protected int currentValue;

	private Color foregroundColor = UIManager.getColor("Table.foreground");

	private boolean themeChanged;

	public TableViewPanel(Explorer explorer, ViewPanelManager viewManager, GameContextMenu popupGame, ViewContextMenu popupView) {
		super(new BorderLayout());
		mdlTblAllGames = new GameTableModel(explorer);
		mdlTblRecentlyPlayed = new GameTableModel(explorer);
		mdlTblFavorites = new GameTableModel(explorer);
		mdlTblFiltered = new GameTableModel(explorer);
		this.explorer = explorer;
		this.popupGame = popupGame;
		this.popupView = popupView;
		initComponents();
		createUI();
	}

	protected void showGamePopupMenu(Component relativeTo, int x, int y) {
		popupGame.show(relativeTo, x, y);
		List<Game> currentGame = explorer.getCurrentGames();
		int platformId = currentGame.get(0).getPlatformId();
		Platform platform = explorer.getPlatform(platformId);
		List<BroEmulator> emulators = platform.getEmulators();
		int defaultEmulatorId = EmulatorConstants.NO_EMULATOR;
		for (int i = 0; i < emulators.size(); i++) {
			Emulator emulator = emulators.get(i);
			if (!emulator.isInstalled()) {
				continue;
			}
			if (emulator.getId() == platform.getDefaultEmulatorId()) {
				defaultEmulatorId = emulator.getId();
				break;
			}
		}
		popupGame.initEmulators(emulators, defaultEmulatorId);
	}

	protected void showViewPopupMenu(Component relativeTo, int x, int y) {
		popupView.show(relativeTo, x, y);
	}

	private void initComponents() {
		tblGames = new JTableDoubleClickOnHeaderFix();
		tblGames.getTableHeader().setOpaque(false);
		tblGames.getTableHeader().setBackground(IconStore.current().getCurrentTheme().getView().getColor());
		tblGames.getTableHeader().setForeground(Color.white);
		columnModel = tblGames.getColumnModel();
		columnAdjuster = new TableColumnAdjuster(tblGames);
		// columnModel.getColumn(0).setResizable(false);

		// minWidth = col.getWidth();
		spTblGames = new JScrollPane(tblGames) { // if we change this to JCustomScrollPane, table header will be gone
			private static final long serialVersionUID = 1L;

			@Override
			protected void paintComponent(Graphics g) {
				super.paintComponent(g);
				Graphics2D g2d = (Graphics2D) g.create();
				int panelWidth = getWidth();
				int panelHeight = getHeight();
				Theme currentTheme = IconStore.current().getCurrentTheme();
				ThemeBackground currentBackground = currentTheme.getView();
				//				if (currentBackground.hasGradientPaint()) {
				//					GradientPaint p = currentBackground.getGradientPaint();
				//					g2d.setPaint(p);
				//				} else if (currentBackground.hasColor()) {
				//					g2d.setColor(currentBackground.getColor());
				//				}
				//				g2d.fillRect(0, 0, panelWidth, panelHeight);

				BufferedImage background = currentBackground.getImage();
				if (background != null) {
					g2d.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
					g2d.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
					g2d.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
					int imgWidth = background.getWidth();
					int imgHeight = background.getHeight();
					int x = 0;
					int y = 0;
					boolean shouldScale = currentBackground.isImageScaleEnabled();
					if (shouldScale) {
						int new_width = imgWidth;
						int new_height = imgHeight;
						boolean scaleProportionally = currentBackground.isScaleProportionallyEnabled();
						if (scaleProportionally) {
							// first check if we need to scale width
							if (imgWidth > panelWidth) {
								//scale width to fit
								new_width = panelWidth;
								//scale height to maintain aspect ratio
								new_height = (new_width * imgHeight) / imgWidth;
							}

							// then check if we need to scale even with the new height
							if (new_height > panelHeight) {
								//scale height to fit instead
								new_height = panelHeight;
								//scale width to maintain aspect ratio
								new_width = (new_height * imgWidth) / imgHeight;
							}
							if (new_width < panelWidth) {
								x += (panelWidth-new_width) / 2;
							}
							if (new_height < panelHeight) {
								y += (panelHeight-new_height) / 2; // image centered
								//					y = panelHeight-new_height; // image bottom
							}
						} else {
							new_width = panelWidth;
							new_height = panelHeight;
						}
						g2d.drawImage(background, x, y, new_width, new_height, this);
						//						boolean addTransparencyPane = true;
						//						if (addTransparencyPane) {
						//							g2d.setColor(getTransparencyColor());
						//							g2d.fillRect(x, y, new_width, new_height);
						//						}
					} else {
						boolean shouldVerticalCenterImage = currentBackground.isVerticalCenterImageEnabled();
						boolean shouldHorizontalCenterImage = currentBackground.isHorizontalCenterImageEnabled();
						if (shouldVerticalCenterImage) {
							if (imgWidth > panelWidth) {
								x -= (imgWidth-panelWidth) / 2;
							}
						}
						if (shouldHorizontalCenterImage) {
							if (imgHeight > panelHeight) {
								y -= (imgHeight-panelHeight) / 2;
							}
						}
						g2d.drawImage(background, x, y, imgWidth, imgHeight, this);
						//						boolean addTransparencyPane = true;
						//						if (addTransparencyPane) {
						//							g2d.setColor(getTransparencyColor());
						//							g2d.fillRect(x, y, imgWidth, imgHeight);
						//						}
					}
					boolean addTransparencyPane = currentBackground.isAddTransparencyPaneEnabled();
					if (addTransparencyPane) {
						g2d.setColor(currentBackground.getTransparencyColor());
						g2d.fillRect(0, 0, panelWidth, panelHeight);
					}
					BufferedImage imgTransparentOverlay = currentTheme.getTransparentBackgroundOverlayImage();
					if (imgTransparentOverlay != null) {
						int width = imgTransparentOverlay.getWidth();
						int height = imgTransparentOverlay.getHeight();

						double factor = background.getWidth() / panelWidth;
						if (factor != 0) {
							int scaledWidth = (int) (width/factor);
							int scaledHeight = (int) (height/factor);
							width = scaledWidth;
							height = scaledHeight;
						}
						x = panelWidth-width;
						y = panelHeight-height;
						g2d.drawImage(imgTransparentOverlay, x, y, width, height, this);
					}
				}
				g2d.dispose();
			}
		};
		setOpaque(false);
		tblGames.setOpaque(false);
		spTblGames.getViewport().setOpaque(false);

		TableCellRenderer renderer = tblGames.getTableHeader().getDefaultRenderer();
		((JLabel) renderer).setHorizontalAlignment(SwingConstants.LEFT);
		tblGames.getTableHeader().setDefaultRenderer(renderer);
		tblGames.setIntercellSpacing(new Dimension());
		tblGames.setShowGrid(false);
		tblGames.getColumnModel().setColumnMargin(0);
		tblGames.setAutoscrolls(false);
		tblGames.getTableHeader().setReorderingAllowed(false);
		tblGames.setFillsViewportHeight(true);
		tblGames.setAutoResizeMode(JTable.AUTO_RESIZE_OFF);
		tblGames.setSelectionMode(ListSelectionModel.MULTIPLE_INTERVAL_SELECTION);
		tblGames.setRowHeight(rowHeight);
		tblGames.setPreferredScrollableViewportSize(new Dimension(0, 0));
		tblGames.setAutoCreateRowSorter(true);
		tblGames.getSelectionModel().addListSelectionListener(this);
		tblGames.addKeyListener(new KeyAdapter() {
			@Override
			public void keyPressed(KeyEvent e) {
				super.keyPressed(e);
				if (e.getKeyCode() == KeyEvent.VK_CONTEXT_MENU) {
					boolean showFileTreePopup = tblGames.getSelectedRow() != -1;
					if (showFileTreePopup) {
						showGamePopupMenu(e.getComponent(), mouseX, mouseY);
					}
				}
			}
		});

		tblGames.addMouseListener(new MouseAdapter() {
			@Override
			public void mousePressed(MouseEvent e) {
				lastMouseX = e.getXOnScreen();
				lastMouseY = e.getYOnScreen();
				//				if ((e.getModifiers() & InputEvent.BUTTON3_MASK) == InputEvent.BUTTON3_MASK) {
				//					if (mouseOver > -1 && !tblGames.isSelectedIndex(mouseOver)) {
				//						tblGames.setSelectedIndex(mouseOver);
				//					}
				//				}
			}

			@Override
			public void mouseReleased(MouseEvent e) {
				dragging = false;
				tblGames.setEnabled(true);
				tblGames.requestFocusInWindow();
				if (SwingUtilities.isRightMouseButton(e)) {
					int index = tblGames.rowAtPoint(e.getPoint());
					if (index != -1) {
						tblGames.setRowSelectionInterval(index, index);
						showGamePopupMenu(e.getComponent(), e.getX(), e.getY());
					} else {
						tblGames.clearSelection();
						showViewPopupMenu(e.getComponent(), e.getX(), e.getY());
					}
				}
				if (spTblGames.getCursor() == cursorDrag) {
					spTblGames.setCursor(null);
				}
				//				smoothScrollOut(spTblGames, lst);
			}
		});
		tblGames.addMouseMotionListener(new MouseMotionAdapter() {

			@Override
			public void mouseMoved(MouseEvent e) {
				mouseX = e.getX();
				mouseY = e.getY();
				TableModel model = tblGames.getModel();
				Point p = e.getPoint();
				/*
				 * Exception in thread "AWT-EventQueue-0"
				 * java.lang.StringIndexOutOfBoundsException: String index out
				 * of range: 47 at java.lang.String.substring(Unknown Source) at
				 * ch.sysout.gameexplorer.ui.NewNewListViewPanel$1.
				 * getListCellRendererComponent(NewNewListViewPanel.java:176) at
				 * javax.swing.plaf.basic.BasicListUI.updateLayoutState(Unknown
				 * Source) at
				 * javax.swing.plaf.basic.BasicListUI.maybeUpdateLayoutState(
				 * Unknown Source) at
				 * javax.swing.plaf.basic.BasicListUI.locationToIndex(Unknown
				 * Source) at javax.swing.JList.locationToIndex(Unknown Source)
				 * at
				 * ch.sysout.gameexplorer.ui.NewNewListViewPanel$2.mouseMoved(
				 * NewNewListViewPanel.java:208)
				 */
				//				tblGames.setToolTipText("");
				int index = tblGames.rowAtPoint(p);
				if (index > -1) {
					Game text = (Game) model.getValueAt(tblGames.convertRowIndexToModel(index), -1);
					ZonedDateTime lastPlayed = text.getLastPlayed();
					tblGames.setToolTipText("<html><strong>" + Messages.get(MessageConstants.COLUMN_TITLE) + ": </strong>" + text.getName()
					+ "<br><strong>"+Messages.get(MessageConstants.COLUMN_PLATFORM) + ": </strong>"+explorer.getPlatform(text.getPlatformId())
					+ "<br><strong>"+Messages.get(MessageConstants.LAST_PLAYED)+": </strong>"+(lastPlayed != null ? lastPlayed : Messages.get(MessageConstants.NEVER_PLAYED_SHORT))
					+ "<br><strong>" + Messages.get(MessageConstants.DATE_ADDED) + ": </strong>" + text.getDateAdded()
					+ "</html>");
					mouseOver = index;
				} else {
					index = -1;
				}
			}

			@Override
			public void mouseDragged(MouseEvent e) {
				boolean noScrollBarsVisible = !spTblGames.getHorizontalScrollBar().isVisible() && !spTblGames.getVerticalScrollBar().isVisible();
				if (!isTouchScreenScrollEnabled()) {
					dragging = false;
					return;
				}
				dragging = true;
				tblGames.setEnabled(false);
				int treshold = 4;
				if (SwingUtilities.isRightMouseButton(e)) {
					return;
				}
				//				bla(e.getPoint());
				if (spTblGames.getVerticalScrollBar().isVisible()) {
					if (spTblGames.getCursor() != cursorDrag) {
						spTblGames.setCursor(cursorDrag);
					}
					if (spTblGames.getCursor() == cursorDrag
							|| scrollDistanceY < -treshold || scrollDistanceY > treshold) {
						// FIXME supress gameSelected event
						//							lst.setSelectedIndex(lastSelectedIndex);
						//							mouseOver = lastSelectedIndex;
						spTblGames.getVerticalScrollBar().setValue(spTblGames.getVerticalScrollBar().getValue() - scrollDistanceY);
					}
					scrollDistanceY = e.getYOnScreen() - lastMouseY;
					lastMouseY = e.getYOnScreen();
					lastVerticalScrollBarValue = spTblGames.getVerticalScrollBar().getValue();
				}
				//				} else if (viewStyle == ViewPanel.LIST_VIEW || viewStyle == ViewPanel.SLIDER_VIEW) {
				//					if (spTblGames.getHorizontalScrollBar().isVisible()) {
				//						if (spTblGames.getCursor() != cursorDrag) {
				//							spTblGames.setCursor(cursorDrag);
				//						}
				//						if (spTblGames.getCursor() == cursorDrag
				//								|| scrollDistanceX < -treshold || scrollDistanceX > treshold) {
				//							// FIXME supress gameSelected event
				//							//							lst.setSelectedIndex(lastSelectedIndex);
				//							//							mouseOver = lastSelectedIndex;
				//							currentValue = spTblGames.getHorizontalScrollBar().getValue();
				//							int value = currentValue - scrollDistanceX;
				//							spTblGames.getHorizontalScrollBar().setValue(value);
				//						}
				//						scrollDistanceX = e.getXOnScreen() - lastMouseX;
				//						lastMouseX = e.getXOnScreen();
				//						lastHorizontalScrollBarValue = spTblGames.getHorizontalScrollBar().getValue();
				//					}
				//				}
			}
		});
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
		if (doNotFireSelectGameEvent) {
			return;
		}
		// int selectedRow = tblGames.getSelectedRow();
		// Game game = (selectedRow != -1) ? explorer.getGame(selectedRow) :
		// null;
		// GameEvent event = new GameSelectionEvent(game);
		// fireEvent(event);
		if (!e.getValueIsAdjusting()) {
			int[] indices = tblGames.getSelectedRows();
			boolean b = indices.length > 0;
			// mnuRunWith.removeAll();
			List<Game> gamesList = new ArrayList<>();
			if (b) {
				for (Integer index : indices) {
					GameTableModel model = ((GameTableModel) tblGames.getModel());
					Game game = (Game) model.getValueAt(tblGames.convertRowIndexToModel(index), -1);
					if (game != null) {
						gamesList.add(game);
					}
				}
				// mnuRunWith.add(new JMenuItem(""+game.getEmulatorId()));
			}

			// lstGames.setComponentPopupMenu(b ? popup : null);

			GameSelectionEvent event = new BroGameSelectionEvent(gamesList, null);
			fireGameSelectedEvent(event);

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

	private void fireGameSelectedEvent(GameSelectionEvent event) {
		for (GameSelectionListener l : selectGameListeners) {
			l.gameSelected(event);
		}
	}

	public boolean isInitialized() {
		return games != null;
	}

	@Override
	public void selectGame(int gameId) {
		if (gameId == GameConstants.NO_GAME) {
			tblGames.clearSelection();
		} else {
			int selectedIndex = -1;
			for (int i = 0; i < tblGames.getModel().getRowCount(); i++) {
				Game game = (Game) tblGames.getModel().getValueAt(i, -1);
				if (game.getId() == gameId) {
					selectedIndex = i;
					tblGames.setRowSelectionInterval(tblGames.convertRowIndexToView(selectedIndex), tblGames.convertRowIndexToView(selectedIndex));
					//				lstGames.ensureIndexIsVisible(selectedIndex);
					break;
				}
			}
		}
	}

	@Override
	public void gameSelected(GameSelectionEvent e) {
	}

	@Override
	public void addSelectGameListener(GameSelectionListener l) {
		selectGameListeners.add(l);
	}

	@Override
	public void addRunGameListener(MouseListener l) {
		tblGames.addMouseListener(l);
	}

	@Override
	public void addRunGameListener(Action l) {
		tblGames.getInputMap(JComponent.WHEN_ANCESTOR_OF_FOCUSED_COMPONENT).put(KeyStroke.getKeyStroke(KeyEvent.VK_ENTER, 0), "actionRunGame");
		tblGames.getActionMap().put("actionRunGame", l);
		//		tblGames.getInputMap().put(KeyStroke.getKeyStroke("pressed ENTER"), "actionRunGame");
		//		tblGames.getActionMap().put("actionRunGame", l);
	}

	public void setSortOrder(int order) {
		tblGames.getRowSorter().toggleSortOrder(order);
	}

	@Override
	public void increaseFontSize() {
		int newRowHeight = getRowHeight() + 4;
		int newColumnWidth = getColumnWidth() + 64;
		setRowHeight(newRowHeight);
		setColumnWidth(newColumnWidth);
		Font font = tblGames.getFont();
		tblGames.setFont(new Font(font.getFontName(), font.getStyle(), font.getSize() + 2));
	}

	@Override
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

	@Override
	public int getColumnWidth() {
		if (columnModel.getColumnCount() > 1) {
			TableColumn column = columnModel.getColumn(1);
			int columnWidth = column.getWidth();
			return columnWidth;
		}
		return 128;
	}

	@Override
	public void setColumnWidth(int value) {
		tblGames.getColumnModel().getColumn(1).setWidth(value);
	}

	@Override
	public int getRowHeight() {
		return tblGames.getRowHeight();
	}

	@Override
	public void setRowHeight(int value) {
		if (value < 1) {
			value = 25;
		}
		tblGames.setRowHeight(value);
	}

	@Override
	public void addGameDragDropListener(DropTargetListener l) {
		new DropTarget(spTblGames, l);
	}

	@Override
	public void languageChanged() {
		popupGame.languageChanged();
		popupView.languageChanged();
		((GameTableModel) mdlTblAllGames).languageChanged();
		final List<Integer> columnWidths = new ArrayList<>();

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
				if (keyFinal != null && keyFinal.getColumn() != -1) {
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

	@Override
	public void groupByNone() {
	}

	@Override
	public void groupByPlatform() {
	}

	@Override
	public void groupByTitle() {
	}

	@Override
	public void hideExtensions(boolean selected) {
		hideExtensions = selected;
	}

	public int getfontSize() {
		return tblGames.getFont().getSize();
	}

	@Override
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

	@Override
	public void gameRated(Game game) {
		if (game.getRate() > 0) {
			if (!((GameTableModel) mdlTblFavorites).contains(game)) {
				((GameTableModel) mdlTblFavorites).addRow(game);
			}
		} else {
			((GameTableModel) mdlTblFavorites).removeGame(game);
		}
		UIUtil.revalidateAndRepaint(spTblGames);
	}

	public void addGame(Game game, ImageIcon gameIcon) {
		((GameTableModel) mdlTblAllGames).addRow(game);
		((GameTableModel) mdlTblAllGames).addGameIcon(game.getId(), gameIcon);
		if (game.isFavorite()) {
			((GameTableModel) mdlTblFavorites).addRow(game);
		}
	}

	@Override
	public void gameAdded(GameAddedEvent e, FilterEvent filterEvent) {
		Game game = e.getGame();
		((GameTableModel) mdlTblAllGames).addRow(game);
		filterSet(filterEvent);
		if (e.isManuallyAdded()) {
			selectGame(game.getId());
		}
	}

	@Override
	public void gameRemoved(GameRemovedEvent e) {
		Game game = e.getGame();
		((GameTableModel) mdlTblAllGames).removeGame(game);
		((GameTableModel) mdlTblRecentlyPlayed).removeGame(game);
		((GameTableModel) mdlTblRecentlyPlayed).removeGame(game);
		((GameTableModel) mdlTblFavorites).removeGame(game);
		selectGame(GameConstants.NO_GAME);
	}

	@Override
	public void initGameList(List<Game> games, int currentNavView) {
		if (mdlTblAllGames.getRowCount() == 0) {
			for (Game game : games) {
				addGame(game, null);
			}
			switch (currentNavView) {
			case NavigationPanel.ALL_GAMES:
				tblGames.setModel(mdlTblAllGames);
				break;
			case NavigationPanel.RECENTLY_PLAYED:
				tblGames.setModel(mdlTblRecentlyPlayed);
				break;
			case NavigationPanel.FAVORITES:
				tblGames.setModel(mdlTblFavorites);
				break;
			default:
				tblGames.setModel(mdlTblAllGames);
				break;
			}
			initAndSetCustomCellRenderer();
		}
	}

	public void setCustomCellRenderer() {
		initAndSetCustomCellRenderer();
	}

	private void initAndSetCustomCellRenderer() {
		if (customRenderer == null) {
			customRenderer = new CustomRenderer();
		}
		setCustomCellRenderer(customRenderer);
	}

	private void setCustomCellRenderer(CustomRenderer customRenderer) {
		for (int i = 1; i < columnModel.getColumnCount(); i++) {
			columnModel.getColumn(i).setCellRenderer(customRenderer);
		}
	}

	@Override
	public void sortOrder(int sortOrder) {
		tblGames.getRowSorter().toggleSortOrder(1);
	}

	@Override
	public void sortBy(int sortBy, PlatformComparator platformComparator) {
		int selectedRow = tblGames.getSelectedRow();
		Game selectedGame = (selectedRow != -1) ? explorer.getGame(selectedRow) : null;

		doNotFireSelectGameEvent = true;
		switch (sortBy) {
		case ViewConstants.SORT_BY_PLATFORM:
			tblGames.getRowSorter().toggleSortOrder(2);
			break;
		case ViewConstants.SORT_BY_TITLE:
			tblGames.getRowSorter().toggleSortOrder(1);
			break;
		}
		if (selectedGame != null) {
			int selectedGameId = selectedGame.getId();
			selectGame(selectedGameId);
		}
		doNotFireSelectGameEvent = false;
	}

	@Override
	public void navigationChanged(NavigationEvent e, FilterEvent filterEvent) {
		int gameCount = 0;
		switch (e.getView()) {
		case NavigationPanel.ALL_GAMES:
			setCurrentView(NavigationPanel.ALL_GAMES);
			gameCount = mdlTblAllGames.getRowCount();
			tblGames.setModel(mdlTblAllGames);
			break;
		case NavigationPanel.RECENTLY_PLAYED:
			setCurrentView(NavigationPanel.RECENTLY_PLAYED);
			tblGames.setModel(mdlTblRecentlyPlayed);
			break;
		case NavigationPanel.FAVORITES:
			setCurrentView(NavigationPanel.FAVORITES);
			tblGames.setModel(mdlTblFavorites);
			break;
		default:
			setCurrentView(NavigationPanel.ALL_GAMES);
			tblGames.setModel(mdlTblAllGames);
			break;
		}
		scrollToSelectedGames();
		if (filterEvent.isPlatformFilterSet() || filterEvent.isGameFilterSet()) {
			((GameTableModel) mdlTblFiltered).removeAllElements();
			filterSet(filterEvent);
			gameCount = mdlTblFiltered.getRowCount();
		}
		fireUpdateGameCountEvent(gameCount);
	}

	public int getCurrentView() {
		return currentView;
	}

	private void setCurrentView(int currentView) {
		this.currentView = currentView;
	}

	@Override
	public void pinColumnWidthSliderPanel(JPanel pnlColumnWidthSlider) {
		add(pnlColumnWidthSlider, BorderLayout.SOUTH);
		pnlColumnWidthSlider.setVisible(true);
		UIUtil.revalidateAndRepaint(this);
	}

	@Override
	public void unpinColumnWidthSliderPanel(JPanel pnlColumnWidthSlider) {
		remove(pnlColumnWidthSlider);
		UIUtil.revalidateAndRepaint(this);
	}

	@Override
	public void pinRowHeightSliderPanel(JPanel pnlRowHeightSlider) {
		add(pnlRowHeightSlider, BorderLayout.EAST);
		pnlRowHeightSlider.setVisible(true);
		UIUtil.revalidateAndRepaint(this);
	}

	@Override
	public void unpinRowHeightSliderPanel(JPanel pnlRowHeightSlider) {
		remove(pnlRowHeightSlider);
		UIUtil.revalidateAndRepaint(this);
	}

	@Override
	public void addDecreaseFontListener(Action l) {
		// TODO Auto-generated method stub

	}

	@Override
	public void addIncreaseFontListener(Action l) {
		// TODO Auto-generated method stub

	}

	@Override
	public void addIncreaseFontListener2(MouseWheelListener l) {
		// TODO Auto-generated method stub

	}

	@Override
	public void addOpenGamePropertiesListener(Action l) {
		tblGames.getInputMap().put(KeyStroke.getKeyStroke(KeyEvent.VK_ENTER, InputEvent.ALT_DOWN_MASK),
				"actionOpenGameProperties");
		tblGames.getActionMap().put("actionOpenGameProperties", l);
	}

	@Override
	public void addRemoveGameListener(Action l) {
		// TODO Auto-generated method stub

	}

	@Override
	public void addCommentListener(ActionListener l) {
		// TODO Auto-generated method stub

	}

	@Override
	public void addOpenGameFolderListener1(MouseListener l) {
		// TODO Auto-generated method stub

	}

	@Override
	public void addRateListener(RateListener l) {
		// TODO Auto-generated method stub

	}

	@Override
	public void addRenameGameListener(Action l) {
		tblGames.getInputMap().put(KeyStroke.getKeyStroke("F2"), "actionRenameGame");
		tblGames.getActionMap().put("actionRenameGame", l);
	}

	@Override
	public void selectNextGame() {
		//		int nextIndex = lstGames.getSelectedIndex() + 1;
		//		if (nextIndex < lstGames.getModel().getSize()) {
		//			Game game = lstGames.getModel().getElementAt(nextIndex);
		//			selectGame(game.getId());
		//		}
	}

	@Override
	public void selectPreviousGame() {
		//		int previousIndex = lstGames.getSelectedIndex() - 1;
		//		if (previousIndex < lstGames.getModel().getSize()) {
		//			Game game = lstGames.getModel().getElementAt(previousIndex);
		//			selectGame(game.getId());
		//		}
	}

	@Override
	public boolean isTouchScreenScrollEnabled() {
		return touchScreenScrollEnabled;
	}

	@Override
	public void setTouchScreenScrollEnabled(boolean touchScreenScrollEnabled) {
		this.touchScreenScrollEnabled = touchScreenScrollEnabled;
	}

	@Override
	public void setViewStyle(int viewStyle) {
		this.viewStyle = viewStyle;
	}

	@Override
	public void addUpdateGameCountListener(UpdateGameCountListener l) {
		gameCountListeners.add(l);
	}

	private void fireUpdateGameCountEvent(int gameCount) {
		for (UpdateGameCountListener l : gameCountListeners) {
			l.gameCountUpdated(gameCount);
		}
	}

	@Override
	public void addAddGameOrEmulatorFromClipboardListener(Action l) {
		tblGames.getInputMap().put(KeyStroke.getKeyStroke(KeyEvent.VK_V, InputEvent.CTRL_DOWN_MASK),
				"actionAddGameOrEmulatorFromClipboard");
		tblGames.getActionMap().put("actionAddGameOrEmulatorFromClipboard", l);
	}

	class CustomRenderer extends DefaultTableCellRenderer {
		private static final long serialVersionUID = -1;
		private Color favoriteForegroundColor = new Color(250, 250, 128);

		@Override
		public Component getTableCellRendererComponent(JTable table, Object value, boolean isSelected, boolean hasFocus,
				int row, int column) {
			Component cellComponent = super.getTableCellRendererComponent(table, value, isSelected, hasFocus, row,
					column);
			Game game = (Game) mdlTblAllGames.getValueAt(table.convertRowIndexToModel(row), -1);
			if (game != null) {
				//				Font font = cellComponent.getFont();
				//				Color selectedBackgroundColor = tblGames.getSelectionBackground();
				Color selectedBackgroundColor = new Color(0f, 0f, 0f, 0.25f);
				Color hoveredBackgroundColor = new Color(0f, 0f, 0f, 0.1f);
				((JComponent) cellComponent).setOpaque(isSelected);
				if (isSelected) {
					Color selectedForegroundColor = UIManager.getColor("Table.selectionForeground");
					cellComponent.setForeground(selectedForegroundColor);
					cellComponent.setBackground(selectedBackgroundColor);
					if (game.isFavorite()) {
						//						Font fontBold = (font.isBold()) ? font : font.deriveFont(
						//								Collections.singletonMap(TextAttribute.WEIGHT, TextAttribute.WEIGHT_BOLD));
						//						cellComponent.setFont(fontBold);
						cellComponent.setForeground(favoriteForegroundColor);
					}
				} else {
					//					cellComponent.setBackground(null);
					if (row == mouseOver) {
						((JComponent) cellComponent).setOpaque(true);
						cellComponent.setBackground(hoveredBackgroundColor);
						//						cellComponent.setForeground(selectedBackgroundColor);
						if (game.isFavorite()) {
							//							Font fontBold = (font.isBold()) ? font : font.deriveFont(
							//									Collections.singletonMap(TextAttribute.WEIGHT, TextAttribute.WEIGHT_BOLD));
							//							cellComponent.setFont(fontBold);
							cellComponent.setForeground(favoriteForegroundColor);
						} else {
							cellComponent.setForeground(foregroundColor);
						}
					} else {
						if (game.isFavorite()) {
							//							Font fontBold = (font.isBold()) ? font : font.deriveFont(Font.BOLD);
							//							cellComponent.setFont(fontBold);
							cellComponent.setForeground(favoriteForegroundColor);
						} else {
							//							Font fontPlain = cellComponent.getFont().deriveFont(Font.PLAIN);
							cellComponent.setForeground(foregroundColor);
							//							cellComponent.setFont(fontPlain);
						}
					}
				}
			}
			return cellComponent;
		}
	}

	@Override
	public void filterSet(FilterEvent event) {
		int selectedRow = tblGames.getSelectedRow();
		Game selectedGame = (selectedRow != -1) ? (Game) tblGames.getValueAt(selectedRow, -1) : null;
		int selectedGameId = (selectedGame != null) ? selectedGame.getId() : GameConstants.NO_GAME;
		doNotFireSelectGameEvent = true;
		//		rememberColumnWidths(tblGames);
		tblGames.setAutoCreateColumnsFromModel(false);

		doTheFilterNew(event);

		if (selectedGameId != GameConstants.NO_GAME) {
			selectGame(selectedGameId);
			if (tblGames.getSelectedRow() == -1) {
				doNotFireSelectGameEvent = false;
				fireGameSelectedEvent(new BroGameSelectionEvent());
			}
		}
		doNotFireSelectGameEvent = false;
		//		fireUpdateGameCountEvent(((GameTableModel) tblGames.getModel()).getRowCount());
		UIUtil.revalidateAndRepaint(tblGames);
		//				setRememberedColumnWidths(tblGames);
	}

	private void doTheFilterNew(FilterEvent event) {
		((GameTableModel) mdlTblFiltered).removeAllElements();

		int platformId = event.getPlatformId();
		Criteria criteria = event.getCriteria();
		List<Game> allGames = getGamesFromCurrentView();
		for (Game g : allGames) {
			((GameTableModel) mdlTblFiltered).addRow(g);
		}
		if (event.isPlatformFilterSet()) {
			for (int i = mdlTblFiltered.getRowCount()-1; i >= 0; i--) {
				Game game = (Game) mdlTblFiltered.getValueAt(i, -1);
				if (game.getPlatformId() != platformId) {
					((GameTableModel) mdlTblFiltered).removeGame(game);
					continue;
				}
			}
		}
		if (event.isGameFilterSet()) {
			String text = event.getCriteria().getText();
			boolean hasSearchString = text != null && !text.isEmpty();
			boolean hasTags = event.hasTags();
			for (int i = mdlTblFiltered.getRowCount()-1; i >= 0; i--) {
				Game game = (Game) mdlTblFiltered.getValueAt(i, -1);
				if (hasSearchString) {
					if (!game.getName().toLowerCase().contains(text.toLowerCase())) {
						((GameTableModel) mdlTblFiltered).removeGame(game);
						continue;
					}
				}
				if (hasTags) {
					//					if (Collections.disjoint(game.getTags(), criteria.getTags())) {
					for (Tag t : criteria.getTags()) {
						if (!game.hasTag(t.getId())) {
							((GameTableModel) mdlTblFiltered).removeGame(game);
						}
					}
				}
			}
		}
		GameTableModel mdl = (!event.isPlatformFilterSet() && !event.isGameFilterSet()) ? getModelFromCurrentView()
				: (GameTableModel) mdlTblFiltered;
		List<Tag> tagsFromGames = new ArrayList<>();
		for (Game game : ((GameTableModel) mdlTblFiltered).getAllElements()) {
			tagsFromGames.addAll(game.getTags());
		}
		tblGames.setModel(mdl);
		fireTagFilterEvent(tagsFromGames, false);
	}

	private GameTableModel getModelFromCurrentView() {
		GameTableModel tmpMdl;
		if (getCurrentView() == NavigationPanel.ALL_GAMES) {
			tmpMdl = ((GameTableModel) mdlTblAllGames);
		} else if (getCurrentView() == NavigationPanel.RECENTLY_PLAYED) {
			tmpMdl = ((GameTableModel) mdlTblRecentlyPlayed);
		} else if (getCurrentView() == NavigationPanel.FAVORITES) {
			tmpMdl = ((GameTableModel) mdlTblFavorites);
		} else {
			tmpMdl = new GameTableModel(explorer);
		}
		return tmpMdl;
	}

	private List<Game> getGamesFromCurrentView() {
		List<Game> tmpGames;
		if (getCurrentView() == NavigationPanel.ALL_GAMES) {
			tmpGames = ((GameTableModel) mdlTblAllGames).getAllElements();
		} else if (getCurrentView() == NavigationPanel.RECENTLY_PLAYED) {
			tmpGames = ((GameTableModel) mdlTblRecentlyPlayed).getAllElements();
		} else if (getCurrentView() == NavigationPanel.FAVORITES) {
			tmpGames = ((GameTableModel) mdlTblFavorites).getAllElements();
		} else {
			tmpGames = new ArrayList<>();
		}
		return tmpGames;
	}

	private void doTheFilter(FilterEvent event) {
		if (!event.isGameFilterSet()) {
			((GameTableModel) mdlTblFiltered).removeAllElements();
			if (!event.isPlatformFilterSet()) {

				// no tag filter set
				if (!event.hasTags()) {
					if (getCurrentView() == NavigationPanel.ALL_GAMES) {
						tblGames.setModel(mdlTblAllGames);

						List<Tag> tagsFromGames = new ArrayList<>();
						for (Game game : ((GameTableModel) mdlTblAllGames).getAllElements()) {
							tagsFromGames.addAll(game.getTags());
						}
						fireTagFilterEvent(tagsFromGames, true);
					}
					if (getCurrentView() == NavigationPanel.RECENTLY_PLAYED) {
						tblGames.setModel(mdlTblRecentlyPlayed);

						List<Tag> tagsFromGames = new ArrayList<>();
						for (Game game : ((GameTableModel) mdlTblRecentlyPlayed).getAllElements()) {
							tagsFromGames.addAll(game.getTags());
						}
						fireTagFilterEvent(tagsFromGames, true);
					}
					if (getCurrentView() == NavigationPanel.FAVORITES) {
						tblGames.setModel(mdlTblFavorites);

						List<Tag> tagsFromGames = new ArrayList<>();
						for (Game game : ((GameTableModel) mdlTblFavorites).getAllElements()) {
							tagsFromGames.addAll(game.getTags());
						}
						fireTagFilterEvent(tagsFromGames, true);
					}
					// tag filter set but no other filters
				} else {
					if (getCurrentView() == NavigationPanel.ALL_GAMES) {
						checkTagFilter(event, (GameTableModel) mdlTblAllGames);
					}
					if (getCurrentView() == NavigationPanel.RECENTLY_PLAYED) {
						checkTagFilter(event, (GameTableModel) mdlTblRecentlyPlayed);
					}
					if (getCurrentView() == NavigationPanel.FAVORITES) {
						checkTagFilter(event, (GameTableModel) mdlTblFavorites);
					}
				}
			} else {
				if (getCurrentView() == NavigationPanel.ALL_GAMES) {
					checkPlatformFilter(event, (GameTableModel) mdlTblAllGames);
				}
				if (getCurrentView() == NavigationPanel.RECENTLY_PLAYED) {
					checkPlatformFilter(event, (GameTableModel) mdlTblRecentlyPlayed);
				}
				if (getCurrentView() == NavigationPanel.FAVORITES) {
					checkPlatformFilter(event, (GameTableModel) mdlTblFavorites);
				}
			}
		} else {
			List<Game> tmpGames = null;
			if (getCurrentView() == NavigationPanel.ALL_GAMES) {
				tmpGames = ((GameTableModel) mdlTblAllGames).getAllElements();
			}
			if (getCurrentView() == NavigationPanel.RECENTLY_PLAYED) {
				tmpGames = ((GameTableModel) mdlTblRecentlyPlayed).getAllElements();
			}
			if (getCurrentView() == NavigationPanel.FAVORITES) {
				tmpGames = ((GameTableModel) mdlTblFavorites).getAllElements();
			}
			int platformId = event.getPlatformId();
			Criteria criteria = event.getCriteria();
			for (Game game : tmpGames) {
				if (game.getName().toLowerCase().contains(criteria.getText().toLowerCase())) {
					if (!((GameTableModel) mdlTblFiltered).contains(game)) {
						if (getCurrentView() == NavigationPanel.FAVORITES && !game.isFavorite()) {
							continue;
						} else {
							if (!event.isPlatformFilterSet()) {
								((GameTableModel) mdlTblFiltered).addRow(game);
							} else {
								if (game.getPlatformId() == platformId) {
									((GameTableModel) mdlTblFiltered).addRow(game);
								}
							}
						}
					} else {
						if (getCurrentView() == NavigationPanel.FAVORITES) {
							if (!game.isFavorite()) {
								((GameTableModel) mdlTblFiltered).removeGame(game);
							}
						}
						if (event.isPlatformFilterSet()) {
							if (game.getPlatformId() != platformId) {
								((GameTableModel) mdlTblFiltered).removeGame(game);
							}
						}
					}
				} else {
					if (((GameTableModel) mdlTblFiltered).contains(game)) {
						((GameTableModel) mdlTblFiltered).removeGame(game);
					}
				}
			}
			tblGames.setModel(mdlTblFiltered);
			List<Tag> tagsFromGames = new ArrayList<>();
			for (Game game : ((GameTableModel) mdlTblFiltered).getAllElements()) {
				tagsFromGames.addAll(game.getTags());
			}
			fireTagFilterEvent(tagsFromGames, true);
		}
	}

	private void setRememberedColumnWidths(JTable tbl) {
		TableColumnModel columnModel = tbl.getColumnModel();
		for (int i = 0; i < columnModel.getColumnCount(); i++) {
			TableColumn column = columnModel.getColumn(i);
			column.setWidth(columnWidths.get(i));
		}
	}

	private void rememberColumnWidths(JTable tbl) {
		columnWidths.clear();
		TableColumnModel columnModel = tbl.getColumnModel();
		for (int i = 0; i < columnModel.getColumnCount(); i++) {
			TableColumn column = columnModel.getColumn(i);
			columnWidths.add(column.getWidth());
		}
	}

	private void checkPlatformFilter(FilterEvent event, GameTableModel mdlTblGames) {
		int platformId = event.getPlatformId();

		for (Game game : mdlTblGames.getAllElements()) {
			if (game.getPlatformId() == platformId) {
				((GameTableModel) mdlTblFiltered).addRow(game);
			}
		}
		tblGames.setModel(mdlTblFiltered);

		List<Tag> tagsFromGames = new ArrayList<>();
		for (Game game : ((GameTableModel) mdlTblFiltered).getAllElements()) {
			tagsFromGames.addAll(game.getTags());
		}
		fireTagFilterEvent(tagsFromGames, true);
	}

	private void checkTagFilter(FilterEvent event, GameTableModel mdlTblAllGames2) {
		List<Tag> tags = event.getCriteria().getTags();
		List<Game> games = new ArrayList<>(mdlTblAllGames2.getAllElements());
		outerloop:
			for (Game game : games) {
				for (Tag tag : tags) {
					int tagId = tag.getId();
					if (!game.hasTag(tagId)) {
						continue outerloop;
					}
				}
				if (!((GameTableModel) mdlTblFiltered).contains(game)) {
					((GameTableModel) mdlTblFiltered).addRow(game);
				}
			}
		GameTableModel mdl = (GameTableModel) mdlTblFiltered;
		List<Tag> tagsFromGames = new ArrayList<>();
		for (Game game : ((GameTableModel) mdlTblFiltered).getAllElements()) {
			tagsFromGames.addAll(game.getTags());
		}
		tblGames.setModel(mdl);
		fireTagFilterEvent(tagsFromGames, false);
	}

	private void fireTagFilterEvent(List<Tag> tags, boolean removeUnusedTags) {
		for (TagsFromGamesListener l : tagsFromGamesListeners) {
			l.tagsInCurrentViewChanged(tags, removeUnusedTags);
		}
	}
	@Override
	public void gameRenamed(GameRenamedEvent event) {
	}

	@Override
	public void addCoverDragDropListener(DropTargetListener l) {
		new DropTarget(tblGames, l);
	}

	@Override
	public Component getDefaultFocusableComponent() {
		return tblGames;
	}

	@Override
	public void addTagListener(TagListener l) {
	}

	@Override
	public void addTagsFromGamesListener(TagsFromGamesListener l) {
		tagsFromGamesListeners.add(l);
	}

	@Override
	public List<Game> getGames() {
		return ((GameTableModel) tblGames.getModel()).getAllElements();
	}

	@Override
	public void coverSizeChanged(int currentCoverSize) {
	}

	@Override
	public void scrollToSelectedGames() {
		List<Game> selectedGames = explorer.getCurrentGames();
		if (selectedGames != null && !selectedGames.isEmpty()) {
			ListSelectionModel selectionModel = tblGames.getSelectionModel();
			selectionModel.setSelectionInterval(0, 0);
		}
	}

	@Override
	public void themeChanged() {
		themeChanged = true;
	}
}