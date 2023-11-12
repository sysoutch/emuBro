package ch.sysout.emubro.ui;

import java.awt.AlphaComposite;
import java.awt.BorderLayout;
import java.awt.Color;
import java.awt.Component;
import java.awt.Cursor;
import java.awt.Dimension;
import java.awt.FlowLayout;
import java.awt.Font;
import java.awt.GradientPaint;
import java.awt.Graphics;
import java.awt.Graphics2D;
import java.awt.Image;
import java.awt.MultipleGradientPaint.CycleMethod;
import java.awt.RadialGradientPaint;
import java.awt.RenderingHints;
import java.awt.dnd.DropTarget;
import java.awt.dnd.DropTargetListener;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.awt.event.FocusAdapter;
import java.awt.event.FocusEvent;
import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;
import java.awt.event.MouseListener;
import java.awt.event.MouseMotionListener;
import java.awt.font.TextAttribute;
import java.awt.geom.Point2D;
import java.awt.geom.Rectangle2D;
import java.awt.image.BufferedImage;
import java.time.LocalDateTime;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.TimeUnit;

import javax.swing.AbstractButton;
import javax.swing.BorderFactory;
import javax.swing.BoxLayout;
import javax.swing.Icon;
import javax.swing.ImageIcon;
import javax.swing.JButton;
import javax.swing.JComponent;
import javax.swing.JLabel;
import javax.swing.JMenu;
import javax.swing.JMenuItem;
import javax.swing.JPanel;
import javax.swing.JPopupMenu;
import javax.swing.JScrollPane;
import javax.swing.JTextArea;
import javax.swing.JTextPane;
import javax.swing.ScrollPaneConstants;
import javax.swing.SwingConstants;
import javax.swing.SwingUtilities;
import javax.swing.UIManager;
import javax.swing.text.SimpleAttributeSet;
import javax.swing.text.StyleConstants;
import javax.swing.text.StyledDocument;

import org.apache.commons.io.FilenameUtils;

import com.formdev.flatlaf.extras.FlatSVGIcon;
import com.jgoodies.forms.factories.CC;
import com.jgoodies.forms.factories.Paddings;
import com.jgoodies.forms.layout.CellConstraints;
import com.jgoodies.forms.layout.FormLayout;

import ch.sysout.emubro.api.PlatformFromGameListener;
import ch.sysout.emubro.api.RunGameWithListener;
import ch.sysout.emubro.api.ScrollToCurrentGamesListener;
import ch.sysout.emubro.api.TagListener;
import ch.sysout.emubro.api.event.GameRenamedEvent;
import ch.sysout.emubro.api.event.GameSelectionEvent;
import ch.sysout.emubro.api.event.TagEvent;
import ch.sysout.emubro.api.model.Explorer;
import ch.sysout.emubro.api.model.Game;
import ch.sysout.emubro.api.model.Platform;
import ch.sysout.emubro.api.model.Tag;
import ch.sysout.emubro.controller.GameSelectionListener;
import ch.sysout.emubro.impl.event.BroTagAddedEvent;
import ch.sysout.emubro.ui.listener.RateListener;
import ch.sysout.emubro.util.ColorConstants;
import ch.sysout.emubro.util.MessageConstants;
import ch.sysout.ui.util.FontUtil;
import ch.sysout.ui.util.ImageUtil;
import ch.sysout.ui.util.UIUtil;
import ch.sysout.util.Icons;
import ch.sysout.util.Messages;
import ch.sysout.util.ScreenSizeUtil;

public class PreviewPanePanel extends JPanel implements GameSelectionListener {
	private static final long serialVersionUID = 1L;

	private SelectionPanel pnlSelection = new SelectionPanel();
	private NoSelectionPanel pnlNoSelection;
	private int lastVerticalScrollBarValue;
	private JScrollPane spSelection;

	private List<Game> currentGames;

	private Explorer explorer;

	public ViewContextMenu popupView;
	private GameContextMenu popupGame;

	private GameFilterPanel pnlGameFilter;

	private List<Tag> defaultTags;

	private List<PlatformFromGameListener> platformFromGameListeners = new ArrayList<>();

	private List<RunGameWithListener> runGameWithListeners = new ArrayList<>();

	private AbstractButton btnResizePreviewPane = new JCustomButton();

	private Image gameBannerImage;

	int thickness = 250;
	private Color transparentColor = new Color(0f, 0f, 0f, 0.4f);
	private Color color1 = transparentColor;
	private Color color2;

	private GradientPaint gp3;
	private GradientPaint gp2;
	private GradientPaint gp4;

	private GradientPaint gp1;

	private Image outputImage;

	private GradientPaint gp33;

	public PreviewPanePanel(Explorer explorer, GameContextMenu popupGame, ViewContextMenu popupView) {
		super();
		this.explorer = explorer;
		this.popupGame = popupGame;
		this.popupView = popupView;

		Theme currentTheme = IconStore.current().getCurrentTheme();
		ThemeBackground themeBackground = currentTheme.getPreviewPane();
		if (themeBackground.hasColor()) {
			color2 = themeBackground.getColor();
		} else if (themeBackground.hasGradientPaint()) {
			color2 = themeBackground.getGradientPaint().getColor2();
		}
		gp1 = new GradientPaint(0, thickness, color1, 0, 0, color2, true);
		initComponents();
		setIcons();
		createUI();
	}

	private void setIcons() {
		int size = ScreenSizeUtil.is3k() ? 16 : 12;
		btnResizePreviewPane.setIcon(ImageUtil.getImageIconFrom(Icons.get("barsWhiteVertical", size, size)));
	}

	private void initComponents() {
		btnResizePreviewPane.setFocusable(false);
		btnResizePreviewPane.addMouseListener(new MouseAdapter() {
			@Override
			public void mouseEntered(MouseEvent e) {
				super.mouseEntered(e);
				btnResizePreviewPane.setCursor(Cursor.getPredefinedCursor(Cursor.E_RESIZE_CURSOR | Cursor.W_RESIZE_CURSOR));
			}

			@Override
			public void mouseExited(MouseEvent e) {
				super.mouseExited(e);
				btnResizePreviewPane.setCursor(null);
			}
		});
		pnlNoSelection = new NoSelectionPanel();
		spSelection = new JCustomScrollPane(pnlSelection, ScrollPaneConstants.VERTICAL_SCROLLBAR_AS_NEEDED,
				ScrollPaneConstants.HORIZONTAL_SCROLLBAR_NEVER);
		pnlNoSelection.setMinimumSize(new Dimension(0, 0));
		spSelection.setVisible(false);
		initNoSelectionText();
	}

	public void addScrollToCurrentGamesListener(ScrollToCurrentGamesListener l) {
		pnlSelection.evs.add(l);
	}

	private Image blurBorder(Image input, double border) {
		int w = input.getWidth(this);
		int h = input.getHeight(this);
		BufferedImage output = new BufferedImage(w, h, BufferedImage.TYPE_INT_ARGB);

		Graphics2D g = output.createGraphics();
		g.drawImage(input, 0, 0, null);

		g.setComposite(AlphaComposite.DstOut);
		Color c0 = new Color(0, 0, 0, 255);
		Color c1 = new Color(0, 0, 0, 0);

		double cy = border;
		double cx = border;

		// Left
		g.setPaint(new GradientPaint(new Point2D.Double(0, cy), c0, new Point2D.Double(cx, cy), c1));
		g.fill(new Rectangle2D.Double(0, cy, cx, h - cy - cy));

		// Right
		g.setPaint(new GradientPaint(new Point2D.Double(w - cx, cy), c1, new Point2D.Double(w, cy), c0));
		g.fill(new Rectangle2D.Double(w - cx, cy, cx, h - cy - cy));

		// Top
		g.setPaint(new GradientPaint(new Point2D.Double(cx, 0), c0, new Point2D.Double(cx, cy), c1));
		g.fill(new Rectangle2D.Double(cx, 0, w - cx - cx, cy));

		// Bottom
		g.setPaint(new GradientPaint(new Point2D.Double(cx, h - cy), c1, new Point2D.Double(cx, h), c0));
		g.fill(new Rectangle2D.Double(cx, h - cy, w - cx - cx, cy));

		// Top Left
		g.setPaint(new RadialGradientPaint(new Rectangle2D.Double(0, 0, cx + cx, cy + cy), new float[] { 0, 1 },
				new Color[] { c1, c0 }, CycleMethod.NO_CYCLE));
		g.fill(new Rectangle2D.Double(0, 0, cx, cy));

		// Top Right
		g.setPaint(new RadialGradientPaint(new Rectangle2D.Double(w - cx - cx, 0, cx + cx, cy + cy),
				new float[] { 0, 1 }, new Color[] { c1, c0 }, CycleMethod.NO_CYCLE));
		g.fill(new Rectangle2D.Double(w - cx, 0, cx, cy));

		// Bottom Left
		g.setPaint(new RadialGradientPaint(new Rectangle2D.Double(0, h - cy - cy, cx + cx, cy + cy),
				new float[] { 0, 1 }, new Color[] { c1, c0 }, CycleMethod.NO_CYCLE));
		g.fill(new Rectangle2D.Double(0, h - cy, cx, cy));

		// Bottom Right
		g.setPaint(new RadialGradientPaint(new Rectangle2D.Double(w - cx - cx, h - cy - cy, cx + cx, cy + cy),
				new float[] { 0, 1 }, new Color[] { c1, c0 }, CycleMethod.NO_CYCLE));
		g.fill(new Rectangle2D.Double(w - cx, h - cy, cx, cy));

		g.dispose();

		return output;
	}

	private void initNoSelectionText() {
		pnlNoSelection.initNoSelectionText();
	}

	public void initDefaultTags(List<Tag> tags) {
		defaultTags = tags;
	}

	public void addResizePreviewPaneListener(MouseMotionListener l) {
		btnResizePreviewPane.addMouseMotionListener(l);
	}

	public void addCoverDragDropListener(DropTargetListener l) {
		new DropTarget(pnlSelection, l);
	}

	public void addRateListener(RateListener l) {
		pnlSelection.pnlRatingBar.addRateListener(l);
	}

	public void addTagListener(TagListener l) {
		pnlSelection.pnlTags.addTagListener(l);
	}

	private void createUI() {
		// FIXME do it now
		spSelection.setMinimumSize(new Dimension(0, 0));
		pnlSelection.setMinimumSize(new Dimension(0, 0));
		pnlNoSelection.setMinimumSize(new Dimension(0, 0));

		//		BoxLayout layout = new BoxLayout(this, BoxLayout.PAGE_AXIS);
		BorderLayout layout = new BorderLayout();
		setLayout(layout);

		spSelection.setBorder(BorderFactory.createEmptyBorder());
		pnlSelection.setBorder(BorderFactory.createEmptyBorder(10, 0, 10, 16));
		pnlNoSelection.setBorder(BorderFactory.createEmptyBorder(10, 0, 10, 16));

		//		add(spSelection, BorderLayout.NORTH);
		//		add(btnResizePreviewPane, BorderLayout.WEST);
		add(pnlNoSelection);
		spSelection.setOpaque(false);
		spSelection.getViewport().setOpaque(false);
	}

	@Override
	public void gameSelected(GameSelectionEvent e) {
		pnlSelection.pnlRatingBar.gameSelected(e);
		lastVerticalScrollBarValue = spSelection.getVerticalScrollBar().getValue();
		currentGames = e.getGames();
		boolean revalidateAndRepaint = false;
		if (currentGames != null && currentGames.size() > 0) {
			if (!spSelection.isVisible()) {
				remove(pnlNoSelection);
				add(spSelection);
				revalidateAndRepaint = true;
				spSelection.setVisible(true);
				pnlNoSelection.setVisible(false);
			}
			if (currentGames.size() == 1) {
				Game firstGame = currentGames.get(0);
				int platformId = firstGame.getPlatformId();
				Icon icon = IconStore.current().getPlatformIcon(platformId);
				boolean favorite = firstGame.isFavorite();
				pnlSelection.setGameTitle(firstGame.getName(), null, favorite);
				gameBannerImage = firstGame.getBannerImage();
				repaint();

				pnlSelection.setCurrentPlatform(explorer.getPlatform(platformId), icon);
				pnlSelection.setDescription(firstGame.getDescription());
				pnlSelection.pnlDeveloper.setDeveloper(firstGame.getDeveloper());
				pnlSelection.pnlPublisher.setPublisher(firstGame.getPublisher());
				pnlSelection.setDateAdded(firstGame.getDateAdded());
				pnlSelection.setPlayCount(firstGame.getPlayCount());
				pnlSelection.setLastPlayed(firstGame.getLastPlayed());
				pnlSelection.setTags(firstGame.getTags());
				pnlSelection.pnlAutoScaleImage.setVisible(true);
				pnlSelection.pnlPlayCount.setVisible(true);
				pnlSelection.pnlDateAdded.setVisible(true);
				//				pnlSelection.pnlPath.setVisible(true);
			} else {
				pnlSelection.setGameTitle(Messages.get(MessageConstants.MULTIPLE_GAMES_SELECTED, currentGames.size()), null);
				pnlSelection.setCurrentPlatform(null, null);
				pnlSelection.setDateAdded(null);
				pnlSelection.setPlayCount(-1);
				pnlSelection.setLastPlayed(null);
				pnlSelection.setTags(null);
				gameCoverChanged(null, null);
				pnlSelection.pnlAutoScaleImage.setVisible(false);
				pnlSelection.pnlPlayCount.setVisible(false);
				pnlSelection.pnlDateAdded.setVisible(false);
				//				pnlSelection.pnlPath.setVisible(false);
			}
			restoreLastScrollBarValues();
		} else {
			if (!pnlNoSelection.isVisible()) {
				remove(spSelection);
				add(pnlNoSelection);
				spSelection.setVisible(false);
				pnlNoSelection.setVisible(true);
				revalidateAndRepaint = true;
			}
		}
		if (revalidateAndRepaint) {
			UIUtil.revalidateAndRepaint(this);
		}
	}

	private void restoreLastScrollBarValues() {
		// final Rectangle rect = lastVerticalScrollBarValue;
		if (spSelection.getVerticalScrollBar().isVisible()) {
			// if (rect != null) {
			pnlSelection.setVisible(false);
			SwingUtilities.invokeLater(new Runnable() {

				@Override
				public void run() {
					spSelection.getVerticalScrollBar().setValue(lastVerticalScrollBarValue);
					pnlSelection.setVisible(true);
				}
			});
		} else {
			SwingUtilities.invokeLater(new Runnable() {
				@Override
				public void run() {
					spSelection.getVerticalScrollBar().setValue(lastVerticalScrollBarValue);
				}
			});
		}
	}

	public void gameCoverChanged(Game game, Image image) {
		pnlSelection.gameCoverChanged(game, image);
	}

	public void languageChanged() {
		pnlNoSelection.languageChanged();
		pnlSelection.languageChanged();
		popupView.languageChanged();
		popupGame.languageChanged();
		popupView.languageChanged();
	}

	public void updatePlayCount() {
		if (currentGames != null && currentGames.size() == 1) {
			pnlSelection.setPlayCount(currentGames.get(0).getPlayCount());
			pnlSelection.setLastPlayed(currentGames.get(0).getLastPlayed());
		}
	}

	public List<Game> getCurrentGames() {
		return currentGames;
	}

	public int getScrollBarSize() {
		return spSelection.getVerticalScrollBar().getWidth();
	}

	public boolean isScrollBarVisible() {
		return spSelection.getVerticalScrollBar().isVisible();
	}

	public void addOpenGameFolderListener(MouseListener l) {
		//		pnlSelection.pnlPath.addOpenGameFolderListener(l);
	}

	public void setPreviewPaneSize(int width, int height) {
		setSize(width, height);
	}

	public void tagAdded(TagEvent e) {
		pnlSelection.pnlTags.addTag(e.getTag());
	}

	public void tagRemoved(TagEvent e) {
		pnlSelection.pnlTags.removeTag(e.getTag().getId());
	}

	public void addCoverFromWebListener(ActionListener l) {
		pnlSelection.btnSearchCover.addActionListener(l);
	}

	public void addTrailerFromWebListener(ActionListener l) {
		pnlSelection.btnSearchTrailer.addActionListener(l);
	}

	public void addTagToGameFilterListener(GameFilterPanel pnlGameFilter) {
		this.pnlGameFilter = pnlGameFilter;
	}

	public void addPlatformToFilterListener(PlatformFromGameListener l) {
		platformFromGameListeners.add(l);
	}

	@Override
	protected void paintComponent(Graphics g) {
		super.paintComponent(g);
		Graphics2D g2d = (Graphics2D) g.create();
		g2d.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
		g2d.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
		g2d.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
		int panelWidth = getWidth();
		int panelHeight = getHeight();
		Theme currentTheme = IconStore.current().getCurrentTheme();
		ThemeBackground currentBackground = currentTheme.getPreviewPane();
		if (currentBackground.hasGradientPaint()) {
			GradientPaint p = currentBackground.getGradientPaint();
			g2d.setPaint(p);
		} else if (currentBackground.hasColor()) {
			//g2d.setColor(currentBackground.getColor());
		}
		//g2d.fillRect(0, 0, panelWidth, panelHeight);

		Image background = currentBackground.getImage();
		if (background != null) {
			int imgWidth = background.getWidth(null);
			int imgHeight = background.getHeight(null);
			int x = 0;
			int y = 0;
			boolean shouldScale = currentBackground.isImageScaleEnabled();
			if (shouldScale) {
				int new_width = imgWidth;
				int new_height = imgHeight;
				boolean stretchToView = currentBackground.isStretchToViewEnabled();
				if (stretchToView) {
					new_width = panelWidth;
					new_height = panelHeight;
				} else {
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
				}
				g2d.drawImage(background, x, y, new_width, new_height, this);
				//				boolean addTransparencyPane = true;
				//				if (addTransparencyPane) {
				//					g2d.setColor(getTransparencyColor());
				//					g2d.fillRect(x, y, new_width, new_height);
				//				}
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
				//				boolean addTransparencyPane = true;
				//				if (addTransparencyPane) {
				//					g2d.setColor(getTransparencyColor());
				//					g2d.fillRect(x, y, imgWidth, imgHeight);
				//				}
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

				double factor = background.getWidth(null) / panelWidth;
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
		if (explorer.hasCurrentGame()) {
			if (gameBannerImage != null) {
				int bannerWidth = gameBannerImage.getWidth(this);
				int bannerHeight = gameBannerImage.getHeight(this);
				if (bannerWidth >= bannerHeight) {
					double scaleFactor = (double) bannerWidth / (double) bannerHeight;
					int width = getWidth();
					int height = (int) (width / scaleFactor);
					int maxHeight = 400;
					if (height > maxHeight) {
						g2d.drawImage(gameBannerImage, 0, 0, width, height, this);
						// bottom
						if (gp3 == null || gp3.getPoint2().getY() != height) {
							gp3 = new GradientPaint(0, 0, color1,
									0, height, color2, false);
						} else if (!gp3.getColor2().equals(IconStore.current().getCurrentTheme().getPreviewPane().getColor())) {
							color2 = IconStore.current().getCurrentTheme().getPreviewPane().getColor();
							gp3 = new GradientPaint(0, 0, color1,
									0, height, color2, false);
						}
						g2d.setPaint(gp3);
						g2d.fillRect(0, 0, width, height);
					} else {
						double factor = (double) bannerHeight / (double)maxHeight;
						g2d.drawImage(gameBannerImage, 0, 0, (int) (bannerWidth/factor), maxHeight, this);
						if (gp3 == null || gp3.getPoint2().getY() != maxHeight) {
							gp3 = new GradientPaint(0, 0, color1,
									0, maxHeight, color2, false);
						} else if (!gp3.getColor2().equals(IconStore.current().getCurrentTheme().getPreviewPane().getColor())) {
							color2 = IconStore.current().getCurrentTheme().getPreviewPane().getColor();
							gp3 = new GradientPaint(0, 0, color1,
									0, maxHeight, color2, false);
						}
						g2d.setPaint(gp3);
						g2d.fillRect(0, 0, (int) (bannerWidth/factor), maxHeight);
					}
				} else {
					double scaleFactor = (double) bannerHeight / (double) bannerWidth;
					int height = getHeight();
					int width = (int) (height / scaleFactor);
					int maxWidth = 400;
					if (width > maxWidth) {
						g2d.drawImage(gameBannerImage, 0, 0, width, height, this);
						// bottom
						if (gp3 == null || gp3.getPoint2().getY() != width) {
							gp3 = new GradientPaint(0, 0, color1,
									width, 0, color2, false);
						} else if (!gp3.getColor2().equals(IconStore.current().getCurrentTheme().getPreviewPane().getColor())) {
							color2 = IconStore.current().getCurrentTheme().getPreviewPane().getColor();
							gp3 = new GradientPaint(0, 0, color1,
									width, 0, color2, false);
						}
						g2d.setPaint(gp3);
						g2d.fillRect(0, 0, width, height);
					} else {
						double factor = (double) bannerWidth / (double) maxWidth;
						g2d.drawImage(gameBannerImage, 0, 0, maxWidth, (int) (bannerHeight/factor), this);
						if (gp3 == null || gp3.getPoint2().getY() != maxWidth) {
							gp3 = new GradientPaint(0, 0, color1,
									maxWidth, 0, color2, false);
						} else if (!gp3.getColor2().equals(IconStore.current().getCurrentTheme().getPreviewPane().getColor())) {
							color2 = IconStore.current().getCurrentTheme().getPreviewPane().getColor();
							gp3 = new GradientPaint(0, 0, color1,
									maxWidth, 0, color2, false);
						}
						g2d.setPaint(gp3);
						g2d.fillRect(0, 0, maxWidth, (int) (bannerHeight/factor));
					}
				}
			}
		}
//		g2d.setColor(Color.PINK);
//		g2d.fillOval(50, 50, 20, 20);
		g2d.dispose();
	}

	class SelectionPanel extends ScrollablePanel {
		private static final long serialVersionUID = 1L;
		private JLabel lblGameTitle = new JLabel("Game Title");
		private JLinkButton lnkPlatformTitle = new JLinkButton("Platform Title");
		private AutoScaleImagePanel pnlAutoScaleImage = new AutoScaleImagePanel();
		private RatingBarPanel pnlRatingBar = new RatingBarPanel(Messages.get(MessageConstants.RATE_GAME), false);
		private DateAddedPanel pnlDateAdded = new DateAddedPanel();
		private PlayCountPanel pnlPlayCount = new PlayCountPanel();
		private LastPlayedPanel pnlLastPlayed = new LastPlayedPanel();
		private PublisherPanel pnlPublisher = new PublisherPanel();
		private DeveloperPanel pnlDeveloper = new DeveloperPanel();

		//		private PathPanel pnlPath = new PathPanel();
		private TagsPanel pnlTags = new TagsPanel();

		private JMenu mnuAddCover = new JMenu(Messages.get(MessageConstants.ADD_COVER));
		private JMenuItem itmAddCoverFromComputer = new JMenuItem(Messages.get(MessageConstants.ADD_COVER_FROM_COMPUTER));
		private JMenuItem itmAddCoverFromWeb = new JMenuItem(Messages.get(MessageConstants.COVER_FROM_WEB));
		private JMenuItem itmRemoveCover = new JMenuItem(Messages.get(MessageConstants.REMOVE_COVER));
		//		private AccordionPanel pnlAccordion;
		private JButton btnComment;
		private Platform platform;
		private JTextArea txtDescription = new JTextArea(0, 5);
		private String description;
		private List<ScrollToCurrentGamesListener> evs = new ArrayList<>();

		private ImageIcon icoRunGame = ImageUtil.getFlatSVGIconFrom(Icons.get("runGame"), 24, ColorStore.current().getColor(ColorConstants.SVG_NO_COLOR));
		private ImageIcon icoMoreOptionsRunGame = ImageUtil.getImageIconFrom(Icons.get("arrowDownOtherWhite", 1));
		private JButton btnRunGame = new JButton(Messages.get(MessageConstants.RUN_GAME));
		private JButton btnMoreOptionsRunGame = new JButton("");
		private JButton btnSearchCover = new JCustomButtonNew();
		private JButton btnSearchTrailer = new JCustomButtonNew();
		
		public SelectionPanel() {
			initComponents();
			setIcons();
			createUI();
		}

		public void setDescription(String description) {
			this.description = description;
			if (description != null && !description.trim().isEmpty()) {
				int limit = 100;
				int length = description.length();
				if (length > limit) {
					txtDescription.setText(description.substring(0, limit)+"...\n\n(Click to show more)");
				} else {
					txtDescription.setText(description);
				}
			} else {
				txtDescription.setText("no description set");
			}
		}

		private void initComponents() {
			initGameTitle();
			initPlatformTitle();
			addMouseListener(new MouseAdapter() {
				@Override
				public void mouseReleased(MouseEvent e) {
					if (SwingUtilities.isRightMouseButton(e)) {
						if (currentGames != null) {
							showGamePopupMenu(e.getComponent(), e.getX(), e.getY());
						} else {
							showViewPopupMenu(e.getComponent(), e.getX(), e.getY());
						}
					}
				}
			});
		}

		protected void showGamePopupMenu(Component component, int x, int y) {
			popupGame.show(component, x, y);
		}

		protected void showViewPopupMenu(Component component, int x, int y) {
			popupView.show(component, x, y);
		}

		private void setIcons() {
			int size = ScreenSizeUtil.is3k() ? 24 : 16;
			pnlDeveloper.lblDeveloper.setIcon(ImageUtil.getFlatSVGIconFrom(Icons.get("robot"), 16, ColorStore.current().getColor(ColorConstants.SVG_NO_COLOR)));
			pnlPublisher.lblPublisher.setIcon(ImageUtil.getFlatSVGIconFrom(Icons.get("publisher"), 16, ColorStore.current().getColor(ColorConstants.SVG_NO_COLOR)));
			mnuAddCover.setIcon(ImageUtil.getImageIconFrom(Icons.get("add", size, size)));
			itmAddCoverFromComputer.setIcon(ImageUtil.getImageIconFrom(Icons.get("fromComputer", size, size)));
			itmAddCoverFromWeb.setIcon(ImageUtil.getImageIconFrom(Icons.get("fromWeb", size, size)));
			itmRemoveCover.setIcon(ImageUtil.getImageIconFrom(Icons.get("remove2", size, size)));
			btnRunGame.setIcon(icoRunGame);
			btnMoreOptionsRunGame.setIcon(icoMoreOptionsRunGame);
			btnSearchCover.setIcon(ImageUtil.getFlatSVGIconFrom(Icons.get("google"), size));
			btnSearchTrailer.setIcon(ImageUtil.getFlatSVGIconFrom(Icons.get("youtube"), size));
		}

		private void createUI() {
			setLayout(new BorderLayout());
			lblGameTitle.setMinimumSize(new Dimension(0, 0));
			lnkPlatformTitle.setMinimumSize(new Dimension(0, 0));
			//			Color themeColor = IconStore.current().getCurrentTheme().getPreviewPane().getColor();
			//			Color color = UIUtil.getForegroundDependOnBackground(themeColor, true);
			//			lnkPlatformTitle.setForeground(color);

			JPanel pnl = createPanel();
			add(pnl, BorderLayout.NORTH);

			//			pnlAccordion = new AccordionPanel(AccordionPanel.VERTICAL_ACCORDION);
			//			pnlAccordion.setOpaque(false);
			//
			//			txtDescription.setHorizontalAlignment(SwingConstants.CENTER);
			txtDescription.setEditable(false);
			txtDescription.setLineWrap(true);
			txtDescription.setWrapStyleWord(true);
			txtDescription.addMouseListener(new MouseAdapter() {
				@Override
				public void mouseClicked(MouseEvent e) {
					if (txtDescription.getText().endsWith("(Click to show more)")) {
						txtDescription.setText(description);
						txtDescription.setCaretPosition(0);
					} else {
						setDescription(description);
					}
				}
			});
			add(txtDescription); // don't use scrollpane if not needed, otherwise there might be scroll issues
		}

		private JPanel createPanel() {
			btnComment = new JCustomButton();
			btnComment.addActionListener(new ActionListener() {

				@Override
				public void actionPerformed(ActionEvent e) {
					UIUtil.showErrorMessage(PreviewPanePanel.this, "not yet implemented sorry :(",
							"feature unavailable");
				}
			});
			btnComment.setMinimumSize(new Dimension(0, 0));
			btnComment.setHorizontalAlignment(SwingConstants.LEFT);
			btnComment.setIcon(ImageUtil.getFlatSVGIconFrom(Icons.get("checkMark"),  22, new Color(40, 167, 69)));

			JPanel pnlCommentWrapper = new JPanel(new BorderLayout());
			JExtendedTextArea txt = new JExtendedTextArea();
			txt.setLineWrap(true);
			txt.setWrapStyleWord(true);
			txt.setRows(5);
			//			txt.putClientProperty("FlatLaf.style", "showClearButton: true");
			FlatSVGIcon icoRename = ImageUtil.getFlatSVGIconFrom(Icons.get("rename"), 12, ColorStore.current().getColor(ColorConstants.SVG_NO_COLOR));
			//			txt.putClientProperty("JTextArea.leadingIcon", icoRename);

			pnlCommentWrapper.add(txt);
			pnlCommentWrapper.add(btnComment, BorderLayout.EAST);

			Color colorUnderlay = new Color(0f, 0f, 0f, 0.25f);
			pnlPlayCount.setBackground(colorUnderlay);
			pnlDateAdded.setBackground(colorUnderlay);
			pnlLastPlayed.setBackground(colorUnderlay);

			FormLayout layoutTop = new FormLayout("default:grow",
					"default, $rgap, default, $ugap, default, $ugap, default");
			JPanel pnl = new JPanel();
			FormLayout layoutMain;
			pnl.setLayout(layoutMain = new FormLayout("default, $ugap, default, min, default, min:grow",
					"default, $lgap, fill:default, $rgap, fill:default, $ugap, fill:default, $ugap, fill:default, $ugap, fill:default, $lgap, fill:default, $lgap, fill:default, $ugap, fill:default, $rgap, fill:default, $rgap, fill:default, $ugap, fill:default, $rgap, fill:default, $ugap, fill:default"));
			int defaultSpanWidth = layoutMain.getColumnCount();
			pnl.add(lnkPlatformTitle, CC.xyw(1, 5, defaultSpanWidth));
			pnl.add(lblGameTitle, CC.xyw(1, 3, defaultSpanWidth));
			pnl.add(pnlAutoScaleImage, CC.xyw (1, 1, defaultSpanWidth));
			JPanel pnlRunGameWrapper = new JPanel(new BorderLayout());
			pnlRunGameWrapper.add(btnRunGame);
			pnlRunGameWrapper.add(btnMoreOptionsRunGame, BorderLayout.EAST);
			pnl.add(pnlRunGameWrapper, CC.xy(1, 7));
			pnl.add(btnSearchCover, CC.xy(3, 7));
			pnl.add(btnSearchTrailer, CC.xy(5, 7));
			
//			pnl.add(pnlGameData, CC.xyw(1, 9, defaultSpanWidth));
			pnl.add(pnlRatingBar, CC.xyw(1, 11, defaultSpanWidth));
			pnl.add(pnlCommentWrapper, CC.xyw(1, 13, defaultSpanWidth));
			pnl.add(pnlTags, CC.xyw(1, 15, defaultSpanWidth));
			pnl.add(pnlPlayCount, CC.xyw(1, 17, defaultSpanWidth));
			pnl.add(pnlLastPlayed, CC.xyw(1, 19, defaultSpanWidth));
			pnl.add(pnlDateAdded, CC.xyw(1, 21, defaultSpanWidth));
			pnl.add(pnlPublisher, CC.xyw(1, 23, defaultSpanWidth));
			pnl.add(pnlDeveloper, CC.xyw(1, 25, defaultSpanWidth));
			pnl.add(pnlTags, CC.xyw(1, 27, defaultSpanWidth));
			//						pnl.add(pnlAutoScaleImage, ccSelection.xy(1, 5));
			//						pnl.add(pnlRatingBar, ccSelection.xyw(1, 9, columnCount));
			//						pnl.add(pnlCommentWrapper, ccSelection.xyw(1, 11, columnCount));
			//						pnl.add(pnlTags, ccSelection.xyw(1, 13, columnCount));
			//						pnl.add(pnlPlayCount, ccSelection.xyw(1, 15, columnCount));
			//						pnl.add(pnlLastPlayed, ccSelection.xyw(1, 17, columnCount));
			//						pnl.add(pnlDateAdded, ccSelection.xyw(1, 19, columnCount));
			return pnl;
		}

		private void initGameTitle() {
			lblGameTitle.setToolTipText("Click to scroll to selected game");
			lblGameTitle.setHorizontalAlignment(SwingConstants.LEFT);
			lblGameTitle.setHorizontalTextPosition(SwingConstants.LEFT);
			lblGameTitle.setVerticalTextPosition(SwingConstants.TOP);
			lblGameTitle.addMouseListener(new MouseAdapter() {
				@Override
				public void mousePressed(MouseEvent e) {
					fireRequestToScrollToCurrentGamesEvent();
					//					if (currentGames.size() == 1) {
					//						pnl.remove(lblGameTitle);
					//						pnl.add(txtGameTitle, CC.xy(1, 1));
					//						txtGameTitle.setText(currentGames.get(0).getName());
					//						txtGameTitle.requestFocusInWindow();
					//						UIUtil.revalidateAndRepaint(pnl);
					//					}
				}
			});
			//			txtGameTitle.addFocusListener(new FocusAdapter() {
			//				@Override
			//				public void focusLost(FocusEvent e) {
			//					pnl.remove(txtGameTitle);
			//					pnl.add(lblGameTitle, CC.xy(1, 1));
			//					UIUtil.revalidateAndRepaint(pnl);
			//				}
			//						});
		}

		protected void fireRequestToScrollToCurrentGamesEvent() {
			for (ScrollToCurrentGamesListener l : evs ) {
				l.scrollToSelectedGames();
			}
		}

		private void initPlatformTitle() {
			lnkPlatformTitle.setToolTipText("Click to set the filter to this platform");
			lnkPlatformTitle.setBorder(Paddings.EMPTY);
			lnkPlatformTitle.setBackground(getBackground());
			lnkPlatformTitle.setHorizontalAlignment(SwingConstants.LEFT);
			lnkPlatformTitle.addActionListener(new ActionListener() {

				@Override
				public void actionPerformed(ActionEvent e) {
					fireAddPlatformToFilterEvent(platform);
				}
			});
		}

		private void fireAddPlatformToFilterEvent(Platform platform) {
			for (PlatformFromGameListener l : platformFromGameListeners) {
				l.platformFromGameAddedToFilter(platform);
			}
		}

		protected void setGameTitle(String s, Icon icon) {
			String gameTitle = s.replace(".", " ").replace("_", " ");
			lblGameTitle.setFont(FontUtil.getCustomBoldFont(18));
			lblGameTitle.setText(Messages.get(MessageConstants.GAME_TITLE, gameTitle));
			lblGameTitle.setIcon(icon);
		}

		protected void setGameTitle(String s, Icon icon, boolean favorite) {
			setGameTitle(s, icon);
			if (favorite) {
				lblGameTitle.setForeground(Color.orange);
			} else {
				lblGameTitle.setForeground(UIManager.getColor("Label.foregroundColor"));
			}
		}

		protected void setCurrentPlatform(Platform platform, Icon icon) {
			this.platform = platform;
			String name = (platform == null) ? "" : platform.getName();
			lnkPlatformTitle.setFont(FontUtil.getCustomFont(12));
			lnkPlatformTitle.setText(name);
			lnkPlatformTitle.setIcon(icon);
		}

		protected void setDateAdded(ZonedDateTime localDateTime) {
			pnlDateAdded.setDateAdded(localDateTime);
		}

		protected void setPlayCount(int playCount) {
			pnlPlayCount.setPlayCount(playCount);
		}

		protected void setLastPlayed(ZonedDateTime localDateTime) {
			pnlLastPlayed.setLastPlayed(localDateTime);
		}

		protected void setGamePath(String s) {
			//			pnlPath.setGamePath(s);
		}

		protected void setTags(List<Tag> list) {
			pnlTags.setTags(list);
		}

		public void gameCoverChanged(Game game, Image image) {
			if (currentGames != null && currentGames.size() == 1
					&& currentGames.get(0) == game) {
				//				pnlSelection.setGameTitle(game.getName(), null);
				if (image == null) {
					pnlSelection.pnlAutoScaleImage.setImage(null);
				} else {
					pnlSelection.pnlAutoScaleImage.setImage(image);
				}
			} else {
				pnlSelection.pnlAutoScaleImage.setImage(null);
			}
		}

		public void languageChanged() {
			pnlDeveloper.lblDeveloper.setFont(FontUtil.getCustomBoldFont(16));
			pnlPublisher.lblPublisher.setFont(FontUtil.getCustomBoldFont(16));
			pnlDateAdded.lblDateAdded.setFont(FontUtil.getCustomBoldFont(16));
			pnlDateAdded.lblDateAdded.setText(Messages.get(MessageConstants.DATE_ADDED));
			if (currentGames != null) {
				if (currentGames.size() == 1) {
					String formattedDate = "";
					ZonedDateTime dateAdded = currentGames.get(0).getDateAdded();
					if (dateAdded != null) {
						formattedDate = UIUtil.format(dateAdded);
					}
					pnlDateAdded.lblDateAdded2.setText(formattedDate);
				} else if (currentGames.size() > 1) {
					setGameTitle(Messages.get(MessageConstants.MULTIPLE_GAMES_SELECTED), null);
				}
			}
			pnlRatingBar.languageChanged();
			pnlPlayCount.languageChanged();
			pnlLastPlayed.languageChanged();
			//			pnlPath.languageChanged();
			pnlTags.languageChanged();
			setToolTipTexts();
		}

		class DateAddedPanel extends JPanel {
			private static final long serialVersionUID = 1L;
			private JLabel lblDateAdded = new JLabel(
					Messages.get(MessageConstants.DATE_ADDED));
			private JLabel lblDateAdded2 = new JLabel("MM d, yyy HH:mm:ss");

			public DateAddedPanel() {
				initLastPlayedTextArea();
				createUI();
			}

			private void initLastPlayedTextArea() {
				lblDateAdded2.setOpaque(false);
				//				txtDateAdded2.setEditable(false);
				//				txtDateAdded2.setFocusable(false);
				//				txtDateAdded2.setLineWrap(true);
				//				txtDateAdded2.setWrapStyleWord(true);
			}

			private void createUI() {
				lblDateAdded2.setMinimumSize(new Dimension(0, 0));
				setOpaque(false);
				setLayout(new BoxLayout(this, BoxLayout.PAGE_AXIS));
				lblDateAdded.setIcon(ImageUtil.getFlatSVGIconFrom(Icons.get("recentlyPlayed"), 16, ColorStore.current().getColor(ColorConstants.SVG_NO_COLOR)));
				add(lblDateAdded);
				add(lblDateAdded2);
			}

			protected void setDateAdded(ZonedDateTime localDateTime) {
				String formattedDate = "";
				if (localDateTime != null) {
					formattedDate = UIUtil.format(localDateTime);
				}
				lblDateAdded2.setText("<html>"+formattedDate+"</html>");
			}
		}

		class PlayCountPanel extends JPanel {
			private static final long serialVersionUID = 1L;
			private JLabel lblPlayCount = new JLabel(Messages.get(MessageConstants.PLAY_COUNT));
			private JLabel lblPlayCount2 = new JLabel("");

			public PlayCountPanel() {
				initPlayCountTextArea();
				createUI();
			}

			private void initPlayCountTextArea() {
				lblPlayCount2.setOpaque(false);
				lblPlayCount2.setFocusable(false);
			}

			private void createUI() {
				setOpaque(false);
				lblPlayCount.setIcon(ImageUtil.getFlatSVGIconFrom(Icons.get("stats"), 16, ColorStore.current().getColor(ColorConstants.SVG_NO_COLOR)));
				lblPlayCount2.setMinimumSize(new Dimension(0, 0));
				setLayout(new BoxLayout(this, BoxLayout.PAGE_AXIS));
				add(lblPlayCount);
				add(lblPlayCount2);
			}

			protected void setPlayCount(int playCount) {
				String s = "";
				switch (playCount) {
				case 0:
					s = " ¯\\_(ツ)_/¯";
					break;
				case 1:
					s = Messages.get(MessageConstants.PLAY_COUNT3, playCount);
					break;
				default:
					s = Messages.get(MessageConstants.PLAY_COUNT2, playCount);
				}
				lblPlayCount2.setText("<html>"+s+"</html>");
			}

			public void languageChanged() {
				lblPlayCount.setText(Messages.get(MessageConstants.PLAY_COUNT));
				lblPlayCount.setFont(FontUtil.getCustomBoldFont(16));
				String s = "";
				if (currentGames != null && currentGames.size() == 1) {
					int playCount = currentGames.get(0).getPlayCount();
					switch (playCount) {
					case 0:
						s = "¯\\_(ツ)_/¯";
						break;
					case 1:
						s = Messages.get(MessageConstants.PLAY_COUNT3, playCount);
						break;
					default:
						s = Messages.get(MessageConstants.PLAY_COUNT2, playCount);
					}
					lblPlayCount2.setText("<html>"+s+"</html>");
				}
			}
		}

		class LastPlayedPanel extends JPanel {
			private static final long serialVersionUID = 1L;
			private JLabel lblLastPlayed = new JLabel("");

			public LastPlayedPanel() {
				initLastPlayedTextArea();
				createUI();
			}

			private void initLastPlayedTextArea() {
				lblLastPlayed.setOpaque(false);
				//				txtLastPlayed2.setEditable(false);
				lblLastPlayed.setFocusable(false);
				//				txtLastPlayed2.setLineWrap(true);
				//				txtLastPlayed2.setWrapStyleWord(true);
			}

			private void createUI() {
				lblLastPlayed.setMinimumSize(new Dimension(0, 0));
				setOpaque(false);
				setLayout(new BoxLayout(this, BoxLayout.PAGE_AXIS));
				add(lblLastPlayed);
			}

			protected void setLastPlayed(ZonedDateTime localDateTime) {
				String s = "";
				if (localDateTime != null) {
					LocalDateTime now = LocalDateTime.now();
					long seconds = TimeUnit.MILLISECONDS.toSeconds(now.getSecond() - localDateTime.getSecond());
					long minutes = TimeUnit.MILLISECONDS.toMinutes(now.getMinute() - localDateTime.getMinute());
					long hours = TimeUnit.MILLISECONDS.toHours(now.getHour() - localDateTime.getHour());
					long days = TimeUnit.MILLISECONDS.toDays(now.getDayOfMonth() - localDateTime.getDayOfMonth());

					String ago = "";
					if (days > 0) {
						ago = days + " " + ((days == 1) ? Messages.get(MessageConstants.DAY) : Messages.get(MessageConstants.DAYS));
					} else if (hours > 0) {
						ago = hours + " " + ((hours == 1) ? Messages.get(MessageConstants.HOUR) : Messages.get(MessageConstants.HOURS));
					} else if (minutes > 0) {
						ago = minutes + " " + ((minutes == 1) ? Messages.get(MessageConstants.MINUTE) : Messages.get(MessageConstants.MINUTES));
					} else {
						ago = ((seconds == 0) ? Messages.get(MessageConstants.JUST_NOW)
								: (seconds + " "
										+ ((seconds == 1) ? Messages.get(MessageConstants.SECOND) : Messages.get(MessageConstants.SECONDS))));
					}
					if (Locale.getDefault().equals(Locale.GERMAN)) {
						ago = ((hours == 0 && minutes == 0 && seconds == 0) ? "" : "Vor ") + ago;
					}
					if (Locale.getDefault().equals(Locale.ENGLISH)) {
						ago += ((hours == 0 && minutes == 0 && seconds == 0) ? "" : " ago");
					}
					if (Locale.getDefault().equals(Locale.FRENCH)) {
						ago = ((hours == 0 && minutes == 0 && seconds == 0) ? "" : "Avant ") + ago;
					}
					s = Messages.get(MessageConstants.LAST_PLAYED_SHORT) + ": " + ago;
				}
				lblLastPlayed.setText("<html>"+s+"</html>");
			}

			public void languageChanged() {
				if (currentGames != null && currentGames.size() == 1) {
					String s = "";
					ZonedDateTime lastPlayed = currentGames.get(0).getLastPlayed();

					if (lastPlayed != null) {
						LocalDateTime now = LocalDateTime.now();
						long seconds = TimeUnit.MILLISECONDS.toSeconds(now.getSecond() - lastPlayed.getSecond());
						long minutes = TimeUnit.MILLISECONDS.toMinutes(now.getMinute() - lastPlayed.getMinute());
						long hours = TimeUnit.MILLISECONDS.toHours(now.getHour() - lastPlayed.getHour());
						long days = TimeUnit.MILLISECONDS.toDays(now.getDayOfMonth() - lastPlayed.getDayOfMonth());
						String ago = "";
						if (days > 0) {
							ago = days + " " + ((days == 1) ? Messages.get(MessageConstants.DAY) : Messages.get(MessageConstants.DAYS));
						} else if (hours > 0) {
							ago = hours + " " + ((hours == 1) ? Messages.get(MessageConstants.HOUR) : Messages.get(MessageConstants.HOURS));
						} else if (minutes > 0) {
							ago = minutes + " " + ((minutes == 1) ? Messages.get(MessageConstants.MINUTE) : Messages.get(MessageConstants.MINUTES));
						} else {
							ago = ((seconds == 0) ? Messages.get(MessageConstants.JUST_NOW)
									: (seconds + " "
											+ ((seconds == 1) ? Messages.get(MessageConstants.SECOND) : Messages.get(MessageConstants.SECONDS))));
						}
						if (Locale.getDefault().equals(Locale.GERMAN)) {
							ago = ((hours == 0 && minutes == 0 && seconds == 0) ? "" : "Vor ") + ago;
						}
						if (Locale.getDefault().equals(Locale.ENGLISH)) {
							ago += ((hours == 0 && minutes == 0 && seconds == 0) ? "" : " ago");
						}
						if (Locale.getDefault().equals(Locale.FRENCH)) {
							ago = ((hours == 0 && minutes == 0 && seconds == 0) ? "" : "Avant ") + ago;
						}
						s = Messages.get(MessageConstants.LAST_PLAYED_SHORT) + ": " + ago;
					}
					lblLastPlayed.setText(s);
				}
			}
		}

		class PublisherPanel extends JPanel {
			private static final long serialVersionUID = 1L;
			private JLabel lblPublisher = new JLabel("Publisher");
			private JLabel lblPublisher2 = new JLabel("");

			public PublisherPanel() {
				initLastPlayedTextArea();
				createUI();
			}

			private void initLastPlayedTextArea() {
				lblPublisher2.setOpaque(false);
				//				txtDateAdded2.setEditable(false);
				//				txtDateAdded2.setFocusable(false);
				//				txtDateAdded2.setLineWrap(true);
				//				txtDateAdded2.setWrapStyleWord(true);
			}

			private void createUI() {
				lblPublisher2.setMinimumSize(new Dimension(0, 0));
				setOpaque(false);
				setLayout(new BoxLayout(this, BoxLayout.PAGE_AXIS));
				lblPublisher.setIcon(ImageUtil.getFlatSVGIconFrom(Icons.get("publisher"), 16, ColorStore.current().getColor(ColorConstants.SVG_NO_COLOR)));
				add(lblPublisher);
				add(lblPublisher2);
			}

			public void setPublisher(String publisher) {
				lblPublisher2.setText(publisher == null ? "¯\\_(ツ)_/¯" : publisher);
			}
		}

		class DeveloperPanel extends JPanel {
			private static final long serialVersionUID = 1L;
			private JLabel lblDeveloper = new JLabel("Developer");
			private JLabel lblDeveloper2 = new JLabel("");

			public DeveloperPanel() {
				initLastPlayedTextArea();
				createUI();
			}

			private void initLastPlayedTextArea() {
				lblDeveloper2.setOpaque(false);
				//				txtDateAdded2.setEditable(false);
				//				txtDateAdded2.setFocusable(false);
				//				txtDateAdded2.setLineWrap(true);
				//				txtDateAdded2.setWrapStyleWord(true);
			}

			private void createUI() {
				lblDeveloper2.setMinimumSize(new Dimension(0, 0));
				setOpaque(false);
				setLayout(new BoxLayout(this, BoxLayout.PAGE_AXIS));
				lblDeveloper.setIcon(ImageUtil.getFlatSVGIconFrom(Icons.get("publisher"), 16, ColorStore.current().getColor(ColorConstants.SVG_NO_COLOR)));
				add(lblDeveloper);
				add(lblDeveloper2);
			}

			public void setDeveloper(String developer) {
				lblDeveloper2.setText(developer == null ? "¯\\_(ツ)_/¯" : developer);
			}
		}

		class PathPanel extends ScrollablePanel {
			private static final long serialVersionUID = 1L;
			// private JEditorPane txtPath = new JEditorPane();
			private JTextArea txtFilename = new JTextArea();
			private JTextArea txtPath = new JTextArea();
			private Font fontUnderline;
			private Font fontNotUnderline;
			private Map<TextAttribute, Integer> fontAttributesNotUnderlined = new HashMap<>();
			private Map<TextAttribute, Integer> fontAttributes = new HashMap<>();
			private JLabel lblFilename = new JLabel(Messages.get(MessageConstants.FILE_NAME));
			private JLabel lblFileInformations = new JLabel(Messages.get(MessageConstants.FILE_INFORMATIONS));
			private JLabel lblFileLocation = new JLabel(Messages.get(MessageConstants.FILE_LOCATION));

			public PathPanel() {
				initPathLink();
				createUI();
			}

			private void initPathLink() {
				txtFilename.setOpaque(false);
				txtFilename.setEditable(false);
				txtFilename.setFocusable(false);
				txtFilename.setLineWrap(true);
				txtFilename.setWrapStyleWord(true);

				txtPath.setOpaque(false);
				txtPath.setEditable(false);
				txtPath.setFocusable(false);
				txtPath.setLineWrap(true);
				txtPath.setWrapStyleWord(true);
				txtPath.addMouseListener(new MouseAdapter() {
					@Override
					public void mouseEntered(MouseEvent e) {
						setGamePathUnderlined(true);
						txtPath.setCursor(Cursor.getPredefinedCursor(Cursor.HAND_CURSOR));
					}

					@Override
					public void mouseExited(MouseEvent e) {
						setGamePathUnderlined(false);
						txtPath.setCursor(null);
					}
				});

				txtPath.addFocusListener(new FocusAdapter() {
					@Override
					public void focusGained(FocusEvent e) {
						setGamePathUnderlined(true);
					}

					@Override
					public void focusLost(FocusEvent e) {
						setGamePathUnderlined(false);
					}
				});
			}

			private void createUI() {
				txtFilename.setMinimumSize(new Dimension(0, 0));
				txtPath.setMinimumSize(new Dimension(0, 0));
				lblFileInformations.setMinimumSize(new Dimension(0, 0));
				setOpaque(false);
				setLayout(new BoxLayout(this, BoxLayout.PAGE_AXIS));
				add(new JLabel(" "));
				add(lblFileInformations);
				add(txtFilename);
				add(txtPath);
			}

			public void setGamePath(String s) {
				String filePathNoEndSeparator = FilenameUtils.getFullPathNoEndSeparator(s);
				String filename = FilenameUtils.getName(s);
				txtPath.setText(filePathNoEndSeparator);
				txtFilename.setText(filename);
			}

			private void setGamePathUnderlined(boolean underlined) {
				if (fontUnderline == null) {
					fontAttributes.put(TextAttribute.UNDERLINE, TextAttribute.UNDERLINE_ON);
				}
				if (fontNotUnderline == null) {
					fontAttributesNotUnderlined.put(TextAttribute.UNDERLINE, -1);
				}

				if (underlined) {
					fontUnderline = txtPath.getFont().deriveFont(fontAttributes);
					txtPath.setFont(fontUnderline);
				} else {
					fontNotUnderline = txtPath.getFont().deriveFont(fontAttributesNotUnderlined);
					txtPath.setFont(fontNotUnderline);
				}
			}

			public void languageChanged() {
				lblFileInformations.setText(Messages.get(MessageConstants.FILE_INFORMATIONS));
			}

			public void addOpenGameFolderListener(MouseListener l) {
				txtPath.addMouseListener(l);
			}
		}
		
		private void setToolTipTexts() {
			btnSearchCover.setToolTipText(Messages.get(MessageConstants.COVER_FROM_WEB));
			btnSearchTrailer.setToolTipText(Messages.get(MessageConstants.SHOW_TRAILER));
		}

		class TagsPanel extends ScrollablePanel {
			private static final long serialVersionUID = 1L;

			private JLabel lblTags = new JLabel(Messages.get(MessageConstants.MANAGE_TAGS));
			private JPanel pnlTagList = new JPanel();
			private JButton btnAddTag = new JCustomButton(Messages.get(MessageConstants.ADD_TAG));
			private int size = ScreenSizeUtil.is3k() ? 24 : 16;
			private Icon iconTag = ImageUtil.getFlatSVGIconFrom(Icons.get("tag"), size, ColorStore.current().getColor(ColorConstants.SVG_NO_COLOR));
			private Map<Integer, JComponent> tags = new HashMap<>();
			protected JPopupMenu popup = new JPopupMenu();
			private JMenuItem itmAddToFilter;
			private JMenuItem itmRemoveTagFromCurrentGames;
			private List<TagListener> tagListeners = new ArrayList<>();

			protected int currentSelectedTagId = -1;

			public TagsPanel() {
				initComponents();
				createUI();
			}

			private void initComponents() {
				FlatSVGIcon svgFilter = new FlatSVGIcon(Icons.get("setFilter"), size, size);
				popup.add(itmAddToFilter = new JMenuItem(Messages.get(MessageConstants.ADD_TO_FILTER), svgFilter));
				popup.add(itmRemoveTagFromCurrentGames = new JMenuItem(Messages.get(MessageConstants.REMOVE_TAG), ImageUtil.getImageIconFrom(Icons.get("remove", size, size))));

				itmAddToFilter.addActionListener(new ActionListener() {

					@Override
					public void actionPerformed(ActionEvent e) {
						List<Game> games = currentGames;
						for (Game game : games) {
							fireAddTagToFilterEvent(game.getTag(currentSelectedTagId));
						}
					}
				});

				itmRemoveTagFromCurrentGames.addActionListener(new ActionListener() {

					@Override
					public void actionPerformed(ActionEvent e) {
						List<Game> games = currentGames;
						for (Game game : games) {
							fireRemoveTagFromGameEvent(game.getTag(currentSelectedTagId));
						}
					}
				});
			}

			protected void fireAddTagToFilterEvent(Tag tag) {
				pnlGameFilter.addTagToFilter(true, tag);
			}

			protected void fireRemoveTagFromGameEvent(Tag tag) {
				for (TagListener l : tagListeners) {
					l.tagRemoved(new BroTagAddedEvent(tag));
				}
			}

			public void addTagListener(TagListener l) {
				tagListeners.add(l);
			}

			private void createUI() {
				setOpaque(false);
				setLayout(new BorderLayout());
				pnlTagList.setOpaque(false);
				pnlTagList.setLayout(new WrapLayout(FlowLayout.LEFT));
				lblTags.setMinimumSize(new Dimension(0, 0));
				add(lblTags, BorderLayout.NORTH);
				add(pnlTagList);

				int size = ScreenSizeUtil.is3k() ? 24 : 16;
				btnAddTag.setIcon(ImageUtil.getFlatSVGIconFrom(Icons.get("tagAdd"), size, ColorStore.current().getColor(ColorConstants.SVG_NO_COLOR)));
				btnAddTag.addActionListener(new ActionListener() {

					@Override
					public void actionPerformed(ActionEvent e) {
						Map<Integer, Tag> tags = new HashMap<>();
						for (Game game : currentGames) {
							for (Tag tag : game.getTags()) {
								if (!tags.containsKey(tag.getId())) {
									tags.put(tag.getId(), tag);
								}
							}
						}
						System.out.println(tags);
						System.out.println(defaultTags);
					}
				});
			}

			protected void setTags(List<Tag> list) {
				pnlTagList.removeAll();
				pnlTagList.add(btnAddTag);
				if (list != null) {
					for (Tag tag : list) {
						addTag(tag);
					}
				}
			}

			public void addTag(final Tag tag) {
				final JButton btn = new JCustomButton(tag.getName());
				btn.setIcon(iconTag);
				String hexColor = tag.getHexColor();
				if (hexColor != null && !hexColor.trim().isEmpty()) {
					Color tagColor = Color.decode(hexColor);
					btn.setBackground(tagColor.brighter());
					btn.setForeground(tagColor);
				}
				pnlTagList.add(btn);

				tags.put(tag.getId(), btn);
				UIUtil.revalidateAndRepaint(pnlTagList);

				btn.addActionListener(new ActionListener() {

					@Override
					public void actionPerformed(ActionEvent e) {
						currentSelectedTagId = tag.getId();
						popup.show(btn, 0, btn.getHeight());
					}
				});
			}

			public void removeTag(int tagId) {
				pnlTagList.remove(tags.get(tagId));
				tags.remove(tagId);
				UIUtil.revalidateAndRepaint(pnlTagList);
			}

			public void languageChanged() {
				lblTags.setText(Messages.get(MessageConstants.MANAGE_TAGS));
				btnAddTag.setText(Messages.get(MessageConstants.ADD_TAG));
				itmAddToFilter.setText(Messages.get(MessageConstants.ADD_TO_FILTER));
				itmRemoveTagFromCurrentGames.setText(Messages.get(MessageConstants.REMOVE_TAG));
			}
		}
	}

	class NoSelectionPanel extends JPanel {
		private static final long serialVersionUID = 1L;
		private JTextPane txtNoSelection = new JTextPane();

		public NoSelectionPanel() {
			createUI();
		}

		public void initNoSelectionText() {
			setComponentPopupMenu(popupView);
			txtNoSelection.setComponentPopupMenu(popupView);
			txtNoSelection.setText(Messages.get(MessageConstants.NO_SELECTION));
			txtNoSelection.setOpaque(false);
			txtNoSelection.setEnabled(false);
			txtNoSelection.setEditable(false);

			StyledDocument doc = txtNoSelection.getStyledDocument();
			SimpleAttributeSet center = new SimpleAttributeSet();
			StyleConstants.setAlignment(center, StyleConstants.ALIGN_CENTER);
			doc.setParagraphAttributes(0, doc.getLength(), center, false);
		}

		private void createUI() {
			FormLayout layoutNoSelection = new FormLayout("min:grow", "min:grow");
			setLayout(layoutNoSelection);
			setOpaque(false);
			CellConstraints ccNoSelection = new CellConstraints();
			add(txtNoSelection, ccNoSelection.xy(1, 1));
		}

		public void languageChanged() {
			txtNoSelection.setText(Messages.get(MessageConstants.NO_SELECTION));
		}
	}

	public void addRunGameListener(ActionListener l) {
		pnlSelection.btnRunGame.addActionListener(l);
	}

	public void addRunGameWithListener(RunGameWithListener l) {
		runGameWithListeners.add(l);
	}

	protected void fireRunGameWithEvent(int emulatorId) {
		for (RunGameWithListener l : runGameWithListeners) {
			l.runGameWith(emulatorId);
		}
	}

	public int getCustomDividerSize() {
		return btnResizePreviewPane.getWidth();
	}

	public void gameRenamed(GameRenamedEvent event) {
		if (currentGames.size() == 1 && currentGames.get(0).equals(event.getGame())) {
			pnlSelection.lblGameTitle.setText(event.getNewName());
		}
	}
}