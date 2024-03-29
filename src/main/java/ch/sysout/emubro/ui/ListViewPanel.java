package ch.sysout.emubro.ui;

import java.awt.BorderLayout;
import java.awt.Color;
import java.awt.Component;
import java.awt.Cursor;
import java.awt.Font;
import java.awt.KeyboardFocusManager;
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
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import javax.swing.*;
import javax.swing.border.Border;
import javax.swing.event.ListSelectionEvent;
import javax.swing.event.ListSelectionListener;

import com.formdev.flatlaf.FlatLaf;
import com.formdev.flatlaf.intellijthemes.FlatLightFlatIJTheme;
import org.apache.commons.io.FilenameUtils;

import com.jgoodies.forms.layout.CellConstraints;
import com.jgoodies.forms.layout.ColumnSpec;
import com.jgoodies.forms.layout.FormLayout;
import com.jgoodies.forms.layout.RowSpec;

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
import ch.sysout.emubro.impl.model.PlatformConstants;
import ch.sysout.emubro.ui.listener.RateListener;
import ch.sysout.emubro.util.MessageConstants;
import ch.sysout.ui.util.UIUtil;
import ch.sysout.util.Messages;
import ch.sysout.util.ScreenSizeUtil;

public class ListViewPanel extends ViewPanel implements ListSelectionListener {
	private GameListModel mdlLstAllGames = new GameListModel();
	private GameListModel mdlLstFavorites = new GameListModel();
	private GameListModel mdlLstRecentlyPlayed = new GameListModel();
	private GameListModel mdlLstRecycleBin = new GameListModel();
	private GameListModel mdlLstFilteredGames = new GameListModel();
	private Color selectionBackgroundColor = UIManager.getColor("List.selectionBackground");
	private Color transparentSelectionBackgroundColor;

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
		private static final long serialVersionUID = 1L;

		@Override
		public int locationToIndex(Point location) {
			if (location == null) {
				return -1;
			}
			int index = super.
					locationToIndex(location);
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
	ViewContextMenu popupView;
	private GroupContextMenu popupGroup;
	protected int mouseOver = -1;
	private Cursor cursorDrag = Cursor.getPredefinedCursor(Cursor.MOVE_CURSOR);
	protected int lastHorizontalScrollBarValue;
	protected int lastVerticalScrollBarValue;
	protected int lastMouseX;
	protected int lastMouseY;
	private int lastVisibleRectY;
	private int lastVisibleRectX;
	protected int scrollDistanceX;
	protected int scrollDistanceY;
	private int layoutOrientation;
	private int defaultViewStyle = 1;
	private int viewStyle = defaultViewStyle;
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
	private boolean doNotFireSelectGameEvent;
	protected int mouseX;
	protected int mouseY;
	private boolean touchScreenScrollEnabled;
	private List<UpdateGameCountListener> gameCountListeners = new ArrayList<>();
	private Explorer explorer;
	private ViewPanelManager viewManager;
	protected List<Game> currentGames;
	private int currentView;
	private List<TagsFromGamesListener> tagsFromGamesListeners = new ArrayList<>();

	private Color colorFavorite = new Color(244, 187, 68);
	private Color colorDeleted = new Color(199, 66, 62);

	protected boolean themeChanged;
	private String currentFilterText = "";

	private Map<Game, String> textFilterHighlightedGameNames = new HashMap<>();
	private boolean shouldUpdateCurrentFilterText;

	public ListViewPanel(Explorer explorer, ViewPanelManager viewManager, GameContextMenu popupGame, ViewContextMenu popupView) {
		super(new BorderLayout());
		this.explorer = explorer;
		this.viewManager = viewManager;
		this.popupGame = popupGame;
		this.popupView = popupView;
		initPopupGroup();
		add(createScrollPane(lstGames));
		setGameListRenderer();
		lstGames.addKeyListener(new KeyAdapter() {
			@Override
			public void keyPressed(KeyEvent e) {
				super.keyPressed(e);
				if (e.getKeyCode() == KeyEvent.VK_CONTEXT_MENU) {
					boolean showFileTreePopup = lstGames.getSelectedIndex() != -1;
					if (showFileTreePopup) {
						showGamePopupMenu(e.getComponent(), mouseX, mouseY);
					}
				}
			}
		});
	}

	protected void showGamePopupMenu(Component relativeTo, int x, int y) {
		List<Game> currentGames = explorer.getCurrentGames();
		if (!currentGames.isEmpty()) {
			popupGame.show(relativeTo, x, y);
			int platformId = currentGames.get(0).getPlatformId();
			Platform platform = explorer.getPlatform(platformId);
			List<BroEmulator> emulators = platform.getEmulators();
			int defaultEmulatorId = EmulatorConstants.NO_EMULATOR;
            for (Emulator emulator : emulators) {
                if (!emulator.isInstalled()) {
                    continue;
                }
                int defaultGameEmulatorId = currentGames.get(0).getDefaultEmulatorId();
                if (defaultGameEmulatorId == EmulatorConstants.NO_EMULATOR) {
                    if (emulator.getId() == platform.getDefaultEmulatorId()) {
                        defaultEmulatorId = emulator.getId();
                        break;
                    }
                } else {
                    if (emulator.getId() == defaultGameEmulatorId) {
                        defaultEmulatorId = emulator.getId();
                        break;
                    }
                }
            }
			popupGame.initEmulators(emulators, defaultEmulatorId);
		}
	}

	protected void showViewPopupMenu(Component relativeTo, int x, int y) {
		popupView.show(relativeTo, x, y);
	}

	private void initPopupGroup() {
		popupGroup = new GroupContextMenu();
	}

	private JScrollPane createScrollPane(final JList<Game> lst) {
		lst.setOpaque(false);
		final JScrollPane sp = new JScrollPane(lst);
		sp.getHorizontalScrollBar().setOpaque(false);
		sp.getVerticalScrollBar().setOpaque(false);
		sp.getHorizontalScrollBar().setUnitIncrement(16);
		sp.getVerticalScrollBar().setUnitIncrement(16);
		sp.getViewport().setOpaque(false);
		sp.setOpaque(false);
		// done cause ModernScrollPane class breaks horizontal mouse wheel scrolling
		// TODO maybe not required anymore with the new FlatLaf Look And Feel. check it.
		// TODO if rly still required, disable horizontal scroll when vertical scroll bar is visible
		//		sp.addMouseWheelListener(new MouseWheelListener() {
		//
		//			@Override
		//			public void mouseWheelMoved(MouseWheelEvent e) {
		//				// Ignore events generated with a rotation of 0
		//				// (not sure why these events are generated)
		//				int rotation = e.getWheelRotation();
		//				if (rotation == 0) {
		//					return;
		//				}
		//				// Get the Action from the scrollbar ActionMap for the given key
		//				JScrollPane scrollPane = (JScrollPane) e.getComponent();
		//				JScrollBar horizontal = scrollPane.getHorizontalScrollBar();
		//				// Get the appropriate Action key for the given rotation
		//				// (unit/block scroll is system dependent)
		//				String key = null;
		//				if (e.getScrollType() == MouseWheelEvent.WHEEL_UNIT_SCROLL) {
		//					key = (rotation < 0) ? "negativeUnitIncrement" : "positiveUnitIncrement";
		//				} else {
		//					key = (rotation < 0) ? "negativeBlockIncrement" : "positiveBlockIncrement";
		//				}
		//
		//				ActionMap map = horizontal.getActionMap();
		//				Action action = map.get(key);
		//				ActionEvent event = new ActionEvent(horizontal, ActionEvent.ACTION_PERFORMED, "");
		//				// Invoke the Action the appropriate number of times to simulate
		//				// default mouse wheel scrolling
		//				int unitsToScroll = Math.abs(e.getUnitsToScroll());
		//				for (int i = 0; i < unitsToScroll; i++) {
		//					action.actionPerformed(event);
		//				}
		//			}
		//		});

		sp.addComponentListener(new ComponentAdapter() {
			@Override
			public void componentResized(ComponentEvent e) {
				fixRowCountForVisibleColumns(lst);
			}
		});

		lst.addMouseListener(new MouseAdapter() {
			@Override
			public void mousePressed(MouseEvent e) {
				lastMouseX = e.getXOnScreen();
				lastMouseY = e.getYOnScreen();
				if ((e.getModifiers() & InputEvent.BUTTON3_MASK) == InputEvent.BUTTON3_MASK) {
					if (mouseOver > -1 && !lst.isSelectedIndex(mouseOver)) {
						lst.setSelectedIndex(mouseOver);
					}
				}
			}

			@Override
			public void mouseClicked(MouseEvent e) {
				lastSelectedIndex = mouseOver;
				if (lst.locationToIndex(e.getPoint()) == -1 && !e.isShiftDown()
						&& !isMenuShortcutKeyDown(e)) {
					mouseOver = -1;
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
					if (index != -1) {
						if (!lst.isSelectedIndex(index)) {
							lst.setSelectedIndex(index);
						}
						showGamePopupMenu(e.getComponent(), e.getX(), e.getY());
					} else {
						lst.clearSelection();
						showViewPopupMenu(e.getComponent(), e.getX(), e.getY());
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

		//		sp.setViewportView(lst);
		sp.setBorder(BorderFactory.createEmptyBorder());
		sps.put(lst, sp);

		setViewStyle(lst, viewStyle);
		lst.setFixedCellWidth(ScreenSizeUtil.adjustValueToResolution(255));
		setRowHeight(lst, lst.getFont().getSize());
		lst.setSelectionMode(ListSelectionModel.MULTIPLE_INTERVAL_SELECTION);
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
				lst.setToolTipText("");
				int index = lst.locationToIndex(p);
				if (index > -1) {
					Game text = model.getElementAt(index);
					ZonedDateTime lastPlayed = text.getLastPlayed();
					lst.setToolTipText("<html>" +
							"<strong>" + text.getName() + "</strong>" +
							"<br>"+explorer.getPlatform(text.getPlatformId()) +
							"<br>" +
							"<br>" +
							"<div>" +
							"<strong>"+Messages.get(MessageConstants.LAST_PLAYED)+": </strong>"+(lastPlayed != null ? lastPlayed : Messages.get(MessageConstants.NEVER_PLAYED_SHORT)) +
							"<br>" +
							"<strong>" + Messages.get(MessageConstants.DATE_ADDED) + ": </strong>" + text.getDateAdded() +
							"</div>" +
							"</html>");
					mouseOver = index;
				} else {
					index = -1;
				}
			}

			@Override
			public void mouseDragged(MouseEvent e) {
				boolean noScrollBarsVisible = !sp.getHorizontalScrollBar().isVisible() && !sp.getVerticalScrollBar().isVisible();
				if (!isTouchScreenScrollEnabled()) {
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
				if (viewStyle == ViewPanel.COVER_VIEW || viewStyle == ViewPanel.ELEMENT_VIEW || viewStyle == ViewPanel.CONTENT_VIEW) {
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
				} else if (viewStyle == ViewPanel.LIST_VIEW || viewStyle == ViewPanel.SLIDER_VIEW) {
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

	private void setGameListRenderer(ListCellRenderer<? super Game> cellRenderer) {
		setGameListRenderer(lstGames, cellRenderer);
	}

	private void setGameListRenderer(JList<Game> lst, ListCellRenderer<? super Game> cellRenderer) {
		this.cellRenderer = cellRenderer;
		lst.setCellRenderer(cellRenderer);
	}

	public void setGameListRenderer() {
		setGameListRenderer(new DefaultListCellRenderer() {
			private static final long serialVersionUID = 1L;

			//			private Color colorBackground = UIManager.getColor("List.foreground");
			//			final Color colorFavorite = Color.BLUE;
			//			final Color colorError = ValidationComponentUtils.getErrorBackground();
			private Border borderHover = BorderFactory.createLineBorder(getGameList().getSelectionBackground(), 1, false);
			private Border borderEmpty = BorderFactory.createEmptyBorder(0, ScreenSizeUtil.adjustValueToResolution(8), 0, 0);
			private Map<Integer, Border> borders = new HashMap<>();

			@Override
			public Component getListCellRendererComponent(JList<?> list, Object value, int index, boolean isSelected,
					boolean cellHasFocus) {
				JLabel label = (JLabel) super.getListCellRendererComponent(list, value, index, isSelected,
						cellHasFocus);
				label.setOpaque(isSelected);
				label.setBackground(selectionBackgroundColor);
				if (viewStyle == ViewPanel.CONTENT_VIEW) {
					label.setHorizontalAlignment(SwingConstants.LEFT);
					label.setHorizontalTextPosition(SwingConstants.RIGHT);
					label.setVerticalTextPosition(SwingConstants.TOP);
				}
				if (viewStyle == ViewPanel.SLIDER_VIEW) {
					label.setHorizontalAlignment(SwingConstants.CENTER);
					label.setHorizontalTextPosition(SwingConstants.CENTER);
					label.setVerticalTextPosition(SwingConstants.BOTTOM);
					list.setFixedCellHeight(sps.get(list).getViewport().getHeight());
				}
				if (viewStyle == ViewPanel.LIST_VIEW || viewStyle == ViewPanel.ELEMENT_VIEW) {
					label.setHorizontalAlignment(SwingConstants.LEFT);
					label.setHorizontalTextPosition(SwingConstants.RIGHT);
					label.setVerticalTextPosition(SwingConstants.CENTER);
				}
				if (viewStyle == ViewPanel.COVER_VIEW) {
					label.setHorizontalAlignment(SwingConstants.CENTER);
					label.setHorizontalTextPosition(SwingConstants.CENTER);
					label.setVerticalTextPosition(SwingConstants.BOTTOM);
				}
				BroGame game = (BroGame) value;
				checkGameIcon(list, game, label);
				checkFontAndFontSize(list, game, label, isSelected);
				checkIsGameSelected(list, index, label);
				//				checkHideExtensions(viewManager.isHideExtensionsEnabled(), explorer.getFiles(game).get(0), label);
				checkTextFilter(list, game, label, isSelected);
				if (isDragging()) {
					setEnabled(true);
				}
				themeChanged = false;
				return label;
			}

			private void checkGameIcon(JList<?> list, BroGame game, JLabel label) {
				int currentCoverSize = viewManager.getCurrentCoverSize();
				int borderHeight = 16;
				Icon gameIcon = null;
				switch (viewStyle) {
				case ViewPanel.LIST_VIEW:
				case ViewPanel.ELEMENT_VIEW:
				case ViewPanel.CONTENT_VIEW:
					gameIcon = (explorer.isShowPlatformIconsEnabled() ? IconStore.current().getGameIcon(game.getId())
							: ((game.hasCover() ? IconStore.current().getScaledGameCover(game.getId(), currentCoverSize) : IconStore.current().getScaledTransparentPlatformCover(game.getPlatformId(), currentCoverSize, 90))));
					break;
				case ViewPanel.SLIDER_VIEW:
				case ViewPanel.COVER_VIEW:
					gameIcon = (explorer.isShowPlatformIconsEnabled() ? IconStore.current().getGameIcon(game.getId())
							: ((game.hasCover() ? IconStore.current().getScaledGameCover(game.getId(), currentCoverSize) : IconStore.current().getScaledTransparentPlatformCover(game.getPlatformId(), currentCoverSize, 90))));
					if (!explorer.isShowGameNamesEnabled())  {
						label.setText("");
					}
					break;
				}
				if (gameIcon != null) {
					label.setIcon(gameIcon);
					label.setDisabledIcon(gameIcon);
				} else {
					int platformId = game.getPlatformId();
					if (platformId == PlatformConstants.NO_PLATFORM) {
						// should not happen in general. there is a bug
						// somewhere else
					} else {
						ImageIcon icon;
						if (viewStyle == ViewPanel.LIST_VIEW || viewStyle == ViewPanel.ELEMENT_VIEW) {
							icon = IconStore.current().getPlatformIcon(platformId);
						} else {
							icon = IconStore.current().getScaledPlatformCover(platformId, currentCoverSize);
						}
						label.setIcon(icon);
						label.setDisabledIcon(icon);
					}
					label.setIconTextGap(ScreenSizeUtil.adjustValueToResolution(8));
					label.setBorder(borderEmpty);
				}
				if (viewStyle == ViewPanel.CONTENT_VIEW) {
					String gameName = game.getName();
					Platform platform = explorer.getPlatform(game.getPlatformId());
					ZonedDateTime dateAdded = game.getDateAdded();
					ZonedDateTime lastPlayed = game.getLastPlayed();
					int rating = game.getRate();
					label.setText("<html><strong>" + gameName + "</strong><br>"
							+ platform.getName() + "<br>"
							+ "Rating: " + rating + " stars<br>"
							+ "Last played: " + ((lastPlayed != null) ? lastPlayed : "Never played") + "<br>"
							+ "Added: " + dateAdded + "</html>");

					int textGap = currentCoverSize - label.getIcon().getIconWidth();
					if (textGap > 0) {
						label.setBorder(getFunkyBorder(textGap / 2 + ScreenSizeUtil.adjustValueToResolution(8)));
						label.setIconTextGap(textGap / 2 + ScreenSizeUtil.adjustValueToResolution(8));
					} else {
						label.setIconTextGap(textGap + ScreenSizeUtil.adjustValueToResolution(8));
						label.setBorder(borderEmpty);
					}
					if (label.getPreferredSize().height > list.getFixedCellHeight()) {
						setRowHeight(list, label.getPreferredSize().height + borderHeight);
					}
				}
				if (viewStyle == ViewPanel.COVER_VIEW) {
					if (label.getPreferredSize().height > list.getFixedCellHeight()) {
						setRowHeight(list, label.getPreferredSize().height + borderHeight);
					}
				}
			}

			private Border getFunkyBorder(int left) {
				Border border = null;
				if ((border = borders.get(left)) == null) {
					border = BorderFactory.createEmptyBorder(0, left, 0, 0);
					borders.put(left, border);
				}
				return border;
			}

			private void checkFontAndFontSize(JList<?> list, BroGame game, JLabel label, boolean isSelected) {
				if (viewManager.getFontSize() <= 0) {
					viewManager.setFontSize(label.getFont().getSize());
				}
				Theme currentTheme = IconStore.current().getCurrentTheme();
				ThemeBackground currentBackground = currentTheme.getView();
				boolean transparentSelection = currentBackground.isTransparentSelection();
				if (game.isFavorite()) {
					label.setForeground(colorFavorite);
					if (!isSelected) {
						if (viewStyle != ViewPanel.CONTENT_VIEW) {	// Cause in content view the game title is bold and the other informations not. It would looks too bold.
						}
					} else {
						if (transparentSelection) {
							label.setBackground(transparentSelectionBackgroundColor);
						}
						if (viewStyle != ViewPanel.CONTENT_VIEW) {	// Cause in content view the game title is bold. This would set game title also plain.
						}
					}
				} else {
					if (isSelected) {
						label.setForeground(UIManager.getColor("List.selectionForeground"));
						if (transparentSelection) {
							label.setBackground(transparentSelectionBackgroundColor);
						}
					} else {
						//						label.setForeground(colorBackground);
					}
				}
				if (getCurrentView() == NavigationPanel.RECYCLE_BIN) {
					label.setForeground(colorDeleted);
				}
			}

			private void checkHideExtensions(boolean hideExtensions, String gamePath, JLabel label) {
				if (!hideExtensions) {
					String fileExtension = FilenameUtils.getExtension(gamePath);
					if (explorer.isKnownExtension(fileExtension)) {
						String newText = label.getText() + "." + fileExtension;
						label.setText(newText);
					}
				}
			}

			private void checkIsGameSelected(JList<?> list, int index, JLabel label) {
				//				int[] selectedIndices = getGameList().getSelectedIndices();
				//				boolean contains = IntStream.of(selectedIndices).anyMatch(x -> x == index);
				//				if (index > -1 && index == mouseOver && !contains) {
				//					label.setForeground(getGameList().getSelectionBackground());
				//					//					label.setBorder(borderHover);
				//				}
				//				if (index == getGameList().getSelectedIndex()) {
				//					label.setForeground(UIManager.getColor("List.selectionForeground"));
				//				}
			}

			private void checkTextFilter(JList<?> list, BroGame game, JLabel label, boolean isSelected) {
				String lblText = label.getText();
				// TODO check if this can be cached even more. or maybe just save it in Game object itself instead of creating an extra HasMap for this
				if (!currentFilterText.isEmpty() && lblText.toLowerCase().contains(currentFilterText.toLowerCase())) {
					if (shouldUpdateCurrentFilterText || !textFilterHighlightedGameNames.containsKey(game)) {
						addOrOverwriteKey(game, lblText, isSelected);
					}
					label.setText(textFilterHighlightedGameNames.get(game).toString());
				}
			}
		});
	}

	protected void addOrOverwriteKey(BroGame game, String lblText, boolean isSelected) {
		lblText = "<html>"+lblText+"</html>";
		int startIndex = lblText.toLowerCase().indexOf(currentFilterText.toLowerCase());
		String str0 = "<font><span style=\"background-color:orange\" color=\"white\">";
		String str1 = "<font><span style=\"background-color:#ef0fff\" color=\"white\">";
		String str2 = "</span></font>";
		int endIndex = startIndex + str1.length() + currentFilterText.length();
		String str = new StringBuilder(lblText).insert(startIndex, isSelected ? str0 : str1)
				.insert(endIndex, str2).toString();
		textFilterHighlightedGameNames.put(game, str);
	}

	@Override
	public void setViewStyle(int viewStyle) {
		setViewStyle(lstGames, viewStyle);
	}

	private void setViewStyle(JList<Game> lst, final int viewStyle) {
		this.viewStyle = viewStyle;
		switch (viewStyle) {
		case ViewPanel.CONTENT_VIEW:
			layoutOrientation = JList.VERTICAL;
			break;
		case ViewPanel.LIST_VIEW:
			layoutOrientation = JList.VERTICAL_WRAP;
			break;
		case ViewPanel.ELEMENT_VIEW:
			layoutOrientation = JList.VERTICAL_WRAP;
			break;
		case ViewPanel.SLIDER_VIEW:
			layoutOrientation = JList.HORIZONTAL_WRAP;
			break;
		case ViewPanel.COVER_VIEW:
			layoutOrientation = JList.HORIZONTAL_WRAP;
			break;
		}
		setFixedCellHeights(viewStyle);
	}

	private void setFixedCellHeights(int viewStyle) {
		SwingUtilities.invokeLater(new Runnable() {
			final int coverSize = viewManager.getCurrentCoverSize();
			final int fontHeight = 24;
			final int borderHeight = 16;

			@Override
			public void run() {
				for (Map.Entry<JList<Game>, JScrollPane> entry : sps.entrySet()) {
					entry.getKey().setLayoutOrientation(layoutOrientation);
					if (viewStyle == ViewPanel.SLIDER_VIEW) {
						entry.getKey().setVisibleRowCount(1);
						entry.getKey().setFixedCellHeight(entry.getValue().getViewport().getHeight());
					} else {
						if (viewStyle == ViewPanel.COVER_VIEW) {
							entry.getKey().setFixedCellHeight(coverSize);
						} else if (viewStyle == ViewPanel.CONTENT_VIEW) {
							entry.getKey().setFixedCellHeight(coverSize + borderHeight);
						} else {
							entry.getKey().setFixedCellHeight(coverSize + borderHeight);
						}
						fixRowCountForVisibleColumns(entry.getKey());
						entry.getKey().ensureIndexIsVisible(entry.getKey().getSelectedIndex());
					}
				}
			}
		});
	}

	private void fixRowCountForVisibleColumns(JList<?> list) {
		int nCols = 0;
		int nRows = 0;
		switch (viewStyle) {
		case ViewPanel.CONTENT_VIEW:
			list.setVisibleRowCount(list.getModel().getSize());
			return;
		case ViewPanel.LIST_VIEW:
			nRows = computeVisibleRowCount(list);
			list.setVisibleRowCount(nRows);
			return;
		case ViewPanel.ELEMENT_VIEW:
			nCols = computeVisibleColumnCount(list);
			break;
		case ViewPanel.COVER_VIEW:
			nCols = computeVisibleColumnCount(list);
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

	private int computeVisibleColumnCount(JList<?> list) {
		// It's assumed here that all cells have the same width. This method
		// could be modified if this assumption is false. If there was cell
		// padding, it would have to be accounted for here as well.
		Rectangle cellBounds = list.getCellBounds(0, 0);
		if (cellBounds != null) {
			int cellWidth = cellBounds.width;
			int width = list.getVisibleRect().width;
			return (cellWidth == 0) ? 0 : width / cellWidth;
		}
		return 1;
	}

	private int computeVisibleRowCount(JList<?> list) {
		// It's assumed here that all cells have the same width. This method
		// could be modified if this assumption is false. If there was cell
		// padding, it would have to be accounted for here as well.
		if (list != null) {
			Rectangle cellBounds = list.getCellBounds(0, 0);
			if (cellBounds != null) {
				int cellHeight = cellBounds.height;
				int height = list.getVisibleRect().height;
				if (height > 0 && cellHeight > 0) {
					int result = height / cellHeight;
					return result;
				}
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
			fireSelectGameEvent();
		}
	}

	private void fireSelectGameEvent() {
		List<Game> selectedGames = lstGames.getSelectedValuesList();
		GameSelectionEvent event = new BroGameSelectionEvent(selectedGames, null);
		for (GameSelectionListener l : selectGameListeners) {
			l.gameSelected(event);
		}
	}

	@Override
	public void gameAdded(GameAddedEvent e, FilterEvent filterEvent) {
		Game game = e.getGame();
		removeGameFromRecycleBin(game);;
		mdlLstAllGames.addElement(game);
		if (game.isFavorite()) {
			mdlLstFavorites.addElement(game);
		}
		//		if (filterEvent.isGameFilterSet() || filterEvent.isPlatformFilterSet()) {
		//			filterSet(filterEvent); // has been done to add games without refreshing when a filter is set.
		//		} else {
		fixRowCountForVisibleColumns(lstGames);
		//		}
	}

	private void removeGameFromRecycleBin(Game game) {
		mdlLstRecycleBin.removeElement(game);
	}

	@Override
	public void gameRemoved(GameRemovedEvent e) {
		Game game = e.getGame();
		mdlLstAllGames.removeElement(game);
		mdlLstFavorites.removeElement(game);
		mdlLstRecentlyPlayed.removeElement(game);
		mdlLstFilteredGames.removeElement(game);
		mdlLstRecycleBin.addElement(game);
		selectGame(GameConstants.NO_GAME);
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
	public void addAddGameOrEmulatorFromClipboardListener(Action l) {
		for (JList<Game> lst : sps.keySet()) {
			lst.getInputMap().put(KeyStroke.getKeyStroke(KeyEvent.VK_V, InputEvent.CTRL_DOWN_MASK),
					"actionAddGameOrEmulatorFromClipboard");
			lst.getActionMap().put("actionAddGameOrEmulatorFromClipboard", l);
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
	public void addSwitchViewByMouseWheelListener(MouseWheelListener l) {
		for (final JScrollPane sp : sps.values()) {
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
			sp.addMouseWheelListener(l);
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
			setColumnWidth(lst, value);
		}
	}

	private void setColumnWidth(JList<Game> lst, int value) {
		Rectangle visibleRect = lst.getVisibleRect();
		int lastSelected = lst.locationToIndex(new Point(visibleRect.x + visibleRect.width / 2, visibleRect.y + visibleRect.height / 2));
		lst.setFixedCellWidth(value);
		fixRowCountForVisibleColumns(lst);
		lst.ensureIndexIsVisible(lastSelected);
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
			setRowHeight(lst, value, true, true);
		}
	}

	private void setRowHeight(JList<?> list, int value) {
		setRowHeight(list, value, false, false);
	}

	private void setRowHeight(JList<?> lst, int value, boolean fixRowCountForVisibleColumns, boolean ensureIndexIsVisible) {
		int lastSelected = -1;
		if (ensureIndexIsVisible) {
			Rectangle visibleRect = lst.getVisibleRect();
			if (visibleRect != null) {
				Point point = new Point(visibleRect.x + visibleRect.width / 2, visibleRect.y + visibleRect.height / 2);
				if (point != null) {
					lastSelected = lst.locationToIndex(point);
				}
			}
		}
		lst.setFixedCellHeight(value);
		if (fixRowCountForVisibleColumns) {
			fixRowCountForVisibleColumns(lst);
		}
		if (ensureIndexIsVisible) {
			if (lastSelected != -1) {
				lst.ensureIndexIsVisible(lastSelected);
			}
		}
	}

	@Override
	public void selectGame(int gameId) {
		if (gameId == GameConstants.NO_GAME) {
			lstGames.clearSelection();
		} else {
			int selectedIndex = -1;
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
			if (viewStyle == ViewPanel.LIST_VIEW) {
				layout = new FormLayout("", "fill:pref, min, fill:min:grow");
			} else {
				layout = new FormLayout("min:grow", "");
			}
			pnlListPlatform.setLayout(layout);
			//			pnlListPlatform.setBackground(UIManager.getColor("List.background"));
			//			pnlListPlatform.setOpaque(false);
			CellConstraints cc = new CellConstraints();
			int x = 1;
			int y = 1;
			for (final Platform p : explorer.getPlatforms()) {
				final JList<Game> lst = new JList<>();
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
						if (doNotFireSelectGameEvent) {
							return;
						}
						if (!e.getValueIsAdjusting()) {
							int[] index = lst.getSelectedIndices();
							currentGames = lst.getSelectedValuesList();
							//			lstGames.setComponentPopupMenu(b ? popupGame : null);

							GameSelectionEvent event = new BroGameSelectionEvent(currentGames, null);
							for (GameSelectionListener l : selectGameListeners) {
								l.gameSelected(event);
							}
							deselectSelectionOfOtherLists(lst);
						}
					}
				});
				lst.addKeyListener(createKeyListener(lst));
				lst.setVisibleRowCount(lstGames.getModel().getSize());
				final int gameCount = mdlNew.getSize();
				String gameCountString = (gameCount == 1) ? Messages.get(MessageConstants.GAME_COUNT1, gameCount)
						: Messages.get(MessageConstants.GAME_COUNT, gameCount);
				final JButton btn = new JCustomButtonNew(
						"<html><strong>" + p.getName() + "</strong><br>" + gameCountString + "</html>");
				if (groupedViewButtons == null) {
					groupedViewButtons = new ArrayList<AbstractButton>();
				}
				groupedViewButtons.add(btn);
				btn.setHorizontalAlignment(SwingConstants.LEFT);
				ImageIcon platformIcon = IconStore.current().getPlatformIcon(p.getId());
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
			pnlWrapperListPlatformGroup.setOpaque(false);
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
				if (viewStyle == ViewPanel.LIST_VIEW) {
					if (e.getKeyCode() == KeyEvent.VK_RIGHT) {
						final List<Game> oldCurrentGame = currentGames;
						SwingUtilities.invokeLater(new Runnable() {

							@Override
							public void run() {
								if (oldCurrentGame == currentGames) {
									KeyboardFocusManager manager = KeyboardFocusManager.getCurrentKeyboardFocusManager();
									manager.focusNextComponent();
								}
							}
						});
					}
				}
				if (e.getKeyCode() == KeyEvent.VK_LEFT) {
					if (viewStyle == ViewPanel.LIST_VIEW) {
						final List<Game> oldCurrentGame = currentGames;
						SwingUtilities.invokeLater(new Runnable() {

							@Override
							public void run() {
								if (oldCurrentGame == currentGames) {
									KeyboardFocusManager manager = KeyboardFocusManager.getCurrentKeyboardFocusManager();
									manager.focusPreviousComponent();

								}
							}
						});
					}
				}

				if (e.getKeyCode() == KeyEvent.VK_DOWN) {
					if (viewStyle == ViewPanel.ELEMENT_VIEW) {
						final List<Game> oldCurrentGame = currentGames;
						SwingUtilities.invokeLater(new Runnable() {

							@Override
							public void run() {
								if (oldCurrentGame == currentGames) {
									final KeyboardFocusManager manager = KeyboardFocusManager.getCurrentKeyboardFocusManager();
									manager.focusNextComponent();
									SwingUtilities.invokeLater(new Runnable() {

										@Override
										public void run() {
											manager.focusNextComponent();
										}
									});
								}
							}
						});
					}
				}
				if (e.getKeyCode() == KeyEvent.VK_UP) {
					if (viewStyle == ViewPanel.ELEMENT_VIEW) {
						final List<Game> oldCurrentGame = currentGames;
						SwingUtilities.invokeLater(new Runnable() {

							@Override
							public void run() {
								if (oldCurrentGame == currentGames) {
									final KeyboardFocusManager manager = KeyboardFocusManager.getCurrentKeyboardFocusManager();
									manager.focusPreviousComponent();
									SwingUtilities.invokeLater(new Runnable() {

										@Override
										public void run() {
											manager.focusPreviousComponent();
										}
									});
								}
							}
						});
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
		if (viewStyle == ViewPanel.LIST_VIEW) {
			String gameCountString = (gameCount == 1) ? Messages.get(MessageConstants.GAME_COUNT1, gameCount)
					: Messages.get(MessageConstants.GAME_COUNT, gameCount);
			String text = "<html>" + gameCountString + "</html>";
			btn.setText(text);
			btn.setHorizontalTextPosition(SwingConstants.CENTER);
			btn.setHorizontalAlignment(SwingConstants.CENTER);
			btn.setVerticalTextPosition(SwingConstants.BOTTOM);
		}
	}

	protected void changeButtonAfterExpand(AbstractButton btn, Platform p, int gameCount) {
		if (viewStyle == ViewPanel.LIST_VIEW) {
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

	protected void expandList(final JList<Game> lst, final JComponent comp) {
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
			if (viewStyle == ViewPanel.LIST_VIEW) {
				layout = new FormLayout("", "fill:pref, min, fill:min:grow");
			} else {
				layout = new FormLayout("min:grow", "");
			}
			pnlListTitle.setLayout(layout);
			//			pnlListTitle.setOpaque(false);
			//			pnlListTitle.setBackground(UIManager.getColor("List.background"));
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
				final JList<Game> lst = new JList<>();
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
						if (doNotFireSelectGameEvent) {
							return;
						}
						if (!e.getValueIsAdjusting()) {
							int index = lst.getSelectedIndex();
							currentGames = lst.getSelectedValuesList();
							//			lstGames.setComponentPopupMenu(b ? popupGame : null);

							GameSelectionEvent event = new BroGameSelectionEvent(currentGames, null);
							for (GameSelectionListener l : selectGameListeners) {
								l.gameSelected(event);
							}
							deselectSelectionOfOtherLists(lst);
						}
					}
				});
				lst.addKeyListener(createKeyListener(lst));
				lst.setVisibleRowCount(lstGames.getModel().getSize());
				int gameCount = mdlNew.getSize();
				String gameCountString = (gameCount == 1) ? Messages.get(MessageConstants.GAME_COUNT1, gameCount)
						: Messages.get(MessageConstants.GAME_COUNT, gameCount);
				String withoutRegex = chars[i].replace("^[", "").replace("].*$", "").replace("^A-Z0-9", Messages.get(MessageConstants.OTHERS));
				final JCustomButton btn = new JCustomButton(
						"<html><strong>"+withoutRegex+"</strong><br>" + gameCountString + "</html>");
				btn.setKeepBackgroundOnHoverLost(true);
				if (groupedViewButtons == null) {
					groupedViewButtons = new ArrayList<AbstractButton>();
				}
				groupedViewButtons.add(btn);
				btn.setHorizontalAlignment(SwingConstants.LEFT);
				btn.setComponentPopupMenu(popupGroup);
				btn.addActionListener(new ActionListener() {

					@Override
					public void actionPerformed(ActionEvent e) {
						if (!lst.isVisible()) {
							expandList(lst, btn);
						} else {
							collapseList(lst);
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
			pnlWrapperListTitleGroup.setOpaque(false);
			pnlWrapperListTitleGroup.add(pnlListTitle);
		}
		sps.get(lstGames).setViewportView(pnlWrapperListTitleGroup);
	}

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
		case NavigationPanel.FAVORITES:
			lstGames.setModel(mdlLstFavorites);
			break;
		case NavigationPanel.RECENTLY_PLAYED:
			lstGames.setModel(mdlLstRecentlyPlayed);
			break;
		case NavigationPanel.RECYCLE_BIN:
			lstGames.setModel(mdlLstRecycleBin);
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
		popupView.languageChanged();
		popupGroup.languageChanged();
	}

	@Override
	public void navigationChanged(NavigationEvent e, FilterEvent filterEvent) {
		List<Game> selectedGames = explorer.getCurrentGames();
		int gameCount = 0;
		switch (e.getView()) {
		case NavigationPanel.ALL_GAMES:
			setCurrentView(NavigationPanel.ALL_GAMES);
			gameCount = mdlLstAllGames.getSize();
			lstGames.setModel(mdlLstAllGames);
			setViewStyle(lstGames, viewStyle);
			break;
		case NavigationPanel.FAVORITES:
			setCurrentView(NavigationPanel.FAVORITES);
			gameCount = mdlLstFavorites.getSize();
			lstGames.setModel(mdlLstFavorites);
			setViewStyle(lstGames, viewStyle);
			break;
		case NavigationPanel.RECENTLY_PLAYED:
			setCurrentView(NavigationPanel.RECENTLY_PLAYED);
			gameCount = mdlLstRecentlyPlayed.getSize();
			lstGames.setModel(mdlLstRecentlyPlayed);
			setViewStyle(lstGames, viewStyle);
			break;
		case NavigationPanel.RECYCLE_BIN:
			setCurrentView(NavigationPanel.RECYCLE_BIN);
			gameCount = mdlLstRecycleBin.getSize();
			lstGames.setModel(mdlLstRecycleBin);
			setViewStyle(lstGames, viewStyle);
			break;
		}
		scrollToSelectedGames();
		if (filterEvent.isPlatformFilterSet() || filterEvent.isGameFilterSet()) {
			mdlLstFilteredGames.removeAllElements();
			filterSet(filterEvent);
			gameCount = mdlLstFilteredGames.getSize();
		} else {
			SwingUtilities.invokeLater(new Runnable() {

				@Override
				public void run() {
					fixRowCountForVisibleColumns(lstGames);
					UIUtil.revalidateAndRepaint(lstGames);
				}
			});
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
		final int lastSelected = lstGames.locationToIndex(new Point(visibleRect.x + visibleRect.width / 2, visibleRect.y + visibleRect.height / 2));
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
		SwingUtilities.invokeLater(new Runnable() {

			@Override
			public void run() {
				fixRowCountForVisibleColumns(lstGames);
				lstGames.ensureIndexIsVisible(lastSelected);
			}
		});
	}

	@Override
	public void decreaseFontSize() {
		Rectangle visibleRect = lstGames.getVisibleRect();
		final int lastSelected = lstGames.locationToIndex(new Point(visibleRect.x + visibleRect.width / 2, visibleRect.y + visibleRect.height / 2));
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
			SwingUtilities.invokeLater(new Runnable() {

				@Override
				public void run() {
					fixRowCountForVisibleColumns(lstGames);
					lstGames.ensureIndexIsVisible(lastSelected);
				}
			});
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
		UIUtil.revalidateAndRepaint(this);
	}

	@Override
	public void sortBy(int sortBy, PlatformComparator platformComparator) {
		Game selectedGame = lstGames.getSelectedValue();
		doNotFireSelectGameEvent = true;
		switch (sortBy) {
		case ViewConstants.SORT_BY_PLATFORM:
			mdlLstAllGames.sortByPlatform(platformComparator);
			mdlLstFavorites.sortByPlatform(platformComparator);
			mdlLstRecentlyPlayed.sortByPlatform(platformComparator);
			mdlLstRecycleBin.sortByPlatform(platformComparator);
			mdlLstFilteredGames.sortByPlatform(platformComparator);
			break;
		case ViewConstants.SORT_BY_TITLE:
			mdlLstAllGames.sort();
			mdlLstFavorites.sort();
			mdlLstRecentlyPlayed.sort();
			mdlLstRecycleBin.sort();
			mdlLstFilteredGames.sort();
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
			mdlLstFavorites.sort();
			mdlLstRecentlyPlayed.sort();
			mdlLstRecycleBin.sort();
			mdlLstFilteredGames.sort();
			break;
		case ViewConstants.SORT_DESCENDING:
			mdlLstAllGames.sortReverseOrder();
			mdlLstFavorites.sortReverseOrder();
			mdlLstRecentlyPlayed.sortReverseOrder();
			mdlLstRecycleBin.sortReverseOrder();
			mdlLstFilteredGames.sortReverseOrder();
			break;
		}
		if (selectedGame != null) {
			int selectedGameId = selectedGame.getId();
			selectGame(selectedGameId);
		}
		doNotFireSelectGameEvent = false;
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
	}

	@Override
	public void hideExtensions(boolean shouldHide) {
		getGameList().repaint();
	}

	@Override
	public void addSuperImportantKeyListener(KeyListener l) {
		for (JList<Game> lst : sps.keySet()) {
			lst.addKeyListener(l);
		}
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

	@Override
	public void filterSet(FilterEvent event) {
		Game selectedGame = lstGames.getSelectedValue();
		final int selectedGameId = (selectedGame != null) ? selectedGame.getId() : GameConstants.NO_GAME;
		doNotFireSelectGameEvent = true;
		doTheFilterNew(event);
		// this invokelater is required because of a weird bug when a filter is set and a
		// game is selected all games in filtered view will be selected (probably gui
		// bug, preview pane only shows one game) also in tableview panel this bug doesn't occur
		SwingUtilities.invokeLater(new Runnable() {

			@Override
			public void run() {
				if (selectedGameId != GameConstants.NO_GAME) {
					selectGame(selectedGameId);
					if (lstGames.getSelectedIndex() == -1) {
						doNotFireSelectGameEvent = false;
						fireSelectGameEvent();
					}
				}
				fixRowCountForVisibleColumns(lstGames);
				fireUpdateGameCountEvent(lstGames.getModel().getSize());
				UIUtil.revalidateAndRepaint(lstGames);
				doNotFireSelectGameEvent = false;
			}
		});
	}

	private void doTheFilterNew(FilterEvent event) {
		mdlLstFilteredGames.removeAllElements();

		int platformId = event.getPlatformId();
		Criteria criteria = event.getCriteria();
		List<Game> allGames = getGamesFromCurrentView();
		mdlLstFilteredGames.addElements(allGames);
		if (event.isPlatformFilterSet()) {
			for (int i = mdlLstFilteredGames.size()-1; i >= 0; i--) {
				Game game = mdlLstFilteredGames.getElementAt(i);
				if (game.getPlatformId() != platformId) {
					mdlLstFilteredGames.removeElementAt(i);
					continue;
				}
			}
		}
		if (event.isGameFilterSet()) {
			String text = event.getCriteria().getText();
			if (!shouldUpdateCurrentFilterText && !text.equals(currentFilterText)) {
				shouldUpdateCurrentFilterText = true;
			}
			currentFilterText = text;
			boolean hasSearchString = text != null && !text.isEmpty();
			boolean hasTags = event.hasTags();
			for (int i = mdlLstFilteredGames.size()-1; i >= 0; i--) {
				Game game = mdlLstFilteredGames.getElementAt(i);
				if (hasSearchString) {
					String queryStr = text.toLowerCase();
					queryStr = ".*"+queryStr
							.replace("\\","\\\\")
							.replace("(","\\(").replace(")","\\)")
							.replace("[","\\[").replace("]","\\]")
							.replace("{","\\{").replace("}","\\}")
							.replace(".","\\.")
							.replace("+","\\+")
							.replace("|","\\|")
							.replace("^","\\^")
							.replace("$","\\$")
							.replaceAll("\\*", ".*")
							.replaceAll("\\?", ".{1}")
							+".*";
					System.out.println(queryStr);
					if (!game.getName().toLowerCase().matches(queryStr)) {
						mdlLstFilteredGames.removeElementAt(i);
						continue;
					}
				}
				if (hasTags) {
					//					if (Collections.disjoint(game.getTags(), criteria.getTags())) {
					for (Tag t : criteria.getTags()) {
						if (!game.hasTag(t.getId())) {
							mdlLstFilteredGames.removeElementAt(i);
							break;
						}
					}
				}
			}
		} else {
			if (!currentFilterText.isEmpty()) {
				textFilterHighlightedGameNames.clear();
			}
			currentFilterText = "";
		}

		GameListModel mdl = (!event.isPlatformFilterSet() && !event.isGameFilterSet()) ? getModelFromCurrentView()
				: mdlLstFilteredGames;
		List<Tag> tagsFromGames = new ArrayList<>();
		for (Game game : mdlLstFilteredGames.getAllElements()) {
			tagsFromGames.addAll(game.getTags());
		}
		lstGames.setModel(mdl);
		fireTagFilterEvent(tagsFromGames, false);

		SwingUtilities.invokeLater(new Runnable() {

			@Override
			public void run() {
				fixRowCountForVisibleColumns(lstGames);
				UIUtil.revalidateAndRepaint(lstGames);
			}
		});
	}

	private GameListModel getModelFromCurrentView() {
		GameListModel tmpMdl;
		if (getCurrentView() == NavigationPanel.ALL_GAMES) {
			tmpMdl = mdlLstAllGames;
		} else if (getCurrentView() == NavigationPanel.FAVORITES) {
			tmpMdl = mdlLstFavorites;
		} else if (getCurrentView() == NavigationPanel.RECENTLY_PLAYED) {
			tmpMdl = mdlLstRecentlyPlayed;
		} else if (getCurrentView() == NavigationPanel.RECYCLE_BIN) {
			tmpMdl = mdlLstRecycleBin;
		} else {
			tmpMdl = new GameListModel();
		}
		return tmpMdl;
	}

	private List<Game> getGamesFromCurrentView() {
		List<Game> tmpGames;
		if (getCurrentView() == NavigationPanel.ALL_GAMES) {
			tmpGames = mdlLstAllGames.getAllElements();
		} else if (getCurrentView() == NavigationPanel.FAVORITES) {
			tmpGames = mdlLstFavorites.getAllElements();
		} else if (getCurrentView() == NavigationPanel.RECENTLY_PLAYED) {
			tmpGames = mdlLstRecentlyPlayed.getAllElements();
		} else if (getCurrentView() == NavigationPanel.RECYCLE_BIN) {
			tmpGames = mdlLstRecycleBin.getAllElements();
		} else {
			tmpGames = new ArrayList<>();
		}
		return tmpGames;
	}

	private void doTheFilter(FilterEvent event) {
		// game filter set
		if (event.isGameFilterSet()) {
			List<Game> tmpGames = null;
			if (getCurrentView() == NavigationPanel.ALL_GAMES) {
				tmpGames = mdlLstAllGames.getAllElements();
			} else if (getCurrentView() == NavigationPanel.FAVORITES) {
				tmpGames = mdlLstFavorites.getAllElements();
			} else if (getCurrentView() == NavigationPanel.RECENTLY_PLAYED) {
				tmpGames = mdlLstRecentlyPlayed.getAllElements();
			} else if (getCurrentView() == NavigationPanel.RECYCLE_BIN) {
				tmpGames = mdlLstRecycleBin.getAllElements();
			}
			int platformId = event.getPlatformId();
			Criteria criteria = event.getCriteria();
			for (Game game : tmpGames) {
				if (game.getName().toLowerCase().contains(criteria.getText().toLowerCase())) {
					if (!mdlLstFilteredGames.contains(game)) {
						if (getCurrentView() == NavigationPanel.FAVORITES && !game.isFavorite()) {
							continue;
						} else {
							// no platform filter set
							if (!event.isPlatformFilterSet()) {
								if (!event.hasTags()) {
									mdlLstFilteredGames.addElement(game);
								} else {
									if (!Collections.disjoint(game.getTags(), criteria.getTags())) {
										mdlLstFilteredGames.addElement(game);
									}
								}
								// platform filter set
							} else {
								if (game.getPlatformId() == platformId) {
									if (!event.hasTags()) {
										mdlLstFilteredGames.addElement(game);
									} else {
										if (!Collections.disjoint(game.getTags(), criteria.getTags())) {
											mdlLstFilteredGames.addElement(game);
										}
									}
								}
							}
						}
					} else {
						if (getCurrentView() == NavigationPanel.FAVORITES) {
							if (!game.isFavorite()) {
								mdlLstFilteredGames.removeElement(game);
							}
						}
						if (event.isPlatformFilterSet()) {
							if (game.getPlatformId() != platformId) {
								mdlLstFilteredGames.removeElement(game);
							}
						}
					}
				} else {
					if (mdlLstFilteredGames.contains(game)) {
						mdlLstFilteredGames.removeElement(game);
					}
				}
			}
			lstGames.setModel(mdlLstFilteredGames);
			List<Tag> tagsFromGames = new ArrayList<>();
			for (Game game : mdlLstFilteredGames.getAllElements()) {
				tagsFromGames.addAll(game.getTags());
			}
			fireTagFilterEvent(tagsFromGames, false);
		} else {
			// no game filter set
			mdlLstFilteredGames.removeAllElements();

			// no platform filter set
			if (!event.isPlatformFilterSet()) {

				// no tag filter set
				if (!event.hasTags()) {
					if (getCurrentView() == NavigationPanel.ALL_GAMES) {
						lstGames.setModel(mdlLstAllGames);

						List<Tag> tagsFromGames = new ArrayList<>();
						for (Game game : mdlLstAllGames.getAllElements()) {
							tagsFromGames.addAll(game.getTags());
						}
						fireTagFilterEvent(tagsFromGames, true);
					}
					if (getCurrentView() == NavigationPanel.RECENTLY_PLAYED) {
						lstGames.setModel(mdlLstRecentlyPlayed);

						List<Tag> tagsFromGames = new ArrayList<>();
						for (Game game : mdlLstRecentlyPlayed.getAllElements()) {
							tagsFromGames.addAll(game.getTags());
						}
						fireTagFilterEvent(tagsFromGames, true);
					}
					if (getCurrentView() == NavigationPanel.FAVORITES) {
						lstGames.setModel(mdlLstFavorites);

						List<Tag> tagsFromGames = new ArrayList<>();
						for (Game game : mdlLstFavorites.getAllElements()) {
							tagsFromGames.addAll(game.getTags());
						}
						fireTagFilterEvent(tagsFromGames, true);
					}

					// tag filter set but no other filters
				} else {
					if (getCurrentView() == NavigationPanel.ALL_GAMES) {
						checkTagFilter(event, mdlLstAllGames);
					}
					if (getCurrentView() == NavigationPanel.RECENTLY_PLAYED) {
						checkTagFilter(event, mdlLstRecentlyPlayed);
					}
					if (getCurrentView() == NavigationPanel.FAVORITES) {
						checkTagFilter(event, mdlLstFavorites);
					}
				}

				// platform filter set but no game filter
			} else {
				if (getCurrentView() == NavigationPanel.ALL_GAMES) {
					checkPlatformFilter(event, mdlLstAllGames);
				}
				if (getCurrentView() == NavigationPanel.RECENTLY_PLAYED) {
					checkPlatformFilter(event, mdlLstRecentlyPlayed);
				}
				if (getCurrentView() == NavigationPanel.FAVORITES) {
					checkPlatformFilter(event, mdlLstFavorites);
				}
			}
		}
	}

	private void checkPlatformFilter(FilterEvent event, GameListModel mdlLstGames) {
		int platformId = event.getPlatformId();
		List<Game> games = mdlLstGames.getAllElements();
		for (Game game : games) {
			if (game.getPlatformId() == platformId) {
				if (event.hasTags()) {
					if (!Collections.disjoint(game.getTags(), event.getCriteria().getTags())) {
						mdlLstFilteredGames.addElement(game);
					}
				} else {
					mdlLstFilteredGames.addElement(game);
				}
			}
		}
		lstGames.setModel(mdlLstFilteredGames);

		List<Tag> tagsFromGames = new ArrayList<>();
		for (Game game : mdlLstFilteredGames.getAllElements()) {
			tagsFromGames.addAll(game.getTags());
		}
		fireTagFilterEvent(tagsFromGames, false);
	}

	private void checkTagFilter(FilterEvent event, GameListModel mdlLstGames) {
		List<Tag> tags = event.getCriteria().getTags();
		List<Tag> tagsFromGames = new ArrayList<>();
		List<Game> games = new ArrayList<>(mdlLstGames.getAllElements());
		outerloop:
			for (Game game : games) {
				for (Tag tag : tags) {
					int tagId = tag.getId();
					if (!game.hasTag(tagId)) {
						continue outerloop;
					}
				}
				if (!mdlLstFilteredGames.contains(game)) {
					mdlLstFilteredGames.addElement(game);
				}
			}
		GameListModel mdl = mdlLstFilteredGames;
		boolean removeUnusedTags = false;
		if (mdl.getAllElements().isEmpty()) {
			mdl = mdlLstGames;
			removeUnusedTags = true;
		}
		lstGames.setModel(mdl);
		for (Game game : mdl.getAllElements()) {
			tagsFromGames.addAll(game.getTags());
		}
		fireTagFilterEvent(tagsFromGames, removeUnusedTags);
	}

	private void fireTagFilterEvent(List<Tag> tags, boolean removeUnusedTags) {
		for (TagsFromGamesListener l : tagsFromGamesListeners) {
			l.tagsInCurrentViewChanged(tags, removeUnusedTags);
		}
	}

	@Override
	public void addTagsFromGamesListener(TagsFromGamesListener l) {
		tagsFromGamesListeners.add(l);
	}

	@Override
	public void gameRenamed(GameRenamedEvent event) {
	}

	@Override
	public void addCoverDragDropListener(DropTargetListener l) {
		for (JList<Game> lst : sps.keySet()) {
			new DropTarget(lst, l);
		}
	}

	@Override
	public Component getDefaultFocusableComponent() {
		return lstGames;
	}

	@Override
	public void addTagListener(TagListener l) {
	}

	@Override
	public List<Game> getGames() {
		return ((GameListModel) lstGames.getModel()).getAllElements();
	}

	@Override
	public void coverSizeChanged(int currentCoverSize) {
		setFixedCellHeights(viewManager.getCurrentCoverSize());
		//		for (JList<Game> lst : sps.keySet()) {
		//			lst.repaint();
		//		}
	}

	@Override
	public void scrollToSelectedGames() {
		List<Game> selectedGames = explorer.getCurrentGames();
		if (selectedGames != null && !selectedGames.isEmpty()) {
			int selectedIndex = lstGames.getSelectedIndex();
			lstGames.removeSelectionInterval(selectedIndex, selectedIndex); // dirty. but otherwise scroll to selected game won't work
			lstGames.setSelectedValue(selectedGames.get(0), true);
		}
	}

	@Override
	public void themeChanged() {
		selectionBackgroundColor = UIManager.getColor("List.selectionBackground");

		Color bg = FlatLaf.isLafDark() ? selectionBackgroundColor.brighter() : selectionBackgroundColor.darker();
		transparentSelectionBackgroundColor = new Color(bg.getRed(), bg.getGreen(), bg.getBlue(), 180);

		themeChanged = true;
	}
}