package ch.sysout.gameexplorer.ui;

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
import javax.swing.JRadioButton;
import javax.swing.JRadioButtonMenuItem;
import javax.swing.JScrollPane;
import javax.swing.JSeparator;
import javax.swing.JToggleButton;
import javax.swing.KeyStroke;
import javax.swing.SwingConstants;
import javax.swing.UIManager;

import ch.sysout.gameexplorer.api.GameListener;
import ch.sysout.gameexplorer.api.event.GameAddedEvent;
import ch.sysout.gameexplorer.api.event.GameRemovedEvent;
import ch.sysout.gameexplorer.api.event.GameSelectionEvent;
import ch.sysout.gameexplorer.api.model.Game;
import ch.sysout.gameexplorer.api.model.Platform;
import ch.sysout.gameexplorer.ui.listener.CoversModelListener;
import ch.sysout.util.Icons;
import ch.sysout.util.Messages;
import ch.sysout.util.ScreenSizeUtil;

public class CoverViewPanel extends ViewPanel
implements GameListener, MouseListener, MouseMotionListener, CoversModelListener {
	private static final long serialVersionUID = 1L;

	private Map<Integer, JComponent> components = new HashMap<>();
	private List<GameListener> listeners = new ArrayList<>();

	private WrapLayout wl = new WrapLayout(FlowLayout.LEADING, 10, 20);

	final JLabel lblLoadingList = new JLabel("loading list...");
	private JPanel pnlBackGround = new JPanel(wl);

	private JScrollPane sp = new JScrollPane(pnlBackGround, JScrollPane.VERTICAL_SCROLLBAR_AS_NEEDED,
			JScrollPane.HORIZONTAL_SCROLLBAR_AS_NEEDED);

	private CoverOptionsPopupMenu mnuCoverOptions;

	private int currentCoverSize = ScreenSizeUtil.adjustValueToResolution(CoverConstants.LARGE_COVERS);

	protected int lastMouseY;
	protected int lastScrollDistance;

	protected int PANEL_SIZE = ScreenSizeUtil.adjustValueToResolution(currentCoverSize / 2 * 3)
			+ ScreenSizeUtil.adjustValueToResolution(20);

	private Map<Integer, Platform> platforms = new HashMap<>();

	private ButtonGroup grp = new ButtonGroup();

	private AbstractButton btnCoversBiggest;
	private AbstractButton btnCoversBig;
	private AbstractButton btnCoversNormal;
	private AbstractButton btnCoversSmall;
	private AbstractButton btnCoversSmallest;

	private int fontSize;

	public CoverViewPanel() {
		super(new BorderLayout());
		initComponents();
		createUI();
	}

	private void initComponents() {
		JPanel pnlViewStyles = new JPanel(new WrapLayout(FlowLayout.LEFT));
		// pnlViewStyles.setBackground(UIManager.getColor("List.background"));

		pnlViewStyles.add(btnCoversBiggest = new JRadioButton(Messages.get("viewCoversBiggest")));
		pnlViewStyles.add(btnCoversBig = new JRadioButton(Messages.get("viewCoversBig")));
		pnlViewStyles.add(btnCoversNormal = new JRadioButton(Messages.get("viewCoversNormal")));
		pnlViewStyles.add(btnCoversSmall = new JRadioButton(Messages.get("viewCoversSmall")));
		pnlViewStyles.add(btnCoversSmallest = new JRadioButton(Messages.get("viewCoversSmallest")));
		ButtonGroup grp = new ButtonGroup();
		grp.add(btnCoversBiggest);
		grp.add(btnCoversBig);
		grp.add(btnCoversNormal);
		grp.add(btnCoversSmall);
		grp.add(btnCoversSmallest);
		add(pnlViewStyles, BorderLayout.NORTH);

		add(sp);
		// wl.setAlignOnBaseline(true);
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

	// @Override
	// public void mouseDragged(MouseEvent e) {
	// super.mouseDragged(e);
	// sp.scrollRectToVisible(new Rectangle(0, lastMouseY, sp.getWidth(),
	// sp.getHeight()-20));
	// }
	@Override
	public void revalidate() {
		if (pnlBackGround != null) {
			pnlBackGround.revalidate();
		} else {
			super.revalidate();
		}
	}

	@Override
	public void repaint() {
		if (pnlBackGround != null) {
			pnlBackGround.repaint();
		} else {
			super.repaint();
		}
	}

	private void showCoverOptionsPopupMenu(MouseEvent e) {
		if (mnuCoverOptions == null) {
			mnuCoverOptions = new CoverOptionsPopupMenu(currentCoverSize, false);
		}
		mnuCoverOptions.show(e.getComponent(), e.getX(), e.getY());
	}

	private void createUI() {
		setPreferredSize(new Dimension(0, 0));
		pnlBackGround.setBackground(UIManager.getColor("List.background"));
		sp.setBorder(BorderFactory.createEmptyBorder());
		sp.getVerticalScrollBar().setUnitIncrement(16);
	}

	@Override
	public boolean requestFocusInWindow() {
		return pnlBackGround.requestFocusInWindow(); // TODO test this
	}

	public void setGameCoversModel(GameCoversModel mdlCoversAllGames) {
		if (components.size() == 0) {
			mdlCoversAllGames.addCoversModelListener(this);
			for (int i = 0; i < mdlCoversAllGames.getSize(); i++) {
				addGame(mdlCoversAllGames.getElementAt(i));
			}
		}
	}

	/**
	 * FIXME Exception in thread "AWT-EventQueue-0"
	 * java.lang.ArrayIndexOutOfBoundsException
	 *
	 * @param games2
	 */
	public void initGameList(List<Game> games2) {
		pnlBackGround.removeAll();

		int size = PANEL_SIZE;
		final Dimension dimension = new Dimension(size, size);
		for (final Game game : games2) {
			String gameTitle = game.getName();
			int maxLength = 24;
			gameTitle.length();
			gameTitle.length();
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
			ImageIcon icon = getPlatformIcon(p.getId());
			System.out.println(icon + " - " + icon == null);
			AbstractButton component = new JToggleButton(text);
			Font f = component.getFont();
			component.setFont(new Font(f.getName(), f.getStyle(), fontSize));
			component.setContentAreaFilled(false);
			component.setPreferredSize(dimension);
			component.setHorizontalTextPosition(SwingConstants.CENTER);
			component.setVerticalTextPosition(SwingConstants.BOTTOM);
			component.setIcon(icon);
			component.setToolTipText("<html><b>" + game.getName() + "</b>" + "<br>" + game.getPlatformId() + ""
					+ "<br>Grösse: 64 KB" + "<br>Zuletzt gespielt: 27.05.2015 11:33:10" + "</html>");
			component.addMouseListener(CoverViewPanel.this);
			grp.add(component);
			components.put(game.getId(), component);
			pnlBackGround.add(component);
			component.addMouseListener(new MouseAdapter() {
				@Override
				public void mousePressed(MouseEvent e) {
					super.mousePressed(e);
					for (int i = 0; i < components.size(); i++) {
						Object source = e.getSource();
						if (source == components.get(i)) {
							// Game game = explorer.getGame();
							// GameEvent event = new GameSelectionEvent(game);
							// fireEvent(event);
						} else {
							// labels.get(i).setBorder(BorderFactory.createEtchedBorder());
						}
					}
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

	private void changeCoverSizeTo(int size) {
		currentCoverSize = size;
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
	public void gameSelected(GameSelectionEvent e) {
	}

	@Override
	public void gameAdded(final GameAddedEvent e) {
		addGame(e.getGame());
	}

	protected void addGame(Game game) {
		if (lblLoadingList.isVisible()) {
			lblLoadingList.setVisible(false);
		}
		int size = ScreenSizeUtil.adjustValueToResolution(PANEL_SIZE);
		AbstractButton component = new JToggleButton(game.getName());
		component.setContentAreaFilled(false);
		component.setPreferredSize(new Dimension(size, size));
		component.setHorizontalTextPosition(SwingConstants.CENTER);
		component.setVerticalTextPosition(SwingConstants.BOTTOM);

		boolean useGameCover = !game.getCoverPath().isEmpty();
		ImageIcon icon = (useGameCover) ? ImageUtil.getImageIconFrom(game.getCoverPath(), true)
				: getPlatformCover(game.getPlatformId());

		component.setIcon(icon);
		component.setToolTipText("<html><b>" + game.getName() + "</b>" + "<br>" + game.getPlatformId() + ""
				+ "<br>Grösse: 64 KB" + "<br>Zuletzt gespielt: 27.05.2015 11:33:10" + "</html>");

		component.addMouseListener(CoverViewPanel.this);
		// grp.add(component);
		grp.add(component);
		components.put(game.getId(), component);
		pnlBackGround.add(component);
		revalidate();
		repaint();
	}

	protected void removeGame(Game game) {
		JComponent component = components.get(game.getId());
		components.remove(game.getId());
		pnlBackGround.remove(component);
		revalidate();
		repaint();
	}

	@Override
	public void gameRemoved(GameRemovedEvent e) {

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

	public void addSelectGameListener(GameListener l) {
		listeners.add(l);
	}

	public void addRunGameListener(MouseListener l) {
	}

	@Override
	public void elementAdded(Game game) {
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

	public void setFontSize(int value) {
		fontSize = value;
		for (JComponent c : components.values()) {
			Font font = c.getFont();
			c.setFont(new Font(font.getFontName(), font.getStyle(), value));
		}
	}

	public void addIncreaseFontListener(Action l) {
		pnlBackGround.getInputMap().put(KeyStroke.getKeyStroke(KeyEvent.VK_PLUS, java.awt.event.InputEvent.CTRL_DOWN_MASK),
				"actionIncreaseFont");
		pnlBackGround.getActionMap().put("actionIncreaseFont", l);
	}

	public void addDecreaseFontListener(Action l) {
		sp.getInputMap().put(KeyStroke.getKeyStroke(KeyEvent.VK_MINUS, java.awt.event.InputEvent.CTRL_DOWN_MASK),
				"actionDencreaseFont");
		sp.getActionMap().put("actionDecreaseFont", l);
	}

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
}