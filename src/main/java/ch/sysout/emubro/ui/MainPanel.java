package ch.sysout.emubro.ui;

import java.awt.BorderLayout;
import java.awt.Component;
import java.awt.Dimension;
import java.awt.Font;
import java.awt.Graphics;
import java.awt.Graphics2D;
import java.awt.GridLayout;
import java.awt.Image;
import java.awt.Point;
import java.awt.dnd.DropTargetListener;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.awt.event.ComponentAdapter;
import java.awt.event.ComponentEvent;
import java.awt.event.ComponentListener;
import java.awt.event.MouseEvent;
import java.awt.event.MouseMotionAdapter;
import java.awt.event.WindowAdapter;
import java.awt.event.WindowEvent;
import java.awt.event.WindowListener;
import java.awt.font.FontRenderContext;
import java.awt.geom.AffineTransform;
import java.awt.image.BufferedImage;
import java.beans.PropertyChangeEvent;
import java.beans.PropertyChangeListener;
import java.io.File;
import java.util.ArrayList;
import java.util.List;

import javax.swing.AbstractButton;
import javax.swing.Action;
import javax.swing.BorderFactory;
import javax.swing.ImageIcon;
import javax.swing.JCheckBox;
import javax.swing.JFrame;
import javax.swing.JPanel;
import javax.swing.JScrollBar;
import javax.swing.JSplitPane;
import javax.swing.SwingUtilities;
import javax.swing.UIManager;
import javax.swing.WindowConstants;
import javax.swing.event.ChangeListener;
import javax.swing.plaf.SplitPaneUI;
import javax.swing.plaf.basic.BasicSplitPaneDivider;
import javax.swing.plaf.basic.BasicSplitPaneUI;

import com.jgoodies.forms.factories.Paddings;
import com.jgoodies.forms.layout.CellConstraints;
import com.jgoodies.forms.layout.FormLayout;

import ch.sysout.emubro.api.PlatformListener;
import ch.sysout.emubro.api.RunGameWithListener;
import ch.sysout.emubro.api.TagListener;
import ch.sysout.emubro.api.event.EmulatorEvent;
import ch.sysout.emubro.api.event.GameAddedEvent;
import ch.sysout.emubro.api.event.GameRemovedEvent;
import ch.sysout.emubro.api.event.GameSelectionEvent;
import ch.sysout.emubro.api.event.PlatformEvent;
import ch.sysout.emubro.api.event.TagEvent;
import ch.sysout.emubro.api.model.Explorer;
import ch.sysout.emubro.api.model.Game;
import ch.sysout.emubro.api.model.PlatformComparator;
import ch.sysout.emubro.api.model.Tag;
import ch.sysout.emubro.controller.GameSelectionListener;
import ch.sysout.emubro.impl.event.BroGameSelectionEvent;
import ch.sysout.emubro.impl.event.NavigationEvent;
import ch.sysout.emubro.impl.model.GameConstants;
import ch.sysout.emubro.util.MessageConstants;
import ch.sysout.util.Icons;
import ch.sysout.util.ImageUtil;
import ch.sysout.util.Messages;
import ch.sysout.util.ScreenSizeUtil;
import ch.sysout.util.UIUtil;

public class MainPanel extends JPanel implements PlatformListener, GameSelectionListener, LanguageListener {
	private static final long serialVersionUID = 1L;

	private OrganizePopupMenu mnuOrganizeOptions = new OrganizePopupMenu();
	private ViewPopupMenu mnuViewSettings = new ViewPopupMenu();
	private BlankViewPanel pnlBlankView;
	private ListViewPanel pnlListView;
	private TableViewPanel pnlTableView;
	private NavigationPanel pnlNavigation;
	private PreviewPanePanel pnlPreviewPane;
	private JSplitPane splNavigationAndCurrentViewAndPreviewPane;
	private JSplitPane splCurrentViewAndPreviewPane;
	private JSplitPane splDetailsPane;
	private DetailsPanel pnlDetails;
	private int lastNavigationPaneWidth;
	private int lastPreviewPaneWidth;
	private int lastDetailsHeight;
	protected int lastLocation;
	protected int counter;
	protected boolean resizeNavigationPanelEnabled;
	private Explorer explorer;
	protected JFrame frameDetailsPane;
	protected WindowListener frameDetailsWindowAdapter;
	private List<DetailsFrameListener> detailsFrameListeners = new ArrayList<>();

	private CellConstraints ccMainPanel;

	private int lastUserDefinedPreviewWidth = -1;
	private int lastUserDefinedDetailsHeight = -1;

	private boolean frameDetailsPaneResized = false;
	private Point lastFrameDetailsPaneLocation;
	private Dimension lastPnlDetailsPreferredSize;

	protected ComponentListener frameDetailsComponentListener = new ComponentAdapter() {
		@Override
		public void componentResized(ComponentEvent e) {
			super.componentResized(e);
			frameDetailsPaneResized = true;
			chkRememberDetailsFrameSizeAndLocation.setSelected(true);
		}
	};

	private Runnable runnableDetailsPane;

	private AbstractButton chkRememberDetailsFrameSizeAndLocation;

	private boolean detailsPaneTemporaryUnpinned;

	private double lastDifference;

	private List<PreviewPaneListener> previewPaneListeners = new ArrayList<>();
	private List<DetailsPaneListener> detailsPaneListeners = new ArrayList<>();

	private String currentNavMode;

	private ViewPanelManager viewManager;

	private GameContextMenu popupGame;
	private ViewContextMenu popupView;

	protected int minimumPreviewPaneWidth = 128;

	protected BasicSplitPaneDivider basicSplitPaneDivider;

	public MainPanel(Explorer explorer, ViewPanelManager viewManager, GameSettingsPopupMenu mnuGameSettings) {
		super(new BorderLayout());
		this.explorer = explorer;
		this.viewManager = viewManager;
		initComponents();
		createUI();
	}

	private void initComponents() {
		popupGame = new GameContextMenu();
		popupView = new ViewContextMenu();
		viewManager.addSelectGameListener(popupGame);
		/** 2 */ initializeCurrentViewAndPreviewPane();
		/** 3 */ initializeNavigationAndCurrentViewAndPreviewPane();
		/** 5 */ initializeDetailsPanel();

		frameDetailsWindowAdapter = new WindowAdapter() {

			@Override
			public void windowActivated(WindowEvent e) {
				if (splDetailsPane.getBottomComponent() == pnlDetails) {
					splDetailsPane.remove(pnlDetails);
					UIUtil.revalidateAndRepaint(splDetailsPane);
				}
			}

			@Override
			public void windowClosing(WindowEvent e) {
				fireDetailsFrameClosingEvent();
				//								lastWidth = frameDetailsPane.getWidth();
				//								lastHeight = frameDetailsPane.getHeight();
			};
		};

		pnlPreviewPane.addResizePreviewPaneListener(new MouseMotionAdapter() {

			@Override
			public void mouseDragged(MouseEvent e) {
				int loc = splNavigationAndCurrentViewAndPreviewPane.getDividerLocation();

				int divLocation = splCurrentViewAndPreviewPane.getDividerLocation();
				splCurrentViewAndPreviewPane.setDividerLocation(divLocation + e.getX());

				if (splCurrentViewAndPreviewPane.getDividerLocation() <= splCurrentViewAndPreviewPane.getMinimumDividerLocation()) {
					lastUserDefinedPreviewWidth = getParent().getWidth() - splCurrentViewAndPreviewPane.getMinimumDividerLocation() + loc;
					splCurrentViewAndPreviewPane.setDividerLocation(splCurrentViewAndPreviewPane.getMinimumDividerLocation());
					return;
				} else if (splCurrentViewAndPreviewPane.getDividerLocation() >= splCurrentViewAndPreviewPane.getMaximumDividerLocation()) {
					lastUserDefinedPreviewWidth = getParent().getWidth() - splCurrentViewAndPreviewPane.getMaximumDividerLocation() + loc;
					splCurrentViewAndPreviewPane.setDividerLocation(splCurrentViewAndPreviewPane.getMaximumDividerLocation());
					return;
				}
				setPreviewPaneMovingWeight();
				lastUserDefinedPreviewWidth = getParent().getWidth() - splCurrentViewAndPreviewPane.getDividerLocation() + loc;
				lastPreviewPaneWidth = lastUserDefinedPreviewWidth;

				//				int divLocation = pnlPreviewPane.getWidth();
				int dividerSize = splCurrentViewAndPreviewPane.getDividerSize();
				int scrollBarSize = pnlPreviewPane.getScrollBarSize();
				int limit = ScreenSizeUtil.adjustValueToResolution(minimumPreviewPaneWidth) + dividerSize
						+ (pnlPreviewPane.isScrollBarVisible() ? scrollBarSize : 0);
				if (divLocation > 0 && limit > 0 && divLocation <= limit) {
					if (splCurrentViewAndPreviewPane.getLastDividerLocation() > 0 && splCurrentViewAndPreviewPane
							.getDividerLocation() > splCurrentViewAndPreviewPane.getLastDividerLocation()) {
						splCurrentViewAndPreviewPane.setDividerLocation(splCurrentViewAndPreviewPane.getMaximumDividerLocation() - limit);
						lastUserDefinedPreviewWidth = getParent().getWidth() - splCurrentViewAndPreviewPane.getDividerLocation();
						if (e.getX() >= (limit / 2)) {
							showPreviewPane(false);
							firePreviewPaneHiddenEvent();
						}
					}
				}
			}
		});
	}

	public void initDefaultTags(List<Tag> tags) {
		pnlPreviewPane.initDefaultTags(tags);
		popupGame.initDefaultTags(tags);
	}

	protected void fireDetailsFrameClosingEvent() {
		for (DetailsFrameListener l : detailsFrameListeners) {
			l.detailsFrameClosing();
		}
	}

	public void addRunGameWithListener(RunGameWithListener l) {
		pnlPreviewPane.addRunGameWithListener(l);
		popupGame.addRunGameWithListener(l);
	}

	public void addDetailsFrameListener(DetailsFrameListener l) {
		detailsFrameListeners.add(l);
	}

	private void initializeDetailsPanel() {
		pnlDetails = new DetailsPanel();
		pnlDetails.addUnpinDetailsPaneListener(new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				String actionCommand = pnlDetails.btnPinUnpinDetailsPane.getActionCommand();
				if (actionCommand.equals(GameViewConstants.UNPIN_DETAILS_PANE)) {
					pinDetailsPane(false);
				} else if (actionCommand.equals(GameViewConstants.PIN_DETAILS_PANE)) {
					pinDetailsPane(true);
				}
			}

		});
		pnlDetails.addSetCoverForGameListener(new ActionListener() {
			@Override
			public void actionPerformed(ActionEvent e) {
				viewManager.setCoverForGame(explorer.getCurrentGames().get(0).getName());
			}
		});
		pnlDetails.addSelectNextGameListener(new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				viewManager.selectNextGame();
			}
		});
		pnlDetails.addSelectPreviousGameListener(new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				viewManager.selectPreviousGame();
			}
		});
		pnlDetails.addResizeDetailsPanelListener(new MouseMotionAdapter() {
			@Override
			public void mouseDragged(MouseEvent e) {
				int divLocation = splDetailsPane.getDividerLocation();
				splDetailsPane.setDividerLocation(divLocation + e.getY());

				lastUserDefinedDetailsHeight = getHeight() - divLocation;
				lastDetailsHeight = lastUserDefinedDetailsHeight;
				int minimumDetailsDividerLocation = splDetailsPane.getMinimumDividerLocation();

				boolean detailsDividerEqualOrLessThanMinimum = splDetailsPane.getDividerLocation() <= minimumDetailsDividerLocation;
				if (detailsDividerEqualOrLessThanMinimum) {
					splDetailsPane.setDividerLocation(minimumDetailsDividerLocation);
					return;
				}
				setDetailsPaneMovingWeight();
				int maximumDetailsDividerLocation = splDetailsPane.getMaximumDividerLocation();
				if (splDetailsPane.getDividerLocation() >= maximumDetailsDividerLocation) {
					splDetailsPane.setDividerLocation(maximumDetailsDividerLocation);
					if (e.getY() >= (pnlDetails.getHeight() / 2)) {
						showDetailsPane(false);
						fireDetailsPaneHiddenEvent();
					}
				}
			}
		});
	}

	void pinDetailsPane(boolean b) {
		pinDetailsPane(b, -1, -1, -1, -1);
	}

	void pinDetailsPane(boolean b, int x2, int y2, int width2, int height2) {
		if (b) {
			detailsPaneTemporaryUnpinned = false; // dont add this in else case
			frameDetailsPaneResized = chkRememberDetailsFrameSizeAndLocation.isSelected();
			frameDetailsPane.removeComponentListener(frameDetailsComponentListener);
			addSplDetailsPane();
			if (isDetailsPaneUnpinned()) {
				lastPnlDetailsPreferredSize = pnlDetails.getSize();
				lastFrameDetailsPaneLocation = frameDetailsPane.getLocationOnScreen();
				frameDetailsPane.dispose();
			}
			pnlDetails.btnResizeDetailsPane.setVisible(true);
			pnlDetails.btnHideDetailsPane.setVisible(true);
			pnlDetails.btnPinUnpinDetailsPane.setIcon(ImageUtil.getImageIconFrom(Icons.get("unpinDetailsPane", 24, 24)));
			pnlDetails.btnPinUnpinDetailsPane.setActionCommand(GameViewConstants.UNPIN_DETAILS_PANE);
		} else {
			// Component btn = pnlNavigation.getButtons()[2];
			// int value = (int) (btn.getLocation().getY() +
			// btn.getHeight() + 2);
			// if (splDetailsPane.getDividerLocation() != value) {
			// splDetailsPane.setDividerLocation(value);
			// }
			// else {
			//			lastDetailsHeight = getParent().getHeight() - splDetailsPane.getDividerLocation();
			//			System.out.println("lastdetailsheight:" + lastDetailsHeight);
			Component parent = MainPanel.this.getParent();
			Point detailsPanelLocationOnScreen = pnlDetails.getLocationOnScreen();
			int width = pnlDetails.getWidth();
			int height = pnlDetails.getHeight();

			boolean frameDetailsPaneResizedFinal = frameDetailsPaneResized;
			if (frameDetailsPane == null) {
				frameDetailsPaneResizedFinal = false;
				pnlDetails.setPreferredSize(new Dimension(width, height));
				frameDetailsPane = new JFrame();
				frameDetailsPane.setDefaultCloseOperation(WindowConstants.DISPOSE_ON_CLOSE);
				frameDetailsPane.setIconImages(getIcons());
				frameDetailsPane.addWindowListener(frameDetailsWindowAdapter);

				JPanel pnlRemember = new JPanel(new GridLayout(1, 1));
				pnlRemember.setOpaque(true);
				pnlRemember.setBackground(IconStore.current().getCurrentTheme().getBackground().getColor().darker());
				pnlRemember.setBorder(Paddings.DLU2);
				chkRememberDetailsFrameSizeAndLocation = new JCheckBox(Messages.get(MessageConstants.REMEMBER_WINDOW_SIZE_AND_POSITION));
				chkRememberDetailsFrameSizeAndLocation.setOpaque(false);
				pnlRemember.add(chkRememberDetailsFrameSizeAndLocation);
				frameDetailsPane.add(pnlRemember, BorderLayout.SOUTH);
			}
			frameDetailsPane.setTitle(Messages.get(MessageConstants.INFORMATION_PANEL));
			removeSplDetailsPane();
			frameDetailsPane.add(pnlDetails);
			pnlDetails.btnResizeDetailsPane.setVisible(false);
			pnlDetails.btnHideDetailsPane.setVisible(false);
			pnlDetails.btnPinUnpinDetailsPane.setIcon(ImageUtil.getImageIconFrom(Icons.get("pinDetailsPane", 24, 24)));
			pnlDetails.btnPinUnpinDetailsPane.setActionCommand(GameViewConstants.PIN_DETAILS_PANE);
			chkRememberDetailsFrameSizeAndLocation.setSelected(frameDetailsPaneResizedFinal);
			if (frameDetailsPaneResizedFinal) {
				pnlDetails.setPreferredSize(lastPnlDetailsPreferredSize);
			} else {
				if (width2 == -1 || height2 == -1) {
					pnlDetails.setPreferredSize(new Dimension(width, height));
				} else {
					pnlDetails.setPreferredSize(new Dimension(width2, height2));
				}
			}
			frameDetailsPane.pack();
			//					if (lastWidth > 0 && lastHeight > 0) {
			//						frameDetailsPane.setSize(lastWidth, lastHeight);
			//					}
			// frame.setSize((int) (frame.getWidth() * 1.5),
			// pnlInformationBarPanel.getHeight());

			if (frameDetailsPaneResizedFinal) {
				frameDetailsPane.setLocation(lastFrameDetailsPaneLocation.x, lastFrameDetailsPaneLocation.y);
			} else {
				if (x2 == -1 || y2 == -1) {
					frameDetailsPane.setLocation(parent.getLocationOnScreen().x - frameDetailsPane.getInsets().left + 1,
							detailsPanelLocationOnScreen.y - frameDetailsPane.getInsets().top);
				} else {
					frameDetailsPane.setLocation(x2, y2);
				}
			}
			frameDetailsPane.setVisible(true);
			if (runnableDetailsPane == null) {
				runnableDetailsPane = new Runnable() {

					@Override
					public void run() {
						frameDetailsPane.addComponentListener(frameDetailsComponentListener);
					}
				};
			}
			SwingUtilities.invokeLater(runnableDetailsPane);
		}
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
			pnlPreviewPane = new PreviewPanePanel(explorer, popupGame, popupView);
		}
		//		pnlPreviewPane.setMinimumSize(new Dimension(0, 0));
		splCurrentViewAndPreviewPane = new JSplitPane(JSplitPane.HORIZONTAL_SPLIT, true,
				viewManager.getCurrentViewPanel(), pnlPreviewPane) {
			private static final long serialVersionUID = 1L;

			@Override
			public int getMinimumDividerLocation() {
				return ScreenSizeUtil.adjustValueToResolution(256);
			}

			@Override
			public int getMaximumDividerLocation() {
				return getWidth() - ScreenSizeUtil.adjustValueToResolution(128);
			}
		};
		splCurrentViewAndPreviewPane.setDividerSize(0);
		splCurrentViewAndPreviewPane.getRightComponent().setVisible(false);
		splCurrentViewAndPreviewPane.setBorder(BorderFactory.createEmptyBorder());
		splCurrentViewAndPreviewPane.setResizeWeight(1);
	}

	private void initializeNavigationAndCurrentViewAndPreviewPane() {
		pnlNavigation = new NavigationPanel();
		splNavigationAndCurrentViewAndPreviewPane = new JSplitPane(JSplitPane.HORIZONTAL_SPLIT, true, pnlNavigation,
				splCurrentViewAndPreviewPane) {
			private static final long serialVersionUID = 1L;

			@Override
			public int getMinimumDividerLocation() {
				JScrollBar navigationVerticalScrollBar = pnlNavigation.getSpNavigationButtons().getVerticalScrollBar();
				int scrollBarWidth = navigationVerticalScrollBar.getWidth();
				if (scrollBarWidth == 0) {
					scrollBarWidth = ((Integer)UIManager.get("ScrollBar.width")).intValue();
				}
				int dividerSize = splNavigationAndCurrentViewAndPreviewPane.getDividerSize();
				int border = pnlNavigation.getButtonBorderSize() + scrollBarWidth + dividerSize;
				return ScreenSizeUtil.adjustValueToResolution(ScreenSizeUtil.adjustValueToResolution(32) + border);
			}
		};
		splNavigationAndCurrentViewAndPreviewPane.setDividerSize(0);
		splNavigationAndCurrentViewAndPreviewPane.getLeftComponent().setVisible(false);
		splNavigationAndCurrentViewAndPreviewPane.setBorder(BorderFactory.createEmptyBorder());
		splNavigationAndCurrentViewAndPreviewPane.setResizeWeight(0);

		BasicSplitPaneDivider divider = (BasicSplitPaneDivider) splNavigationAndCurrentViewAndPreviewPane.getComponent(2);
		divider.setBorder(BorderFactory.createEmptyBorder());
	}

	public void addNavigationSplitPaneListener() {
		currentNavMode = "oneLine";
		PropertyChangeListener listener = new PropertyChangeListener() {

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
					JScrollBar navigationVerticalScrollBar = pnlNavigation.getSpNavigationButtons().getVerticalScrollBar();
					int scrollBarWidth = navigationVerticalScrollBar.getWidth();
					if (scrollBarWidth == 0) {
						scrollBarWidth = ((Integer)UIManager.get("ScrollBar.width")).intValue();
					}
					int dividerSize = splNavigationAndCurrentViewAndPreviewPane.getDividerSize();
					int border = pnlNavigation.getButtonBorderSize() + scrollBarWidth + dividerSize;
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

		splNavigationAndCurrentViewAndPreviewPane.addPropertyChangeListener(
				JSplitPane.DIVIDER_LOCATION_PROPERTY, listener);
	}

	void setCurrentViewPanel(int defaultViewPanel, List<Game> games) {
		switch (defaultViewPanel) {
		case ViewPanel.BLANK_VIEW:
			if (pnlBlankView == null) {
				pnlBlankView = viewManager.getBlankViewPanel();
			}
			viewManager.setCurrentViewPanel(pnlBlankView);
			break;
		case ViewPanel.LIST_VIEW:
			if (pnlListView == null) {
				pnlListView = new ListViewPanel(explorer, viewManager, popupGame, popupView);
				viewManager.initializeViewPanel(pnlListView, games);
			}
			viewManager.setCurrentViewPanel(pnlListView);
			setViewStyle(ViewPanel.LIST_VIEW);
			break;
		case ViewPanel.ELEMENT_VIEW:
			if (pnlListView == null) {
				pnlListView = new ListViewPanel(explorer, viewManager, popupGame, popupView);
				viewManager.initializeViewPanel(pnlListView, games);
			}
			viewManager.setCurrentViewPanel(pnlListView);
			setViewStyle(ViewPanel.ELEMENT_VIEW);
			break;
		case ViewPanel.TABLE_VIEW:
			if (pnlTableView == null) {
				pnlTableView = new TableViewPanel(explorer, viewManager, popupGame, popupView);
				viewManager.initializeViewPanel(pnlTableView, games);
			}
			viewManager.setCurrentViewPanel(pnlTableView);
			setViewStyle(ViewPanel.TABLE_VIEW);
			pnlTableView.adjustColumns();
			pnlTableView.setCustomCellRenderer(); // we need to do that cause otherwise the defaultrenderer would be set
			break;
		case ViewPanel.CONTENT_VIEW:
			if (pnlListView == null) {
				pnlListView = new ListViewPanel(explorer, viewManager, popupGame, popupView);
				viewManager.initializeViewPanel(pnlListView, games);
			}
			viewManager.setCurrentViewPanel(pnlListView);
			setViewStyle(ViewPanel.CONTENT_VIEW);
			break;
		case ViewPanel.SLIDER_VIEW:
			if (pnlListView == null) {
				pnlListView = new ListViewPanel(explorer, viewManager, popupGame, popupView);
				viewManager.initializeViewPanel(pnlListView, games);
			}
			viewManager.setCurrentViewPanel(pnlListView);
			setViewStyle(ViewPanel.SLIDER_VIEW);
			break;
		case ViewPanel.COVER_VIEW:
			if (pnlListView == null) {
				pnlListView = new ListViewPanel(explorer, viewManager, popupGame, popupView);
				viewManager.initializeViewPanel(pnlListView, games);
			}
			viewManager.setCurrentViewPanel(pnlListView);
			setViewStyle(ViewPanel.COVER_VIEW);
			break;
		}
		changeViewPanelTo(viewManager.getCurrentViewPanel());
		viewManager.getCurrentViewPanel().requestFocusInWindow();
		SwingUtilities.invokeLater(new Runnable() {

			@Override
			public void run() {
				if (explorer.hasCurrentGame()) {
					viewManager.selectGame(explorer.getCurrentGames().get(0).getId());
				} else {
					viewManager.selectGame(GameConstants.NO_GAME);
				}
			}
		});
	}

	private void createUI() {
		//		setBorder(BorderFactory.createLoweredSoftBevelBorder());
		FormLayout layout = new FormLayout("min:grow",
				"fill:min:grow");
		setLayout(layout);
		ccMainPanel = new CellConstraints();
		splDetailsPane = new JSplitPane(JSplitPane.VERTICAL_SPLIT, splNavigationAndCurrentViewAndPreviewPane,
				pnlDetails) {
			private static final long serialVersionUID = 1L;

			@Override
			public int getMinimumDividerLocation() {
				return ScreenSizeUtil.adjustValueToResolution(128);
			}
		};
		splDetailsPane.setDividerSize(0);
		//		splDetailsPane.setUI(new BasicSplitPaneUI() {
		//			@Override
		//			public BasicSplitPaneDivider createDefaultDivider() {
		//				return basicSplitPaneDivider = new BasicSplitPaneDivider(this) {
		//					private static final long serialVersionUID = 1L;
		//
		//					@Override
		//					public void setBorder(Border b) {
		//						super.setBorder(b);
		//					}
		//				};
		//			}
		//		});
		//		BasicSplitPaneDivider divider = ((BasicSplitPaneUI) splDetailsPane.getUI()).getDivider();
		//		TitledBorder titled = BorderFactory.createTitledBorder("\u2630");
		//		titled.setTitleJustification(TitledBorder.CENTER);
		//		titled.setTitlePosition(TitledBorder.TOP);
		//		titled.setTitleFont(new Font(Font.DIALOG, Font.PLAIN, 12));
		//		titled.setTitleColor(Color.BLACK);
		//		divider.setBorder(titled);

		addDividerDraggedListeners();
		splDetailsPane.setBorder(BorderFactory.createEmptyBorder());
		splDetailsPane.getBottomComponent().setVisible(false);
		splDetailsPane.setContinuousLayout(true);
		splDetailsPane.setResizeWeight(1);
		add(splDetailsPane, ccMainPanel.xy(1, 1));
	}

	/**
	 * this method must be called when look and feel changes
	 */
	public void addDividerDraggedListeners() {
		SplitPaneUI spui = splCurrentViewAndPreviewPane.getUI();
		if (spui instanceof BasicSplitPaneUI) {
			// Setting a mouse listener directly on split pane does not work, because no events are being received.
			//			((BasicSplitPaneUI) spui).getDivider().addMouseMotionListener(new MouseMotionAdapter() {
			//				@Override
			//				public void mouseDragged(MouseEvent e) {
			//					int loc = splNavigationAndCurrentViewAndPreviewPane.getDividerLocation();
			//					if (splCurrentViewAndPreviewPane.getDividerLocation() <= splCurrentViewAndPreviewPane.getMinimumDividerLocation()) {
			//						lastUserDefinedPreviewWidth = getParent().getWidth() - splCurrentViewAndPreviewPane.getMinimumDividerLocation() + loc;
			//						splCurrentViewAndPreviewPane.setDividerLocation(splCurrentViewAndPreviewPane.getMinimumDividerLocation());
			//						return;
			//					}
			//					setPreviewPaneMovingWeight();
			//					lastUserDefinedPreviewWidth = getParent().getWidth() - splCurrentViewAndPreviewPane.getDividerLocation() + loc;
			//					lastPreviewPaneWidth = lastUserDefinedPreviewWidth;
			//
			//					int divLocation = pnlPreviewPane.getWidth();
			//					int dividerSize = splCurrentViewAndPreviewPane.getDividerSize();
			//					int scrollBarSize = pnlPreviewPane.getScrollBarSize();
			//					int limit = ScreenSizeUtil.adjustValueToResolution(minimumPreviewPaneWidth) + dividerSize
			//							+ (pnlPreviewPane.isScrollBarVisible() ? scrollBarSize : 0);
			//
			//					if (divLocation > 0 && limit > 0 && divLocation <= limit) {
			//						if (splCurrentViewAndPreviewPane.getLastDividerLocation() > 0 && splCurrentViewAndPreviewPane
			//								.getDividerLocation() > splCurrentViewAndPreviewPane.getLastDividerLocation()) {
			//							splCurrentViewAndPreviewPane.setDividerLocation(splCurrentViewAndPreviewPane.getMaximumDividerLocation() - limit);
			//							lastUserDefinedPreviewWidth = getParent().getWidth() - splCurrentViewAndPreviewPane.getDividerLocation();
			//							if (e.getX() >= (limit / 2)) {
			//								showPreviewPane(false);
			//								firePreviewPaneHiddenEvent();
			//							}
			//						}
			//					}
			//				}
			//			});
		}
		//		SplitPaneUI spui2 = splDetailsPane.getUI();
		//		if (spui2 instanceof BasicSplitPaneUI) {
		//			// Setting a mouse listener directly on split pane does not work, because no events are being received.
		//			((BasicSplitPaneUI) spui2).getDivider().addMouseMotionListener(new MouseMotionAdapter() {
		//				@Override
		//				public void mouseDragged(MouseEvent e) {
		//					lastUserDefinedDetailsHeight = getHeight() - splDetailsPane.getDividerLocation();
		//					lastDetailsHeight = lastUserDefinedDetailsHeight;
		//					int minimumDetailsDividerLocation = splDetailsPane.getMinimumDividerLocation();
		//					boolean detailsDividerEqualOrLessThanMinimum = splDetailsPane.getDividerLocation() <= minimumDetailsDividerLocation;
		//					if (detailsDividerEqualOrLessThanMinimum) {
		//						splDetailsPane.setDividerLocation(minimumDetailsDividerLocation);
		//						return;
		//					}
		//					setDetailsPaneMovingWeight();
		//					if (splDetailsPane.getDividerLocation() == splDetailsPane.getMaximumDividerLocation()) {
		//						if (e.getY() >= (pnlDetails.getHeight() / 2)) {
		//							showDetailsPane(false);
		//							fireDetailsPaneHiddenEvent();
		//						}
		//					}
		//				}
		//			});
		//		}
	}

	protected void firePreviewPaneHiddenEvent() {
		for (PreviewPaneListener l : previewPaneListeners) {
			l.previewPaneHidden();
		}
	}

	protected void fireDetailsPaneHiddenEvent() {
		for (DetailsPaneListener l : detailsPaneListeners) {
			l.detailsPaneHidden();
		}
	}

	public void showOrganizePopupMenu(ActionEvent e) {
		if (mnuOrganizeOptions == null) {
			mnuOrganizeOptions = new OrganizePopupMenu();
		}
		Component source = (Component) e.getSource();
		mnuOrganizeOptions.show(source, 0, source.getHeight());
	}

	void showNavigationPane(boolean b) {
		pnlNavigation.setVisible(b);
		mnuOrganizeOptions.showNavigationPane(b);
		if (b) {
			addSplNavigationPane();
		} else {
			removeSplNavigationPane();
		}
	}

	void showNavigationPane(boolean b, int dividerLocation, String navigationPaneState) {
		lastNavigationPaneWidth = dividerLocation;
		pnlNavigation.setNavigationPaneState(navigationPaneState);
		pnlNavigation.setVisible(b);
		splNavigationAndCurrentViewAndPreviewPane.setDividerLocation(dividerLocation);
		mnuOrganizeOptions.showNavigationPane(b);
	}

	void showPreviewPane(boolean b) {
		mnuOrganizeOptions.showPreviewPane(b);
		pnlPreviewPane.setVisible(b);
		if (b) {
			addSplPreviewPane();
		} else {
			removeSplPreviewPane();
		}
	}

	private void addSplNavigationPane() {
		pnlNavigation.setVisible(true);
		int divLocation = splDetailsPane.getDividerLocation();
		splNavigationAndCurrentViewAndPreviewPane.setRightComponent(splCurrentViewAndPreviewPane);
		if (isPreviewPaneVisible()) {
			if (isDetailsPanePinned() && isDetailsPaneVisible()) {
				splDetailsPane.setTopComponent(splNavigationAndCurrentViewAndPreviewPane);
				splDetailsPane.setDividerLocation(divLocation);
			} else {
				add(splNavigationAndCurrentViewAndPreviewPane, ccMainPanel.xy(1, 1));
			}
		} else {
			if (isDetailsPanePinned() && isDetailsPaneVisible()) {
				splNavigationAndCurrentViewAndPreviewPane.setRightComponent(viewManager.getCurrentViewPanel());
				splDetailsPane.setTopComponent(splNavigationAndCurrentViewAndPreviewPane);
				splDetailsPane.setDividerLocation(divLocation);
			} else {
				splNavigationAndCurrentViewAndPreviewPane.setLeftComponent(pnlNavigation);
				splNavigationAndCurrentViewAndPreviewPane.setRightComponent(viewManager.getCurrentViewPanel());
				add(splNavigationAndCurrentViewAndPreviewPane, ccMainPanel.xy(1, 1));
			}
		}
		SwingUtilities.invokeLater(new Runnable() {

			@Override
			public void run() {
				setLastNavigationPaneDividerLocation();
			}
		});
		UIUtil.revalidateAndRepaint(this);
	}

	private void removeSplNavigationPane() {
		int lastLoc = splDetailsPane.getDividerLocation();
		int navDivLoc = splNavigationAndCurrentViewAndPreviewPane.getDividerLocation();
		lastNavigationPaneWidth = (isNavigationPaneVisible() ? navDivLoc : 0);
		pnlNavigation.setVisible(false);
		splNavigationAndCurrentViewAndPreviewPane.remove(splCurrentViewAndPreviewPane);

		if (isDetailsPanePinned() && isDetailsPaneVisible()) {
			if (isPreviewPaneVisible()) {
				splDetailsPane.setTopComponent(splCurrentViewAndPreviewPane);
			} else {
				splDetailsPane.setTopComponent(viewManager.getCurrentViewPanel());
			}
			splDetailsPane.setDividerLocation(lastLoc);

			//		SwingUtilities.invokeLater(new Runnable() {
			//
			//			@Override
			//			public void run() {
			//				setLastNavigationDividerLocation();
			//			}
			//		});
		} else {
			remove(splNavigationAndCurrentViewAndPreviewPane);
			if (isPreviewPaneVisible()) {
				add(splCurrentViewAndPreviewPane, ccMainPanel.xy(1, 1));
			} else {
				add(viewManager.getCurrentViewPanel(), ccMainPanel.xy(1, 1));
			}
		}
		UIUtil.revalidateAndRepaint(this);
	}

	private void addSplPreviewPane() {
		pnlPreviewPane.setVisible(true);

		// this has been done cause of a bug which changes navigations divider
		// location after adding/removing splitpane components
		int lastNavigationDividerLocation = splNavigationAndCurrentViewAndPreviewPane.getDividerLocation();

		remove(splCurrentViewAndPreviewPane);
		splCurrentViewAndPreviewPane.setLeftComponent(viewManager.getCurrentViewPanel());
		splCurrentViewAndPreviewPane.setRightComponent(pnlPreviewPane);
		if (isNavigationPaneVisible()) {
			splCurrentViewAndPreviewPane.setVisible(true);
			splNavigationAndCurrentViewAndPreviewPane.setRightComponent(splCurrentViewAndPreviewPane);
			if (isDetailsPanePinned() && isDetailsPaneVisible()) {
				int loc = splDetailsPane.getDividerLocation();
				splDetailsPane.setTopComponent(splNavigationAndCurrentViewAndPreviewPane);
				splDetailsPane.setDividerLocation(loc);
			} else {
				add(splNavigationAndCurrentViewAndPreviewPane, ccMainPanel.xy(1, 1));
			}

			// this has been done cause of a bug which changes navigations divider
			// location after adding/removing splitpane components
			splNavigationAndCurrentViewAndPreviewPane.setDividerLocation(lastNavigationDividerLocation);
		} else {
			if (isDetailsPanePinned() && isDetailsPaneVisible()) {
				int loc = splDetailsPane.getDividerLocation();
				splCurrentViewAndPreviewPane.setVisible(true);
				remove(splCurrentViewAndPreviewPane);
				splDetailsPane.setTopComponent(splCurrentViewAndPreviewPane);
				splDetailsPane.setDividerLocation(loc);
			} else {
				splCurrentViewAndPreviewPane.setVisible(true);
				remove(splNavigationAndCurrentViewAndPreviewPane);
				add(splCurrentViewAndPreviewPane, ccMainPanel.xy(1, 1));
			}

			//			//			remove(currentViewPanel);
			//			//			splNavigationAndCurrentViewAndPreviewPane.remove(currentViewPanel);
			//			//			splDetailsPane.remove(currentViewPanel);
			//
			//			if (isDetailsPanePinned() && isDetailsPaneVisible()) {
			//				int loc = splDetailsPane.getDividerLocation();
			//				splDetailsPane.setTopComponent(splCurrentViewAndPreviewPane);
			//				splDetailsPane.setDividerLocation(loc);
			//			} else {
			//				add(splCurrentViewAndPreviewPane, ccMainPanel.xy(1, 1));
			//				//				splCurrentViewAndPreviewPane.setDividerLocation(getWidth() - lastUserDefinedPreviewWidth);
			//			}
		}
		UIUtil.revalidateAndRepaint(this);

		SwingUtilities.invokeLater(new Runnable() {

			@Override
			public void run() {
				setLastPreviewPaneDividerLocation();
			}
		});
	}

	private void removeSplPreviewPane() {
		//		lastPreviewPaneWidth = getWidth() - splCurrentViewAndPreviewPane.getDividerLocation();
		//		lastPreviewDividerSize = splCurrentViewAndPreviewPane.getDividerSize();
		//		pnlPreviewPane.setPreferredSize(new Dimension(0, 0));
		//		splCurrentViewAndPreviewPane.setDividerLocation(getWidth());
		//		splCurrentViewAndPreviewPane.setDividerSize(0);
		pnlPreviewPane.setVisible(false);
		// this has been done cause of a bug which changes navigations divider
		// location after adding/removing splitpane components
		int lastNavigationDividerLocation = splNavigationAndCurrentViewAndPreviewPane.getDividerLocation();
		lastPreviewPaneWidth = getParent().getWidth() - splCurrentViewAndPreviewPane.getDividerLocation();

		if (isNavigationPaneVisible()) {
			remove(splCurrentViewAndPreviewPane);
			splCurrentViewAndPreviewPane.remove(viewManager.getCurrentViewPanel());
			splCurrentViewAndPreviewPane.remove(pnlPreviewPane);
			splCurrentViewAndPreviewPane.setVisible(false);
			splNavigationAndCurrentViewAndPreviewPane.setRightComponent(viewManager.getCurrentViewPanel());

			// this has been done cause of a bug which changes navigations divider
			// location after adding/removing splitpane components
			splNavigationAndCurrentViewAndPreviewPane.setDividerLocation(lastNavigationDividerLocation);
		} else {
			if (isDetailsPanePinned() && isDetailsPaneVisible()) {
				int loc = splDetailsPane.getDividerLocation();
				splDetailsPane.setTopComponent(viewManager.getCurrentViewPanel());
				splDetailsPane.setDividerLocation(loc);
			} else {
				remove(splCurrentViewAndPreviewPane);
				add(viewManager.getCurrentViewPanel(), ccMainPanel.xy(1, 1));
			}
		}

		UIUtil.revalidateAndRepaint(this);
	}

	void showPreviewPane(boolean b, int previewPaneWidth) {
		lastPreviewPaneWidth = previewPaneWidth;
		showPreviewPane(b);
	}

	public void showDetailsPane(boolean b) {
		pnlDetails.setVisible(b);
		pnlDetails.btnHideDetailsPane.setVisible(b);
		pnlDetails.tpDetailsPane.setVisible(b);
		pnlDetails.pnlHideDetailsPanePanel.setVisible(b);
		pnlDetails.pnlTpInformationBar.setVisible(b);
		mnuOrganizeOptions.showDetailsPane(b);
		if (b) {
			addSplDetailsPane();
		} else {
			if (isDetailsPaneUnpinned()) {
				fireDetailsFrameClosingEvent();
				frameDetailsPane.dispose();
			} else {
				removeSplDetailsPane();
			}
		}
	}

	private void addSplDetailsPane() {
		boolean navVisible = isNavigationPaneVisible();
		boolean prevVisible = isPreviewPaneVisible();
		if (navVisible) {
			splDetailsPane.setTopComponent(splNavigationAndCurrentViewAndPreviewPane);
		} else {
			if (prevVisible) {
				splDetailsPane.setTopComponent(splCurrentViewAndPreviewPane);
			} else {
				remove(viewManager.getCurrentViewPanel());
				splDetailsPane.setTopComponent(viewManager.getCurrentViewPanel());
			}
		}
		splDetailsPane.setBottomComponent(pnlDetails);
		add(splDetailsPane, ccMainPanel.xy(1, 1));
		splDetailsPane.setVisible(true);
		UIUtil.revalidateAndRepaint(this);

		SwingUtilities.invokeLater(new Runnable() {

			@Override
			public void run() {
				setLastDetailsPaneDividerLocation();
			}
		});
	}

	private void removeSplDetailsPane() {
		if (isDetailsPanePinned()) {
			boolean navigationAndPreviewPaneHidden = splDetailsPane.getTopComponent() == viewManager.getCurrentViewPanel();
			boolean navigationPaneHidden = splDetailsPane.getTopComponent() == splCurrentViewAndPreviewPane;
			boolean navigationAndPreviewPaneVisible = splDetailsPane.getTopComponent() == splNavigationAndCurrentViewAndPreviewPane;
			boolean detailsPaneVisible = splDetailsPane.getBottomComponent() == pnlDetails;
			if (navigationAndPreviewPaneVisible && detailsPaneVisible) {
				lastDetailsHeight = getHeight() - splDetailsPane.getDividerLocation();
				remove(splDetailsPane);
				splDetailsPane.remove(splNavigationAndCurrentViewAndPreviewPane);
				splDetailsPane.remove(pnlDetails);
				splDetailsPane.setVisible(false);
				add(splNavigationAndCurrentViewAndPreviewPane, ccMainPanel.xy(1, 1));
				UIUtil.revalidateAndRepaint(this);
			} else if (navigationPaneHidden && detailsPaneVisible) {
				lastDetailsHeight = getHeight() - splDetailsPane.getDividerLocation();
				remove(splDetailsPane);
				splDetailsPane.remove(splCurrentViewAndPreviewPane);
				splDetailsPane.remove(pnlDetails);
				splDetailsPane.setVisible(false);
				add(splCurrentViewAndPreviewPane, ccMainPanel.xy(1, 1));
				UIUtil.revalidateAndRepaint(this);
			} else if (navigationAndPreviewPaneHidden && detailsPaneVisible) {
				lastDetailsHeight = getHeight() - splDetailsPane.getDividerLocation();
				remove(splDetailsPane);
				splDetailsPane.remove(viewManager.getCurrentViewPanel());
				splDetailsPane.remove(pnlDetails);
				splDetailsPane.setVisible(false);
				add(viewManager.getCurrentViewPanel(), ccMainPanel.xy(1, 1));
				UIUtil.revalidateAndRepaint(this);
			}
		}
	}

	public void showDetailsPane(boolean b, int detailsPaneHeight) {
		lastDetailsHeight = detailsPaneHeight;
		showDetailsPane(b);
	}

	public void showViewSettingsPopupMenu(Component comp) {
		mnuViewSettings.show(comp, 0, comp.getHeight());
	}

	public void navigationChanged(NavigationEvent e) {
		pnlNavigation.navigationChanged(e);
		if (pnlTableView != null) {
			SwingUtilities.invokeLater(new Runnable() {

				@Override
				public void run() {
					pnlTableView.adjustColumns();
					pnlTableView.setCustomCellRenderer(); // we need to do that cause otherwise the defaultrenderer would be set
				}
			});
		}
	}

	@Override
	public void gameSelected(GameSelectionEvent e) {
		List<Game> games = e.getGames();
		boolean b = !games.isEmpty();
		pnlPreviewPane.gameSelected(e);
		pnlDetails.gameSelected(e);
		//		popupGame.gameSelected(e);
		for (Game game : games) {
			if (game != null) {
				String gameCoverPath = game.getCoverPath();
				ImageIcon img;
				if (gameCoverPath != null && !gameCoverPath.trim().isEmpty()) {
					int gameId = game.getId();
					viewManager.addGameCoverPath(gameId, gameCoverPath);
					img = IconStore.current().getGameCover(gameId);
				} else {
					int platformId = game.getPlatformId();
					img = IconStore.current().getPlatformCover(platformId);
				}
				pnlPreviewPane.gameCoverChanged(game, (img != null) ? img.getImage() : null);
			}
		}
	}

	public void emulatorAdded(EmulatorEvent e) {
		pnlDetails.pnlBrowseComputer.emulatorAdded(e);
	}

	public void emulatorRemoved(EmulatorEvent e) {
	}

	public void changeViewPanelTo(ViewPanel pnl) {
		viewManager.setCurrentViewPanel(pnl);
		if (isPreviewPaneVisible()) {
			int lastDiv = splCurrentViewAndPreviewPane.getDividerLocation();
			splCurrentViewAndPreviewPane.setLeftComponent(pnl);
			splCurrentViewAndPreviewPane.setDividerLocation(lastDiv);
		} else {
			if (isNavigationPaneVisible()) {
				int lastDivNav = splNavigationAndCurrentViewAndPreviewPane.getDividerLocation();
				splNavigationAndCurrentViewAndPreviewPane.setRightComponent(pnl);
				splNavigationAndCurrentViewAndPreviewPane.setDividerLocation(lastDivNav);
			} else {
				if (isDetailsPanePinned() && isDetailsPaneVisible()) {
					if (splDetailsPane != null) {
						int lastDiv = splDetailsPane.getDividerLocation();
						splDetailsPane.setTopComponent(pnl);
						splDetailsPane.setDividerLocation(lastDiv);
					}
				} else {
					removeAll();
					add(pnl, ccMainPanel.xy(1, 1));
				}
			}
		}
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

	public void addChangeToTagsListener(ActionListener l) {
		pnlNavigation.addChangeToTagsListener(l);
	}

	public boolean isNavigationPaneVisible() {
		return pnlNavigation.isVisible();
	}

	public boolean isPreviewPaneVisible() {
		return pnlPreviewPane.isVisible();
	}

	public ViewPanel getCurrentViewPanel() {
		return viewManager.getCurrentViewPanel();
	}

	protected void showHidePanels() {
		checkMinimizePreviewPane();
		checkMinimizeDetailsPane();
		checkDetailsPaneTemporaryUnpinned();
		UIUtil.revalidateAndRepaint(this); // dont remove this. otherwise when starting in fullscreen then restore size panels would not hide if needed
	}

	private void setPreviewPaneResizeWeight() {
		splCurrentViewAndPreviewPane.setResizeWeight(0);
	}

	private void setPreviewPaneMovingWeight() {
		splCurrentViewAndPreviewPane.setResizeWeight(1);
	}

	private boolean isPreviewPaneMovingWeight() {
		return splCurrentViewAndPreviewPane.getResizeWeight() == 1;
	}

	private boolean isPreviewPaneResizeWeight() {
		return splCurrentViewAndPreviewPane.getResizeWeight() == 0;
	}

	private void checkMinimizePreviewPane() {
		if (isPreviewPaneVisible()) {
			int newPreviewWidth = getParent().getWidth() - splCurrentViewAndPreviewPane.getDividerLocation();
			int previewDividerLocation = splCurrentViewAndPreviewPane.getDividerLocation();
			int minimumPreviewDividerLocation = splCurrentViewAndPreviewPane.getMinimumDividerLocation();
			boolean previewDividerEqualOrLessThanMinimum = previewDividerLocation <= minimumPreviewDividerLocation;
			if (previewDividerEqualOrLessThanMinimum) {
				boolean lastUserSettingsNotInitialized = lastUserDefinedPreviewWidth < 0;
				setPreviewPaneResizeWeight();
				if (lastUserSettingsNotInitialized) {
					lastUserDefinedPreviewWidth = newPreviewWidth;
				}
				if (isPreviewPaneMovingWeight()) {
					if (newPreviewWidth <= lastUserDefinedPreviewWidth) {
						setPreviewPaneResizeWeight();
					} else {
						splCurrentViewAndPreviewPane.setDividerLocation(getWidth() - lastUserDefinedPreviewWidth);
					}
				} else if (isPreviewPaneResizeWeight()) {
					boolean previewDividerLesserThanUserDefined = newPreviewWidth < lastUserDefinedPreviewWidth;
					boolean previewDividerGreaterThanUserDefined = newPreviewWidth > lastUserDefinedPreviewWidth;
					if (previewDividerLesserThanUserDefined) {
						setLastPreviewPaneDividerLocation();
						int divLocation = splCurrentViewAndPreviewPane.getDividerLocation();
						int dividerSize = splCurrentViewAndPreviewPane.getDividerSize();
						int scrollBarSize = pnlPreviewPane.getScrollBarSize();
						int limit = ScreenSizeUtil.adjustValueToResolution(minimumPreviewPaneWidth) + dividerSize
								+ (pnlPreviewPane.isScrollBarVisible() ? scrollBarSize : 0);
						int minimumPreviewPaneWidth = splCurrentViewAndPreviewPane.getMaximumDividerLocation() - limit;
						if (divLocation >= minimumPreviewPaneWidth) {
							showPreviewPane(false);
							firePreviewPaneHiddenEvent();
						}
					} else if (previewDividerGreaterThanUserDefined) {
						setPreviewPaneMovingWeight();
						setLastPreviewPaneDividerLocation();
					}
				}
			} else {
				boolean lastUserSettingsNotInitialized = lastUserDefinedPreviewWidth < 0;
				if (lastUserSettingsNotInitialized) {
					lastUserDefinedPreviewWidth = newPreviewWidth;
				}
				boolean previewDividerGreaterThanUserDefined = newPreviewWidth > lastUserDefinedPreviewWidth;
				if (previewDividerGreaterThanUserDefined) {
					setPreviewPaneMovingWeight();
					setLastPreviewPaneDividerLocation();
				}
			}
		}
	}

	private void checkMinimizeDetailsPane() {
		if (isDetailsPanePinned() && isDetailsPaneVisible()) {
			int newDetailsHeight = getHeight() - splDetailsPane.getDividerLocation();
			int detailsDividerLocation = splDetailsPane.getDividerLocation();
			int minimumDetailsDividerLocation = splDetailsPane.getMinimumDividerLocation();
			boolean detailsDividerEqualOrLessThanMinimum = detailsDividerLocation <= minimumDetailsDividerLocation;
			if (detailsDividerEqualOrLessThanMinimum) {
				boolean lastUserSettingsNotInitialized = lastUserDefinedDetailsHeight < 0;
				setDetailsPaneResizeWeight();
				if (lastUserSettingsNotInitialized) {
					lastUserDefinedDetailsHeight = newDetailsHeight;
				} else {
					if (isDetailsPaneMovingWeight()) {
						if (newDetailsHeight <= lastUserDefinedDetailsHeight) {
							setDetailsPaneResizeWeight();
						}
					} else if (isDetailsPaneResizeWeight()) {
						boolean detailsDividerLesserThanUserDefined = newDetailsHeight < lastUserDefinedDetailsHeight;
						boolean detailsDividerGreaterThanUserDefined = newDetailsHeight > lastUserDefinedDetailsHeight;
						if (detailsDividerLesserThanUserDefined) {
							setLastDetailsPaneDividerLocation();
							int divLocation = splDetailsPane.getDividerLocation();
							int maximumDivLocation = splDetailsPane.getMaximumDividerLocation();
							if (divLocation >= maximumDivLocation) {
								if (pnlDetails.getHeight() == pnlDetails.getMinimumSize().getHeight()) {
									showDetailsPane(false);
									fireDetailsPaneHiddenEvent();
								}
							}
						} else if (detailsDividerGreaterThanUserDefined) {
							setDetailsPaneMovingWeight();
							setLastDetailsPaneDividerLocation();
						}
					}
				}
			} else {
				boolean lastUserSettingsNotInitialized = lastUserDefinedDetailsHeight < 0;
				if (lastUserSettingsNotInitialized) {
					lastUserDefinedDetailsHeight = newDetailsHeight;
				}
				boolean detailsDividerGreaterThanUserDefined = newDetailsHeight > lastUserDefinedDetailsHeight;
				if (detailsDividerGreaterThanUserDefined) {
					setDetailsPaneMovingWeight();
					setLastDetailsPaneDividerLocation();
				}
			}
		}
	}

	private boolean isDetailsPaneMovingWeight() {
		return splDetailsPane.getResizeWeight() == 1;
	}

	private boolean isDetailsPaneResizeWeight() {
		return splDetailsPane.getResizeWeight() == 0;
	}

	private void setDetailsPaneResizeWeight() {
		splDetailsPane.setResizeWeight(0);
	}

	private void setDetailsPaneMovingWeight() {
		splDetailsPane.setResizeWeight(1);
	}

	private void checkDetailsPaneTemporaryUnpinned() {
		int notificationWidth = pnlDetails.pnlNotification.getWidth();
		int browseComputerWidth = pnlDetails.pnlBrowseComputer.getWidth();
		double notificationMinimumWidth = pnlDetails.pnlNotification.getMinimumSize().getWidth();
		double browseComputerMinimumWidth = pnlDetails.pnlBrowseComputer.getMinimumSize().getWidth();

		int pinUnpinButtonWidth = pnlDetails.btnPinUnpinDetailsPane.getWidth();
		if (detailsPaneTemporaryUnpinned) {
			boolean pinDetailsPane = false;
			int parentWidth = getParent().getWidth();
			if (parentWidth > browseComputerMinimumWidth + pinUnpinButtonWidth
					&& parentWidth > notificationMinimumWidth + pinUnpinButtonWidth) {
				pinDetailsPane = true;
				//			if (!isPreviewPaneVisible()) {
				//				showPreviewPane(true);
				//			}

				//		showHidePreviewPane();
				//		showHideNavigationPane();
				// showHideButtonParPanel();
			}
			if (pinDetailsPane) {
				lastDifference = getWidth() - notificationMinimumWidth;
				if (isDetailsPaneVisible() && isDetailsPaneUnpinned()) {
					if (detailsPaneTemporaryUnpinned) {
						pinDetailsPane(true);
					}
				}
			}
		} else {
			boolean unPinDetailsPane = false;
			boolean takeBrowseComputer = (browseComputerMinimumWidth >= notificationMinimumWidth);
			if (takeBrowseComputer) {
				if (browseComputerWidth <= browseComputerMinimumWidth) {
					unPinDetailsPane = true;
				}
			} else {
				if (notificationWidth <= notificationMinimumWidth) {
					unPinDetailsPane = true;
				}
			}
			if (unPinDetailsPane) {
				if (isDetailsPaneVisible() && isDetailsPanePinned()) {
					pinDetailsPane(false);
					detailsPaneTemporaryUnpinned = true;
				}
			}
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

	public JPanel getDetailsPanel() {
		return pnlDetails;
	}

	public JSplitPane getSplNavigationPane() {
		return splNavigationAndCurrentViewAndPreviewPane;
	}

	public JSplitPane getSplGameDetailsPane() {
		return splDetailsPane;
	}

	public void addAddGameListener(Action l) {
		// TODO implement
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

	public void addLoadDiscListener(ActionListener l) {
	}

	public void addShowMenuBarListener(ActionListener l) {
		mnuOrganizeOptions.addShowMenuBarListener(l);
	}

	public void addShowNavigationPaneListener(ActionListener l) {
		mnuOrganizeOptions.addShowNavigationListener(l);
	}

	public void addShowPreviewPaneListener(ActionListener l) {
		mnuOrganizeOptions.addShowPreviewListener(l);
	}

	public void addShowGameDetailsListener(ActionListener l) {
		pnlDetails.addShowGameDetailsListener(l);
		mnuOrganizeOptions.addShowGameDetailsListener(l);
	}

	public void addOpenPropertiesListener(ActionListener l) {
		mnuOrganizeOptions.addOpenPropertiesListener(l);
	}

	public void addExitListener(ActionListener l) {
		mnuOrganizeOptions.addExitListener(l);
	}

	public void addBroComponentListener(ComponentListener l) {
		addComponentListener(l);
	}

	public void showInformation(NotificationElement element) {
		pnlDetails.addNotificationElement(element);
	}

	@Override
	public void platformAdded(PlatformEvent e) {
	}

	@Override
	public void platformRemoved(PlatformEvent e) {
	}

	public void addChangeToWelcomeViewListener(ActionListener l) {
		mnuViewSettings.addChangeToWelcomeViewListener(l);
	}

	public void addCoverSizeListener(ChangeListener l) {
		mnuViewSettings.addCoverSizeListener(l);
	}

	public void addChangeToCoversBiggestListener(ActionListener l) {
		mnuViewSettings.addChangeToCoversBiggestListener(l);
	}

	public void addChangeToCoversBigListener(ActionListener l) {
		mnuViewSettings.addChangeToCoversBigListener(l);
	}

	public void addChangeToCoversNormalListener(ActionListener l) {
		mnuViewSettings.addChangeToCoversNormalListener(l);
	}

	public void addChangeToCoversSmallListener(ActionListener l) {
		mnuViewSettings.addChangeToCoversSmallListener(l);
	}

	public void addChangeToCoversSmallestListener(ActionListener l) {
		mnuViewSettings.addChangeToCoversSmallestListener(l);
	}

	public void addChangeToListViewListener(ActionListener l) {
		mnuViewSettings.addChangeToListViewListener(l);
	}

	public void addChangeToElementViewListener(ActionListener l) {
		mnuViewSettings.addChangeToElementViewListener(l);
	}

	public void addChangeToTableViewListener(ActionListener l) {
		mnuViewSettings.addChangeToTableViewListener(l);
	}

	public void addChangeToContentViewListener(ActionListener l) {
		mnuViewSettings.addChangeToContentViewListener(l);
	}

	public void addChangeToSliderViewListener(ActionListener l) {
		mnuViewSettings.addChangeToSliderViewListener(l);
	}

	public void addChangeToCoverViewListener(ActionListener l) {
		mnuViewSettings.addChangeToCoverViewListener(l);
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
		viewManager.addGameDragDropListener(l);
	}

	public void addCoverToLibraryDragDropListener(DropTargetListener l) {
		pnlDetails.pnlBrowseCovers.addCoverDragDropListener(l);
	}

	public void addShowUncategorizedFilesDialogListener(ActionListener l) {
		pnlDetails.pnlBrowseComputer.addShowUncategorizedFilesDialogListener(l);
	}

	public void addPictureFromComputer(ImageIcon icon) {
		pnlDetails.pnlBrowseCovers.addPictureFromComputer(icon);
	}

	public void removeAllPictures() {
		pnlDetails.pnlBrowseCovers.removeAllPictures();
	}

	public void gameCoverChanged(Game game, Image i) {
		String gameCoverPath = game.getCoverPath();
		viewManager.addGameCoverPath(game.getId(), gameCoverPath);
		pnlPreviewPane.gameCoverChanged(game, i);
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

	@Override
	public void languageChanged() {
		pnlNavigation.languageChanged();
		pnlPreviewPane.languageChanged();
		pnlDetails.languageChanged();
		viewManager.getCurrentViewPanel().languageChanged();
		mnuOrganizeOptions.languageChanged();
		mnuViewSettings.languageChanged();
		if (frameDetailsPane != null) {
			frameDetailsPane.setTitle(Messages.get(MessageConstants.INFORMATION_PANEL));
			chkRememberDetailsFrameSizeAndLocation.setText(Messages.get(MessageConstants.REMEMBER_WINDOW_SIZE_AND_POSITION));
		}
	}

	public void updatePlayCountForCurrentGame() {
		pnlPreviewPane.updatePlayCount();
	}

	public void setViewStyle(int viewStyle) {
		viewManager.setViewStyle(viewStyle);
	}

	public boolean isDetailsPaneVisible() {
		return pnlDetails.isVisible();
	}

	public int getGroupBy() {
		return viewManager.getCurrentViewPanel().getGroupBy();
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

	public void setActiveTab(int tabIndex) {
		pnlDetails.setActiveTab(tabIndex);
	}

	public boolean isDetailsPanePinned() {
		return frameDetailsPane == null || !frameDetailsPane.isVisible();
	}

	public boolean isDetailsPaneUnpinned() {
		return frameDetailsPane != null && frameDetailsPane.isVisible();
	}

	public void increaseFontSize() {
		viewManager.inreaseFontSize();
	}

	public void decreaseFontSize() {
		viewManager.decreaseFontSize();
	}

	public void hideExtensions(boolean selected) {
		viewManager.hideExtensions(selected);
	}

	public int getFontSize() {
		return viewManager.getFontSize();
	}

	public void showMenuBar(boolean b) {
		mnuOrganizeOptions.showMenuBar(b);
	}

	public void showStatusBar(boolean b) {
		mnuOrganizeOptions.showStatusBar(b);
	}

	public void setDividerLocations() {
		setLastPreviewPaneDividerLocation();
		setLastDetailsPaneDividerLocation();
	}

	public void setLastNavigationPaneDividerLocation() {
		int lastNavigationPaneDividerLocation = lastNavigationPaneWidth;
		int minimumDivLocation = splNavigationAndCurrentViewAndPreviewPane.getMinimumDividerLocation();
		int maximumDivLocation = splNavigationAndCurrentViewAndPreviewPane.getMaximumDividerLocation();
		if (lastNavigationPaneDividerLocation <= minimumDivLocation) {
			lastNavigationPaneDividerLocation = minimumDivLocation;
		} else if (lastNavigationPaneDividerLocation >= maximumDivLocation) {
			lastNavigationPaneDividerLocation = maximumDivLocation;
		}
		splNavigationAndCurrentViewAndPreviewPane.setDividerLocation(lastNavigationPaneDividerLocation);
	}

	public void setLastPreviewPaneDividerLocation() {
		int lastPreviewPaneDividerLocation = getParent().getWidth() - lastPreviewPaneWidth;
		int minimumDivLocation = splCurrentViewAndPreviewPane.getMinimumDividerLocation();
		int maximumDivLocation = splCurrentViewAndPreviewPane.getMaximumDividerLocation();
		if (lastPreviewPaneDividerLocation <= minimumDivLocation) {
			lastPreviewPaneDividerLocation = minimumDivLocation;
		} else if (lastPreviewPaneDividerLocation >= maximumDivLocation) {
			lastPreviewPaneDividerLocation = maximumDivLocation;
		}
		splCurrentViewAndPreviewPane.setDividerLocation(lastPreviewPaneDividerLocation);
	}

	public void setLastDetailsPaneDividerLocation() {
		int lastDetailsPaneDividerLocation = getHeight() - lastDetailsHeight;
		int minimumDivLocation = splDetailsPane.getMinimumDividerLocation();
		int maximumDivLocation = splDetailsPane.getMaximumDividerLocation();
		if (lastDetailsPaneDividerLocation <= minimumDivLocation) {
			lastDetailsPaneDividerLocation = minimumDivLocation;
		} else if (lastDetailsPaneDividerLocation >= maximumDivLocation) {
			lastDetailsPaneDividerLocation = maximumDivLocation;
		}
		splDetailsPane.setDividerLocation(lastDetailsPaneDividerLocation);
	}

	public Point getLastFrameDetailsPaneLocation() {
		return lastFrameDetailsPaneLocation;
	}

	public Dimension getLastPnlDetailsPreferredSize() {
		return lastPnlDetailsPreferredSize;
	}

	public void addPreviewPaneListener(PreviewPaneListener l) {
		previewPaneListeners.add(l);
	}

	public void addDetailsPaneListener(DetailsPaneListener l) {
		detailsPaneListeners.add(l);
	}

	public String getNavigationPaneState() {
		return pnlNavigation.getNavigationPaneState();
	}

	public int getSelectedNavigationItem() {
		return pnlNavigation.getSelectedNavigationItem();
	}

	public void setTouchScreenOpimizedScrollEnabled(boolean selected) {
		viewManager.setTouchScreenScrollEnabled(selected);
	}

	public ViewPanelManager getViewManager() {
		return viewManager;
	}

	public void gameRated(Game game) {
		viewManager.gameRated(game);
	}

	public void sortBy(int sortBy, PlatformComparator platformComparator) {
		popupView.sortBy(sortBy);
	}

	public void sortOrder(int sortOrder) {
		viewManager.sortOrder(sortOrder);
		popupView.sortOrder(sortOrder);
	}

	public boolean isViewPanelInitialized(int coverView) {
		switch (coverView) {
		case ViewPanel.LIST_VIEW:
			return pnlListView != null;
		case ViewPanel.TABLE_VIEW:
			return pnlTableView != null;
		}
		return false;
	}

	public void pinColumnWidthSliderPanel(JPanel pnlColumnWidthSlider) {
		viewManager.pinColumnWidthSliderPanel(pnlColumnWidthSlider);
	}

	public void unpinColumnWidthSliderPanel(JPanel pnlColumnWidthSlider) {
		viewManager.unpinColumnWidthSliderPanel(pnlColumnWidthSlider);
	}

	public void pinRowHeightSliderPanel(JPanel pnlRowHeightSlider) {
		viewManager.pinRowHeightSliderPanel(pnlRowHeightSlider);
	}

	public void unpinRowHeightSliderPanel(JPanel pnlRowHeightSlider) {
		viewManager.unpinRowHeightSliderPanel(pnlRowHeightSlider);
	}

	public PreviewPanePanel getPreviewPane() {
		return pnlPreviewPane;
	}

	public GameContextMenu getPopupGame() {
		return popupGame;
	}

	public ViewContextMenu getPopupView() {
		return popupView;
	}

	public void activateQuickSearchButton(boolean gamesOrPlatformsFound) {
		pnlDetails.pnlBrowseComputer.activateQuickSearchButton(gamesOrPlatformsFound);
	}

	public void gameAdded(GameAddedEvent e) {
		pnlDetails.pnlBrowseComputer.gameAdded(e);
	}

	public void gameRemoved(GameRemovedEvent e) {
		pnlPreviewPane.gameSelected(new BroGameSelectionEvent());
		pnlDetails.pnlBrowseComputer.gameRemoved(e);
	}

	public void addRateListener(RateListener l) {
		pnlPreviewPane.addRateListener(l);
		popupGame.addRateListener(l);
	}

	public void addTagListener(TagListener l) {
		pnlPreviewPane.addTagListener(l);
		popupGame.addTagListener(l);
	}

	public void addAddFilesListener(ActionListener l) {
		popupView.addAddFilesListener(l);
	}

	public void addAddFoldersListener(ActionListener l) {
		popupView.addAddFoldersListener(l);
	}

	public void addAddGameOrEmulatorFromClipboardListener(Action l) {
		popupView.addAddGameOrEmulatorFromClipboardListener(l);
	}

	public void tagAdded(TagEvent e) {
		pnlPreviewPane.tagAdded(e);
		popupGame.tagAdded(e);
	}

	public void tagRemoved(TagEvent e) {
		pnlPreviewPane.tagRemoved(e);
		popupGame.tagRemoved(e);
	}

	public void addSortByTitleListener(ActionListener l) {
		popupView.addSortByTitleListener(l);
	}

	public void addSortByPlatformListener(ActionListener l) {
		popupView.addSortByPlatformListener(l);
	}

	public void addSortAscendingListener(ActionListener l) {
		popupView.addSortAscendingListener(l);
	}

	public void addSortDescendingListener(ActionListener l) {
		popupView.addSortDescendingListener(l);
	}

	public void addGroupByNoneListener(ActionListener l) {
		popupView.addGroupByNoneListener(l);
	}

	public void addGroupByPlatformListener(ActionListener l) {
		popupView.addGroupByPlatformListener(l);
	}

	public void addGroupByTitleListener(ActionListener l) {
		popupView.addGroupByTitleListener(l);
	}

	public void addSetFilterListener(ActionListener l) {
		popupView.addSetFilterListener(l);
	}

	public void addHideExtensionsListener(ActionListener l) {
		popupView.addHideExtensionsListener(l);
	}

	public void addTouchScreenOptimizedScrollListener(ActionListener l) {
		popupView.addTouchScreenOptimizedScrollListener(l);
	}

	public void addShowToolTipTextsListener(ActionListener l) {
		popupView.addShowToolTipTextsListener(l);
	}

	public void setRefreshGameListListener(ActionListener l) {
		popupView.setRefreshGameListListener(l);
	}

	public void addFullScreenListener(ActionListener l) {
		popupView.addFullScreenListener(l);
	}

	public void showFilterPanel(boolean b) {
		popupView.showFilterPanel(b);
	}

	public int getCurrentView() {
		if (viewManager.getCurrentViewPanel() == pnlBlankView) {
			return ViewPanel.BLANK_VIEW;
		}
		if (viewManager.getCurrentViewPanel() == pnlListView) {
			return viewManager.getViewStyle();
		}
		if (viewManager.getCurrentViewPanel() == pnlTableView) {
			return ViewPanel.TABLE_VIEW;
		}
		return ViewPanel.BLANK_VIEW;
	}

	public void addOpenGameFolderListener(ActionListener l) {
		popupGame.addOpenGameFolderListener(l);
	}

	public void addCopyGamePathListener(ActionListener l) {
		popupGame.addCopyGamePathListener(l);
	}

	public int getSplPreviewPaneDividerLocation() {
		return splCurrentViewAndPreviewPane.getDividerLocation();
	}

	public void setSplPreviewPaneDividerLocation(int divLocation) {
		splCurrentViewAndPreviewPane.setDividerLocation(divLocation);
	}

	@Override
	protected void paintComponent(Graphics g) {
		super.paintComponent(g);
		BufferedImage background = IconStore.current().getCurrentTheme().getView().getImage();
		if (background != null) {
			Graphics2D g2d = (Graphics2D) g.create();
			int panelWidth = getWidth();
			int panelHeight = getHeight();
			int imgWidth = background.getWidth();
			int imgHeight = background.getHeight();
			boolean shouldScale = false;
			if (shouldScale) {
				g2d.drawImage(background, 0, 0, panelWidth, panelHeight, this);
			} else {
				g2d.drawImage(background, 0, 0, imgWidth, imgHeight, this);
			}
			g2d.dispose();
		}
	}
}
