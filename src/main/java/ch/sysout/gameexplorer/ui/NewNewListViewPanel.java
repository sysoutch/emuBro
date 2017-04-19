package ch.sysout.gameexplorer.ui;

import java.awt.BorderLayout;
import java.awt.Color;
import java.awt.Component;
import java.awt.Cursor;
import java.awt.Font;
import java.awt.Point;
import java.awt.Rectangle;
import java.awt.dnd.DropTarget;
import java.awt.dnd.DropTargetListener;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.awt.event.ComponentAdapter;
import java.awt.event.ComponentEvent;
import java.awt.event.FocusEvent;
import java.awt.event.FocusListener;
import java.awt.event.InputEvent;
import java.awt.event.KeyEvent;
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
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;

import javax.swing.AbstractButton;
import javax.swing.Action;
import javax.swing.BorderFactory;
import javax.swing.DefaultListCellRenderer;
import javax.swing.DefaultListSelectionModel;
import javax.swing.Icon;
import javax.swing.ImageIcon;
import javax.swing.JButton;
import javax.swing.JLabel;
import javax.swing.JList;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.KeyStroke;
import javax.swing.ListModel;
import javax.swing.ListSelectionModel;
import javax.swing.ScrollPaneConstants;
import javax.swing.SwingConstants;
import javax.swing.SwingUtilities;
import javax.swing.ToolTipManager;
import javax.swing.UIManager;
import javax.swing.border.Border;
import javax.swing.event.ListSelectionEvent;
import javax.swing.event.ListSelectionListener;

import org.apache.commons.io.FilenameUtils;

import com.jgoodies.forms.layout.CellConstraints;
import com.jgoodies.forms.layout.ColumnSpec;
import com.jgoodies.forms.layout.FormLayout;
import com.jgoodies.forms.layout.RowSpec;

import ch.sysout.gameexplorer.api.GameListener;
import ch.sysout.gameexplorer.api.event.FilterEvent;
import ch.sysout.gameexplorer.api.event.GameAddedEvent;
import ch.sysout.gameexplorer.api.event.GameRemovedEvent;
import ch.sysout.gameexplorer.api.event.GameSelectionEvent;
import ch.sysout.gameexplorer.api.filter.Criteria;
import ch.sysout.gameexplorer.api.model.Explorer;
import ch.sysout.gameexplorer.api.model.Game;
import ch.sysout.gameexplorer.api.model.Platform;
import ch.sysout.gameexplorer.impl.event.BroGameSelectionEvent;
import ch.sysout.gameexplorer.impl.event.NavigationEvent;
import ch.sysout.gameexplorer.impl.model.BroGame;
import ch.sysout.gameexplorer.impl.model.EmulatorConstants;
import ch.sysout.gameexplorer.impl.model.GameConstants;
import ch.sysout.gameexplorer.impl.model.PlatformConstants;
import ch.sysout.util.Messages;
import ch.sysout.util.ScreenSizeUtil;

public class NewNewListViewPanel extends ViewPanel implements ListSelectionListener, ActionListener {
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
	private JList<Game> lstGames = new JList<>();
	private List<GameListener> listeners = new ArrayList<>();
	protected int lastVertScrollBarValue;
	private int lastSelectedIndex;
	private GameContextMenu popupGame;
	private GroupContextMenu popupGroup;
	protected int mouseOver = -1;
	private Color c;
	private Color color2 = new Color(56, 216, 120);
	private Criteria criteria;
	private Cursor cursorDrag = Cursor.getPredefinedCursor(Cursor.MOVE_CURSOR);
	protected int lastVisibleRectX;
	protected int lastVisibleRectY;
	protected int lastMouseX;
	protected int lastMouseY;
	protected int scrollDistanceX;
	protected int scrollDistanceY;
	private ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);
	private int viewStyle;
	private int layoutOrientation;
	private int defaultViewStyle = 1;
	protected Map<String, Icon> systemIcons = new HashMap<>();
	private Explorer explorer;
	private Map<JList<Game>, JScrollPane> sps = new HashMap<>();
	private JPanel pnlWrapperListGroup;
	private JPanel pnlListPlatform;
	protected int currentFontSize = -1;
	private List<AbstractButton> groupedViewButtons;
	private boolean hideExtensions = true;
	protected ListSelectionModel disabledItemSelectionModel = new DisabledItemSelectionModel();
	protected ListSelectionModel lastSelectionModel;

	public NewNewListViewPanel(Explorer explorer) {
		super(new BorderLayout());
		this.explorer = explorer;
		popupGame = new GameContextMenu();
		popupGroup = new GroupContextMenu();
		add(createScrollPane(lstGames));
		lastSelectionModel = lstGames.getSelectionModel();
	}

	private JScrollPane createScrollPane(JList<Game> lst) {
		JScrollPane sp = new JScrollPane();
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
			}

			@Override
			public void mouseReleased(MouseEvent e) {
				if ((e.getModifiers() & InputEvent.BUTTON3_MASK) == InputEvent.BUTTON3_MASK) {
					if (mouseOver > -1) {
						lst.setSelectedIndex(mouseOver);
					}
				}
				if (sp.getCursor() == cursorDrag) {
					sp.setCursor(null);
				}
			}

			@Override
			public void mouseExited(MouseEvent e) {
				mouseOver = -1;
				lst.repaint();
			}
		});

		sp.setViewportView(lst);
		sp.setBorder(BorderFactory.createEmptyBorder());
		sp.addComponentListener(new ComponentAdapter() {
			@Override
			public void componentResized(ComponentEvent e) {
				fixRowCountForVisibleColumns(lst);
			}
		});
		sps.put(lst, sp);

		setViewStyle(lst, viewStyle);
		lst.setFixedCellHeight(ScreenSizeUtil.adjustValueToResolution(24));
		lst.setSelectionMode(ListSelectionModel.SINGLE_SELECTION);
		lst.setFixedCellWidth(255);
		ToolTipManager.sharedInstance().registerComponent(lst);

		lst.addListSelectionListener(this);

		final Color color = UIManager.getColor("Menu.selectionBackground");
		final Color colorFavorite = new Color(250, 176, 42);

		final Border border = BorderFactory.createLineBorder(color);
		BorderFactory.createLineBorder(colorFavorite);

		try {
			c = color.brighter();
		} catch (NullPointerException e) {
			c = color;
		}

		lst.setCellRenderer(new DefaultListCellRenderer() {
			private static final long serialVersionUID = 1L;

			@Override
			public Component getListCellRendererComponent(JList<?> list, Object value, int index, boolean isSelected,
					boolean cellHasFocus) {
				JLabel label = (JLabel) super.getListCellRendererComponent(list, value, index, isSelected,
						cellHasFocus);
				// setOpaque(isSelected);
				// if (!isSelected) {
				// label.setForeground(UIManager.getColor("List.selectionForeground"));
				// }
				BroGame game = (BroGame) value;
				Icon gameIcon = getGameIcon(game.getId());
				if (gameIcon != null) {
					label.setIcon(gameIcon);
				} else {
					int emulatorId = game.getEmulatorId();
					if (emulatorId == EmulatorConstants.NO_EMULATOR) {
						int platformId = game.getPlatformId();
						if (platformId == PlatformConstants.NO_PLATFORM) {
							// should not happen in general. there is a bug
							// somewhere else
						} else {
							// Emulator emulator =
							// explorer.getEmulatorFromPlatform(platformId);
							// if (emulator != null && emulator.getId() !=
							// EmulatorConstants.NO_EMULATOR) {
							// emulatorId = emulator.getId();
							// Icon emulatorIcon = getEmulatorIcon(emulatorId);
							// label.setIcon(emulatorIcon);
							// } else {
							Icon platformIcon = getPlatformIcon(platformId);
							label.setIcon(platformIcon);
							// }
						}
					}
				}
				if (criteria != null
						&& label.getText().toLowerCase().contains(criteria.getText().trim().toLowerCase())) {
					int length = criteria.getText().length();
					for (int i = 0; i < label.getText().length(); i++) {
						if (length < 0 || label.getText().length() < length) {
							continue;
						}
						String labelText = label.getText();
						String criteriaText = criteria.getText();
						/*
						 * Exception in thread "AWT-EventQueue-0"
						 * java.lang.StringIndexOutOfBoundsException: String
						 * index out of range: 47 at
						 * java.lang.String.substring(Unknown Source) at
						 * ch.sysout.gameexplorer.ui.NewNewListViewPanel$1.
						 * getListCellRendererComponent(NewNewListViewPanel.java
						 * :176) at
						 * javax.swing.plaf.basic.BasicListUI.updateLayoutState(
						 * Unknown Source) at
						 * javax.swing.plaf.basic.BasicListUI.
						 * maybeUpdateLayoutState(Unknown Source) at
						 * javax.swing.plaf.basic.BasicListUI.locationToIndex(
						 * Unknown Source) at
						 * javax.swing.JList.locationToIndex(Unknown Source) at
						 * ch.sysout.gameexplorer.ui.NewNewListViewPanel$2.
						 * mouseMoved(NewNewListViewPanel.java:208)
						 */
						if (labelText.substring(i, i + length).equalsIgnoreCase(criteriaText)) {
							String newString = labelText;
							if (!isSelected) {
								newString = "<html>" + label.getText().substring(0, i)
										+ "<span style=\"background-color: #38D878; color: white\">"
										// + "<span style=\"color: #38D878\">"
										+ label.getText().substring(i, i + length) + "</span>"
										+ label.getText().substring(i + length, label.getText().length()) + "</html>";

								label.setText(newString);
							}
							break;
						}
					}
				}

				if (game.isFavorite()) {
					label.setForeground(colorFavorite);
				}
				if (index > -1 && index == mouseOver && index != lst.getSelectedIndex()) {
					// label.setBackground(c);
					// UIManager.getColor("List.selectionForeground")
					label.setForeground(color);
					label.setBorder(border);
				}
				if (index == lst.getSelectedIndex()) {
					label.setForeground(UIManager.getColor("List.selectionForeground"));
				}
				if (!hideExtensions) {
					String fileExtension = FilenameUtils.getExtension(game.getPath());
					if (explorer.isKnownExtension(fileExtension)) {
						String newText = label.getText() + "." + fileExtension;
						label.setText(newText);
					}
				}
				Font labelFont = label.getFont();
				if (currentFontSize == -1) {
					currentFontSize = label.getFont().getSize();
				}
				label.setFont(new Font(labelFont.getName(), Font.PLAIN, currentFontSize));
				return label;
			}
		});

		lst.addMouseMotionListener(new MouseMotionAdapter() {

			@Override
			public void mouseMoved(MouseEvent e) {
				ListModel<Game> model = lst.getModel();
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
				int index = lst.locationToIndex(e.getPoint());
				if (index > -1) {
					lst.setToolTipText(null);
					Game text = model.getElementAt(index);
					Date lastPlayed = text.getLastPlayed();
					lst.setToolTipText("<html><strong>" + Messages.get("columnTitle") + ": </strong>" + text.getName()
					+ "<br><strong>" + Messages.get("columnPlatform") + ": </strong>"
					+ explorer.getPlatform(text.getPlatformId()) + "<br><strong>" + Messages.get("lastPlayed")
					+ ": </strong>" + (lastPlayed != null ? lastPlayed : Messages.get("neverPlayedShort"))
					+ "<br><strong>" + Messages.get("dateAdded") + ": </strong>" + text.getDateAdded()
					+ "<br><strong>" + Messages.get("fileLocation") + ": </strong>" + text.getPath()
					+ "</html>");
					mouseOver = index;
					lst.repaint();
				}
			}

			@Override
			public void mouseDragged(MouseEvent e) {
				int treshold = 4;
				if (SwingUtilities.isRightMouseButton(e)) {
					return;
				}
				bla(e.getPoint());
				if (viewStyle == 0 || viewStyle == 2) {
					if (sp.getVerticalScrollBar().isVisible()) {
						if (sp.getCursor() == cursorDrag || scrollDistanceY < -treshold || scrollDistanceY > treshold) {
							if (sp.getCursor() != cursorDrag) {
								sp.setCursor(cursorDrag);
							}
							// FIXME supress gameSelected event
							lst.setSelectedIndex(lastSelectedIndex);
							if (lst.getSelectionModel() != lastSelectionModel) {
								lastSelectionModel = lst.getSelectionModel();
								lst.setSelectionModel(disabledItemSelectionModel);
							}
							mouseOver = lastSelectedIndex;
							lst.scrollRectToVisible(new Rectangle(0, lastVisibleRectY - scrollDistanceY,
									lst.getVisibleRect().width, lst.getVisibleRect().height));
						}
						scrollDistanceY = e.getYOnScreen() - lastMouseY;
						lastMouseY = e.getYOnScreen();
						lastVisibleRectY = lst.getVisibleRect().y;
					}
				} else if (viewStyle == 1) {
					System.out.println("move test");
					if (sp.getHorizontalScrollBar().isVisible()) {
						if (sp.getCursor() == cursorDrag || scrollDistanceX < -treshold || scrollDistanceX > treshold) {
							if (sp.getCursor() != cursorDrag) {
								sp.setCursor(cursorDrag);
							}
							// FIXME supress gameSelected event
							lst.setSelectedIndex(lastSelectedIndex);
							if (lst.getSelectionModel() != lastSelectionModel) {
								lastSelectionModel = lst.getSelectionModel();
								lst.setSelectionModel(disabledItemSelectionModel);
							}
							mouseOver = lastSelectedIndex;
							lst.scrollRectToVisible(new Rectangle(lastVisibleRectX - scrollDistanceX, 0,
									lst.getVisibleRect().width, lst.getVisibleRect().height));
						}
						scrollDistanceX = e.getXOnScreen() - lastMouseX;
						lastMouseX = e.getXOnScreen();
						lastVisibleRectX = lst.getVisibleRect().x;
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
		Rectangle cellBounds = list.getCellBounds(0, 0);
		if (cellBounds != null) {
			int cellHeight = cellBounds.height;
			int height = list.getVisibleRect().height;
			int result = height / cellHeight;
			return result;
		}
		return 1;
	}

	@Override
	public boolean requestFocusInWindow() {
		return lstGames.requestFocusInWindow();
	}

	@Override
	public void valueChanged(ListSelectionEvent e) {
		if (!e.getValueIsAdjusting()) {
			e.getSource();

			int index = lstGames.getSelectedIndex();
			boolean b = index != GameConstants.NO_GAME;
			Game game = null;
			if (b) {
				game = lstGames.getSelectedValue();
			}
			lstGames.setComponentPopupMenu(b ? popupGame : null);
			GameSelectionEvent event = new BroGameSelectionEvent(game, null);
			for (GameListener l : listeners) {
				l.gameSelected(event);
			}
		}
	}

	public void gameAdded(final GameAddedEvent e) {
		fixRowCountForVisibleColumns(lstGames);
	}

	public void gameRemoved(final GameRemovedEvent e) {
		fixRowCountForVisibleColumns(lstGames);
	}

	@Override
	public void actionPerformed(ActionEvent e) {
	}

	public void addOpenGamePropertiesListener(ActionListener l) {
		popupGame.addOpenGamePropertiesListener(l);
	}

	public void addOpenGameFolderListener(ActionListener l) {
		popupGame.addOpenGameFolder(l);
	}

	public void addOpenGamePropertiesListener(Action l) {
		for (JList<Game> lst : sps.keySet()) {
			lst.getInputMap().put(KeyStroke.getKeyStroke(KeyEvent.VK_ENTER, java.awt.event.InputEvent.ALT_DOWN_MASK),
					"actionOpenGameProperties");
			lst.getActionMap().put("actionOpenGameProperties", l);
		}
	}

	public void addIncreaseFontListener(Action l) {
		for (JList<Game> lst : sps.keySet()) {
			lst.getInputMap().put(KeyStroke.getKeyStroke(KeyEvent.VK_PLUS, java.awt.event.InputEvent.CTRL_DOWN_MASK),
					"actionIncreaseFont");
			lst.getActionMap().put("actionIncreaseFont", l);
		}
	}

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

	public void addDecreaseFontListener(Action l) {
		for (JList<Game> lst : sps.keySet()) {
			lst.getInputMap().put(KeyStroke.getKeyStroke(KeyEvent.VK_MINUS, java.awt.event.InputEvent.CTRL_DOWN_MASK),
					"actionDecreaseFont");
			lst.getActionMap().put("actionDecreaseFont", l);
		}
	}

	public void addSelectGameListener(GameListener l) {
		listeners.add(l);
	}

	public void addRunGameListener(ActionListener l) {
		popupGame.addRunGameListener(l);
	}

	public void addCoverFromComputerListener(ActionListener l) {
		popupGame.addCoverFromComputerListener(l);
	}

	public void addCoverFromWebListener(ActionListener l) {
		popupGame.addCoverFromWebListener(l);
	}

	public void addTrailerFromWebListener(ActionListener l) {
		popupGame.addTrailerFromWebListener(l);
	}

	public void addRunGameListener(Action l) {
		for (JList<Game> lst : sps.keySet()) {
			lst.getInputMap().put(KeyStroke.getKeyStroke("pressed ENTER"), "actionRunGame");
			lst.getActionMap().put("actionRunGame", l);
		}
	}

	public void addRunGameListener(MouseListener l) {
		for (JList<Game> lst : sps.keySet()) {
			lst.addMouseListener(l);
		}
	}

	public void addRenameGameListener(Action l) {
		for (JList<Game> lst : sps.keySet()) {
			lst.getInputMap().put(KeyStroke.getKeyStroke("F2"), "actionRenameGame");
			lst.getActionMap().put("actionRenameGame", l);
		}
		popupGame.addRenameGameListener(l);
	}

	public void addRemoveGameListener(Action l) {
		for (JList<Game> lst : sps.keySet()) {
			lst.getInputMap().put(KeyStroke.getKeyStroke("DELETE"), "actionRemoveGame");
			lst.getActionMap().put("actionRemoveGame", l);
		}
		popupGame.addRemoveGameListener(l);
	}

	public int getColumnWidth() {
		for (JList<Game> lst : sps.keySet()) {
			return lst.getFixedCellWidth();
		}
		return 128;
	}

	public void setColumnWidth(int value) {
		// int lastValue =
		// sps.get(lstGames).getHorizontalScrollBar().getValue();
		for (JList<Game> lst : sps.keySet()) {
			lst.setFixedCellWidth(value);
			fixRowCountForVisibleColumns(lst);
		}
		// sp.getHorizontalScrollBar().setValue(lastValue);
	}

	public int getRowHeight() {
		for (JList<Game> lst : sps.keySet()) {
			return lst.getFixedCellHeight();
		}
		return 24;
	}

	public void setRowHeight(int value) {
		for (JList<Game> lst : sps.keySet()) {
			lst.setFixedCellHeight(value);
			fixRowCountForVisibleColumns(lst);
		}
	}

	public void selectGame(final int gameId) {
		SwingUtilities.invokeLater(new Runnable() {

			@Override
			public void run() {
				int selectedIndex = GameConstants.NO_GAME;
				for (int i = 0; i < lstGames.getModel().getSize(); i++) {
					if (lstGames.getModel().getElementAt(i).getId() == gameId) {
						selectedIndex = i;
						lstGames.setSelectedIndex(selectedIndex);
						break;
					}
				}
				lstGames.ensureIndexIsVisible(selectedIndex);
			}
		});
	}

	@Override
	public void groupByNone() {
		sps.get(lstGames).setViewportView(lstGames);
	}

	@Override
	public void groupByPlatform() {
		if (pnlListPlatform == null) {
			pnlListPlatform = new JPanel();
			// FormLayout layout = new FormLayout("min:grow",
			// "fill:pref, min, fill:min, min, fill:pref, min, fill:min");

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
			for (Platform p : explorer.getPlatforms()) {
				JList<Game> lst = new JList<>();
				GameListModel mdlAll = (GameListModel) lstGames.getModel();
				GameListModel mdlNew = new GameListModel();
				for (Game g : mdlAll.getAllElements()) {
					if (g.getPlatformId() == p.getId()) {
						mdlNew.addElement(g);
					}
				}
				lst.setModel(mdlNew);
				if (mdlNew.getSize() == 0) {
					continue;
				}
				createScrollPane(lst);
				lst.setVisibleRowCount(lstGames.getModel().getSize());
				int gameCount = explorer.getGameCountFromPlatform(p.getId());
				String gameCountString = (gameCount == 1) ? Messages.get("gameCount1", gameCount)
						: Messages.get("gameCount", gameCount);
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
				btn.setContentAreaFilled(false);
				btn.setHorizontalAlignment(SwingConstants.LEFT);
				ImageIcon platformIcon = ImageUtil.getImageIconFrom("/images/platforms/logos/" + p.getIconFileName(),
						false);
				btn.setIcon(platformIcon);
				btn.setComponentPopupMenu(popupGroup);
				btn.addActionListener(new ActionListener() {

					@Override
					public void actionPerformed(ActionEvent e) {
						lst.setVisible(!lst.isVisible());
						if (viewStyle == 1) {
							int gameCount = explorer.getGameCountFromPlatform(p.getId());
							String gameCountString = (gameCount == 1) ? Messages.get("gameCount1", gameCount)
									: Messages.get("gameCount", gameCount);
							String text = "<html><strong>" + p.getName() + "</strong><br>" + gameCountString
									+ "</html>";
							btn.setText(lst.isVisible() ? text : "");
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

				btn.addFocusListener(new FocusListener() {

					@Override
					public void focusGained(FocusEvent e) {
						doHover((AbstractButton) e.getSource(), true);
					}

					@Override
					public void focusLost(FocusEvent e) {
						doHover((AbstractButton) e.getSource(), false);
					}
				});

				btn.addMouseListener(new MouseAdapter() {
					@Override
					public void mouseEntered(MouseEvent e) {
						doHover((AbstractButton) e.getSource(), true);
					}

					@Override
					public void mouseExited(MouseEvent e) {
						doHover((AbstractButton) e.getSource(), false);
					}
				});
			}
		}
		if (pnlWrapperListGroup == null) {
			pnlWrapperListGroup = new JPanel(new BorderLayout());
			pnlWrapperListGroup.add(pnlListPlatform);
		}
		sps.get(lstGames).setViewportView(pnlWrapperListGroup);
		sps.get(lstGames).getHorizontalScrollBar().setUnitIncrement(16);
		sps.get(lstGames).getVerticalScrollBar().setUnitIncrement(16);
	}

	protected void doHover(AbstractButton btn, boolean b) {
		btn.setContentAreaFilled(b);
	}

	public ListModel<Game> getListModel() {
		return lstGames.getModel();
	}

	public void setListModel(ListModel<Game> model) {
		if (lstGames.getModel() != model) {
			lstGames.setModel(model);
			lstGames.setVisibleRowCount(model.getSize());
		}
	}

	public void filterSet(FilterEvent e) {
		criteria = e.getCriteria();
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

	public void navigationChanged(NavigationEvent e) {
		switch (e.getView()) {
		case NavigationPanel.ALL_GAMES:
			setViewStyle(lstGames, defaultViewStyle);
			lstGames.setBackground(Color.WHITE);
			break;
		case NavigationPanel.RECENTLY_PLAYED:
			setViewStyle(lstGames, defaultViewStyle);
			lstGames.setBackground(Color.WHITE);
			break;
		case NavigationPanel.FAVORITES:
			setViewStyle(lstGames, defaultViewStyle);
			lstGames.setBackground(new Color(10, 42, 64));
			break;
		}
	}

	public void increaseFontSize() {
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
	}

	public void decreaseFontSize() {
		int newRowHeight = getRowHeight() - 4;
		int newColumnWidth = getColumnWidth() - 64;
		if (newRowHeight > 0) {
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
		}
	}

	public void hideExtensions(boolean selected) {
		hideExtensions = selected;
		repaint();
	}

	public int getfontSize() {
		return currentFontSize;
	}

	public void setFontSize(int value) {
		currentFontSize = value;
	}
}