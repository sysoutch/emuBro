package ch.sysout.emubro.ui;

import java.awt.BorderLayout;
import java.awt.Cursor;
import java.awt.Dimension;
import java.awt.FlowLayout;
import java.awt.Font;
import java.awt.Rectangle;
import java.awt.dnd.DropTarget;
import java.awt.dnd.DropTargetListener;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.awt.event.KeyEvent;
import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;
import java.awt.event.MouseListener;
import java.awt.event.MouseMotionListener;
import java.awt.event.MouseWheelListener;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Set;
import java.util.Timer;
import java.util.TimerTask;

import javax.swing.AbstractButton;
import javax.swing.Action;
import javax.swing.BorderFactory;
import javax.swing.ButtonGroup;
import javax.swing.ImageIcon;
import javax.swing.JCheckBoxMenuItem;
import javax.swing.JComponent;
import javax.swing.JLabel;
import javax.swing.JMenu;
import javax.swing.JMenuItem;
import javax.swing.JPanel;
import javax.swing.JPopupMenu;
import javax.swing.JRadioButtonMenuItem;
import javax.swing.JScrollPane;
import javax.swing.JSeparator;
import javax.swing.JToggleButton;
import javax.swing.KeyStroke;
import javax.swing.SwingConstants;
import javax.swing.UIManager;

import ch.sysout.emubro.api.GameListener;
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
import ch.sysout.emubro.ui.listener.CoversModelListener;
import ch.sysout.util.Icons;
import ch.sysout.util.ScreenSizeUtil;
import ch.sysout.util.UIUtil;
import ch.sysout.util.ValidationUtil;

public class CoverViewPanel extends ViewPanel
implements GameListener, GameSelectionListener, MouseListener, MouseMotionListener, CoversModelListener {
	private static final long serialVersionUID = 1L;

	private GameCoversModel mdlCoversAllGames = new GameCoversModel();
	private GameCoversModel mdlCoversRecentlyPlayed = new GameCoversModel();
	private GameCoversModel mdlCoversFavorites = new GameCoversModel();
	private GameCoversModel mdlCoversFiltered = new GameCoversModel();

	private Map<Integer, AbstractButton> components = new HashMap<>();
	private List<GameSelectionListener> selectGameListeners = new ArrayList<>();

	private WrapLayout wl = new WrapLayout(FlowLayout.LEADING, 10, 20);

	final JLabel lblLoadingList = new JLabel("loading list...");
	private JPanel pnlBackGround;

	private JScrollPane sp;

	private CoverOptionsPopupMenu mnuCoverOptions;

	private int currentCoverSize = ScreenSizeUtil.adjustValueToResolution(CoverConstants.MEDIUM_COVERS);

	protected int lastMouseY;
	protected int lastScrollDistance;

	protected int PANEL_SIZE = ScreenSizeUtil.adjustValueToResolution(currentCoverSize / 2 * 3);

	private Map<Integer, Platform> platforms = new HashMap<>();

	private int fontSize;
	private ButtonGroup grp = new ButtonGroup();

	private Map<Float, ImageIcon> scaledCovers = new HashMap<>();

	public IconStore iconStore;

	protected int selectedGame = GameConstants.NO_GAME;

	private boolean touchScreenScrollEnabled;

	private int viewStyle;

	public CoverViewPanel(IconStore iconStore) {
		super(new BorderLayout());
		ValidationUtil.checkNull(iconStore, "iconStore");
		this.iconStore = iconStore;
		initComponents();
		createUI();
	}

	private void initComponents() {
		wl.setAlignOnBaseline(true);
		pnlBackGround = new JPanel();
		pnlBackGround.setLayout(wl);
		pnlBackGround.add(lblLoadingList);
		addListeners();
	}

	private void addListeners() {
		pnlBackGround.addMouseMotionListener(this);
		MouseListener mouseAdapter = new MouseAdapter() {

			@Override
			public void mousePressed(MouseEvent e) {
				super.mousePressed(e);
				if (e.isPopupTrigger()) {
					showCoverOptionsPopupMenu(e);
				}
			}

			@Override
			public void mouseReleased(MouseEvent e) {
				super.mouseReleased(e);
				if (e.isPopupTrigger()) {
					showCoverOptionsPopupMenu(e);
				} else {
					pnlBackGround.setCursor(null);

					Timer timer = new Timer();
					TimerTask task = new TimerTask() {

						@Override
						public void run() {
							if (lastScrollDistance != 0) {
								if (lastScrollDistance > 0) {
									if ((lastScrollDistance % 2) == 0) {
										lastScrollDistance -= 2;
									} else {
										lastScrollDistance--;
									}
								} else {
									if ((lastScrollDistance % 2) == 0) {
										lastScrollDistance += 2;
									} else {
										lastScrollDistance++;
									}
								}

								pnlBackGround.scrollRectToVisible(new Rectangle(0,
										pnlBackGround.getVisibleRect().y + lastScrollDistance,
										pnlBackGround.getVisibleRect().width, pnlBackGround.getVisibleRect().height));

								getRootPane().revalidate();
								getRootPane().repaint();
							} else {
								cancel();
							}
						}
					};

					timer.schedule(task, 0, 10);
				}
			}
		};
		pnlBackGround.addMouseListener(mouseAdapter);
	}

	private void showCoverOptionsPopupMenu(MouseEvent e) {
		if (mnuCoverOptions == null) {
			mnuCoverOptions = new CoverOptionsPopupMenu(currentCoverSize, false);
		}
		mnuCoverOptions.show(e.getComponent(), e.getX(), e.getY());
	}

	private void createUI() {
		sp = new JScrollPane(pnlBackGround, JScrollPane.VERTICAL_SCROLLBAR_AS_NEEDED,
				JScrollPane.HORIZONTAL_SCROLLBAR_AS_NEEDED);
		add(sp);
		setPreferredSize(new Dimension(0, 0));
		pnlBackGround.setBackground(UIManager.getColor("List.background"));
		sp.setBorder(BorderFactory.createEmptyBorder());
		sp.getVerticalScrollBar().setUnitIncrement(16);
	}

	@Override
	public boolean requestFocusInWindow() {
		return pnlBackGround.requestFocusInWindow(); // TODO test this
	}

	/**
	 * FIXME Exception in thread "AWT-EventQueue-0"
	 * java.lang.ArrayIndexOutOfBoundsException
	 *
	 * @param games
	 */
	@Override
	public void initGameList(List<Game> games, int currentNavView) {
		pnlBackGround.removeAll();
		int size = ScreenSizeUtil.adjustValueToResolution(PANEL_SIZE) + fontSize;
		final Dimension dimension = new Dimension(size, size);
		for (Game game : games) {
			String gameTitle = game.getName();
			int maxLength = 24;
			if (gameTitle.length() > maxLength) {
				int k = 1;
				int newStartIndex = 0;
				for (int i = 0; i < gameTitle.length(); i++) {
					if (i == maxLength * k) {
						gameTitle = gameTitle.substring(0, newStartIndex)
								+ gameTitle.substring(newStartIndex, newStartIndex + maxLength) + "\n"
								+ gameTitle.substring(newStartIndex + maxLength);
						newStartIndex = i;
						k++;
					}
					if (k == 3) {
						break;
					}
				}
			}

			lblLoadingList.setVisible(false);
			String text = gameTitle;
			Platform p = platforms.get(game.getPlatformId());
			AbstractButton component = new JToggleButton(text);
			Font f = component.getFont();
			component.setFont(new Font(f.getName(), f.getStyle(), fontSize));
			component.setContentAreaFilled(false);
			component.setPreferredSize(dimension);
			component.setHorizontalTextPosition(SwingConstants.CENTER);
			component.setVerticalTextPosition(SwingConstants.BOTTOM);
			component.setToolTipText("<html><b>" + game.getName() + "</b>" + "<br>" + game.getPlatformId() + ""
					+ "<br>Grösse: 64 KB" + "<br>Zuletzt gespielt: 27.05.2015 11:33:10" + "</html>");
			boolean useGameCover = !game.getCoverPath().isEmpty();
			ImageIcon icon = (useGameCover) ? ImageUtil.getImageIconFrom(game.getCoverPath(), true) : null;
			if (icon != null) {
				icon = ImageUtil.scaleCover(icon, currentCoverSize, CoverConstants.SCALE_HEIGHT_OPTION);
			}
			mdlCoversAllGames.addCover(game.getId(), icon);

			component.addMouseListener(CoverViewPanel.this);
			grp.add(component);
			mdlCoversAllGames.addElement(game);
			components.put(game.getId(), component);
			pnlBackGround.add(component);
			component.addActionListener(new ActionListener() {

				@Override
				public void actionPerformed(ActionEvent e) {
					if (selectedGame != GameConstants.NO_GAME) {
						if (selectedGame != game.getId()) {
							UIUtil.doHover(false, components.get(selectedGame));
						}
					}
					selectedGame = game.getId();
					fireGameSelectedEvent(game.getId());
				}
			});
		}
		// SwingUtilities.invokeLater(new Runnable() {
		//
		// @Override
		// public void run() {
		// adjustCoverPanelSize();
		// }
		// });
		// autoSetCovers();
	}

	public void initCovers() {
		for (Entry<Integer, AbstractButton> comps : components.entrySet()) {
			Game game = mdlCoversAllGames.getGame(comps.getKey());
			int platformId = game.getPlatformId();
			AbstractButton comp = comps.getValue();
			ImageIcon icon = iconStore.getPlatformCover(platformId);
			if (icon != null) {
				icon = iconStore.getScaledPlatformCover(platformId, currentCoverSize);
			}
			comp.setIcon(icon);
		}
	}

	protected void fireGameSelectedEvent(int i) {
		for (GameSelectionListener l : selectGameListeners) {
			l.gameSelected(new BroGameSelectionEvent(mdlCoversAllGames.getGame(i), null));
		}
	}

	private void changeCoverSizeTo(int size) {
		currentCoverSize = size;
		PANEL_SIZE = ScreenSizeUtil.adjustValueToResolution(currentCoverSize / 2 * 3);
		// for (int i = 0; i < explorer.getGameCount(); i++) {
		// Game game = explorer.getGameAt(i);
		// String coverPath = game.getCoverPath();
		//
		// if (game.hasCover()) {
		// ImageIcon icon = scaleCover(coverPath, size,
		// CoverConstants.SCALE_AUTO_OPTION);
		// buttons.get(i).setIcon(icon);
		// } else {
		// Random rand = new Random();
		// int index = rand.nextInt(icons.size());
		// buttons.get(i).setIcon(scaleCover(icons.get(index),
		// size, CoverConstants.SCALE_AUTO_OPTION));
		// }
		// }
	}

	@Override
	public void selectGame(int gameId) {

	}

	@Override
	public void gameSelected(GameSelectionEvent e) {
	}

	@Override
	public void gameAdded(final GameAddedEvent e) {
		if (e.getGame() == null) {
			System.err.println("this game is null. should normally not happen");
			return;
		}
		addGame(e.getGame());
	}

	protected void addGame(Game game) {
		mdlCoversAllGames.addElement(game);

		if (game == null) {
			System.err.println("this game is null. should normally not happen");
			return;
		}
		if (lblLoadingList.isVisible()) {
			lblLoadingList.setVisible(false);
		}
		int size = PANEL_SIZE + fontSize;
		AbstractButton component = new JToggleButton(game.getName());
		component.setContentAreaFilled(false);
		final Dimension dimension = new Dimension(size, size);
		component.setMinimumSize(dimension);
		component.setPreferredSize(dimension);
		component.setSize(dimension);
		component.setHorizontalTextPosition(SwingConstants.CENTER);
		component.setVerticalTextPosition(SwingConstants.BOTTOM);
		component.setToolTipText("<html><b>" + game.getName() + "</b>" + "<br>" + game.getPlatformId() + ""
				+ "<br>Grösse: 64 KB" + "<br>Zuletzt gespielt: 27.05.2015 11:33:10" + "</html>");
		component.addMouseListener(CoverViewPanel.this);
		grp.add(component);
		components.put(game.getId(), component);
		pnlBackGround.add(component);
		UIUtil.revalidateAndRepaint(pnlBackGround);
	}

	protected void removeGame(Game game) {
		JComponent component = components.get(game.getId());
		if (component != null) {
			components.remove(game.getId());
			pnlBackGround.remove(component);
			UIUtil.revalidateAndRepaint(pnlBackGround);
		}
	}

	@Override
	public void gameRemoved(GameRemovedEvent e) {
		Game game = e.getGame();
		mdlCoversAllGames.removeElement(game);
	}

	@Override
	public void mouseClicked(MouseEvent e) {
	}

	@Override
	public void mousePressed(MouseEvent e) {
		// JComponent source = (JComponent) e.getSource();
		// for (JComponent lbl : components) {
		// if (lbl == source) {
		// } else {
		// }
		// }
		// // source.setContentAreaFilled(true);
		// // source.setFocusPainted(false);
		lastMouseY = sp.getVerticalScrollBar().getValue();
	}

	@Override
	public void mouseReleased(MouseEvent e) {
	}

	@Override
	public void mouseEntered(MouseEvent e) {
		((AbstractButton) e.getSource()).setContentAreaFilled(true);
	}

	@Override
	public void mouseExited(MouseEvent e) {
		if (!((JToggleButton) e.getSource()).isSelected()) {
			((AbstractButton) e.getSource()).setContentAreaFilled(false);
		}
	}

	class CoverOptionsPopupMenu extends JPopupMenu implements ActionListener {
		private static final long serialVersionUID = 1L;

		public static final int HUGE_COVERS = CoverConstants.HUGE_COVERS;
		public static final int LARGE_COVERS = CoverConstants.LARGE_COVERS;
		public static final int MEDIUM_COVERS = CoverConstants.MEDIUM_COVERS;
		public static final int SMALL_COVERS = CoverConstants.SMALL_COVERS;
		public static final int TINY_COVERS = CoverConstants.TINY_COVERS;

		private JRadioButtonMenuItem itmHugeCovers;
		private JRadioButtonMenuItem itmLargeCovers;
		private JRadioButtonMenuItem itmMediumCovers;
		private JRadioButtonMenuItem itmSmallCovers;
		private JRadioButtonMenuItem itmTinyCovers;
		private JCheckBoxMenuItem itmShowGameTitles;

		private JRadioButtonMenuItem itmSortAscending;
		private JRadioButtonMenuItem itmSortDescending;

		private JRadioButtonMenuItem itmGroupAscending;
		private JRadioButtonMenuItem itmGroupDescending;

		private JMenuItem itmRefresh;

		public CoverOptionsPopupMenu(int iconSize, boolean squareIcons) {
			JMenu mnuView = new JMenu("Ansicht");
			JMenu mnuSort = new JMenu("Sortieren nach");
			JMenu mnuGroup = new JMenu("Gruppieren nach");

			itmRefresh = new JMenuItem("Aktualisieren");
			add(mnuView);
			add(new JSeparator());
			add(mnuSort);
			add(mnuGroup);
			add(new JSeparator());
			add(itmRefresh);

			itmHugeCovers = new JRadioButtonMenuItem("Riesige Covers");
			itmLargeCovers = new JRadioButtonMenuItem("Grosse Covers");
			itmMediumCovers = new JRadioButtonMenuItem("Mittelgrosse Covers");
			itmSmallCovers = new JRadioButtonMenuItem("Kleine Covers");
			itmTinyCovers = new JRadioButtonMenuItem("Winzige Covers");

			addToButtonGroup(new ButtonGroup(), itmHugeCovers, itmLargeCovers, itmMediumCovers, itmSmallCovers,
					itmTinyCovers);

			itmShowGameTitles = new JCheckBoxMenuItem("Spieltitel anzeigen");

			mnuView.add(itmShowGameTitles);
			mnuView.add(new JSeparator());
			mnuView.add(itmHugeCovers);
			mnuView.add(itmLargeCovers);
			mnuView.add(itmMediumCovers);
			mnuView.add(itmSmallCovers);
			mnuView.add(itmTinyCovers);

			switch (iconSize) {
			case HUGE_COVERS:
				itmHugeCovers.setSelected(true);
				break;
			case LARGE_COVERS:
				itmLargeCovers.setSelected(true);
				break;
			case MEDIUM_COVERS:
				itmMediumCovers.setSelected(true);
				break;
			case SMALL_COVERS:
				itmSmallCovers.setSelected(true);
				break;
			case TINY_COVERS:
				itmTinyCovers.setSelected(true);
				break;
			}

			JRadioButtonMenuItem itmSortName = new JRadioButtonMenuItem("Name");
			JRadioButtonMenuItem itmSortType = new JRadioButtonMenuItem("Typ");
			itmSortName.setSelected(true);
			addToButtonGroup(new ButtonGroup(), itmSortName, itmSortType);

			itmSortAscending = new JRadioButtonMenuItem("Aufsteigend");
			itmSortDescending = new JRadioButtonMenuItem("Absteigend");
			itmSortAscending.setSelected(true);
			addToButtonGroup(new ButtonGroup(), itmSortAscending, itmSortDescending);

			mnuSort.add(itmSortName);
			mnuSort.add(itmSortType);
			mnuSort.add(new JSeparator());
			mnuSort.add(itmSortAscending);
			mnuSort.add(itmSortDescending);

			JRadioButtonMenuItem itmGroupName = new JRadioButtonMenuItem("Name");
			JRadioButtonMenuItem itmGroupType = new JRadioButtonMenuItem("Typ");
			JRadioButtonMenuItem itmGroupBlank = new JRadioButtonMenuItem("(Keine)");
			itmGroupName.setSelected(true);
			addToButtonGroup(new ButtonGroup(), itmGroupName, itmGroupType, itmGroupBlank);

			itmGroupAscending = new JRadioButtonMenuItem("Aufsteigend");
			itmGroupDescending = new JRadioButtonMenuItem("Absteigend");
			itmGroupAscending.setSelected(true);
			addToButtonGroup(new ButtonGroup(), itmGroupAscending, itmGroupDescending);

			mnuGroup.add(itmGroupName);
			mnuGroup.add(itmGroupType);
			mnuGroup.add(itmGroupBlank);
			mnuGroup.add(new JSeparator());
			mnuGroup.add(itmGroupAscending);
			mnuGroup.add(itmGroupDescending);

			setAccelerators();
			setIcons();
			addListeners();
		}

		private void setAccelerators() {
			itmRefresh.setAccelerator(KeyStroke.getKeyStroke("F5"));
		}

		private void setIcons() {
			String size = ScreenSizeUtil.is3k() ? "24" : "16";
			setIcon(itmHugeCovers, Icons.get("viewCovers", size, size));
			setIcon(itmLargeCovers, Icons.get("viewCovers", size, size));
			setIcon(itmMediumCovers, Icons.get("viewCovers", size, size));
			setIcon(itmSmallCovers, Icons.get("viewCovers", size, size));
			setIcon(itmTinyCovers, Icons.get("viewCovers", size, size));
			setIcon(itmRefresh, Icons.get("refresh", size, size));
		}

		private void setIcon(AbstractButton btn, String pathToIcon) {
			btn.setIcon(new ImageIcon(getClass().getResource(pathToIcon)));
		}

		private void addToButtonGroup(ButtonGroup grp, AbstractButton... buttons) {
			for (AbstractButton btn : buttons) {
				grp.add(btn);
			}
		}

		private void addListeners() {
			addActionListeners(itmHugeCovers, itmLargeCovers, itmMediumCovers, itmSmallCovers, itmTinyCovers);
		}

		private void addActionListeners(AbstractButton... buttons) {
			for (AbstractButton btn : buttons) {
				btn.addActionListener(this);
			}
		}

		@Override
		public void actionPerformed(ActionEvent e) {
			Object source = e.getSource();
			// Game game = components.get(0);
			// BroGameSelectionEvent event = new BroGameSelectionEvent(game);
			// fireEvent(event);

			if (source == itmHugeCovers) {
				changeCoverSizeTo(HUGE_COVERS);
			} else if (source == itmLargeCovers) {
				changeCoverSizeTo(LARGE_COVERS);
			} else if (source == itmMediumCovers) {
				changeCoverSizeTo(MEDIUM_COVERS);
			} else if (source == itmSmallCovers) {
				changeCoverSizeTo(SMALL_COVERS);
			} else if (source == itmTinyCovers) {
				changeCoverSizeTo(TINY_COVERS);
			}
		}
	}

	@Override
	public void mouseDragged(MouseEvent e) {
		// lstGames.setSelectedIndex(lastSelectedIndex);
		pnlBackGround.setCursor(Cursor.getPredefinedCursor(Cursor.MOVE_CURSOR));
		int val = sp.getVerticalScrollBar().getValue();
		pnlBackGround.scrollRectToVisible(new Rectangle(0, val + lastScrollDistance,
				pnlBackGround.getVisibleRect().width, pnlBackGround.getVisibleRect().height));
		lastScrollDistance = lastMouseY - e.getYOnScreen();
		lastMouseY = e.getYOnScreen();
	}

	@Override
	public void mouseMoved(MouseEvent e) {
	}

	@Override
	public void addSelectGameListener(GameSelectionListener l) {
		selectGameListeners.add(l);
	}

	@Override
	public void addRunGameListener(MouseListener l) {
	}

	@Override
	public void elementAdded(Game game) {
		if (game == null) {
			System.err.println("this game is null. should normally not happen");
			return;
		}
		addGame(game);
	}

	@Override
	public void elementRemoved(Game game) {
		removeGame(game);
	}

	@Override
	public void allElementsRemoved() {

	}

	@Override
	public void addGameDragDropListener(DropTargetListener l) {
		new DropTarget(pnlBackGround, l);
	}

	@Override
	public void languageChanged() {
	}

	@Override
	public void groupByNone() {
		// TODO Auto-generated method stub

	}

	@Override
	public void groupByPlatform() {
		// TODO Auto-generated method stub

	}

	@Override
	public void groupByTitle() {
		// TODO Auto-generated method stub

	}

	@Override
	public void increaseFontSize() {
		int newRowHeight = PANEL_SIZE;
		int newColumnWidth = PANEL_SIZE;
		//		setRowHeight(newRowHeight);
		//		setColumnWidth(newColumnWidth);
		for (JComponent c : components.values()) {
			Font font = c.getFont();
			c.setFont(new Font(font.getFontName(), font.getStyle(), font.getSize() + 2));
		}
	}

	@Override
	public void decreaseFontSize() {
		int newRowHeight = PANEL_SIZE;
		int newColumnWidth = PANEL_SIZE;
		//		setRowHeight(newRowHeight);
		//		setColumnWidth(newColumnWidth);
		for (JComponent c : components.values()) {
			Font font = c.getFont();
			c.setFont(new Font(font.getFontName(), font.getStyle(), font.getSize() - 2));
		}
	}

	public void initGameCovers() {
		Set<Entry<Integer, Game>> allGames = mdlCoversAllGames.getAllGames();
		for (Map.Entry<Integer, Game> entry : allGames) {
			Game game = entry.getValue();
			int gameId = game.getId();
			int platformId = game.getPlatformId();
			AbstractButton component = components.get(gameId);
			ImageIcon icon = mdlCoversAllGames.getCover(gameId);
			if (icon == null) {
				icon = getScaledCover(platformId, currentCoverSize, CoverConstants.SCALE_HEIGHT_OPTION);
			} else {
				System.err.println("not null");
			}
			component.setIcon((icon != null) ? icon : iconStore.getPlatformCover(platformId));
		}
	}

	private ImageIcon getScaledCover(int platformId, int currentCoverSize2, int scaleHeightOption) {
		String s = platformId+"."+currentCoverSize2;
		float platformIdPlusCurrentCoverSize = Float.parseFloat(s);
		ImageIcon icon = null;
		if (scaledCovers.containsKey(platformIdPlusCurrentCoverSize)) {
			icon = scaledCovers.get(platformIdPlusCurrentCoverSize);
		} else {
			ImageIcon platformCover = iconStore.getPlatformCover(platformId);
			if (platformCover != null) {
				icon = ImageUtil.scaleCover(platformCover, currentCoverSize2, scaleHeightOption);
				scaledCovers.put(platformIdPlusCurrentCoverSize, icon);
			}
		}
		return icon;
	}

	@Override
	public void setFontSize(int value) {
		fontSize = value;
		for (JComponent c : components.values()) {
			Font font = c.getFont();
			c.setFont(new Font(font.getFontName(), font.getStyle(), value));
		}
	}

	@Override
	public void addIncreaseFontListener(Action l) {
		pnlBackGround.getInputMap().put(KeyStroke.getKeyStroke(KeyEvent.VK_PLUS, java.awt.event.InputEvent.CTRL_DOWN_MASK),
				"actionIncreaseFont");
		pnlBackGround.getActionMap().put("actionIncreaseFont", l);
	}

	@Override
	public void addDecreaseFontListener(Action l) {
		sp.getInputMap().put(KeyStroke.getKeyStroke(KeyEvent.VK_MINUS, java.awt.event.InputEvent.CTRL_DOWN_MASK),
				"actionDencreaseFont");
		sp.getActionMap().put("actionDecreaseFont", l);
	}

	@Override
	public void addIncreaseFontListener2(MouseWheelListener l) {
		sp.addMouseWheelListener(l);
		//		sp.addMouseWheelListener(new MouseWheelListener() {
		//
		//			@Override
		//			public void mouseWheelMoved(MouseWheelEvent e) {
		//				if (e.isControlDown()) {
		//					sp.setWheelScrollingEnabled(false);
		//				} else {
		//					sp.setWheelScrollingEnabled(true);
		//				}
		//			}
		//		});
	}

	@Override
	public int getGroupBy() {
		return ViewConstants.GROUP_BY_NONE;
		//			return ViewConstants.GROUP_BY_PLATFORM;
		//		throw new IllegalStateException("current viewport not known");
	}

	public void addGame2(Game game) {
		mdlCoversAllGames.addElement(game);
	}

	public boolean isInitialized() {
		return false;
	}

	@Override
	public void initPlatforms(List<Platform> platforms) {
	}

	@Override
	public void sortBy(int sortBy, PlatformComparator platformComparator) {
		// TODO Auto-generated method stub

	}

	@Override
	public void sortOrder(int sortOrder) {
		// TODO Auto-generated method stub

	}

	@Override
	public void navigationChanged(NavigationEvent e) {

	}

	@Override
	public void pinColumnWidthSliderPanel(JPanel pnlColumnWidthSlider) {
		// TODO Auto-generated method stub

	}

	@Override
	public void unpinColumnWidthSliderPanel(JPanel pnlColumnWidthSlider) {
		// TODO Auto-generated method stub

	}

	@Override
	public void pinRowHeightSliderPanel(JPanel pnlRowHeightSlider) {
		// TODO Auto-generated method stub

	}

	@Override
	public void unpinRowHeightSliderPanel(JPanel pnlRowHeightSlider) {
		// TODO Auto-generated method stub

	}

	@Override
	public void gameRated(Game game) {
		// TODO Auto-generated method stub

	}

	@Override
	public void hideExtensions(boolean shouldHide) {
		// TODO Auto-generated method stub

	}

	@Override
	public void addRunGameListener(Action l) {
		// TODO Auto-generated method stub

	}

	@Override
	public void addOpenGamePropertiesListener(Action l) {
		// TODO Auto-generated method stub

	}

	@Override
	public void addRemoveGameListener(Action l) {
		// TODO Auto-generated method stub

	}

	@Override
	public int getColumnWidth() {
		// TODO Auto-generated method stub
		return 0;
	}

	@Override
	public void setColumnWidth(int value) {
		// TODO Auto-generated method stub

	}

	@Override
	public int getRowHeight() {
		// TODO Auto-generated method stub
		return 0;
	}

	@Override
	public void setRowHeight(int value) {
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
		// TODO Auto-generated method stub

	}

	@Override
	public void selectNextGame() {
	}

	@Override
	public void selectPreviousGame() {
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
}