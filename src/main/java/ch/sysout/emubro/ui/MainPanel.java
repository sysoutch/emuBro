package ch.sysout.emubro.ui;

import java.awt.BorderLayout;
import java.awt.Color;
import java.awt.Component;
import java.awt.Dimension;
import java.awt.Font;
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
import java.beans.PropertyChangeEvent;
import java.beans.PropertyChangeListener;
import java.io.File;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import javax.swing.AbstractButton;
import javax.swing.Action;
import javax.swing.BorderFactory;
import javax.swing.DefaultListCellRenderer;
import javax.swing.Icon;
import javax.swing.ImageIcon;
import javax.swing.JCheckBox;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JList;
import javax.swing.JPanel;
import javax.swing.JScrollBar;
import javax.swing.JSplitPane;
import javax.swing.ListModel;
import javax.swing.SwingUtilities;
import javax.swing.UIManager;
import javax.swing.WindowConstants;
import javax.swing.border.Border;
import javax.swing.plaf.SplitPaneUI;
import javax.swing.plaf.basic.BasicSplitPaneUI;
import javax.swing.table.TableModel;

import org.apache.commons.io.FilenameUtils;

import com.jgoodies.forms.factories.Paddings;
import com.jgoodies.forms.layout.CellConstraints;
import com.jgoodies.forms.layout.FormLayout;

import ch.sysout.emubro.api.PlatformListener;
import ch.sysout.emubro.api.event.EmulatorEvent;
import ch.sysout.emubro.api.event.FilterEvent;
import ch.sysout.emubro.api.event.GameAddedEvent;
import ch.sysout.emubro.api.event.GameSelectionEvent;
import ch.sysout.emubro.api.event.PlatformEvent;
import ch.sysout.emubro.api.filter.Criteria;
import ch.sysout.emubro.api.filter.Filter;
import ch.sysout.emubro.api.model.Explorer;
import ch.sysout.emubro.api.model.Game;
import ch.sysout.emubro.api.model.Platform;
import ch.sysout.emubro.api.model.PlatformComparator;
import ch.sysout.emubro.controller.GameSelectionListener;
import ch.sysout.emubro.impl.event.NavigationEvent;
import ch.sysout.emubro.impl.filter.GameFilter;
import ch.sysout.emubro.impl.filter.NullFilter;
import ch.sysout.emubro.impl.filter.PlatformFilter;
import ch.sysout.emubro.impl.model.BroGame;
import ch.sysout.emubro.impl.model.EmulatorConstants;
import ch.sysout.emubro.impl.model.PlatformConstants;
import ch.sysout.emubro.util.MessageConstants;
import ch.sysout.util.Icons;
import ch.sysout.util.Messages;
import ch.sysout.util.ScreenSizeUtil;
import ch.sysout.util.UIUtil;

public class MainPanel extends JPanel implements PlatformListener, GameSelectionListener, LanguageListener {
	private static final long serialVersionUID = 1L;

	private int size = ScreenSizeUtil.is3k() ? 32 : 24;
	private OrganizePopupMenu mnuOrganizeOptions = new OrganizePopupMenu();
	private ViewSettingsPopupMenu mnuViewSettings = new ViewSettingsPopupMenu();
	private BlankViewPanel pnlBlankView;
	private ListViewPanel pnlListView;
	private TableViewPanel pnlTableView;
	private CoverViewPanel pnlCoverView;
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
	private Map<String, ImageIcon> gameCovers = new HashMap<>();
	private Explorer explorer;
	protected JFrame frameDetailsPane;
	protected WindowListener frameDetailsWindowAdapter;
	private List<DetailsFrameListener> detailsFrameListeners = new ArrayList<>();

	private CellConstraints ccMainPanel;

	private int lastUserDefinedPreviewWidth;
	private int lastUserDefinedDetailsHeight;

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

	private Criteria criteria;

	private ViewPanelManager viewManager;

	private GameContextMenu popupGame;

	public MainPanel(Explorer explorer, ViewPanelManager viewManager) {
		super(new BorderLayout());
		this.explorer = explorer;
		this.viewManager = viewManager;
		initComponents();
		createUI();
	}

	private void initComponents() {
		popupGame = new GameContextMenu();
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

		pnlBlankView = new BlankViewPanel();
		changeViewPanelTo(pnlBlankView);
	}

	protected void fireDetailsFrameClosingEvent() {
		for (DetailsFrameListener l : detailsFrameListeners) {
			l.detailsFrameClosing();
		}
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
				pnlRemember.setBorder(Paddings.DLU2);
				chkRememberDetailsFrameSizeAndLocation = new JCheckBox(Messages.get(MessageConstants.REMEMBER_WINDOW_SIZE_AND_POSITION));
				pnlRemember.add(chkRememberDetailsFrameSizeAndLocation);
				frameDetailsPane.add(pnlRemember, BorderLayout.SOUTH);
			}
			frameDetailsPane.setTitle(Messages.get(MessageConstants.INFORMATION_PANEL));
			removeSplDetailsPane();
			frameDetailsPane.add(pnlDetails);
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
			pnlPreviewPane = new PreviewPanePanel(explorer, popupGame);
		}
		pnlPreviewPane.setMinimumSize(new Dimension(0, 0));
		splCurrentViewAndPreviewPane = new JSplitPane(JSplitPane.HORIZONTAL_SPLIT, true,
				viewManager.getCurrentViewPanel(), pnlPreviewPane) {
			private static final long serialVersionUID = 1L;

			@Override
			public int getMinimumDividerLocation() {
				return ScreenSizeUtil.adjustValueToResolution(360 - splNavigationAndCurrentViewAndPreviewPane.getDividerLocation());
			}
		};
		splCurrentViewAndPreviewPane.getRightComponent().setVisible(false);
		splCurrentViewAndPreviewPane.setBorder(BorderFactory.createEmptyBorder());
		splCurrentViewAndPreviewPane.setResizeWeight(1);
	}

	private void initializeNavigationAndCurrentViewAndPreviewPane() {
		pnlNavigation = new NavigationPanel();
		splNavigationAndCurrentViewAndPreviewPane = new JSplitPane(JSplitPane.HORIZONTAL_SPLIT, true, pnlNavigation,
				splCurrentViewAndPreviewPane);
		splNavigationAndCurrentViewAndPreviewPane.getLeftComponent().setVisible(false);
		splNavigationAndCurrentViewAndPreviewPane.setBorder(BorderFactory.createEmptyBorder());
		splNavigationAndCurrentViewAndPreviewPane.setResizeWeight(0);
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
					System.out.println("1st: "+scrollBarWidth);
					if (scrollBarWidth == 0) {
						System.out.println("2nd: "+scrollBarWidth);
						scrollBarWidth = ((Integer)UIManager.get("ScrollBar.width")).intValue();
						System.out.println("3rd: "+scrollBarWidth);
						//							pnlNavigation.getSpNavigationButtons().setVerticalScrollBarPolicy(JScrollPane.VERTICAL_SCROLLBAR_AS_NEEDED);
					}
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

		splNavigationAndCurrentViewAndPreviewPane.addPropertyChangeListener(
				JSplitPane.DIVIDER_LOCATION_PROPERTY, listener);
	}

	void setCurrentViewPanel(int defaultViewPanel, List<Game> games) {
		switch (defaultViewPanel) {
		case ViewPanel.LIST_VIEW:
			if (pnlListView == null) {
				pnlListView = new ListViewPanel(popupGame);
				viewManager.initializeViewPanel(pnlListView, games);
				setGameListRenderer();
			}
			viewManager.setCurrentViewPanel(pnlListView);
			break;
		case ViewPanel.TABLE_VIEW:
			if (pnlTableView == null) {
				pnlTableView = new TableViewPanel(viewManager.getIconStore());
				viewManager.initializeViewPanel(pnlTableView, games);
			}
			viewManager.setCurrentViewPanel(pnlTableView);
			pnlTableView.adjustColumns();
			break;
		case ViewPanel.COVER_VIEW:
			if (pnlCoverView == null) {
				pnlCoverView = new CoverViewPanel(viewManager.getIconStore());
				viewManager.initializeViewPanel(pnlCoverView, games);
				SwingUtilities.invokeLater(new Runnable() {

					@Override
					public void run() {
						pnlCoverView.initCovers();
					}
				});
			}
			viewManager.setCurrentViewPanel(pnlCoverView);
			break;
		default:
			viewManager.setCurrentViewPanel(pnlListView);
		}
		changeViewPanelTo(viewManager.getCurrentViewPanel());
		viewManager.getCurrentViewPanel().requestFocusInWindow();
	}

	private void createUI() {
		setBorder(BorderFactory.createLoweredSoftBevelBorder());
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
			((BasicSplitPaneUI) spui).getDivider().addMouseMotionListener(new MouseMotionAdapter() {
				@Override
				public void mouseDragged(MouseEvent e) {
					System.out.println("preview div dragged");
					int loc = splNavigationAndCurrentViewAndPreviewPane.getDividerLocation();
					if (splCurrentViewAndPreviewPane.getDividerLocation() <= splCurrentViewAndPreviewPane.getMinimumDividerLocation()) {
						lastUserDefinedPreviewWidth = getParent().getWidth() - splCurrentViewAndPreviewPane.getMinimumDividerLocation() + loc;
						splCurrentViewAndPreviewPane.setDividerLocation(splCurrentViewAndPreviewPane.getMinimumDividerLocation());
						return;
					}
					lastUserDefinedPreviewWidth = getParent().getWidth() - splCurrentViewAndPreviewPane.getDividerLocation() + loc;

					int divLocation = pnlPreviewPane.getWidth();
					int dividerSize = splCurrentViewAndPreviewPane.getDividerSize();
					int scrollBarSize = pnlPreviewPane.getScrollBarSize();
					int limit = (int) pnlPreviewPane.getPreferredSize().getWidth() + dividerSize
							+ (pnlPreviewPane.isScrollBarVisible() ? scrollBarSize : 0);
					//					if (divLocation > 0 && limit > 0 && divLocation <= limit) {
					//						if (splCurrentViewAndPreviewPane.getLastDividerLocation() > 0 && splCurrentViewAndPreviewPane
					//								.getDividerLocation() > splCurrentViewAndPreviewPane.getLastDividerLocation()) {
					//							splCurrentViewAndPreviewPane
					//							.setDividerLocation(splCurrentViewAndPreviewPane.getMaximumDividerLocation() - limit);
					//							System.err.println("stoppppppppppppppp");
					//						}
					//						// lastDivLocation = super.getDividerLocation();
					//					}

					if (divLocation > 0 && limit > 0 && divLocation <= limit) {
						if (splCurrentViewAndPreviewPane.getLastDividerLocation() > 0 && splCurrentViewAndPreviewPane
								.getDividerLocation() > splCurrentViewAndPreviewPane.getLastDividerLocation()) {
							splCurrentViewAndPreviewPane.setDividerLocation(splCurrentViewAndPreviewPane.getMaximumDividerLocation() - limit);
							lastUserDefinedPreviewWidth = getParent().getWidth() - splCurrentViewAndPreviewPane.getDividerLocation();

							//						if (splDetailsPane.getLastDividerLocation() < splDetailsPane.getDividerLocation()) {
							System.err.println("limit: "+limit);
							if (e.getX() >= (limit / 2)) {
								showPreviewPane(false);
								firePreviewPaneHiddenEvent();
							}
							//						}
						}
					}
				}
			});
		}
		SplitPaneUI spui2 = splDetailsPane.getUI();
		if (spui2 instanceof BasicSplitPaneUI) {
			// Setting a mouse listener directly on split pane does not work, because no events are being received.
			((BasicSplitPaneUI) spui2).getDivider().addMouseMotionListener(new MouseMotionAdapter() {
				@Override
				public void mouseDragged(MouseEvent e) {
					lastUserDefinedDetailsHeight = getHeight() - splDetailsPane.getDividerLocation();
					int minimumDetailsDividerLocation = splDetailsPane.getMinimumDividerLocation();
					boolean detailsDividerEqualOrLessThanMinimum = splDetailsPane.getDividerLocation() <= minimumDetailsDividerLocation;
					if (detailsDividerEqualOrLessThanMinimum) {
						splDetailsPane.setDividerLocation(minimumDetailsDividerLocation);
						return;
					}
					if (splDetailsPane.getDividerLocation() == splDetailsPane.getMaximumDividerLocation()) {
						//						if (splDetailsPane.getLastDividerLocation() < splDetailsPane.getDividerLocation()) {


						//						if (e.getX() >= ((getHeight() - splDetailsPane.getMaximumDividerLocation()) / 2)) {
						//						if (e.getY() >= ScreenSizeUtil.adjustValueToResolution(64)) {
						if (e.getY() >= (pnlDetails.getHeight() / 2)) {
							showDetailsPane(false);
							fireDetailsPaneHiddenEvent();
						}
						//						}
					}
				}
			});
		}
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

	public void adjustSplitPaneDividerSizes() {
		int dividerSize = splDetailsPane.getDividerSize();
		int value = ScreenSizeUtil.adjustValueToResolution(dividerSize);
		splDetailsPane.setDividerSize(value);
		splCurrentViewAndPreviewPane.setDividerSize(value);
		splNavigationAndCurrentViewAndPreviewPane.setDividerSize(value);
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
		//		SwingUtilities.invokeLater(new Runnable() {
		//
		//			@Override
		//			public void run() {
		//				setLastNavigationDividerLocation();
		//			}
		//		});
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
		UIUtil.doHover(false, pnlDetails.btnHideDetailsPane, pnlDetails.btnPinUnpinDetailsPane);
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
	}

	@Override
	public void gameSelected(GameSelectionEvent e) {
		Game game = e.getGame();
		boolean b = game != null;
		pnlPreviewPane.gameSelected(e);
		pnlDetails.gameSelected(e);
		if (game != null) {
			String gameCoverPath = game.getCoverPath();
			ImageIcon img;
			if (gameCoverPath != null && !gameCoverPath.trim().isEmpty()) {
				if (!gameCovers.containsKey(gameCoverPath) || gameCovers.get(gameCoverPath) == null) {
					gameCovers.put(gameCoverPath, ImageUtil.getImageIconFrom(gameCoverPath, true));
				}
				img = gameCovers.get(gameCoverPath);
			} else {
				int platformId = e.getGame().getPlatformId();
				img = viewManager.getIconStore().getPlatformCover(platformId);
			}
			if (img != null) {
				pnlPreviewPane.gameCoverChanged(game, img.getImage());
				doDirtyGameCoverRepaintFix();
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

	public boolean isNavigationPaneVisible() {
		return pnlNavigation.isVisible();
	}

	public boolean isPreviewPaneVisible() {
		return pnlPreviewPane.isVisible();
	}

	public int getCurrentViewPanelType() {
		ViewPanel currentViewPanel = viewManager.getCurrentViewPanel();
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
		return viewManager.getCurrentViewPanel();
	}

	protected void showHidePanels() {
		checkMinimizePreviewPane();
		checkMinimizeDetailsPane();
		checkDetailsPaneTemporaryUnpinned();
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
				boolean lastUserSettingsNotInitialized = lastUserDefinedPreviewWidth <= 0;
				setPreviewPaneResizeWeight();
				if (lastUserSettingsNotInitialized) {
					lastUserDefinedPreviewWidth = newPreviewWidth;
				} else {
					if (isPreviewPaneMovingWeight()) {
						if (newPreviewWidth <= lastUserDefinedPreviewWidth) {
							setPreviewPaneResizeWeight();
						} else {
							splCurrentViewAndPreviewPane.setDividerLocation(getWidth() - lastUserDefinedPreviewWidth);
							System.out.println("yayyyyyyyy");
						}
					} else if (isPreviewPaneResizeWeight()) {
						boolean previewDividerLesserThanUserDefined = newPreviewWidth < lastUserDefinedPreviewWidth;
						boolean previewDividerGreaterThanUserDefined = newPreviewWidth > lastUserDefinedPreviewWidth;
						if (previewDividerLesserThanUserDefined) {
							setLastPreviewPaneDividerLocation();
							int divLocation = splCurrentViewAndPreviewPane.getDividerLocation();
							int dividerSize = splCurrentViewAndPreviewPane.getDividerSize();
							int scrollBarSize = pnlPreviewPane.getScrollBarSize();
							int limit = (int) pnlPreviewPane.getPreferredSize().getWidth() + dividerSize
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
				}
			} else {
				boolean lastUserSettingsNotInitialized = lastUserDefinedPreviewWidth <= 0;
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
				boolean lastUserSettingsNotInitialized = lastUserDefinedDetailsHeight <= 0;
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
				boolean lastUserSettingsNotInitialized = lastUserDefinedDetailsHeight <= 0;
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
			boolean takeNotification = (notificationMinimumWidth <= browseComputerMinimumWidth);
			if (takeNotification) {
				if (notificationWidth <= notificationMinimumWidth) {
					// showHideGameFilterPanel();
					//			if (isPreviewPaneVisible()) {
					//				showPreviewPane(false);
					//			}
					unPinDetailsPane = true;
				}
			} else {
				if (browseComputerWidth <= browseComputerMinimumWidth) {
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

	public JSplitPane getSplPreviewPane() {
		return splCurrentViewAndPreviewPane;
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

	public ListModel<Game> getGameListModel() {
		return pnlListView.getListModel();
	}

	public TableModel getGameTableModel() {
		return pnlTableView.getTableModel();
	}

	public void setGameTableModel(TableModel model) {
		pnlTableView.setTableModel(model);
	}

	@Override
	public void platformAdded(PlatformEvent e) {
		Platform p = e.getPlatform();
		viewManager.getIconStore().addPlatformIcon(p.getId(), p.getIconFileName());
	}

	@Override
	public void platformRemoved(PlatformEvent e) {

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
		viewManager.addGameDragDropListener(l);
	}

	public void addCoverToLibraryDragDropListener(DropTargetListener l) {
		pnlDetails.pnlBrowseCovers.addCoverDragDropListener(l);
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

	public void filterSet(FilterEvent e) {
		criteria = e.getCriteria();
		if (!criteria.getText().isEmpty()) {
			if (e instanceof GameFilterEvent) {
				Filter<Game> filter = new GameFilter();
				//				mdlLstFilteredGames.removeAllElements();
				//				updateGameCount(mdlLstAllGames.getSize());
				int counter = 0;
				//				List<Game> test = new ArrayList<>();
				//				for (Game g : mdlLstAllGames.getAllElements()) {
				//					if (filter.match(criteria, g)) {
				//						test.add(g);
				//						counter++;
				//					}
				//				}
				//				mdlLstFilteredGames.addElements(test);

				final int counterFinal = counter;
				SwingUtilities.invokeLater(new Runnable() {

					/*
					 * This invokeLater has been done cause of a known java bug
					 * "AWT-EventQueue-0"
					 * java.lang.ArrayIndexOutOfBoundsException when calling
					 * setModel()
					 */
					@Override
					public void run() {
						//						setGameTableModel(mdlTblGamesFiltered);
						// view.setGameCoversModel(mdlCoversFiltered);
						//						setGameListModel(mdlLstFilteredGames, true);
						//						updateGameCount(mdlLstFilteredGames.getSize());

						//						setGameTableModel(mdlTblGamesFiltered);
						// view.setGameCoversModel(mdlCoversFiltered);
						//						filterSet(e, counterFinal);
					}
				});
			}
			if (e instanceof PlatformFilterEvent) {
				Filter<Platform> filter = new PlatformFilter();
				//				mdlLstFilteredGames.removeAllElements();
				//				updateGameCount(mdlLstAllGames.getSize());
				int counter = 0;
				//				List<Game> test = new ArrayList<>();
				//				for (Game g : mdlLstAllGames.getAllElements()) {
				//					if (filter.match(criteria, explorer.getPlatform(g.getPlatformId()))) {
				//						test.add(g);
				//						counter++;
				//					}
				//				}
				//				mdlLstFilteredGames.addElements(test);

				final int counterFinal = counter;
				SwingUtilities.invokeLater(new Runnable() {

					/*
					 * This invokeLater has been done cause of a known java bug
					 * "AWT-EventQueue-0"
					 * java.lang.ArrayIndexOutOfBoundsException when calling
					 * setModel()
					 */
					@Override
					public void run() {
						//						setGameTableModel(mdlTblGamesFiltered);
						// view.setGameCoversModel(mdlCoversFiltered);
						//						setGameListModel(mdlLstFilteredGames, true);
						//						updateGameCount(mdlLstFilteredGames.getSize());

						//						setGameTableModel(mdlTblGamesFiltered);
						// view.setGameCoversModel(mdlCoversFiltered);
						//						filterSet(e, counterFinal);
					}
				});
			}
		} else {
			new NullFilter();
			//			mdlLstFilteredGames.clear();
			SwingUtilities.invokeLater(new Runnable() {
				/*
				 * This invokeLater has been done cause of a known java bug
				 * "AWT-EventQueue-0"
				 * java.lang.ArrayIndexOutOfBoundsException when calling
				 * setModel()
				 */
				@Override
				public void run() {
					//					setGameListModel(mdlLstAllGames);
					//					updateGameCount(mdlLstAllGames.getSize());
					//					filterSet(e, -1);
				}
			});
		}
	}

	@Override
	public void languageChanged() {
		pnlNavigation.languageChanged();
		pnlPreviewPane.languageChanged();
		pnlDetails.languageChanged();
		viewManager.getCurrentViewPanel().languageChanged();
		mnuOrganizeOptions.languageChanged();

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

	public void setFontSize(int value) {
		viewManager.setFontSize(value);
	}

	public void showMenuBar(boolean b) {
		mnuOrganizeOptions.showMenuBar(b);
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

	public void setGameListRenderer() {
		DefaultListCellRenderer renderer;
		pnlListView.setGameListRenderer(renderer = new DefaultListCellRenderer() {
			private static final long serialVersionUID = 1L;
			final Color colorFavorite = new Color(250, 176, 42);
			private Border borderHover = BorderFactory.createLineBorder(pnlListView.getGameList().getSelectionBackground(), 2, false);
			//			private Border borderMargin = new EmptyBorder(10, 10, 10, 10);
			//			private Border borderCompoundHover = new CompoundBorder(borderHover, borderMargin);

			@Override
			public Component getListCellRendererComponent(JList<?> list, Object value, int index, boolean isSelected,
					boolean cellHasFocus) {
				JLabel label = (JLabel) super.getListCellRendererComponent(list, value, index, isSelected,
						cellHasFocus);
				BroGame game = (BroGame) value;
				checkGameIcon(game, label);
				checkCriteria(label, isSelected);
				checkIsFavorite(game, label);
				checkIsGameSelected(index, label);
				checkHideExtensions(viewManager.isHideExtensionsEnabled(), game.getPath(), label);
				checkFontAndFontSize(label);
				if (pnlListView.isDragging()) {
					setEnabled(true);
				}
				return label;
			}

			private void checkGameIcon(BroGame game, JLabel label) {
				Icon gameIcon = viewManager.getIconStore().getGameIcon(game.getId());
				if (gameIcon != null) {
					label.setIcon(gameIcon);
					label.setDisabledIcon(gameIcon);
				} else {
					int emulatorId = game.getEmulatorId();
					if (emulatorId == EmulatorConstants.NO_EMULATOR) {
						int platformId = game.getPlatformId();
						if (platformId == PlatformConstants.NO_PLATFORM) {
							// should not happen in general. there is a bug
							// somewhere else
						} else {
							Icon platformIcon = viewManager.getIconStore().getPlatformIcon(platformId);
							label.setIcon(platformIcon);
							label.setDisabledIcon(platformIcon);
						}
					}
				}
			}

			private void checkFontAndFontSize(JLabel label) {
				Font labelFont = label.getFont();
				if (viewManager.getFontSize() <= 0) {
					viewManager.setFontSize(label.getFont().getSize());
				}
				label.setFont(new Font(labelFont.getName(), Font.PLAIN, pnlListView.getfontSize()));
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

			private void checkIsGameSelected(int index, JLabel label) {
				if (index > -1 && index == pnlListView.getMouseOver() && index != pnlListView.getGameList().getSelectedIndex()) {
					label.setForeground(pnlListView.getGameList().getSelectionBackground());
					label.setBorder(borderHover);
				}
				if (index == pnlListView.getGameList().getSelectedIndex()) {
					label.setForeground(UIManager.getColor("List.selectionForeground"));
				}
			}

			private void checkIsFavorite(BroGame game, JLabel label) {
				if (game.isFavorite()) {
					label.setForeground(colorFavorite);
					label.setText("<html><strong>" + label.getText() + "</strong></html>");
				}
			}

			private void checkCriteria(JLabel label, boolean isSelected) {
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
			}
		});
	}

	public void initGameCovers() {
		if (getCurrentViewPanelType() == ViewPanel.COVER_VIEW) {
			pnlCoverView.initGameCovers();
		}
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

	public boolean isFilterFavoriteActive() {
		return false;
	}

	public void sortBy(int sortBy, PlatformComparator platformComparator) {
		viewManager.sortBy(sortBy, platformComparator);
	}

	public void sortOrder(int sortOrder) {
		viewManager.sortOrder(sortOrder);
	}

	public boolean isViewPanelInitialized(int coverView) {
		switch (coverView) {
		case ViewPanel.LIST_VIEW:
			return pnlListView != null;
		case ViewPanel.TABLE_VIEW:
			return pnlTableView != null;
		case ViewPanel.COVER_VIEW:
			return pnlCoverView != null;
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

	public void activateQuickSearchButton(boolean gamesOrPlatformsFound) {
		pnlDetails.pnlBrowseComputer.activateQuickSearchButton(gamesOrPlatformsFound);
	}

	public void gameAdded(GameAddedEvent e) {
		pnlDetails.pnlBrowseComputer.gameAdded(e);
	}
}