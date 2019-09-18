package ch.sysout.emubro.ui;

import java.awt.BorderLayout;
import java.awt.Color;
import java.awt.Component;
import java.awt.Cursor;
import java.awt.Dimension;
import java.awt.FlowLayout;
import java.awt.Font;
import java.awt.Graphics;
import java.awt.Graphics2D;
import java.awt.Image;
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
import javax.swing.text.SimpleAttributeSet;
import javax.swing.text.StyleConstants;
import javax.swing.text.StyledDocument;

import org.apache.commons.io.FilenameUtils;

import com.jgoodies.forms.factories.Paddings;
import com.jgoodies.forms.layout.CellConstraints;
import com.jgoodies.forms.layout.FormLayout;

import ch.sysout.emubro.api.PlatformFromGameListener;
import ch.sysout.emubro.api.RunGameWithListener;
import ch.sysout.emubro.api.TagListener;
import ch.sysout.emubro.api.event.GameSelectionEvent;
import ch.sysout.emubro.api.event.TagEvent;
import ch.sysout.emubro.api.model.Explorer;
import ch.sysout.emubro.api.model.Game;
import ch.sysout.emubro.api.model.Platform;
import ch.sysout.emubro.api.model.Tag;
import ch.sysout.emubro.controller.GameSelectionListener;
import ch.sysout.emubro.impl.event.BroTagAddedEvent;
import ch.sysout.emubro.util.MessageConstants;
import ch.sysout.util.FontUtil;
import ch.sysout.util.Icons;
import ch.sysout.util.ImageUtil;
import ch.sysout.util.Messages;
import ch.sysout.util.ScreenSizeUtil;
import ch.sysout.util.UIUtil;

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

	private AbstractButton btnResizePreviewPane = new JButton();

	public PreviewPanePanel(Explorer explorer, GameContextMenu popupGame, ViewContextMenu popupView) {
		super();
		this.explorer = explorer;
		this.popupGame = popupGame;
		this.popupView = popupView;
		initComponents();
		setIcons();
		createUI();
	}

	private void setIcons() {
		int size = ScreenSizeUtil.is3k() ? 16 : 12;
		btnResizePreviewPane.setIcon(ImageUtil.getImageIconFrom(Icons.get("barsWhiteVertical", size, size)));
	}

	private void initComponents() {
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
		spSelection = new ModernScrollPane(pnlSelection, ScrollPaneConstants.VERTICAL_SCROLLBAR_AS_NEEDED,
				ScrollPaneConstants.HORIZONTAL_SCROLLBAR_NEVER);
		pnlNoSelection.setMinimumSize(new Dimension(0, 0));
		spSelection.setVisible(false);
		initNoSelectionText();
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

		//		pnlSelection.setBorder(new EmptyBorder(new Insets(0, borderSize, 0, borderSize)));
		//		pnlNoSelection.setBorder(new EmptyBorder(new Insets(borderSize, borderSize, borderSize, borderSize)));
		//		pnlNoSelection.setBorder(BorderFactory.createLoweredSoftBevelBorder());

		//		BoxLayout layout = new BoxLayout(this, BoxLayout.PAGE_AXIS);
		BorderLayout layout = new BorderLayout();
		setLayout(layout);

		pnlSelection.setBorder(BorderFactory.createEmptyBorder(10, 0, 10, 16));
		pnlNoSelection.setBorder(BorderFactory.createEmptyBorder(10, 0, 10, 16));

		//		add(spSelection, BorderLayout.NORTH);
		btnResizePreviewPane.setFocusable(false);
		UIUtil.doHover(false, btnResizePreviewPane);
		add(btnResizePreviewPane, BorderLayout.WEST);
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
				pnlSelection.setGameTitle(firstGame.getName(), null);
				pnlSelection.setCurrentPlatform(explorer.getPlatform(platformId), icon);
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

	public void gameCoverChanged(Game game, Image i) {
		pnlSelection.gameCoverChanged(game, i);
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
		pnlSelection.pnlGameData.addCoverFromWebListener(l);
	}

	public void addTrailerFromWebListener(ActionListener l) {
		pnlSelection.pnlGameData.addTrailerFromWebListener(l);

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
		BufferedImage imagePreviewPaneBackground = IconStore.current().getPreviewPaneBackgroundImage();
		if (imagePreviewPaneBackground != null) {
			Graphics2D g2d = (Graphics2D) g.create();
			int x = 0;
			int y = 0;
			int w = getWidth();
			int h = getHeight();
			g2d.drawImage(imagePreviewPaneBackground, 0, 0, w, h, this);
			g2d.dispose();
		}
	}

	class SelectionPanel extends ScrollablePanel {
		private static final long serialVersionUID = 1L;
		private JLabel lblGameTitle = new JLabel2("Game Title");
		private JLinkButton lnkPlatformTitle = new JLinkButton("Platform Title");
		private GameDataPanel pnlGameData = new GameDataPanel();
		private AutoScaleImagePanel pnlAutoScaleImage = new AutoScaleImagePanel();
		private RatingBarPanel pnlRatingBar = new RatingBarPanel(Messages.get(MessageConstants.RATE_GAME), false);
		private DateAddedPanel pnlDateAdded = new DateAddedPanel();
		private PlayCountPanel pnlPlayCount = new PlayCountPanel();
		private LastPlayedPanel pnlLastPlayed = new LastPlayedPanel();
		//		private PathPanel pnlPath = new PathPanel();
		private TagsPanel pnlTags = new TagsPanel();

		private JMenu mnuAddCover = new JMenu(Messages.get(MessageConstants.ADD_COVER));
		private JMenuItem itmAddCoverFromComputer = new JMenuItem(Messages.get(MessageConstants.ADD_COVER_FROM_COMPUTER));
		private JMenuItem itmAddCoverFromWeb = new JMenuItem(Messages.get(MessageConstants.COVER_FROM_WEB));
		private JMenuItem itmRemoveCover = new JMenuItem(Messages.get(MessageConstants.REMOVE_COVER));
		private JPanel pnl;
		private JButton btnComment;
		private Platform platform;

		public SelectionPanel() {
			setLayout(new BorderLayout());
			initComponents();
			setIcons();
			createUI();
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
			mnuAddCover.setIcon(ImageUtil.getImageIconFrom(Icons.get("add", size, size)));
			itmAddCoverFromComputer.setIcon(ImageUtil.getImageIconFrom(Icons.get("fromComputer", size, size)));
			itmAddCoverFromWeb.setIcon(ImageUtil.getImageIconFrom(Icons.get("fromWeb", size, size)));
			itmRemoveCover.setIcon(ImageUtil.getImageIconFrom(Icons.get("remove2", size, size)));
		}

		private void createUI() {
			setOpaque(false);
			pnlRatingBar.setOpaque(false);
			pnlAutoScaleImage.setOpaque(false);
			lblGameTitle.setMinimumSize(new Dimension(0, 0));
			lnkPlatformTitle.setMinimumSize(new Dimension(0, 0));
			FormLayout layoutTop = new FormLayout("min:grow",
					"default, $rgap, default, $ugap, default, $ugap, default, $ugap, default, $lgap, default, $ugap,"
							+ " fill:pref, $lgap, fill:pref, fill:$ugap, fill:pref, fill:$ugap, fill:default"/*, fill:$ugap, fill:default */);
			pnl = new JPanel(layoutTop);
			pnl.setOpaque(false);
			int columnCount = layoutTop.getColumnCount();
			CellConstraints ccSelection = new CellConstraints();
			pnl.setLayout(layoutTop);
			pnl.add(lblGameTitle, ccSelection.xyw(1, 1, columnCount));
			pnl.add(lnkPlatformTitle, ccSelection.xyw(1, 3, columnCount));
			pnl.add(pnlGameData, ccSelection.xyw(1, 5, columnCount));
			pnl.add(pnlAutoScaleImage, ccSelection.xyw(1, 7, columnCount));
			pnl.add(pnlRatingBar, ccSelection.xyw(1, 9, columnCount));

			btnComment = new JButton(Messages.get(MessageConstants.GAME_COMMENT));
			UIUtil.doHover(false, btnComment);
			btnComment.addMouseListener(UIUtil.getMouseAdapter());
			btnComment.addActionListener(new ActionListener() {

				@Override
				public void actionPerformed(ActionEvent e) {
					UIUtil.showErrorMessage(PreviewPanePanel.this, "not yet implemented sorry :(",
							"feature unavailable");
				}
			});
			btnComment.setMinimumSize(new Dimension(0, 0));
			btnComment.setHorizontalAlignment(SwingConstants.LEFT);
			btnComment.setIcon(ImageUtil.getImageIconFrom(Icons.get("gameComment", 16, 16)));
			JPanel pnlCommentWrapper = new JPanel(new BorderLayout());
			pnlCommentWrapper.setOpaque(false);
			pnlCommentWrapper.add(btnComment, BorderLayout.WEST);

			Color colorUnderlay = new Color(0f, 0f, 0f, 0.25f);
			pnlPlayCount.setBackground(colorUnderlay);
			pnlDateAdded.setBackground(colorUnderlay);
			pnlLastPlayed.setBackground(colorUnderlay);

			pnl.add(pnlCommentWrapper, ccSelection.xyw(1, 11, columnCount));
			pnl.add(pnlTags, ccSelection.xyw(1, 13, columnCount));
			pnl.add(pnlPlayCount, ccSelection.xyw(1, 15, columnCount));
			pnl.add(pnlLastPlayed, ccSelection.xyw(1, 17, columnCount));
			pnl.add(pnlDateAdded, ccSelection.xyw(1, 19, columnCount));
			//			pnl.add(pnlPath, ccSelection.xyw(1, 21, columnCount));
			add(pnl);
		}

		private void initGameTitle() {
			lblGameTitle.setOpaque(false);
			//			lblGameTitle.addMouseListener(new MouseAdapter() {
			//				@Override
			//				public void mousePressed(MouseEvent e) {
			//					if (currentGames.size() == 1) {
			//						pnl.remove(lblGameTitle);
			//						pnl.add(txtGameTitle, CC.xy(1, 1));
			//						txtGameTitle.setText(currentGames.get(0).getName());
			//						txtGameTitle.requestFocusInWindow();
			//						UIUtil.revalidateAndRepaint(pnl);
			//					}
			//				}
			//			});
			//			txtGameTitle.addFocusListener(new FocusAdapter() {
			//				@Override
			//				public void focusLost(FocusEvent e) {
			//					pnl.remove(txtGameTitle);
			//					pnl.add(lblGameTitle, CC.xy(1, 1));
			//					UIUtil.revalidateAndRepaint(pnl);
			//				}
			//			});
		}

		private void initPlatformTitle() {
			lnkPlatformTitle.setFont(FontUtil.getCustomFont());
			lnkPlatformTitle.setBorder(Paddings.EMPTY);
			lnkPlatformTitle.setBackground(getBackground());
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
			lblGameTitle.setText(Messages.get(MessageConstants.GAME_TITLE_LARGE, "<html><strong>" + gameTitle + "</strong></html>"));
			lblGameTitle.setIcon(icon);
		}

		protected void setCurrentPlatform(Platform platform, Icon icon) {
			this.platform = platform;
			String name = (platform == null) ? "" : platform.getName();
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
				pnlSelection.setGameTitle(game.getName(), null);
				if (image == null) {
					pnlSelection.pnlAutoScaleImage.setGameCover(null);
				} else {
					pnlSelection.pnlAutoScaleImage.setGameCover(image);
				}
			} else {
				pnlSelection.pnlAutoScaleImage.setGameCover(null);
			}
		}

		public void languageChanged() {
			btnComment.setText(Messages.get(MessageConstants.GAME_COMMENT));
			pnlDateAdded.lblDateAdded.setText(("<html><strong>" + Messages.get(MessageConstants.DATE_ADDED) + "</strong></html>"));
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
			pnlGameData.setToolTipTexts();
		}

		class DateAddedPanel extends JPanel {
			private static final long serialVersionUID = 1L;
			private JLabel lblDateAdded = new JLabel2(
					"<html><strong>" + Messages.get(MessageConstants.DATE_ADDED) + "</strong></html>");
			private JLabel lblDateAdded2 = new JLabel2("MM d, yyy HH:mm:ss");

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
			private JLabel lblPlayCount = new JLabel2(
					"<html><strong>" + Messages.get(MessageConstants.PLAY_COUNT) + "</strong></html>");
			private JLabel lblPlayCount2 = new JLabel2("");

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
				lblPlayCount2.setMinimumSize(new Dimension(0, 0));
				setLayout(new BoxLayout(this, BoxLayout.PAGE_AXIS));
				add(lblPlayCount);
				add(lblPlayCount2);
			}

			protected void setPlayCount(int playCount) {
				String s = "";
				switch (playCount) {
				case 0:
					s = Messages.get(MessageConstants.NEVER_PLAYED);
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
				lblPlayCount.setText("<html><strong>" + Messages.get(MessageConstants.PLAY_COUNT) + "</strong></html>");
				String s = "";
				if (currentGames != null && currentGames.size() == 1) {
					int playCount = currentGames.get(0).getPlayCount();
					switch (playCount) {
					case 0:
						s = Messages.get(MessageConstants.NEVER_PLAYED);
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
			private JLabel lblLastPlayed = new JLabel2("");

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

		class PathPanel extends ScrollablePanel {
			private static final long serialVersionUID = 1L;
			// private JEditorPane txtPath = new JEditorPane();
			private JTextArea txtFilename = new JTextArea();
			private JTextArea txtPath = new JTextArea();
			private Font fontUnderline;
			private Font fontNotUnderline;
			private Map<TextAttribute, Integer> fontAttributesNotUnderlined = new HashMap<>();
			private Map<TextAttribute, Integer> fontAttributes = new HashMap<>();
			private JLabel lblFilename = new JLabel2("<html><strong>" + Messages.get(MessageConstants.FILE_NAME) + "</strong></html>");
			private JLabel lblFileInformations = new JLabel2("<html><strong>" + Messages.get(MessageConstants.FILE_INFORMATIONS) + "</strong></html>");
			private JLabel lblFileLocation = new JLabel2("<html><strong>" + Messages.get(MessageConstants.FILE_LOCATION) + "</strong></html>");

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
				lblFileInformations.setText("<html><strong>" + Messages.get(MessageConstants.FILE_INFORMATIONS) + "</strong></html>");
			}

			public void addOpenGameFolderListener(MouseListener l) {
				txtPath.addMouseListener(l);
			}
		}

		public class GameDataPanel extends ScrollablePanel implements MouseListener {
			private static final long serialVersionUID = 1L;

			int size = ScreenSizeUtil.is3k() ? 32 : 24;
			Color colorUnderlay = new Color(0f, 0f, 0f, 0.25f);

			private ImageIcon icoRunGame = ImageUtil.getImageIconFrom(Icons.get("runGame", size, size));
			private ImageIcon icoMoreOptionsRunGame = ImageUtil.getImageIconFrom(Icons.get("arrowDownOtherWhite", 1));
			private JLabel lblRunGame = new JLabel(Messages.get(MessageConstants.RUN_GAME));
			private JLabel lblMoreOptionsRunGame = new JLabel("");

			private JButton btnRunGame = new JButton(Messages.get(MessageConstants.RUN_GAME));
			private JButton btnMoreOptionsRunGame = new JButton("");
			private JButton btnSearchCover = new JButton();
			private JButton btnSearchTrailer = new JButton();

			private JPanel pnlRunGameWrapper;

			public GameDataPanel() {
				initComponents();
				createUI();
			}

			private void initComponents() {
				setToolTipTexts();
				setIcons();
				addListeners();
			}

			private void setToolTipTexts() {
				btnSearchCover.setToolTipText(Messages.get(MessageConstants.COVER_FROM_WEB));
				btnSearchTrailer.setToolTipText(Messages.get(MessageConstants.SHOW_TRAILER));
			}

			private void setIcons() {
				int size = ScreenSizeUtil.is3k() ? 32 : 24;
				btnSearchCover.setIcon(ImageUtil.getImageIconFrom(Icons.get("google", size, size)));
				btnSearchTrailer.setIcon(ImageUtil.getImageIconFrom(Icons.get("youtube", size, size)));

				lblRunGame.setIcon(icoRunGame);
				lblMoreOptionsRunGame.setIcon(icoMoreOptionsRunGame);
				btnRunGame.setIcon(icoRunGame);
				btnMoreOptionsRunGame.setIcon(icoMoreOptionsRunGame);
			}

			private void addListeners() {
				lblRunGame.addMouseListener(this);
				lblMoreOptionsRunGame.addMouseListener(this);
				btnRunGame.addMouseListener(this);
				btnMoreOptionsRunGame.addMouseListener(this);
				btnSearchCover.addMouseListener(this);
				btnSearchTrailer.addMouseListener(this);
				btnRunGame.addMouseListener(UIUtil.getMouseAdapter());
				btnMoreOptionsRunGame.addMouseListener(UIUtil.getMouseAdapter());
				btnSearchCover.addMouseListener(UIUtil.getMouseAdapter());
				btnSearchTrailer.addMouseListener(UIUtil.getMouseAdapter());
			}

			private void createUI() {
				setOpaque(false);
				setLayout(new FormLayout("min, min, min, min:grow, min",
						"fill:min, $rgap, fill:min"));
				CellConstraints cc = new CellConstraints();

				Color colorUnderlay = new Color(0f, 0f, 0f, 0.25f);
				lblRunGame.setOpaque(true);
				lblMoreOptionsRunGame.setOpaque(true);
				lblRunGame.setBackground(new Color(0f, 0f, 0f, 0.25f));
				lblMoreOptionsRunGame.setBackground(new Color(0f, 0f, 0f, 0.25f));

				pnlRunGameWrapper = new JPanel(new BorderLayout());
				pnlRunGameWrapper.setOpaque(false);
				pnlRunGameWrapper.setBorder(BorderFactory.createLineBorder(colorUnderlay, 15));
				pnlRunGameWrapper.add(lblRunGame);
				pnlRunGameWrapper.add(lblMoreOptionsRunGame, BorderLayout.EAST);
				UIUtil.doHover(false, btnRunGame, btnMoreOptionsRunGame, btnSearchCover, btnSearchTrailer);
				add(pnlRunGameWrapper, cc.xyw(1, 1, 5));
				//				add(btnRunGame, cc.xyw(1, 1, 4));
				//				add(btnMoreOptionsRunGame, cc.xy(5, 1));
				add(btnSearchCover, cc.xy(1, 3));
				add(btnSearchTrailer, cc.xy(3, 3));
				//			int size = ScreenSizeUtil.is3k() ? 24 : 16;
				//			btnAddTag.setIcon(ImageUtil.getImageIconFrom(Icons.get("add", size, size)));
				//			btnAddTag.setBorderPainted(false);
				//			btnAddTag.setContentAreaFilled(false);
			}

			@Override
			public void mouseClicked(MouseEvent e) {
				// TODO Auto-generated method stub

			}

			@Override
			public void mousePressed(MouseEvent e) {
				// TODO Auto-generated method stub

			}

			@Override
			public void mouseReleased(MouseEvent e) {
				// TODO Auto-generated method stub

			}

			@Override
			public void mouseEntered(MouseEvent e) {
				JComponent source = (JComponent) e.getSource();
				if (source == lblRunGame || source == lblMoreOptionsRunGame) {
					pnlRunGameWrapper.remove(lblRunGame);
					pnlRunGameWrapper.remove(lblMoreOptionsRunGame);
					pnlRunGameWrapper.add(btnRunGame);
					pnlRunGameWrapper.add(btnMoreOptionsRunGame, BorderLayout.EAST);
					UIUtil.doHover(true, btnRunGame, btnMoreOptionsRunGame);
				} else if (source == btnSearchCover) {
					((AbstractButton) source).setText("Google");
				} else if (source == btnSearchTrailer) {
					((AbstractButton) source).setText("YouTube");
				}
			}

			@Override
			public void mouseExited(MouseEvent e) {
				JComponent source = (JComponent) e.getSource();
				if (source == btnRunGame || source == btnMoreOptionsRunGame) {
					UIUtil.doHover(false, btnRunGame, btnMoreOptionsRunGame);
					pnlRunGameWrapper.remove(btnRunGame);
					pnlRunGameWrapper.remove(btnMoreOptionsRunGame);
					pnlRunGameWrapper.add(lblRunGame);
					pnlRunGameWrapper.add(lblMoreOptionsRunGame, BorderLayout.EAST);
				} else if (source == btnSearchCover || source == btnSearchTrailer) {
					((AbstractButton) source).setText("");
				}
			}

			public void addCoverFromWebListener(ActionListener l) {
				btnSearchCover.addActionListener(l);
			}

			public void addTrailerFromWebListener(ActionListener l) {
				btnSearchTrailer.addActionListener(l);
			}
		}

		class TagsPanel extends ScrollablePanel {
			private static final long serialVersionUID = 1L;

			private JLabel lblTags = new JLabel2("<html><strong>" + Messages.get(MessageConstants.MANAGE_TAGS) + "</strong></html>");
			private JPanel pnlTagList = new JPanel();
			private JButton btnAddTag = new JButton(Messages.get(MessageConstants.ADD_TAG));
			private int size = ScreenSizeUtil.is3k() ? 24 : 16;
			private Icon iconTag = ImageUtil.getImageIconFrom(Icons.get("tags", size, size));
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
				popup.add(itmAddToFilter = new JMenuItem(Messages.get(MessageConstants.ADD_TO_FILTER), ImageUtil.getImageIconFrom(Icons.get("setFilter", size, size))));
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
				btnAddTag.setIcon(ImageUtil.getImageIconFrom(Icons.get("add", size, size)));
				UIUtil.doHover(false, btnAddTag);
				btnAddTag.addMouseListener(UIUtil.getMouseAdapter());
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

			public void addTag(Tag tag) {
				JButton btn = new JButton(tag.getName());
				btn.setIcon(iconTag);
				Color randomColor = Color.decode(tag.getHexColor());
				btn.setBackground(randomColor.brighter());
				btn.setForeground(randomColor);
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
				lblTags.setText("<html><strong>" + Messages.get(MessageConstants.MANAGE_TAGS) + "</strong></html>");
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
		pnlSelection.pnlGameData.btnRunGame.addActionListener(l);
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
}