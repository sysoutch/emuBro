package ch.sysout.emubro.ui;

import java.awt.BorderLayout;
import java.awt.Color;
import java.awt.Component;
import java.awt.Cursor;
import java.awt.Font;
import java.awt.Point;
import java.awt.Rectangle;
import java.awt.Toolkit;
import java.awt.dnd.DropTarget;
import java.awt.dnd.DropTargetListener;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.awt.event.ComponentAdapter;
import java.awt.event.ComponentEvent;
import java.awt.event.FocusAdapter;
import java.awt.event.FocusEvent;
import java.awt.event.InputEvent;
import java.awt.event.KeyAdapter;
import java.awt.event.KeyEvent;
import java.awt.event.KeyListener;
import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;
import java.awt.event.MouseListener;
import java.awt.event.MouseMotionAdapter;
import java.awt.event.MouseWheelEvent;
import java.awt.event.MouseWheelListener;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;

import javax.swing.AbstractButton;
import javax.swing.Action;
import javax.swing.BorderFactory;
import javax.swing.DefaultListSelectionModel;
import javax.swing.Icon;
import javax.swing.ImageIcon;
import javax.swing.JButton;
import javax.swing.JComponent;
import javax.swing.JList;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.KeyStroke;
import javax.swing.ListCellRenderer;
import javax.swing.ListModel;
import javax.swing.ListSelectionModel;
import javax.swing.ScrollPaneConstants;
import javax.swing.SwingConstants;
import javax.swing.SwingUtilities;
import javax.swing.ToolTipManager;
import javax.swing.UIManager;
import javax.swing.event.ListSelectionEvent;
import javax.swing.event.ListSelectionListener;

import com.jgoodies.forms.layout.CellConstraints;
import com.jgoodies.forms.layout.ColumnSpec;
import com.jgoodies.forms.layout.FormLayout;
import com.jgoodies.forms.layout.RowSpec;

import ch.sysout.emubro.api.event.GameAddedEvent;
import ch.sysout.emubro.api.event.GameRemovedEvent;
import ch.sysout.emubro.api.event.GameSelectionEvent;
import ch.sysout.emubro.api.model.Game;
import ch.sysout.emubro.api.model.Platform;
import ch.sysout.emubro.api.model.PlatformComparator;
import ch.sysout.emubro.controller.GameSelectionListener;
import ch.sysout.emubro.controller.ViewConstants;
import ch.sysout.emubro.impl.event.BroGameSelectionEvent;
import ch.sysout.emubro.impl.event.NavigationEvent;
import ch.sysout.emubro.impl.model.GameConstants;
import ch.sysout.emubro.util.MessageConstants;
import ch.sysout.ui.ImageUtil;
import ch.sysout.util.Messages;
import ch.sysout.util.ScreenSizeUtil;
import ch.sysout.util.UIUtil;

public class ListViewPanel extends ViewPanel implements ListSelectionListener {
	private GameListModel mdlLstAllGames = new GameListModel();
	private GameListModel mdlLstRecentlyPlayed = new GameListModel();
	private GameListModel mdlLstFavorites = new GameListModel();
	private GameListModel mdlLstFilteredGames = new GameListModel();

	public class DisabledItemSelectionModel extends DefaultListSelectionModel {
		private static final long serialVersionUID = 1L;

		@Override
		public void setSelectionInterval(int index0, int index1) {
			super.setSelectionInterval(-1, -1);
		}
	}
	private static final long serialVersionUID = 1L;
	private static int size = ScreenSizeUtil.adjustValueToResolution(16);
	private List<String> stringList = new ArrayList<>();
	private JList<Game> lstGames = new JList<Game>() {

		@Override
		public int locationToIndex(Point location) {
			int index = super.locationToIndex(location);
			if (index != -1 && !getCellBounds(index, index).contains(location)) {
				return -1;
			}
			else {
				return index;
			}
		}
	};
	private List<GameSelectionListener> selectGameListeners = new ArrayList<>();
	protected int lastVertScrollBarValue;
	private int lastSelectedIndex;
	GameContextMenu popupGame;
	private GroupContextMenu popupGroup;
	protected int mouseOver = -1;
	private Color c;
	private Color color2 = new Color(56, 216, 120);
	private Cursor cursorDrag = Cursor.getPredefinedCursor(Cursor.MOVE_CURSOR);
	protected int lastHorizontalScrollBarValue;
	protected int lastVerticalScrollBarValue;
	protected int lastMouseX;
	protected int lastMouseY;
	private int lastVisibleRectY;
	private int lastVisibleRectX;
	protected int scrollDistanceX;
	protected int scrollDistanceY;
	private int viewStyle;
	private int layoutOrientation;
	private int defaultViewStyle = 1;
	protected Map<String, Icon> systemIcons = new HashMap<>();
	private Map<JList<Game>, JScrollPane> sps = new HashMap<>();
	private JPanel pnlWrapperListPlatformGroup;
	private JPanel pnlWrapperListTitleGroup;
	private JPanel pnlListPlatform;
	private JPanel pnlListTitle;
	protected int currentFontSize = -1;
	private List<AbstractButton> groupedViewButtons;
	private boolean hideExtensions = true;
	protected boolean dragging;
	protected int currentValue;
	private ListCellRenderer<? super Game> cellRenderer;
	private IconStore iconStore;
	private boolean doNotFireSelectGameEvent;
	private List<Platform> platforms;
	protected int mouseX;
	protected int mouseY;
	private boolean touchScreenScrollEnabled;
	private List<UpdateGameCountListener> gameCountListeners = new ArrayList<>();

	public ListViewPanel(GameContextMenu popupGame) {
		super(new BorderLayout());
		this.popupGame = popupGame;
		initPopupGroup();
		add(createScrollPane(lstGames));
		lstGames.addKeyListener(new KeyAdapter() {
			@Override
			public void keyPressed(KeyEvent e) {
				super.keyPressed(e);
				if (e.getKeyCode() == KeyEvent.VK_CONTEXT_MENU) {
					boolean showFileTreePopup = lstGames.getSelectedIndex() != GameConstants.NO_GAME;
					if (showFileTreePopup) {
						showGamePopupMenu(e.getComponent(), mouseX, mouseY);
					}
				}
			}
		});
	}

	protected void showGamePopupMenu(Component relativeTo, int x, int y) {
		popupGame.show(relativeTo, x, y);
	}

	private void initPopupGroup() {
		popupGroup = new GroupContextMenu();
	}

	private JScrollPane createScrollPane(JList<Game> lst) {
		JScrollPane sp = new JScrollPane();
		sp.addComponentListener(new ComponentAdapter() {
			@Override
			public void componentResized(ComponentEvent e) {
				fixRowCountForVisibleColumns(lst);
			}
		});

		sp.getHorizontalScrollBar().setUnitIncrement(16);
		sp.getVerticalScrollBar().setUnitIncrement(16);

		// sp.setOpaque(false);
		// sp.getViewport().setOpaque(false);
		// lst.setOpaque(false);
		lst.addMouseListener(new MouseAdapter() {
			@Override
			public void mousePressed(MouseEvent e) {
				lastMouseX = e.getXOnScreen();
				lastMouseY = e.getYOnScreen();
				if ((e.getModifiers() & InputEvent.BUTTON3_MASK) == InputEvent.BUTTON3_MASK) {
					if (mouseOver > -1) {
						lst.setSelectedIndex(mouseOver);
					}
				}
			}

			@Override
			public void mouseClicked(MouseEvent e) {
				lastSelectedIndex = mouseOver;
				if (lst.locationToIndex(e.getPoint()) == -1 && !e.isShiftDown()
						&& !isMenuShortcutKeyDown(e)) {
					mouseOver = GameConstants.NO_GAME;
					lst.clearSelection();
				}
			}

			@Override
			public void mouseReleased(MouseEvent e) {
				dragging = false;
				lst.setEnabled(true);
				lst.requestFocusInWindow();
				if (SwingUtilities.isRightMouseButton(e)) {
					int index = lst.locationToIndex(e.getPoint());
					if (index > -1) {
						lst.setSelectedIndex(index);
						showGamePopupMenu(e.getComponent(), e.getX(), e.getY());
					}
				}
				if (sp.getCursor() == cursorDrag) {
					sp.setCursor(null);
				}
				smoothScrollOut(sp, lst);
			}

			@Override
			public void mouseExited(MouseEvent e) {
				mouseOver = -1;
				lst.repaint();
			}
		});

		sp.setViewportView(lst);
		sp.setBorder(BorderFactory.createEmptyBorder());
		sps.put(lst, sp);

		setViewStyle(lst, viewStyle);
		lst.setFixedCellWidth(ScreenSizeUtil.adjustValueToResolution(255));
		lst.setFixedCellHeight(ScreenSizeUtil.adjustValueToResolution(24));
		lst.setSelectionMode(ListSelectionModel.SINGLE_SELECTION);
		ToolTipManager.sharedInstance().registerComponent(lst);

		lst.addListSelectionListener(this);

		//		final Color color = UIManager.getColor("Menu.selectionBackground");
		setGameListRenderer(lst, cellRenderer);

		lst.addMouseMotionListener(new MouseMotionAdapter() {

			@Override
			public void mouseMoved(MouseEvent e) {
				mouseX = e.getX();
				mouseY = e.getY();
				ListModel<Game> model = lst.getModel();
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
				int index = lst.locationToIndex(p);
				if (index > -1) {
					lst.setToolTipText(null);
					Game text = model.getElementAt(index);
					Date lastPlayed = text.getLastPlayed();
					lst.setToolTipText("<html><strong>" + Messages.get(MessageConstants.COLUMN_TITLE) + ": </strong>" + text.getName()
					+ "<br><strong>" + Messages.get(MessageConstants.COLUMN_PLATFORM) + ": </strong>"
					//					+ explorer.getPlatform(text.getPlatformId()) + "<br><strong>" + Messages.get("lastPlayed") + ": </strong>"
					+ (lastPlayed != null ? lastPlayed : Messages.get(MessageConstants.NEVER_PLAYED_SHORT))
					+ "<br><strong>" + Messages.get(MessageConstants.DATE_ADDED) + ": </strong>" + text.getDateAdded()
					+ "<br><strong>" + Messages.get(MessageConstants.FILE_LOCATION) + ": </strong>" + text.getPath()
					+ "</html>");
					mouseOver = index;
				} else {
					index = GameConstants.NO_GAME;
				}
				lst.repaint();
			}

			@Override
			public void mouseDragged(MouseEvent e) {
				boolean noScrollBarsVisible = !sp.getHorizontalScrollBar().isVisible() && !sp.getVerticalScrollBar().isVisible();
				if (!isTouchScreenScrollEnabled() || noScrollBarsVisible) {
					dragging = false;
					return;
				}
				dragging = true;
				lst.setEnabled(false);
				int treshold = 4;
				if (SwingUtilities.isRightMouseButton(e)) {
					return;
				}
				//				bla(e.getPoint());
				if (viewStyle == 0 || viewStyle == 2) {
					if (sp.getVerticalScrollBar().isVisible()) {
						if (sp.getCursor() != cursorDrag) {
							sp.setCursor(cursorDrag);
						}
						if (sp.getCursor() == cursorDrag
								|| scrollDistanceY < -treshold || scrollDistanceY > treshold) {
							// FIXME supress gameSelected event
							//							lst.setSelectedIndex(lastSelectedIndex);
							//							mouseOver = lastSelectedIndex;
							sp.getVerticalScrollBar().setValue(sp.getVerticalScrollBar().getValue() - scrollDistanceY);
						}
						scrollDistanceY = e.getYOnScreen() - lastMouseY;
						lastMouseY = e.getYOnScreen();
						lastVerticalScrollBarValue = sp.getVerticalScrollBar().getValue();
					}
				} else if (viewStyle == 1) {
					if (sp.getHorizontalScrollBar().isVisible()) {
						if (sp.getCursor() != cursorDrag) {
							sp.setCursor(cursorDrag);
						}
						if (sp.getCursor() == cursorDrag
								|| scrollDistanceX < -treshold || scrollDistanceX > treshold) {
							// FIXME supress gameSelected event
							//							lst.setSelectedIndex(lastSelectedIndex);
							//							mouseOver = lastSelectedIndex;
							currentValue = sp.getHorizontalScrollBar().getValue();
							int value = currentValue - scrollDistanceX;
							System.out.println("vals: " + currentValue + " " + scrollDistanceX);
							sp.getHorizontalScrollBar().setValue(value);
						}
						scrollDistanceX = e.getXOnScreen() - lastMouseX;
						lastMouseX = e.getXOnScreen();
						lastHorizontalScrollBarValue = sp.getHorizontalScrollBar().getValue();
					}
				}
			}

			private void bla(Point point) {
				Rectangle rect = lst.getCellBounds(0, lst.getLastVisibleIndex());
				if (rect != null && rect.contains(point)) {
					lst.locationToIndex(point);
				} else {
					lst.clearSelection();
				}
			}
		});
		return sp;
	}

	private boolean isMenuShortcutKeyDown(InputEvent event) {
		return (event.getModifiers() & Toolkit.getDefaultToolkit().getMenuShortcutKeyMask()) != 0;
	}

	protected void smoothScrollOut(JScrollPane sp, JList<Game> lst) {
	}

	public void setGameListRenderer(ListCellRenderer<? super Game> cellRenderer) {
		setGameListRenderer(lstGames, cellRenderer);
	}

	public void setGameListRenderer(JList<Game> lst, ListCellRenderer<? super Game> cellRenderer) {
		this.cellRenderer = cellRenderer;
		lst.setCellRenderer(cellRenderer);
	}

	@Override
	public void setViewStyle(int viewStyle) {
		setViewStyle(lstGames, viewStyle);
	}

	private void setViewStyle(JList<Game> lst, int viewStyle) {
		switch (viewStyle) {
		case 0:
			layoutOrientation = JList.VERTICAL;
			lst.setLayoutOrientation(layoutOrientation);
			sps.get(lst).setHorizontalScrollBarPolicy(ScrollPaneConstants.HORIZONTAL_SCROLLBAR_AS_NEEDED);
			sps.get(lst).setVerticalScrollBarPolicy(ScrollPaneConstants.VERTICAL_SCROLLBAR_AS_NEEDED);
			this.viewStyle = viewStyle;
			break;
		case 1:
			layoutOrientation = JList.VERTICAL_WRAP;
			lst.setLayoutOrientation(layoutOrientation);
			sps.get(lst).setHorizontalScrollBarPolicy(ScrollPaneConstants.HORIZONTAL_SCROLLBAR_AS_NEEDED);
			sps.get(lst).setVerticalScrollBarPolicy(ScrollPaneConstants.VERTICAL_SCROLLBAR_NEVER);
			this.viewStyle = viewStyle;
			break;
		case 2:
			layoutOrientation = JList.HORIZONTAL_WRAP;
			lst.setLayoutOrientation(layoutOrientation);
			sps.get(lst).setHorizontalScrollBarPolicy(ScrollPaneConstants.HORIZONTAL_SCROLLBAR_AS_NEEDED);
			sps.get(lst).setVerticalScrollBarPolicy(ScrollPaneConstants.VERTICAL_SCROLLBAR_AS_NEEDED);
			this.viewStyle = viewStyle;
			break;
		}
		fixRowCountForVisibleColumns(lst);
	}

	private void fixRowCountForVisibleColumns(JList<Game> list) {
		int nCols = 0;
		int nRows = 0;
		switch (viewStyle) {
		case 0:
			list.setVisibleRowCount(list.getModel().getSize());
			return;
		case 1:
			nRows = computeVisibleRowCount(list);
			System.out.println("1: " + nRows);
			list.setVisibleRowCount(nRows);
			return;
		case 2:
			nCols = computeVisibleColumnCount(list);
			System.out.println("2: " + nCols);
			break;
		}
		int nItems = list.getModel().getSize();

		// Compute the number of rows that will result in the desired number of
		// columns
		if (nCols != 0) {
			nRows = nItems / nCols;
			if (nItems % nCols > 0) {
				nRows++;
			}
			list.setVisibleRowCount(nRows);
		}
	}

	private int computeVisibleColumnCount(JList<Game> list) {
		// It's assumed here that all cells have the same width. This method
		// could be modified if this assumption is false. If there was cell
		// padding, it would have to be accounted for here as well.
		Rectangle cellBounds = list.getCellBounds(0, 0);
		if (cellBounds != null) {
			int cellWidth = cellBounds.width;
			int width = list.getVisibleRect().width;
			return width / cellWidth;
		}
		return 1;
	}

	private int computeVisibleRowCount(JList<Game> list) {
		// It's assumed here that all cells have the same width. This method
		// could be modified if this assumption is false. If there was cell
		// padding, it would have to be accounted for here as well.
		if (list != null) {
			Rectangle cellBounds = list.getCellBounds(0, 0);
			if (cellBounds != null) {
				int cellHeight = cellBounds.height;
				int height = list.getVisibleRect().height;
				int result = height / cellHeight;
				return result;
			}
		}
		return 1;
	}

	@Override
	public boolean requestFocusInWindow() {
		return lstGames.requestFocusInWindow();
	}

	@Override
	public void valueChanged(ListSelectionEvent e) {
		if (doNotFireSelectGameEvent) {
			return;
		}
		if (!e.getValueIsAdjusting()) {
			int index = lstGames.getSelectedIndex();
			boolean b = index != GameConstants.NO_GAME;
			Game game = null;
			if (b) {
				game = lstGames.getSelectedValue();
			}
			//			lstGames.setComponentPopupMenu(b ? popupGame : null);

			GameSelectionEvent event = new BroGameSelectionEvent(game, null);
			for (GameSelectionListener l : selectGameListeners) {
				l.gameSelected(event);
			}
		}
	}

	@Override
	public void gameAdded(GameAddedEvent e) {
		Game game = e.getGame();
		mdlLstAllGames.addElement(game);
		if (game.isFavorite()) {
			mdlLstFavorites.addElement(game);
		}
		//		if (getGameListModel() == mdlLstFavorites) {
		//			element.setRate(RatingBarPanel.MAXIMUM_RATE);
		//			mdlLstFavorites.addElement(element);
		//		}
		fixRowCountForVisibleColumns(lstGames);
	}

	@Override
	public void gameRemoved(GameRemovedEvent e) {
		Game game = e.getGame();
		mdlLstAllGames.removeElement(game);
		mdlLstFavorites.removeElement(game);
		mdlLstFilteredGames.removeElement(game);
		mdlLstRecentlyPlayed.removeElement(game);
		fixRowCountForVisibleColumns(lstGames);
	}

	@Override
	public void addOpenGamePropertiesListener(Action l) {
		for (JList<Game> lst : sps.keySet()) {
			lst.getInputMap().put(KeyStroke.getKeyStroke(KeyEvent.VK_ENTER, InputEvent.ALT_DOWN_MASK),
					"actionOpenGameProperties");
			lst.getActionMap().put("actionOpenGameProperties", l);
		}
	}

	@Override
	public void addIncreaseFontListener(Action l) {
		for (JList<Game> lst : sps.keySet()) {
			lst.getInputMap().put(KeyStroke.getKeyStroke(KeyEvent.VK_PLUS, InputEvent.CTRL_DOWN_MASK), "actionIncreaseFont");
			lst.getInputMap().put(KeyStroke.getKeyStroke(KeyEvent.VK_ADD, KeyEvent.CTRL_DOWN_MASK), "actionIncreaseFont");
			lst.getInputMap().put(KeyStroke.getKeyStroke(KeyEvent.VK_EQUALS, KeyEvent.CTRL_DOWN_MASK | KeyEvent.SHIFT_DOWN_MASK),"actionIncreaseFont");
			lst.getInputMap().put(KeyStroke.getKeyStroke(KeyEvent.VK_1, KeyEvent.CTRL_DOWN_MASK | KeyEvent.SHIFT_DOWN_MASK),"actionIncreaseFont");
			lst.getActionMap().put("actionIncreaseFont", l);
		}
	}

	@Override
	public void addIncreaseFontListener2(MouseWheelListener l) {
		for (JScrollPane sp : sps.values()) {
			sp.addMouseWheelListener(l);
			sp.addMouseWheelListener(new MouseWheelListener() {

				@Override
				public void mouseWheelMoved(MouseWheelEvent e) {
					if (e.isControlDown()) {
						sp.setWheelScrollingEnabled(false);
					} else {
						sp.setWheelScrollingEnabled(true);
					}
				}
			});
		}
	}

	@Override
	public void addDecreaseFontListener(Action l) {
		for (JList<Game> lst : sps.keySet()) {
			lst.getInputMap().put(KeyStroke.getKeyStroke(KeyEvent.VK_MINUS, InputEvent.CTRL_DOWN_MASK), "actionDecreaseFont");
			lst.getInputMap().put(KeyStroke.getKeyStroke(KeyEvent.VK_SUBTRACT, InputEvent.CTRL_DOWN_MASK), "actionDecreaseFont");
			lst.getActionMap().put("actionDecreaseFont", l);
		}
	}

	@Override
	public void addSelectGameListener(GameSelectionListener l) {
		selectGameListeners.add(l);
	}

	@Override
	public void addRunGameListener(Action l) {
		for (JList<Game> lst : sps.keySet()) {
			lst.getInputMap().put(KeyStroke.getKeyStroke("pressed ENTER"), "actionRunGame");
			lst.getActionMap().put("actionRunGame", l);
		}
	}

	@Override
	public void addRunGameListener(MouseListener l) {
		for (JList<Game> lst : sps.keySet()) {
			lst.addMouseListener(l);
		}
	}

	@Override
	public void addRenameGameListener(Action l) {
		for (JList<Game> lst : sps.keySet()) {
			lst.getInputMap().put(KeyStroke.getKeyStroke("F2"), "actionRenameGame");
			lst.getActionMap().put("actionRenameGame", l);
		}
	}

	@Override
	public void addRemoveGameListener(Action l) {
		for (JList<Game> lst : sps.keySet()) {
			lst.getInputMap().put(KeyStroke.getKeyStroke("DELETE"), "actionRemoveGame");
			lst.getActionMap().put("actionRemoveGame", l);
		}
	}

	@Override
	public int getColumnWidth() {
		for (JList<Game> lst : sps.keySet()) {
			return lst.getFixedCellWidth();
		}
		return 128;
	}

	@Override
	public void setColumnWidth(int value) {
		// int lastValue =
		// sps.get(lstGames).getHorizontalScrollBar().getValue();
		for (JList<Game> lst : sps.keySet()) {
			Rectangle visibleRect = lst.getVisibleRect();
			int lastSelected = lst.locationToIndex(new Point(visibleRect.x + visibleRect.width / 2, visibleRect.y + visibleRect.height / 2));
			lst.setFixedCellWidth(value);
			fixRowCountForVisibleColumns(lst);
			lst.ensureIndexIsVisible(lastSelected);
		}
	}

	@Override
	public int getRowHeight() {
		for (JList<Game> lst : sps.keySet()) {
			return lst.getFixedCellHeight();
		}
		return 24;
	}

	@Override
	public void setRowHeight(int value) {
		for (JList<Game> lst : sps.keySet()) {
			Rectangle visibleRect = lst.getVisibleRect();
			int lastSelected = lst.locationToIndex(new Point(visibleRect.x + visibleRect.width / 2, visibleRect.y + visibleRect.height / 2));
			lst.setFixedCellHeight(value);
			fixRowCountForVisibleColumns(lst);
			lst.ensureIndexIsVisible(lastSelected);
		}
	}

	@Override
	public void selectGame(int gameId) {
		int selectedIndex = GameConstants.NO_GAME;
		for (int i = 0; i < lstGames.getModel().getSize(); i++) {
			Game game = lstGames.getModel().getElementAt(i);
			if (game.getId() == gameId) {
				selectedIndex = i;
				lstGames.setSelectedIndex(selectedIndex);
				lstGames.ensureIndexIsVisible(selectedIndex);
				break;
			}
		}
	}

	@Override
	public void groupByNone() {
		sps.get(lstGames).setViewportView(lstGames);
		SwingUtilities.invokeLater(new Runnable() {

			@Override
			public void run() {
				fixRowCountForVisibleColumns(lstGames);
			}
		});
	}

	@Override
	public void groupByPlatform() {
		if (pnlListPlatform == null) {
			pnlListPlatform = new JPanel();
			FormLayout layout = null;
			if (viewStyle == 1) {
				layout = new FormLayout("", "fill:pref, min, fill:min:grow");
			} else {
				layout = new FormLayout("min:grow", "");
			}
			pnlListPlatform.setLayout(layout);
			pnlListPlatform.setBackground(UIManager.getColor("List.background"));
			pnlListPlatform.setOpaque(true);
			CellConstraints cc = new CellConstraints();
			int x = 1;
			int y = 1;
			for (Platform p : platforms) {
				JList<Game> lst = new JList<>();
				GameListModel mdlAll = (GameListModel) lstGames.getModel();
				GameListModel mdlNew = new GameListModel();
				for (Game g : mdlAll.getAllElements()) {
					if (g.getPlatformId() == p.getId()) {
						mdlNew.addElement(g);
					}
				}
				lst.setModel(mdlNew);
				setGameListRenderer(lst, cellRenderer);
				if (mdlNew.getSize() == 0) {
					continue;
				}
				createScrollPane(lst);
				lst.addListSelectionListener(new ListSelectionListener() {

					@Override
					public void valueChanged(ListSelectionEvent e) {
						deselectSelectionOfOtherLists(lst);
					}
				});
				lst.addKeyListener(createKeyListener(lst));
				lst.setVisibleRowCount(lstGames.getModel().getSize());
				int gameCount = mdlNew.getSize();
				String gameCountString = (gameCount == 1) ? Messages.get(MessageConstants.GAME_COUNT1, gameCount)
						: Messages.get(MessageConstants.GAME_COUNT, gameCount);
				AbstractButton btn = new JButton(
						"<html><strong>" + p.getName() + "</strong><br>" + gameCountString + "</html>");
				if (groupedViewButtons == null) {
					groupedViewButtons = new ArrayList<AbstractButton>();
				}
				groupedViewButtons.add(btn);
				// TitledBorder titledBorder =
				// BorderFactory.createTitledBorder("");
				// titledBorder.setTitleJustification(TitledBorder.LEFT);
				// titledBorder.setTitlePosition(TitledBorder.LEFT);
				// btn.setBorder(titledBorder);
				//				btn.setContentAreaFilled(false);
				btn.setHorizontalAlignment(SwingConstants.LEFT);
				ImageIcon platformIcon = ImageUtil.getImageIconFrom("/images/platforms/logos/" + p.getIconFileName(),
						false);
				btn.setIcon(platformIcon);
				btn.setDisabledIcon(platformIcon);
				btn.setComponentPopupMenu(popupGroup);
				btn.addActionListener(new ActionListener() {

					@Override
					public void actionPerformed(ActionEvent e) {
						if (!lst.isVisible()) {
							expandList(lst, btn);
							changeButtonAfterExpand(btn, p, gameCount);
						} else {
							collapseList(lst);
							changeButtonAfterCollapse(btn, gameCount);
						}
					}
				});
				if (viewStyle == 1) {
					layout.appendColumn(ColumnSpec.decode("default:grow"));
					layout.appendColumn(ColumnSpec.decode("$rgap"));
					pnlListPlatform.add(btn, cc.xy(x, 1));
					pnlListPlatform.add(lst, cc.xy(x, 3));
					x += 2;
				} else {
					layout.appendRow(RowSpec.decode("fill:pref"));
					layout.appendRow(RowSpec.decode("min"));
					layout.appendRow(RowSpec.decode("fill:default:grow"));
					layout.appendRow(RowSpec.decode("$lgap"));
					pnlListPlatform.add(btn, cc.xy(1, y));
					pnlListPlatform.add(lst, cc.xy(1, y += 2));
					y += 2;
				}
				//				btn.addMouseListener(UIUtil.getMouseAdapter());
				lst.addFocusListener(new FocusAdapter() {
					@Override
					public void focusGained(FocusEvent e) {
						fixRowCountForVisibleColumns(lst);
					}
				});
				fixRowCountForVisibleColumns(lst);
			}
		}
		if (pnlWrapperListPlatformGroup == null) {
			pnlWrapperListPlatformGroup = new JPanel(new BorderLayout());
			pnlWrapperListPlatformGroup.add(pnlListPlatform);
		}
		sps.get(lstGames).setViewportView(pnlWrapperListPlatformGroup);
		sps.get(lstGames).addComponentListener(new ComponentAdapter() {
			@Override
			public void componentResized(ComponentEvent e) {
				for (Map.Entry<JList<Game>, JScrollPane> entry : sps.entrySet()) {
					fixRowCountForVisibleColumns(entry.getKey());
				}
			}
		});
	}

	private KeyListener createKeyListener(JList<Game> lst) {
		KeyAdapter adapter = new KeyAdapter() {
			@Override
			public void keyPressed(KeyEvent e) {
				if (e.getKeyCode() == KeyEvent.VK_RIGHT) {
					System.out.println(e.getKeyCode());
					boolean selectFirstGameInNextList = false;
					for (Entry<JList<Game>, JScrollPane> entry : sps.entrySet()) {
						if (entry.getKey() == lstGames) {
							continue;
						}
						if (selectFirstGameInNextList) {
							JList<Game> lstTemp = entry.getKey();
							if (lstTemp.isVisible()) {
								lstTemp.requestFocusInWindow();
								lstTemp.setSelectedIndex(0);
								lstTemp.ensureIndexIsVisible(0);
								selectFirstGameInNextList = false;
							}
							//									break;
						} else if (entry.getKey() == lst) {
							selectFirstGameInNextList = true;
						}
					}
				}
				if (e.getKeyCode() == KeyEvent.VK_LEFT) {
					System.out.println(e.getKeyCode());
					JList<Game> previousEntry = null;
					for (Entry<JList<Game>, JScrollPane> entry : sps.entrySet()) {
						if (entry.getKey() == lstGames) {
							continue;
						}
						if (entry.getKey() == lst) {
							if (previousEntry != null) {
								previousEntry.requestFocusInWindow();
								previousEntry.setSelectedIndex(0);
								previousEntry.ensureIndexIsVisible(0);
							}
							//									break;
						}
						if (previousEntry == null && entry.getKey().isVisible()) {
							previousEntry = entry.getKey();
						}
					}
				}
			}
		};
		return adapter;
	}

	protected void deselectSelectionOfOtherLists(JList<Game> lst) {
		int selectedEntry = lst.getSelectedIndex();
		for (Map.Entry<JList<Game>, JScrollPane> entry : sps.entrySet()) {
			if (entry.getKey() != lst) {
				entry.getKey().clearSelection();
			}
		}
		lst.setSelectedIndex(selectedEntry);
	}

	protected void changeButtonAfterCollapse(AbstractButton btn, int gameCount) {
		if (viewStyle == 1) {
			String gameCountString = (gameCount == 1) ? Messages.get(MessageConstants.GAME_COUNT1, gameCount)
					: Messages.get("gameCount", gameCount);
			String text = "<html>" + gameCountString + "</html>";
			btn.setText(text);
			btn.setHorizontalTextPosition(SwingConstants.CENTER);
			btn.setHorizontalAlignment(SwingConstants.CENTER);
			btn.setVerticalTextPosition(SwingConstants.BOTTOM);
		}
	}

	protected void changeButtonAfterExpand(AbstractButton btn, Platform p, int gameCount) {
		if (viewStyle == 1) {
			//			int gameCount = explorer.getGameCountFromPlatform(p.getId());
			String gameCountString = (gameCount == 1) ? Messages.get(MessageConstants.GAME_COUNT1, gameCount)
					: Messages.get(MessageConstants.GAME_COUNT, gameCount);
			String text = "<html><strong>" + p.getName() + "</strong><br>" + gameCountString
					+ "</html>";
			btn.setText(text);
			btn.setHorizontalTextPosition(SwingConstants.RIGHT);
			btn.setHorizontalAlignment(SwingConstants.LEFT);
			btn.setVerticalTextPosition(SwingConstants.CENTER);
		}
	}

	protected void expandList(JList<Game> lst, JComponent comp) {
		lst.setVisible(true);
		SwingUtilities.invokeLater(new Runnable() {

			@Override
			public void run() {
				sps.get(lstGames).getViewport().setViewPosition(comp.getLocation());
				fixRowCountForVisibleColumns(lst);
			}
		});
	}

	protected void collapseList(JList<Game> lst) {
		lst.setVisible(false);
	}

	@Override
	public void groupByTitle() {
		if (pnlListTitle == null) {
			pnlListTitle = new JPanel();
			FormLayout layout = null;
			if (viewStyle == 1) {
				layout = new FormLayout("", "fill:pref, min, fill:min:grow");
			} else {
				layout = new FormLayout("min:grow", "");
			}
			pnlListTitle.setLayout(layout);
			pnlListTitle.setBackground(UIManager.getColor("List.background"));
			pnlListTitle.setOpaque(true);
			CellConstraints cc = new CellConstraints();
			int x = 1;
			int y = 1;
			GameListModel mdlAll = (GameListModel) lstGames.getModel();
			String[] chars = {
					"^[0-9].*$",
					"^[A-D].*$", "^[E-H].*$", "^[I-L].*$", "^[M-P].*$", "^[Q-T].*$", "^[U-W].*$", "^[X-Z].*$",
					"^[^A-Z0-9].*$"
			};
			for (int i = 0; i < chars.length; i++) {
				JList<Game> lst = new JList<>();
				GameListModel mdlNew = new GameListModel();
				for (Game g : mdlAll.getAllElements()) {
					if (g.getName().trim().toUpperCase().matches(chars[i])) {
						mdlNew.addElement(g);
					}
				}
				lst.setModel(mdlNew);
				setGameListRenderer(lst, cellRenderer);
				if (mdlNew.getSize() == 0) {
					continue;
				}
				createScrollPane(lst);
				lst.addListSelectionListener(new ListSelectionListener() {

					@Override
					public void valueChanged(ListSelectionEvent e) {
						deselectSelectionOfOtherLists(lst);
					}
				});
				lst.addKeyListener(createKeyListener(lst));
				lst.setVisibleRowCount(lstGames.getModel().getSize());
				int gameCount = mdlNew.getSize();
				String gameCountString = (gameCount == 1) ? Messages.get(MessageConstants.GAME_COUNT1, gameCount)
						: Messages.get(MessageConstants.GAME_COUNT, gameCount);
				String withoutRegex = chars[i].replace("^[", "").replace("].*$", "").replace("^A-Z0-9", Messages.get(MessageConstants.OTHERS));
				AbstractButton btn = new JButton(
						"<html><strong>"+withoutRegex+"</strong><br>" + gameCountString + "</html>");
				if (groupedViewButtons == null) {
					groupedViewButtons = new ArrayList<AbstractButton>();
				}
				groupedViewButtons.add(btn);
				// TitledBorder titledBorder =
				// BorderFactory.createTitledBorder("");
				// titledBorder.setTitleJustification(TitledBorder.LEFT);
				// titledBorder.setTitlePosition(TitledBorder.LEFT);
				// btn.setBorder(titledBorder);
				//				btn.setContentAreaFilled(false);
				btn.setHorizontalAlignment(SwingConstants.LEFT);
				btn.setComponentPopupMenu(popupGroup);
				btn.addActionListener(new ActionListener() {

					@Override
					public void actionPerformed(ActionEvent e) {
						if (!lst.isVisible()) {
							expandList(lst, btn);
						} else {
							collapseList(lst);
							//							String withoutRegex = chars[iFinal].replace("^[", "").replace("].*$", "").replace("^A-Z0-9", Messages.get("others"));
							//							changeButtonAfterCollapseOrExpandTitle(gameCount, withoutRegex, btn, true);
						}
					}
				});
				if (viewStyle == 1) {
					layout.appendColumn(ColumnSpec.decode("default:grow"));
					layout.appendColumn(ColumnSpec.decode("$rgap"));
					pnlListTitle.add(btn, cc.xy(x, 1));
					pnlListTitle.add(lst, cc.xy(x, 3));
					x += 2;
				} else {
					layout.appendRow(RowSpec.decode("fill:pref"));
					layout.appendRow(RowSpec.decode("min"));
					layout.appendRow(RowSpec.decode("fill:default:grow"));
					layout.appendRow(RowSpec.decode("$lgap"));
					pnlListTitle.add(btn, cc.xy(1, y));
					pnlListTitle.add(lst, cc.xy(1, y += 2));
					y += 2;
				}
				//				btn.addMouseListener(UIUtil.getMouseAdapter());
				lst.addFocusListener(new FocusAdapter() {
					@Override
					public void focusGained(FocusEvent e) {
						fixRowCountForVisibleColumns(lst);
					}
				});
				fixRowCountForVisibleColumns(lst);
			}
		}
		if (pnlWrapperListTitleGroup == null) {
			pnlWrapperListTitleGroup = new JPanel(new BorderLayout());
			pnlWrapperListTitleGroup.add(pnlListTitle);
		}
		sps.get(lstGames).setViewportView(pnlWrapperListTitleGroup);
	}

	//	protected void changeButtonAfterCollapseOrExpandTitle(int gameCount, String withoutRegex, AbstractButton btn, boolean expand) {
	//		if (viewStyle == 1) {
	//			String gameCountString = (gameCount == 1) ? Messages.get("gameCount1", gameCount)
	//					: Messages.get("gameCount", gameCount);
	//			String text = "<html><strong>" + withoutRegex + "</strong><br>" + gameCountString
	//					+ "</html>";
	//			btn.setText(expand ? text : "<html><strong>" + withoutRegex + "</strong></html>");
	//		}
	//	}

	protected void doHover(AbstractButton btn, boolean b) {
		btn.setContentAreaFilled(b);
	}

	@Override
	public int getGroupBy() {
		if (sps.get(lstGames).getViewport().getView() == lstGames) {
			return ViewConstants.GROUP_BY_NONE;
		}
		if (sps.get(lstGames).getViewport().getView() == pnlWrapperListPlatformGroup) {
			return ViewConstants.GROUP_BY_PLATFORM;
		}
		if (sps.get(lstGames).getViewport().getView() == pnlWrapperListTitleGroup) {
			return ViewConstants.GROUP_BY_TITLE;
		}
		throw new IllegalStateException("current viewport not known");
	}

	public ListModel<Game> getListModel() {
		return lstGames.getModel();
	}

	@Override
	public void initGameList(List<Game> games, int currentNavView) {
		mdlLstAllGames.addElements(games);
		for (Game game : games) {
			if (game.isFavorite()) {
				mdlLstFavorites.addElement(game);
			}
		}
		switch (currentNavView) {
		case NavigationPanel.ALL_GAMES:
			lstGames.setModel(mdlLstAllGames);
			break;
		case NavigationPanel.RECENTLY_PLAYED:
			lstGames.setModel(mdlLstRecentlyPlayed);
			break;
		case NavigationPanel.FAVORITES:
			lstGames.setModel(mdlLstFavorites);
			break;
		default:
			lstGames.setModel(mdlLstAllGames);
			break;
		}
	}

	@Override
	public void addGameDragDropListener(DropTargetListener l) {
		for (JList<Game> lst : sps.keySet()) {
			new DropTarget(lst, l);
		}
	}

	@Override
	public void languageChanged() {
		popupGame.languageChanged();
		popupGroup.languageChanged();
	}

	@Override
	public void navigationChanged(NavigationEvent e) {
		int gameCount = 0;
		switch (e.getView()) {
		case NavigationPanel.ALL_GAMES:
			gameCount = mdlLstAllGames.getSize();
			lstGames.setModel(mdlLstAllGames);
			lstGames.setBackground(UIManager.getColor("List.background"));
			setViewStyle(lstGames, defaultViewStyle);
			break;
		case NavigationPanel.RECENTLY_PLAYED:
			gameCount = mdlLstRecentlyPlayed.getSize();
			lstGames.setModel(mdlLstRecentlyPlayed);
			lstGames.setBackground(UIManager.getColor("List.background"));
			setViewStyle(lstGames, defaultViewStyle);
			break;
		case NavigationPanel.FAVORITES:
			gameCount = mdlLstFavorites.getSize();
			lstGames.setModel(mdlLstFavorites);
			lstGames.setBackground(new Color(10, 42, 64));
			setViewStyle(lstGames, defaultViewStyle);
			break;
		}
		fireUpdateGameCountEvent(gameCount);
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
	public void increaseFontSize() {
		Rectangle visibleRect = lstGames.getVisibleRect();
		int lastSelected = lstGames.locationToIndex(new Point(visibleRect.x + visibleRect.width / 2, visibleRect.y + visibleRect.height / 2));
		int newRowHeight = getRowHeight() + 4;
		int newColumnWidth = getColumnWidth() + 64;
		if (groupedViewButtons != null) {
			for (AbstractButton b : groupedViewButtons) {
				Font f = b.getFont();
				b.setFont(new Font(f.getName(), f.getStyle(), f.getSize() + 2));
			}
		}
		setRowHeight(newRowHeight);
		setColumnWidth(newColumnWidth);
		currentFontSize += 2;
		repaint();
		lstGames.ensureIndexIsVisible(lastSelected);
	}

	@Override
	public void decreaseFontSize() {
		Rectangle visibleRect = lstGames.getVisibleRect();
		int lastSelected = lstGames.locationToIndex(new Point(visibleRect.x + visibleRect.width / 2, visibleRect.y + visibleRect.height / 2));
		int newRowHeight = getRowHeight() - 4;
		int newColumnWidth = getColumnWidth() - 64;
		if (newRowHeight > 16) {
			if (groupedViewButtons != null) {
				for (AbstractButton b : groupedViewButtons) {
					Font f = b.getFont();
					b.setFont(new Font(f.getName(), f.getStyle(), f.getSize() - 2));
				}
			}
			setRowHeight(newRowHeight);
			setColumnWidth(newColumnWidth);
			currentFontSize -= 2;
			repaint();
			lstGames.ensureIndexIsVisible(lastSelected);
		}
	}

	public int getFontSize() {
		return currentFontSize;
	}

	@Override
	public void setFontSize(int value) {
		currentFontSize = value;
	}

	public JList<?> getGameList() {
		return lstGames;
	}

	public boolean isDragging() {
		return dragging;
	}

	public int getMouseOver() {
		return mouseOver;
	}

	@Override
	public void gameRated(Game game) {
		if (game.getRate() > 0) {
			if (!mdlLstFavorites.contains(game)) {
				mdlLstFavorites.addElement(game);
			}
		} else {
			mdlLstFavorites.removeElement(game);
			if (getListModel() == mdlLstFavorites) {
				lstGames.clearSelection();
			}
		}
		revalidate();
		repaint();
	}

	@Override
	public void sortBy(int sortBy, PlatformComparator platformComparator) {
		Game selectedGame = lstGames.getSelectedValue();
		doNotFireSelectGameEvent = true;
		switch (sortBy) {
		case ViewConstants.SORT_BY_PLATFORM:
			mdlLstAllGames.sortByPlatform(platformComparator);
			mdlLstRecentlyPlayed.sortByPlatform(platformComparator);
			mdlLstFavorites.sortByPlatform(platformComparator);
			break;
		case ViewConstants.SORT_BY_TITLE:
			mdlLstAllGames.sort();
			mdlLstRecentlyPlayed.sort();
			mdlLstFavorites.sort();
			break;
		}
		if (selectedGame != null) {
			int selectedGameId = selectedGame.getId();
			selectGame(selectedGameId);
		}
		doNotFireSelectGameEvent = false;
	}

	@Override
	public void sortOrder(int sortOrder) {
		Game selectedGame = lstGames.getSelectedValue();
		doNotFireSelectGameEvent = true;
		switch (sortOrder) {
		case ViewConstants.SORT_ASCENDING:
			mdlLstAllGames.sort();
			mdlLstRecentlyPlayed.sort();
			mdlLstFavorites.sort();
			break;
		case ViewConstants.SORT_DESCENDING:
			mdlLstAllGames.sortReverseOrder();
			mdlLstRecentlyPlayed.sortReverseOrder();
			mdlLstFavorites.sortReverseOrder();
			break;
		default:
			return;
		}
		if (selectedGame != null) {
			int selectedGameId = selectedGame.getId();
			selectGame(selectedGameId);
		}
		doNotFireSelectGameEvent = false;
	}

	@Override
	public void initPlatforms(List<Platform> platforms) {
		this.platforms = platforms;
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
	public void gameSelected(GameSelectionEvent e) {
		System.out.println("ListViewPanel game selected");
	}

	@Override
	public void hideExtensions(boolean shouldHide) {
		getGameList().repaint();
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
	public void addCommentListener(ActionListener l) {
		// TODO Auto-generated method stub

	}

	@Override
	public void selectNextGame() {
		int nextIndex = lstGames.getSelectedIndex() + 1;
		if (nextIndex < lstGames.getModel().getSize()) {
			Game game = lstGames.getModel().getElementAt(nextIndex);
			selectGame(game.getId());
		}
	}

	@Override
	public void selectPreviousGame() {
		int previousIndex = lstGames.getSelectedIndex() - 1;
		if (previousIndex > -1) {
			Game game = lstGames.getModel().getElementAt(previousIndex);
			selectGame(game.getId());
		}
	}

	@Override
	public boolean isTouchScreenScrollEnabled() {
		return touchScreenScrollEnabled;
	}

	@Override
	public void setTouchScreenScrollEnabled(boolean touchScreenScrollEnabled) {
		this.touchScreenScrollEnabled = touchScreenScrollEnabled;
	}
}