package ch.sysout.gameexplorer.ui;

import java.awt.BorderLayout;
import java.awt.Component;
import java.awt.Dimension;
import java.awt.Font;
import java.awt.Image;
import java.awt.Point;
import java.awt.dnd.DropTargetListener;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.awt.event.ComponentListener;
import java.awt.event.MouseEvent;
import java.awt.event.MouseListener;
import java.awt.event.MouseWheelListener;
import java.awt.event.WindowAdapter;
import java.awt.event.WindowEvent;
import java.awt.font.FontRenderContext;
import java.awt.geom.AffineTransform;
import java.beans.PropertyChangeEvent;
import java.beans.PropertyChangeListener;
import java.io.File;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import javax.swing.AbstractAction;
import javax.swing.AbstractButton;
import javax.swing.Action;
import javax.swing.BorderFactory;
import javax.swing.Icon;
import javax.swing.ImageIcon;
import javax.swing.JComponent;
import javax.swing.JFrame;
import javax.swing.JPanel;
import javax.swing.JSplitPane;
import javax.swing.KeyStroke;
import javax.swing.ListModel;
import javax.swing.SwingUtilities;
import javax.swing.WindowConstants;
import javax.swing.table.TableModel;

import com.jgoodies.forms.factories.CC;
import com.jgoodies.forms.factories.Paddings;
import com.jgoodies.forms.layout.CellConstraints;
import com.jgoodies.forms.layout.FormLayout;

import ch.sysout.gameexplorer.api.FilterListener;
import ch.sysout.gameexplorer.api.GameListener;
import ch.sysout.gameexplorer.api.GameViewListener;
import ch.sysout.gameexplorer.api.PlatformListener;
import ch.sysout.gameexplorer.api.event.EmulatorEvent;
import ch.sysout.gameexplorer.api.event.FilterEvent;
import ch.sysout.gameexplorer.api.event.GameAddedEvent;
import ch.sysout.gameexplorer.api.event.GameRemovedEvent;
import ch.sysout.gameexplorer.api.event.GameSelectionEvent;
import ch.sysout.gameexplorer.api.event.PlatformEvent;
import ch.sysout.gameexplorer.api.model.Emulator;
import ch.sysout.gameexplorer.api.model.Explorer;
import ch.sysout.gameexplorer.api.model.Game;
import ch.sysout.gameexplorer.api.model.Platform;
import ch.sysout.gameexplorer.impl.event.NavigationEvent;
import ch.sysout.gameexplorer.impl.model.BroEmulator;
import ch.sysout.util.Icons;
import ch.sysout.util.Messages;
import ch.sysout.util.ScreenSizeUtil;

public class MainPanel extends JPanel
implements PlatformListener, GameListener, ActionListener, MouseListener, LanguageListener {
	private static final long serialVersionUID = 1L;

	private int size = ScreenSizeUtil.is3k() ? 32 : 24;
	private int size2 = ScreenSizeUtil.is3k() ? 32 : 24;

	private ButtonBarButton btnOrganize;
	private ButtonBarButton btnSettings;
	private ButtonBarButton btnRunGame;
	private ButtonBarButton btnMoreOptionsRunGame;
	private ButtonBarButton btnRemoveGame;
	private ButtonBarButton btnRenameGame;
	private ButtonBarButton btnGameProperties;
	private ButtonBarButton btnChangeView;
	private ButtonBarButton btnMoreOptionsChangeView;
	private ButtonBarButton btnPreviewPane;
	private ButtonBarButton btnSetFilter;
	private JComponent[] buttonBarComponents;

	private OrganizePopupMenu mnuOrganizeOptions = new OrganizePopupMenu();
	private GameSettingsPopupMenu mnuGameSettings = new GameSettingsPopupMenu();
	private ViewSettingsPopupMenu mnuViewSettings = new ViewSettingsPopupMenu();

	private ImageIcon iconPreviewPaneShow;
	private ImageIcon iconPreviewPaneHide;
	private ImageIcon iconChangeView;

	private BlankViewPanel pnlBlankView;
	private NewNewListViewPanel pnlListView;
	private TableViewPanel pnlTableView;
	private CoverViewPanel pnlCoverView;
	private ViewPanel currentViewPanel;

	private List<GameViewListener> gameViewChangeListeners = new ArrayList<>();
	private List<GameListener> gameListeners = new ArrayList<>();

	private RatingBarPanel pnlRatingBar = new RatingBarPanel(Messages.get("rate"), true);

	private ButtonBarPanel pnlButtonBar;
	private GameFilterPanel pnlGameFilter;
	private NavigationPanel pnlNavigation;

	private PreviewPanePanel pnlPreviewPane;

	private JSplitPane splNavigationAndCurrentViewAndPreviewPane;
	private JSplitPane splCurrentViewAndPreviewPane;

	private JSplitPane splDetailsPane;

	private DetailsPanel pnlDetails;

	private int lastPreviewDividerLocation;
	private int lastDetailsDividerLocation;
	private int lastDetailsDividerSize;
	private int lastPreviewDividerSize;

	private Dimension lastInformationBarSize = new Dimension();
	private Dimension lastNavigationPaneSize = new Dimension();
	private Dimension lastPreviewPaneSize = new Dimension();

	protected int lastLocation;
	protected int counter;

	protected boolean resizeNavigationPanelEnabled;

	private Map<String, ImageIcon> gameCovers = new HashMap<>();

	private Explorer explorer;

	private Icon iconSearchGame;
	private Icon iconSearchGameGreen;
	private Icon iconSearchGameRed;

	protected JFrame frameDetailsPane;

	public MainPanel(Explorer explorer) {
		super(new BorderLayout());
		this.explorer = explorer;
		initComponents();
		createUI();
	}

	private void initComponents() {
		iconPreviewPaneShow = ImageUtil.getImageIconFrom(Icons.get("showPreviewPane", size, size));
		iconPreviewPaneHide = ImageUtil.getImageIconFrom(Icons.get("hidePreviewPane", size, size));
		iconChangeView = ImageUtil.getImageIconFrom(Icons.get("viewTable", size, size));
		iconSearchGame = ImageUtil.getImageIconFrom(Icons.get("searchGame2", size, size));
		iconSearchGameGreen = ImageUtil.getImageIconFrom(Icons.get("searchGame2Green", size, size));
		iconSearchGameRed = ImageUtil.getImageIconFrom(Icons.get("searchGame2Red", size, size));

		/** 2 */ initializeCurrentViewAndPreviewPane();
		/** 3 */ initializeNavigationAndCurrentViewAndPreviewPane();
		/** 4 */ initializeButtonBar();
		/** 5 */ initializeDetailsPanel();
		/** 6 */ initializeGameFilter();

		pnlBlankView = new BlankViewPanel();
		pnlListView = new NewNewListViewPanel(explorer);
		pnlTableView = new TableViewPanel();
		pnlCoverView = new CoverViewPanel();
		changeViewPanelTo(pnlBlankView);

		setToolTipTexts();
	}

	private void initializeGameFilter() {
		pnlGameFilter = new GameFilterPanel(explorer);
		pnlGameFilter.setVisible(false);

		Action focusSearchFieldAction = new AbstractAction("focusAction") {
			private static final long serialVersionUID = 1L;

			@Override
			public void actionPerformed(ActionEvent e) {
				if (!pnlGameFilter.isVisible()) {
					pnlGameFilter.setVisible(true);
				}
				pnlGameFilter.setFocusInTextField();
			}
		};
		focusSearchFieldAction.putValue(Action.ACCELERATOR_KEY, KeyStroke.getKeyStroke("control F"));
		getActionMap().put("focusAction", focusSearchFieldAction);
		getInputMap(JComponent.WHEN_IN_FOCUSED_WINDOW)
		.put((KeyStroke) focusSearchFieldAction.getValue(Action.ACCELERATOR_KEY), "focusAction");
	}

	private void initializeButtonBar() {
		pnlButtonBar = new ButtonBarPanel();
		btnOrganize = new ButtonBarButton(Messages.get("organize"),
				ImageUtil.getImageIconFrom(Icons.get("organize", size, size)), Messages.get("organize"));
		btnSettings = new ButtonBarButton(Messages.get("settings"),
				ImageUtil.getImageIconFrom(Icons.get("settings", size, size)), Messages.get("settings"));
		btnRunGame = new ButtonBarButton(Messages.get("runGame"),
				ImageUtil.getImageIconFrom(Icons.get("runGame", size, size)), Messages.get("runGame"));
		btnMoreOptionsRunGame = new ButtonBarButton("", ImageUtil.getImageIconFrom(Icons.get("arrowDown", 1)),
				Messages.get("moreOptions"));
		btnRemoveGame = new ButtonBarButton(Messages.get("remove"), ImageUtil.getImageIconFrom(Icons.get("remove", size, size)),
				Messages.get("remove"));
		btnRenameGame = new ButtonBarButton(Messages.get("rename"), ImageUtil.getImageIconFrom(Icons.get("rename", size, size)),
				Messages.get("rename"));
		btnGameProperties = new ButtonBarButton(Messages.get("gameProperties"),
				ImageUtil.getImageIconFrom(Icons.get("gameProperties", size, size)), Messages.get("gameProperties"));
		btnChangeView = new ButtonBarButton("", iconChangeView, null);
		btnMoreOptionsChangeView = new ButtonBarButton("", ImageUtil.getImageIconFrom(Icons.get("arrowDown", 1)),
				Messages.get("moreOptions"));
		btnPreviewPane = new ButtonBarButton("", iconPreviewPaneHide, null);
		btnPreviewPane.setActionCommand(GameViewConstants.HIDE_PREVIEW_PANE);
		btnSetFilter = new ButtonBarButton("", iconSearchGame, Messages.get("loadDisc"));
		buttonBarComponents = new JComponent[] { btnOrganize, btnSettings, btnRunGame, btnMoreOptionsRunGame,
				btnRemoveGame, btnRenameGame,
				btnGameProperties, btnChangeView, btnMoreOptionsChangeView, btnPreviewPane, btnSetFilter };
		btnRunGame.setComponentPopupMenu(mnuGameSettings);
	}

	private void initializeDetailsPanel() {
		pnlDetails = new DetailsPanel();
		pnlDetails.addUnpinDetailsPaneListener(new ActionListener() {
			private int lastWidth;
			private int lastHeight;

			@Override
			public void actionPerformed(ActionEvent e) {
				String actionCommand = pnlDetails.btnPinUnpinDetailsPane.getActionCommand();
				if (actionCommand.equals(GameViewConstants.UNPIN_DETAILS_PANE)) {
					// Component btn = pnlNavigation.getButtons()[2];
					// int value = (int) (btn.getLocation().getY() +
					// btn.getHeight() + 2);
					// if (splDetailsPane.getDividerLocation() != value) {
					// splDetailsPane.setDividerLocation(value);
					// }
					// else {
					Point bla = pnlDetails.getLocationOnScreen();
					int width = pnlDetails.getWidth();
					int height = pnlDetails.getHeight();
					if (frameDetailsPane == null) {
						frameDetailsPane = new JFrame();
						frameDetailsPane.setDefaultCloseOperation(WindowConstants.DISPOSE_ON_CLOSE);
						frameDetailsPane.setIconImages(getIcons());
						frameDetailsPane.addWindowListener(new WindowAdapter() {

							@Override
							public void windowActivated(WindowEvent e) {
								if (splDetailsPane.getBottomComponent() == pnlDetails) {
									splDetailsPane.remove(pnlDetails);
									splDetailsPane.revalidate();
									splDetailsPane.repaint();
								}
							}

							@Override
							public void windowClosed(WindowEvent e) {
								lastWidth = frameDetailsPane.getWidth();
								lastHeight = frameDetailsPane.getHeight();
							};
						});
						pnlDetails.setPreferredSize(new Dimension(width, height));
					}
					frameDetailsPane.add(pnlDetails);
					pnlDetails.btnHideDetailsPane.setVisible(false);
					pnlDetails.btnPinUnpinDetailsPane
					.setIcon(ImageUtil.getImageIconFrom(Icons.get("pinDetailsPane", 24, 24)));
					pnlDetails.btnPinUnpinDetailsPane.setActionCommand(GameViewConstants.PIN_DETAILS_PANE);
					pnlDetails.btnResize.setVisible(true);
					frameDetailsPane.pack();
					if (lastWidth > 0 && lastHeight > 0) {
						frameDetailsPane.setSize(lastWidth, lastHeight);
					}
					Component parent = MainPanel.this.getParent();
					// frame.setSize((int) (frame.getWidth() * 1.5),
					// pnlInformationBarPanel.getHeight());
					frameDetailsPane.setLocation(parent.getLocationOnScreen().x - frameDetailsPane.getInsets().left + 1,
							bla.y - frameDetailsPane.getInsets().top);
					frameDetailsPane.setVisible(true);
				} else if (actionCommand.equals(GameViewConstants.PIN_DETAILS_PANE)) {
					if (frameDetailsPane != null) {
						frameDetailsPane.setVisible(false);
						frameDetailsPane.dispose();
					}
					splDetailsPane.add(pnlDetails);
					splDetailsPane.revalidate();
					splDetailsPane.repaint();
					pnlDetails.btnHideDetailsPane.setVisible(true);
					pnlDetails.btnPinUnpinDetailsPane
					.setIcon(ImageUtil.getImageIconFrom(Icons.get("unpinDetailsPane", 24, 24)));
					pnlDetails.btnPinUnpinDetailsPane.setActionCommand(GameViewConstants.UNPIN_DETAILS_PANE);
					pnlDetails.btnResize.setVisible(false);
				}
			}
		});
	}

	private List<Image> getIcons() {
		List<Image> icons = new ArrayList<>();
		String[] dimensions = { "256x256", "192x192", "128x128", "96x96", "72x72", "64x64", "48x48", "32x32", "24x24",
		"16x16" };
		for (String d : dimensions) {
			try {
				icons.add(new ImageIcon(getClass().getResource("/images/" + d + "/logo.png")).getImage());
			} catch (Exception e) {
				// ignore
			}
		}
		return icons;
	}

	private void initializeCurrentViewAndPreviewPane() {
		if (pnlPreviewPane == null) {
			pnlPreviewPane = new PreviewPanePanel(explorer);
		}
		pnlPreviewPane.setMinimumSize(new Dimension(0, 0));
		splCurrentViewAndPreviewPane = new JSplitPane(JSplitPane.HORIZONTAL_SPLIT, true, currentViewPanel,
				pnlPreviewPane) {
			private static final long serialVersionUID = 1L;
			// int lastDivLocation;

			// @Override
			// public int getDividerLocation() {
			// int divLocation = pnlPreviewPane.getWidth();
			// int limit = (int) pnlPreviewPane.getPreferredSize().getWidth() +
			// getDividerSize() + (pnlPreviewPane.isScrollBarVisible() ?
			// pnlPreviewPane.getScrollBarSize() : 0);
			// System.out.println(pnlPreviewPane.getWidth() + " " +
			// pnlPreviewPane.getPreferredSize().getWidth());
			// if (divLocation > 0 && limit > 0 && divLocation <= limit) {
			// if (super.getLastDividerLocation() > 0 &&
			// super.getDividerLocation() > super.getLastDividerLocation()) {
			// setDividerLocation(getMaximumDividerLocation()-limit);
			// }
			// // lastDivLocation = super.getDividerLocation();
			// }
			// return super.getDividerLocation();
			// }
		};
		PropertyChangeListener listener = new PropertyChangeListener() {
			@Override
			public void propertyChange(PropertyChangeEvent e) {
				int divLocation = pnlPreviewPane.getWidth();
				int dividerSize = splCurrentViewAndPreviewPane.getDividerSize();
				int scrollBarSize = pnlPreviewPane.getScrollBarSize();
				int limit = (int) pnlPreviewPane.getPreferredSize().getWidth() + dividerSize
						+ (pnlPreviewPane.isScrollBarVisible() ? scrollBarSize : 0);
				if (divLocation > 0 && limit > 0 && divLocation <= limit) {
					if (splCurrentViewAndPreviewPane.getLastDividerLocation() > 0 && splCurrentViewAndPreviewPane
							.getDividerLocation() > splCurrentViewAndPreviewPane.getLastDividerLocation()) {
						splCurrentViewAndPreviewPane
						.setDividerLocation(splCurrentViewAndPreviewPane.getMaximumDividerLocation() - limit);
					}
					// lastDivLocation = super.getDividerLocation();
				}
			}
		};
		splCurrentViewAndPreviewPane.addPropertyChangeListener(JSplitPane.DIVIDER_LOCATION_PROPERTY, listener);
		splCurrentViewAndPreviewPane.setBorder(BorderFactory.createEmptyBorder());
		splCurrentViewAndPreviewPane.setResizeWeight(1);
	}

	private void initializeNavigationAndCurrentViewAndPreviewPane() {
		pnlNavigation = new NavigationPanel();
		splNavigationAndCurrentViewAndPreviewPane = new JSplitPane(JSplitPane.HORIZONTAL_SPLIT, true, pnlNavigation,
				splCurrentViewAndPreviewPane);
		splNavigationAndCurrentViewAndPreviewPane.setBorder(BorderFactory.createEmptyBorder());
		splNavigationAndCurrentViewAndPreviewPane.setResizeWeight(0);

		PropertyChangeListener listener = new PropertyChangeListener() {
			private Object currentNavMode = "oneLine";

			@Override
			public void propertyChange(PropertyChangeEvent e) {
				if (pnlNavigation != null) {
					e.getOldValue();
					int newValue = (int) e.getNewValue();

					AbstractButton button = pnlNavigation.getButtons()[1];
					String text = pnlNavigation.getLongestLabel();

					AffineTransform affinetransform = new AffineTransform();
					FontRenderContext frc = new FontRenderContext(affinetransform, true, false);
					Font font = button.getFont().deriveFont(Font.BOLD);
					int textWidth = (int) (font.getStringBounds(text, frc).getWidth());
					int iconWidth = button.getIcon().getIconWidth();
					int scrollBarWidth = pnlNavigation.getSpNavigationButtons().getVerticalScrollBar().getWidth();
					int dividerSize = splNavigationAndCurrentViewAndPreviewPane.getDividerSize();
					int border = button.getInsets().left + button.getInsets().right + scrollBarWidth + dividerSize;
					int widthWithTextOnOneLine = textWidth + iconWidth + border + button.getIconTextGap();
					int widthWithTextBottom = ((textWidth >= iconWidth) ? textWidth : iconWidth) + border;
					if (newValue < iconWidth + border) {
						splNavigationAndCurrentViewAndPreviewPane.setDividerLocation(iconWidth + border);
						if (currentNavMode != null && !currentNavMode.equals("min")) {
							currentNavMode = "min";
							pnlNavigation.minimizeContentWidth();
						}
					} else if (newValue > widthWithTextOnOneLine) {
						splNavigationAndCurrentViewAndPreviewPane.setDividerLocation(widthWithTextOnOneLine);
						if (currentNavMode != null && !currentNavMode.equals("oneLine")) {
							currentNavMode = "oneLine";
							pnlNavigation.maximizeContentWidth();
						}
					} else {
						if (newValue <= iconWidth + border) {
							splNavigationAndCurrentViewAndPreviewPane.setDividerLocation(iconWidth + border);
							if (currentNavMode != null && !currentNavMode.equals("min")) {
								currentNavMode = "min";
								pnlNavigation.minimizeContentWidth();
							}
							return;
						}
						if (newValue <= widthWithTextBottom) {
							splNavigationAndCurrentViewAndPreviewPane.setDividerLocation(widthWithTextBottom);
							if (currentNavMode != null && !currentNavMode.equals("centered")) {
								currentNavMode = "centered";
								pnlNavigation.centerContentWidth();
							}
							return;
						}
						if (newValue <= widthWithTextOnOneLine) {
							splNavigationAndCurrentViewAndPreviewPane.setDividerLocation(widthWithTextOnOneLine);
							if (currentNavMode != null && !currentNavMode.equals("oneLine")) {
								currentNavMode = "oneLine";
								pnlNavigation.maximizeContentWidth();
							}
							return;
						}
					}
				}
			}
		};
		splNavigationAndCurrentViewAndPreviewPane.addPropertyChangeListener(JSplitPane.DIVIDER_LOCATION_PROPERTY,
				listener);
	}

	void setCurrentViewPanel(int defaultViewPanel) {
		switch (defaultViewPanel) {
		case ViewPanel.LIST_VIEW:
			currentViewPanel = pnlListView;
			break;
		case ViewPanel.TABLE_VIEW:
			currentViewPanel = pnlTableView;
			break;
		case ViewPanel.COVER_VIEW:
			currentViewPanel = pnlCoverView;
			break;
		default:
			currentViewPanel = pnlListView;
		}
		changeViewPanelTo(currentViewPanel);
		currentViewPanel.requestFocusInWindow();
	}

	private void setToolTipTexts() {
		btnOrganize.setToolTipText(Messages.get("organize"));
		btnSettings.setToolTipText(Messages.get("settings"));
		btnRunGame.setToolTipText(Messages.get("runGame"));
		btnRemoveGame.setToolTipText(Messages.get("remove"));
		btnRenameGame.setToolTipText(Messages.get("rename"));
		btnGameProperties.setToolTipText(Messages.get("gameProperties"));
		btnMoreOptionsRunGame.setToolTipText(Messages.get("moreOptions"));
		btnMoreOptionsChangeView.setToolTipText(Messages.get("moreOptions"));
		btnSetFilter.setToolTipText(Messages.get("searchGame"));
	}

	public void addListeners() {
		pnlButtonBar.addListeners();
		addMouseListeners(btnOrganize, btnSettings, btnRunGame, btnMoreOptionsRunGame,
				btnRemoveGame, btnRenameGame, btnGameProperties, btnSetFilter,
				btnPreviewPane, btnChangeView, btnMoreOptionsChangeView);
		addActionListeners(btnOrganize, btnChangeView, btnMoreOptionsChangeView, btnSetFilter);

		gameListeners.add(pnlRatingBar);
		pnlListView.addSelectGameListener(this);
		pnlTableView.addSelectGameListener(this);
		pnlCoverView.addSelectGameListener(this);
		addSelectGameListener(pnlPreviewPane);
		// addComponentListener(new ComponentAdapter() {
		// private int lastWidth;
		//
		// @Override
		// public void componentResized(ComponentEvent e) {
		// super.componentResized(e);
		// if (lastLocation == 0 && splDetailsPane.getDividerLocation() > 0) {
		// lastLocation = getHeight() - splDetailsPane.getDividerLocation();
		// }
		// int bla2 = getHeight() - lastLocation;
		// splDetailsPane.setDividerLocation(bla2);
		//
		// if (lastWidth == 0) {
		// lastWidth = getWidth();
		// }
		// splCurrentViewAndPreviewPane.setDividerLocation(splCurrentViewAndPreviewPane.getDividerLocation()
		// - (getWidth() - lastWidth));
		// lastWidth = getWidth();
		// if (splDetailsPane.getDividerLocation() < 132) {
		// splDetailsPane.setDividerLocation(132);
		// }
		// }
		// });

	}

	private void addMouseListeners(Component... o) {
		for (Component obj : o) {
			obj.addMouseListener(this);

		}
	}

	private void addActionListeners(AbstractButton... o) {
		for (AbstractButton obj : o) {
			obj.addActionListener(this);
		}
	}

	private void createUI() {
		createButtonBar();
		FormLayout layout = new FormLayout("min:grow", "fill:min, $lgap, fill:min, $lgap, fill:min:grow");
		setLayout(layout);
		CellConstraints cc = new CellConstraints();
		add(pnlButtonBar, cc.xy(1, 1));
		add(pnlGameFilter, cc.xy(1, 3));

		pnlGameFilter.setBorder(BorderFactory.createTitledBorder(""));

		splDetailsPane = new JSplitPane(JSplitPane.VERTICAL_SPLIT, splNavigationAndCurrentViewAndPreviewPane,
				pnlDetails);
		lastDetailsDividerSize = splDetailsPane.getDividerSize();
		lastPreviewDividerSize = splCurrentViewAndPreviewPane.getDividerSize();

		splDetailsPane.setContinuousLayout(true);
		splDetailsPane.setResizeWeight(1);

		add(splDetailsPane, cc.xy(1, 5));
	}

	private void createButtonBar() {
		FormLayout layout = new FormLayout(
				"pref, min, pref, min, pref, pref, min, pref, min, pref,"
						+ "min, pref, min:grow, pref, pref, min, pref, min, pref",
				"2dlu, fill:default");
		pnlButtonBar.setLayout(layout);
		pnlButtonBar.setBorder(Paddings.DLU2);

		int x[] = { 1, 3, 5, 6, 8, 10, 12, 14, 15, 17, 19 };
		int y = 2;
		for (int i = 0; i < buttonBarComponents.length; i++) {
			pnlButtonBar.add(buttonBarComponents[i], CC.xy(x[i], y));
		}
	}

	public void adjustSplitPaneDividerSizes() {
		int dividerSize = splDetailsPane.getDividerSize();
		int value = ScreenSizeUtil.adjustValueToResolution(dividerSize);
		splDetailsPane.setDividerSize(value);
		splCurrentViewAndPreviewPane.setDividerSize(value);
		splNavigationAndCurrentViewAndPreviewPane.setDividerSize(value);
		lastDetailsDividerSize = splDetailsPane.getDividerSize();
		lastPreviewDividerSize = splCurrentViewAndPreviewPane.getDividerSize();
	}

	public void showOrganizePopupMenu(ActionEvent e) {
		if (mnuOrganizeOptions == null) {
			mnuOrganizeOptions = new OrganizePopupMenu();
		}
		Component source = (Component) e.getSource();
		mnuOrganizeOptions.show(source, 0, source.getHeight());
	}

	void showPreviewPane(boolean b) {
		if (b) {
			splCurrentViewAndPreviewPane.setDividerLocation(getWidth() - lastPreviewDividerLocation);
			splCurrentViewAndPreviewPane.setDividerSize(lastPreviewDividerSize);
			btnPreviewPane.setIcon(iconPreviewPaneHide);
			btnPreviewPane.setToolTipText("Vorschaufenster ausblenden (Alt+Shift+P)");
			btnPreviewPane.setActionCommand(GameViewConstants.HIDE_PREVIEW_PANE);
		} else {
			lastPreviewDividerLocation = getWidth() - splCurrentViewAndPreviewPane.getDividerLocation();
			lastPreviewDividerSize = splCurrentViewAndPreviewPane.getDividerSize();
			pnlPreviewPane.setSize(0, 0);
			splCurrentViewAndPreviewPane.setDividerLocation(getWidth());
			splCurrentViewAndPreviewPane.setDividerSize(0);
			btnPreviewPane.setIcon(iconPreviewPaneShow);
			btnPreviewPane.setToolTipText("Vorschaufenster einblenden (Alt+Shift+P)");
			btnPreviewPane.setActionCommand(GameViewConstants.SHOW_PREVIEW_PANE);
		}
		//		if (isPreviewPaneVisible()) {
		//			previewPaneDividerLocation = getSplPreviewPane().getDividerLocation();
		//		}
		//
		//		if (previewPaneDividerLocation != -1) {
		//			pnlPreviewPane.setVisible(b);
		//			splCurrentViewAndPreviewPane.setDividerLocation(previewPaneDividerLocation);
		//		}
	}

	public void showDetailsPane(boolean b) {
		pnlDetails.btnHideDetailsPane.setVisible(b);
		pnlDetails.tpDetailsPane.setVisible(b);
		pnlDetails.pnlHideDetailsPanePanel.setVisible(b);
		pnlDetails.pnlTpInformationBar.setVisible(b);
		if (b) {
			splDetailsPane.setDividerLocation(getHeight() - lastDetailsDividerLocation);
			splDetailsPane.setDividerSize(lastDetailsDividerSize);
		} else {
			lastDetailsDividerLocation = getHeight() - splDetailsPane.getDividerLocation();
			lastDetailsDividerSize = splDetailsPane.getDividerSize();
			pnlDetails.setSize(0, 0);
			splDetailsPane.setDividerLocation(getHeight());
			splDetailsPane.setDividerSize(0);
		}
	}

	public void showGameSettingsPopupMenu(List<BroEmulator> emulators, int defaultEmulatorIndex) {
		mnuGameSettings.initEmulators(emulators, defaultEmulatorIndex);
		mnuGameSettings.show(btnRunGame, 0, btnRunGame.getHeight());
	}

	private void showViewSettingsPopupMenu() {
		mnuViewSettings.show(btnChangeView, 0, btnChangeView.getHeight());
	}

	public void navigationChanged(NavigationEvent e) {
		pnlNavigation.navigationChanged(e);
		pnlListView.navigationChanged(e);
	}

	@Override
	public void gameSelected(GameSelectionEvent e) {
		boolean b = e.getGame() != null;
		btnRunGame.setVisible(b);
		btnMoreOptionsRunGame.setVisible(b);
		btnGameProperties.setVisible(b);
		btnRemoveGame.setVisible(b);
		btnRenameGame.setVisible(b);
		pnlPreviewPane.gameSelected(e);
		Game game = e.getGame();
		if (game != null) {
			String gameCoverPath = game.getCoverPath();
			ImageIcon img;
			if (gameCoverPath != null && !gameCoverPath.trim().isEmpty()) {
				if (!gameCovers.containsKey(gameCoverPath)) {
					gameCovers.put(gameCoverPath, ImageUtil.getImageIconFrom(gameCoverPath, true));
				}
				img = gameCovers.get(gameCoverPath);
			} else {
				int platformId = e.getGame().getPlatformId();
				img = currentViewPanel.getPlatformCover(platformId);
			}
			if (img != null) {
				pnlPreviewPane.gameCoverChanged(game, img.getImage());
				doDirtyGameCoverRepaintFix();
			}
		}
	}

	public void emulatorAdded(EmulatorEvent e) {
	}

	public void emulatorRemoved(EmulatorEvent e) {
	}

	@Override
	public void gameAdded(GameAddedEvent e) {
		currentViewPanel.addGameIconPath(e.getGame().getId(), e.getGame().getIconPath());
		pnlListView.gameAdded(e);
		pnlTableView.gameAdded(e);
		pnlCoverView.gameAdded(e);
		pnlGameFilter.gameAdded(e);
	}

	@Override
	public void gameRemoved(GameRemovedEvent e) {
		pnlListView.gameRemoved(e);
		pnlTableView.gameRemoved(e);
		pnlCoverView.gameRemoved(e);
	}

	@Override
	public void actionPerformed(ActionEvent e) {
		Object source = e.getSource();
		if (source == btnMoreOptionsChangeView) {
			showViewSettingsPopupMenu();
		} else if (source == btnSetFilter) {
			showHideFilterPanel();
		}
	}

	public void showHideFilterPanel() {
		pnlGameFilter.setVisible(!pnlGameFilter.isVisible());
	}

	public void changeViewPanelTo(ViewPanel pnl) {
		// remove(currentViewPanel);
		currentViewPanel = pnl;
		splCurrentViewAndPreviewPane.setLeftComponent(pnl);
		// pnlTableView.adjustColumns();
	}

	public void addChangeToAllGamesListener(ActionListener l) {
		pnlNavigation.addChangeToAllGamesListener(l);
	}

	public void addChangeToRecentlyListener(ActionListener l) {
		pnlNavigation.addChangeToRecentlyPlayedListener(l);
	}

	public void addChangeToFavoritesListener(ActionListener l) {
		pnlNavigation.addChangeToFavoritesListener(l);
	}

	public boolean isPreviewPaneVisible() {
		return pnlPreviewPane.isVisible();
	}

	@Override
	public void mouseEntered(MouseEvent e) {
		AbstractButton source = (AbstractButton) e.getSource();
		if (isButtonBarComponent(source)) {
			if (!source.isSelected()) {
				source.setBorderPainted(true);
				source.setContentAreaFilled(true);
				if (source == btnRunGame) {
					btnMoreOptionsRunGame.setBorderPainted(true);
					btnMoreOptionsRunGame.setContentAreaFilled(true);
				}
			}
			if (source == btnMoreOptionsRunGame) {
				btnRunGame.setBorderPainted(true);
				btnRunGame.setContentAreaFilled(true);
			}
			if (source == btnChangeView) {
				btnMoreOptionsChangeView.setBorderPainted(true);
				btnMoreOptionsChangeView.setContentAreaFilled(true);
			}
			if (source == btnMoreOptionsChangeView) {
				btnChangeView.setBorderPainted(true);
				btnChangeView.setContentAreaFilled(true);
			}
		}
	}

	private boolean isButtonBarComponent(JComponent source) {
		for (JComponent c : buttonBarComponents) {
			if (source == c) {
				return true;
			}
		}
		return false;
	}

	@Override
	public void mouseExited(MouseEvent e) {
		AbstractButton source = (AbstractButton) e.getSource();
		if (isButtonBarComponent(source)) {
			if (!source.isSelected()) {
				source.setBorderPainted(false);
				source.setContentAreaFilled(false);
				if (source == btnRunGame) {
					btnMoreOptionsRunGame.setBorderPainted(false);
					btnMoreOptionsRunGame.setContentAreaFilled(false);
				}
				if (source == btnMoreOptionsRunGame) {
					btnRunGame.setBorderPainted(false);
					btnRunGame.setContentAreaFilled(false);
				}
				if (source == btnChangeView) {
					btnMoreOptionsChangeView.setBorderPainted(false);
					btnMoreOptionsChangeView.setContentAreaFilled(false);
				}
				if (source == btnMoreOptionsChangeView) {
					btnChangeView.setBorderPainted(false);
					btnChangeView.setContentAreaFilled(false);
				}
			}
		}
	}

	@Override
	public void mouseClicked(MouseEvent e) {
	}

	@Override
	public void mousePressed(MouseEvent e) {
	}

	@Override
	public void mouseReleased(MouseEvent e) {
	}

	public int getCurrentViewPanelType() {
		if (currentViewPanel == pnlBlankView) {
			return ViewPanel.BLANK_VIEW;
		}
		if (currentViewPanel == pnlListView) {
			return ViewPanel.LIST_VIEW;
		}
		if (currentViewPanel == pnlTableView) {
			return ViewPanel.TABLE_VIEW;
		}
		if (currentViewPanel == pnlCoverView) {
			return ViewPanel.COVER_VIEW;
		}
		return ViewPanel.BLANK_VIEW;
	}

	public ViewPanel getCurrentViewPanel() {
		return currentViewPanel;
	}

	protected void showHidePanels() {
		showHidePreviewPane();
		showHideNavigationPane();
		// showHideInformationBar();
		// showHideButtonParPanel();
		// showHideGameFilterPanel();
	}

	private void showHideNavigationPane() {
		// @Override
		// public void componentResized(ComponentEvent e) {
		// super.componentResized(e);
		// int width = (int) getSize().getWidth();
		// System.out.println(width +" "+ getButtonBarContentWidth());
		// boolean disableButton = width < getButtonBarContentWidth();
		// if (disableButton) {
		// if (minimizeButton >= 0) {
		// if (minimizeButton == 3) {
		// minimizeButton--;
		// }
		// int counter = 4;
		// ButtonBarButton btn = null;
		// for (int i = counter; i >= 0; i--) {
		// if (counter == minimizeButton) {
		// btn = components.get(i);
		// break;
		// }
		// counter--;
		// }
		// if (btn.isVisible()) {
		// if (!btn.getText().isEmpty()) {
		// btn.setText("");
		// } else {
		// btn.setVisible(false);
		// }
		// }
		// minimizeButton--;
		// }
		// } else {
		// // ButtonBarButton btn = components.get(4);
		// // if (btn.getText().isEmpty()) {
		// // btn.setText("Game settings");
		// // if ((int) getSize().getWidth() < getButtonBarContentWidth()) {
		// // btn.setText("");
		// // return;
		// // }
		// // }
		// }
		// }

		if (pnlNavigation.getWidth() > 0) {
			if (lastNavigationPaneSize.width == 0) {
				pnlNavigation.setSize(pnlNavigation.getWidth(), 0);
			}
			lastNavigationPaneSize.setSize(pnlNavigation.getWidth(), pnlNavigation.getHeight());
		}

		boolean show = (getWidth() - pnlNavigation.getWidth() - pnlPreviewPane.getWidth()) > pnlNavigation.getWidth();
		if (!show && pnlPreviewPane.isVisible()) {
			return;
		}

		pnlNavigation.setVisible(show);
		if (show) {
			splNavigationAndCurrentViewAndPreviewPane.setDividerLocation(lastNavigationPaneSize.width);
		}
		revalidate();
		repaint();
	}

	private void showHidePreviewPane() {
		if (pnlPreviewPane.getWidth() > 0) {
			if (lastPreviewPaneSize.width == 0) {
				pnlPreviewPane.setSize(pnlPreviewPane.getWidth(), 0);
			}
			lastPreviewPaneSize.setSize(pnlPreviewPane.getWidth(), pnlPreviewPane.getHeight());
		}
		boolean hidePreviewPane = shouldHidePreviewPane();
		if (hidePreviewPane) {
			pnlPreviewPane.setPreviewPaneSize(0, pnlPreviewPane.getHeight());
		} else {
			if (pnlNavigation.isVisible()) {
				if (!pnlPreviewPane.isVisible()) {
					pnlPreviewPane.setVisible(true);
					splCurrentViewAndPreviewPane.setDividerLocation(
							splCurrentViewAndPreviewPane.getWidth() - lastPreviewPaneSize.width);
				}
			}
		}
		validate();
		repaint();
	}

	private boolean shouldHidePreviewPane() {
		if (isPreviewPaneVisible()) {
			return lastPreviewPaneSize.width * 1.125 > currentViewPanel.getWidth();
		} else {
			return lastPreviewPaneSize.width * 1.125 > (currentViewPanel.getWidth()) - lastPreviewPaneSize.width;
		}
	}

	public boolean isGameOptionsPanelVisible() {
		return pnlDetails.isNotificationsPanelVisible();
	}

	public void setInformationBarPanelVisible(boolean visible) {
		pnlDetails.setInformationBarPanelVisible(visible);
	}

	public JPanel getNavigationPanel() {
		return pnlNavigation;
	}

	public JPanel getPreviewPanel() {
		return pnlPreviewPane;
	}

	public JSplitPane getSplNavigationPane() {
		return splNavigationAndCurrentViewAndPreviewPane;
	}

	public JSplitPane getSplPreviewPane() {
		return splCurrentViewAndPreviewPane;
	}

	public JSplitPane getSplGameDetailsPane() {
		return splDetailsPane;
	}

	public void addSelectGameListener(GameListener l) {
		pnlListView.addSelectGameListener(l);
		pnlTableView.addSelectGameListener(l);
		pnlCoverView.addSelectGameListener(l);
	}

	public void addRunGameListener(ActionListener l) {
		btnRunGame.addActionListener(l);
		pnlListView.addRunGameListener(l);
		pnlPreviewPane.addRunGameListener(l);
	}

	public void addRunGameListener(Action l) {
		pnlListView.addRunGameListener(l);
		pnlTableView.addRunGameListener(l);
		// pnlCoverView.addRunGameListener(l);
	}

	public void addRunGameListener(MouseListener l) {
		pnlListView.addRunGameListener(l);
		pnlTableView.addRunGameListener(l);
		pnlCoverView.addRunGameListener(l);
	}

	public void addCoverFromComputerListener(ActionListener l) {
		pnlListView.addCoverFromComputerListener(l);
		pnlPreviewPane.addCoverFromComputerListener(l);
	}

	public void addCoverFromWebListener(ActionListener l) {
		pnlListView.addCoverFromWebListener(l);
		pnlPreviewPane.addCoverFromWebListener(l);
	}

	public void addTrailerFromWebListener(ActionListener l) {
		pnlListView.addTrailerFromWebListener(l);
		pnlPreviewPane.addTrailerFromWebListener(l);
	}

	public void addRenameGameListener(Action al) {
		btnRenameGame.addActionListener(al);
		pnlListView.addRenameGameListener(al);
		pnlPreviewPane.addRenameGameListener(al);
	}

	public void addAddGameListener(Action l) {
		// TODO implement
	}

	public void addRemoveGameListener(Action l) {
		btnRemoveGame.addActionListener(l);
		pnlListView.addRemoveGameListener(l);
		pnlPreviewPane.addRemoveGameListener(l);
	}

	public void addAddPlatformListener(Action l) {
		// TODO implement
	}

	public void addRemovePlatformListener(Action l) {
		// TODO implement
	}

	public void addAddEmulatorListener(Action l) {
		// TODO implement
	}

	public void addRemoveEmulatorListener(Action l) {
		// TODO implement
	}

	public void addOpenGameSettingsListener(ActionListener l) {
		btnGameProperties.addActionListener(l);
	}

	public void addOpenGamePropertiesListener(ActionListener l) {
		btnGameProperties.addActionListener(l);
		pnlListView.addOpenGamePropertiesListener(l);
		pnlPreviewPane.addOpenGamePropertiesListener(l);
	}

	public void addOpenGamePropertiesListener(Action l) {
		pnlListView.addOpenGamePropertiesListener(l);
	}

	public void addIncreaseFontListener(Action l) {
		pnlListView.addIncreaseFontListener(l);
		//		pnlTableView.addIncreaseFontListener(l);
		pnlCoverView.addIncreaseFontListener(l);
	}

	public void addIncreaseFontListener2(MouseWheelListener l) {
		pnlListView.addIncreaseFontListener2(l);
		//		pnlTableView.addIncreaseFontListener2(l);
		pnlCoverView.addIncreaseFontListener2(l);
	}

	public void addDecreaseFontListener(Action l) {
		pnlListView.addDecreaseFontListener(l);
		//		pnlTableView.addDecreaseFontListener(l);
		pnlCoverView.addDecreaseFontListener(l);
	}

	public void addOpenGameFolderListener(ActionListener l) {
		pnlListView.addOpenGameFolderListener(l);
		pnlPreviewPane.addOpenGameFolderListener(l);
	}

	public void addOpenGameFolderListener(MouseListener l) {
		pnlPreviewPane.addOpenGameFolderListener(l);
	}

	public void addLoadDiscListener(ActionListener l) {
	}

	public void addShowMenuBarListener(ActionListener l) {
		mnuOrganizeOptions.addShowMenuBarListener(l);
	}

	public void addShowPreviewPaneListener(ActionListener l) {
		btnPreviewPane.addActionListener(l);
		mnuOrganizeOptions.addShowPreviewListener(l);
	}

	public void addShowGameDetailsListener(ActionListener l) {
		pnlDetails.addShowGameDetailsListener(l);
		mnuOrganizeOptions.addShowGameDetailsListener(l);
	}

	public void addOpenPropertiesListener(ActionListener l) {
		btnSettings.addActionListener(l);
		mnuOrganizeOptions.addOpenPropertiesListener(l);
	}

	public void addExitListener(ActionListener l) {
		mnuOrganizeOptions.addExitListener(l);
	}

	public void addBroComponentListener(ComponentListener l) {
		addComponentListener(l);
	}

	public void addShowOrganizeContextMenuListener(ActionListener l) {
		btnOrganize.addActionListener(l);
	}

	public void addShowContextMenuListener(ActionListener l) {
		btnMoreOptionsRunGame.addActionListener(l);
	}

	public void showInformation(NotificationElement element) {
		pnlDetails.addNotificationElement(element);
	}

	public void adjustSplitPaneDividerLocations(int width2, int height2) {
		// -- Nav
		// splNavigationAndCurrentViewAndPreviewPane.setDividerLocation(
		// ScreenSizeUtil.adjustValueToResolution(128));

		// pnlPreviewPane.setPreferredSize(new
		// Dimension(getWidth()-ScreenSizeUtil.adjustValueToResolution(96),
		// pnlPreviewPane.getHeight()));
		// final int previewPaneWidth =
		// ScreenSizeUtil.adjustValueToResolution(280);
		// int gameDetailsPaneHeight =
		// ScreenSizeUtil.adjustValueToResolution(220);

		// -- details
		// splDetailsPane.setDividerLocation(height - gameDetailsPaneHeight);

		// -- preview
		// splCurrentViewAndPreviewPane.setDividerLocation(width2 -
		// previewPaneWidth);
	}

	public void addFilterListener(FilterListener l) {
		pnlGameFilter.addFilterListener(l);
	}

	public void addPlatformFilterListener(FilterListener l) {
		pnlGameFilter.addFilterListener(l);
	}

	public ListModel<Game> getGameListModel() {
		return pnlListView.getListModel();
	}

	public void setGameListModel(ListModel<Game> mdlLstGames) {
		pnlListView.setListModel(mdlLstGames);
	}

	public TableModel getGameTableModel() {
		return pnlTableView.getTableModel();
	}

	public void setGameTableModel(TableModel model) {
		pnlTableView.setTableModel(model);
	}

	public void setGameCoversModel(GameCoversModel mdlCoversAllGames) {
		pnlCoverView.setGameCoversModel(mdlCoversAllGames);
	}

	@Override
	public void platformAdded(PlatformEvent e) {
		Platform p = e.getPlatform();
		currentViewPanel.addPlatformIcon(p.getId(), p.getIconFileName());
	}

	@Override
	public void platformRemoved(PlatformEvent e) {

	}

	public void initPlatforms(List<Platform> platforms) {
		initPlatformIcons(platforms);
		initPlatformCovers(platforms);
		pnlGameFilter.initPlatforms(platforms);
	}

	public void initPlatformIcons(List<Platform> platforms) {
		for (Platform p : platforms) {
			initEmulatorIcons(p.getEmulators());
			currentViewPanel.addPlatformIcon(p.getId(), p.getIconFileName());
			pnlTableView.platformIconAdded(p.getId(), currentViewPanel.getPlatformIcon(p.getId()));
		}
		pnlNavigation.initPlatforms(platforms);
		// pnlNavigation.initCmbPlatforms(currentViewPanel);
	}

	public void initPlatformCovers(List<Platform> platforms) {
		for (Platform p : platforms) {
			System.err.println(p);
			currentViewPanel.addPlatformCover(p.getId(), p.getDefaultGameCover());
		}
	}

	public int getColumnWidth() {
		switch (getCurrentViewPanelType()) {
		case ViewPanel.LIST_VIEW:
			return pnlListView.getColumnWidth();
		case ViewPanel.TABLE_VIEW:
			return pnlTableView.getColumnWidth();
		}
		return 128;
	}

	public void setColumnWidth(int value) {
		switch (getCurrentViewPanelType()) {
		case ViewPanel.LIST_VIEW:
			pnlListView.setColumnWidth(value);
			break;
		case ViewPanel.TABLE_VIEW:
			pnlTableView.setColumnWidth(value);
			break;
		}
	}

	public int getRowHeight() {
		switch (getCurrentViewPanelType()) {
		case ViewPanel.LIST_VIEW:
			return pnlListView.getRowHeight();
		case ViewPanel.TABLE_VIEW:
			return pnlTableView.getRowHeight();
		}
		return 24;
	}

	public void setRowHeight(int value) {
		switch (getCurrentViewPanelType()) {
		case ViewPanel.LIST_VIEW:
			pnlListView.setRowHeight(value);
			break;
		case ViewPanel.TABLE_VIEW:
			pnlTableView.setRowHeight(value);
			break;
		}
	}

	public void selectGame(int gameId) {
		pnlListView.selectGame(gameId);
	}

	public void addChangeToListViewListener(ActionListener l) {
		mnuViewSettings.addChangeToListViewListener(l);
	}

	public void addChangeToTableViewListener(ActionListener l) {
		mnuViewSettings.addChangeToTableViewListener(l);
	}

	public void addAutoSearchListener(ActionListener l) {
		pnlDetails.pnlBrowseComputer.addAutoSearchListener(l);
	}

	public void addQuickSearchListener(ActionListener l) {
		pnlDetails.pnlBrowseComputer.addQuickSearchListener(l);
	}

	public void addCustomSearchListener(ActionListener l) {
		pnlDetails.pnlBrowseComputer.addCustomSearchListener(l);
	}

	public void addLastSearchListener(ActionListener l) {
		pnlDetails.pnlBrowseComputer.addLastSearchListener(l);
	}

	public void addGameDragDropListener(DropTargetListener l) {
		currentViewPanel.addGameDragDropListener(l);
	}

	public void addCoverDragDropListener(DropTargetListener l) {
		pnlPreviewPane.addCoverDragDropListener(l);
	}

	public void addCoverToLibraryDragDropListener(DropTargetListener l) {
		pnlDetails.pnlBrowseCovers.addCoverDragDropListener(l);
	}

	public void addRateListener(RateListener l) {
		pnlPreviewPane.addRateListener(l);
	}

	public void addPictureFromComputer(ImageIcon icon) {
		pnlDetails.pnlBrowseCovers.addPictureFromComputer(icon);
	}

	public void removeAllPictures() {
		pnlDetails.pnlBrowseCovers.removeAllPictures();
	}

	public void gameCoverChanged(Game game, Image i) {
		String gameCoverPath = game.getCoverPath();
		gameCovers.put(gameCoverPath, ImageUtil.getImageIconFrom(gameCoverPath, true));
		pnlPreviewPane.gameCoverChanged(game, i);
		doDirtyGameCoverRepaintFix();
	}

	private void doDirtyGameCoverRepaintFix() {
		int oldLocation = splCurrentViewAndPreviewPane.getDividerLocation();
		splCurrentViewAndPreviewPane.setDividerLocation(oldLocation + 1);
		SwingUtilities.invokeLater(new Runnable() {

			@Override
			public void run() {
				splCurrentViewAndPreviewPane.setDividerLocation(splCurrentViewAndPreviewPane.getDividerLocation() - 1);
			}
		});
	}

	public void adjustColumns() {
		pnlTableView.adjustColumns();
	}

	public int getDetailsPaneNotificationTab() {
		return pnlDetails.tpDetailsPane.getSelectedIndex();
	}

	public void setDetailsPaneNotificationTab(int detailsPaneNotificationTab) {
		if (detailsPaneNotificationTab >= 0 && pnlDetails.tpDetailsPane.getTabCount() > detailsPaneNotificationTab) {
			pnlDetails.tpDetailsPane.setSelectedIndex(detailsPaneNotificationTab);
		}
	}

	public void searchProcessInitialized() {
		pnlDetails.pnlBrowseComputer.searchProcessInitialized();
	}

	public void searchProcessEnded() {
		pnlDetails.pnlBrowseComputer.searchProcessEnded();
	}

	public void directorySearched(String absolutePath) {
		pnlDetails.pnlBrowseComputer.directorySearched(absolutePath);
	}

	public Component getViewPanel() {
		return currentViewPanel;
	}

	public void filterSet(FilterEvent e, int gameCount) {
		pnlListView.filterSet(e);
		if (gameCount == 0) {
			btnSetFilter.setIcon(iconSearchGameRed);
		} else if (gameCount > 0) {
			btnSetFilter.setIcon(iconSearchGameGreen);
		} else {
			btnSetFilter.setIcon(iconSearchGame);
		}
	}

	@Override
	public void languageChanged() {
		pnlGameFilter.languageChanged();
		pnlNavigation.languageChanged();
		pnlPreviewPane.languageChanged();
		pnlDetails.languageChanged();
		currentViewPanel.languageChanged();
		mnuOrganizeOptions.languageChanged();
		if (!btnOrganize.getText().isEmpty()) {
			btnOrganize.setText(Messages.get("organize"));
		}
		if (!btnSettings.getText().isEmpty()) {
			btnSettings.setText(Messages.get("settings"));
		}
		if (!btnRunGame.getText().isEmpty()) {
			btnRunGame.setText(Messages.get("runGame"));
		}
		if (!btnRemoveGame.getText().isEmpty()) {
			btnRemoveGame.setText(Messages.get("remove"));
		}
		if (!btnRenameGame.getText().isEmpty()) {
			btnRenameGame.setText(Messages.get("rename"));
		}
		if (!btnGameProperties.getText().isEmpty()) {
			btnGameProperties.setText(Messages.get("gameProperties"));
		}
		setToolTipTexts();
	}

	public void updatePlayCountForCurrentGame() {
		pnlPreviewPane.updatePlayCount();
	}

	public void setViewStyle(int viewStyle) {
		pnlListView.setViewStyle(viewStyle);
	}

	public void initEmulatorIcons(List<BroEmulator> list) {
		String emuBroCoverHome = System.getProperty("user.home") + File.separator + ".emubro" + File.separator
				+ "emulators";
		for (Emulator e : list) {
			String coverPath = emuBroCoverHome + File.separator + e.getId() + ".png";
			currentViewPanel.addEmulatorIconPath(e.getId(), coverPath);
		}
	}

	public void initGameIcons(List<Game> games) {
		for (Game g : games) {
			if (g.hasIcon()) {
				currentViewPanel.addGameIconPath(g.getId(), g.getIconPath());
			}
		}
	}

	public boolean isDetailsPaneVisible() {
		return splDetailsPane.getDividerSize() > 0;
	}

	public void groupByNone() {
		currentViewPanel.groupByNone();
	}

	public void groupByPlatform() {
		currentViewPanel.groupByPlatform();
	}

	public List<File> getSelectedDirectoriesToBrowse() {
		return pnlDetails.getSelectedDirectoriesToBrowse();
	}

	public void rememberZipFile(String file) {
		pnlDetails.rememberZipFile(file);
	}

	public void rememberRarFile(String file) {
		pnlDetails.rememberRarFile(file);
	}

	public void rememberIsoFile(String file) {
		pnlDetails.rememberIsoFile(file);
	}

	public void setActiveTab(int i) {
		if (splDetailsPane.getDividerSize() == 0) {
			showDetailsPane(true);
		}
		pnlDetails.setActiveTab(i);
	}

	public void minimizeDetailsPane() {
		splDetailsPane.setDividerLocation(getHeight() - splDetailsPane.getBottomComponent().getPreferredSize().height);
	}

	public boolean isDetailsPaneUnpinned() {
		return frameDetailsPane != null && frameDetailsPane.isVisible();
	}

	public void increaseFontSize() {
		pnlListView.increaseFontSize();
		pnlTableView.increaseFontSize();
		pnlCoverView.increaseFontSize();
	}

	public void decreaseFontSize() {
		pnlListView.decreaseFontSize();
		pnlTableView.decreaseFontSize();
		pnlCoverView.decreaseFontSize();
	}

	public void hideExtensions(boolean selected) {
		pnlListView.hideExtensions(selected);
		pnlTableView.hideExtensions(selected);
	}

	public int getFontSize() {
		return pnlListView.getfontSize();
	}

	public void setFontSize(int value) {
		pnlListView.setFontSize(value);
		pnlTableView.setFontSize(value);
		pnlCoverView.setFontSize(value);
	}
}