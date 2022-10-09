package ch.sysout.emubro.ui;

import java.awt.Color;
import java.awt.Component;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.io.File;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import javax.swing.Action;
import javax.swing.ButtonGroup;
import javax.swing.Icon;
import javax.swing.ImageIcon;
import javax.swing.JComponent;
import javax.swing.JMenu;
import javax.swing.JMenuItem;
import javax.swing.JPopupMenu;
import javax.swing.JRadioButtonMenuItem;
import javax.swing.JSeparator;
import javax.swing.MenuElement;
import javax.swing.MenuSelectionManager;
import javax.swing.SwingUtilities;
import javax.swing.event.PopupMenuEvent;
import javax.swing.filechooser.FileSystemView;

import ch.sysout.emubro.api.PopupMenuAdapter;
import ch.sysout.emubro.api.RunGameWithListener;
import ch.sysout.emubro.api.TagListener;
import ch.sysout.emubro.api.event.GameSelectionEvent;
import ch.sysout.emubro.api.event.TagEvent;
import ch.sysout.emubro.api.model.Emulator;
import ch.sysout.emubro.api.model.Game;
import ch.sysout.emubro.api.model.Tag;
import ch.sysout.emubro.controller.GameSelectionListener;
import ch.sysout.emubro.impl.event.BroTagAddedEvent;
import ch.sysout.emubro.impl.event.BroTagRemovedEvent;
import ch.sysout.emubro.impl.model.BroEmulator;
import ch.sysout.emubro.util.MessageConstants;
import ch.sysout.ui.util.ImageUtil;
import ch.sysout.ui.util.UIUtil;
import ch.sysout.util.Icons;
import ch.sysout.util.Messages;
import ch.sysout.util.ScreenSizeUtil;

public class GameContextMenu extends JPopupMenu implements GameSelectionListener, TagListener {
	private static final long serialVersionUID = 1L;

	private JMenuItem itmRunGame = new JMenuItem("");
	private JMenu mnuRunWith = new JMenu("");
	private JMenuItem itmRunWithDefault = new JMenuItem();
	private JMenuItem itmRunConfigurations = new JMenuItem();
	private JMenuItem itmRunEmulator = new JMenuItem();
	private JMenuItem itmConfigureEmulator = new JMenuItem();
	private JMenuItem itmChangePlatform = new JMenuItem();
	private JMenu mnuRateGame = new JMenu();
	private JMenu mnuManageTags = new JMenu();
	private JMenu mnuAvailableTags = new JMenu();
	private JMenu mnuImportTags = new JMenu();
	private JMenuItem itmCreateNewTag = new JMenuItem();
	private JMenuItem itmAutoSearchTags = new JMenuItem();
	private JMenuItem itmAddCoverComputer = new JMenuItem();
	private JMenuItem mnuShowTagsWeb = new JMenu();
	private JMenu mnuShowCoverWeb = new JMenu();
	private JMenu mnuShowTrailerWeb = new JMenu();
	private JMenuItem itmDefaultTagSource = new JMenuItem();
	private JMenuItem itmDefaultImportTagSource = new JMenuItem();
	private JMenuItem itmCoverDownload = new JMenuItem("Download");
	private JMenuItem itmDefaultCoverSource = new JMenuItem();
	private JMenuItem itmDefaultTrailerSource = new JMenuItem();
	private JMenuItem itmWebSearchSettings = new JMenuItem();
	private JMenuItem itmRenameGame = new JMenuItem();
	private JMenuItem itmRemoveGame = new JMenuItem();
	private JMenuItem itmCopyGamePath = new JMenuItem();
	private JMenuItem itmOpenGameFolder = new JMenuItem();
	private JMenuItem itmGameProperties = new JMenuItem();
	private RatingBarPanel pnlRatingBar = new RatingBarPanel(null, false);
	private JMenuItem itmComment = new JMenuItem();

	private int size = ScreenSizeUtil.is3k() ? 24 : 16;
	private Icon iconTag = ImageUtil.getFlatSVGIconFrom(Icons.get("tag"), size, new Color(168, 124, 160));
	private Icon iconRemoveTag = ImageUtil.getImageIconFrom(Icons.get("remove", size, size));
	//	private Icon iconRenameTag = ImageUtil.getImageIconFrom(Icons.get("rename", size, size));

	private List<TagListener> tagListeners = new ArrayList<>();

	private Map<Integer, JComponent> tags = new HashMap<>();

	private List<RunGameWithListener> runGameWithListeners = new ArrayList<>();

	public GameContextMenu() {
		//		MenuScroller.setScrollerFor(mnuAvailableTags, 8, 125, 3, 1);

		setIcons();
		addComponentsToJComponent(this, itmRunGame, mnuRunWith, itmRunConfigurations,
				new JSeparator(), itmRunEmulator, itmConfigureEmulator, itmChangePlatform,
				new JSeparator(), mnuRateGame, mnuManageTags, itmAddCoverComputer,
				new JSeparator(), mnuShowTagsWeb, mnuShowCoverWeb, mnuShowTrailerWeb/*, itmWebSearchSettings*/,
				new JSeparator(), itmRemoveGame, itmRenameGame,
				new JSeparator(),  itmCopyGamePath,itmOpenGameFolder,
				new JSeparator(), itmGameProperties);
		addComponentsToJComponent(mnuRateGame, pnlRatingBar, new JSeparator(), itmComment);
		addComponentsToJComponent(mnuShowTagsWeb, itmDefaultTagSource);
		addComponentsToJComponent(mnuShowCoverWeb, itmCoverDownload, itmDefaultCoverSource);
		addComponentsToJComponent(mnuShowTrailerWeb, itmDefaultTrailerSource);

		int size = ScreenSizeUtil.is3k() ? 24 : 16;
		itmCreateNewTag.setIcon(ImageUtil.getImageIconFrom(Icons.get("add", size, size)));
		itmAutoSearchTags.setIcon(ImageUtil.getImageIconFrom(Icons.get("searchFile", size, size)));
		mnuShowTagsWeb.setIcon(ImageUtil.getFlatSVGIconFrom(Icons.get("tag"), size, Color.LIGHT_GRAY));
		addComponentsToJComponent(mnuImportTags, itmDefaultImportTagSource, new JSeparator());
		addComponentsToJComponent(mnuAvailableTags, itmCreateNewTag, new JSeparator());
		addComponentsToJComponent(mnuManageTags, itmAutoSearchTags, mnuAvailableTags, new JSeparator());
		addPopupMenuListener(new PopupMenuAdapter() {
			@Override
			public void popupMenuWillBecomeVisible(PopupMenuEvent e) {
				super.popupMenuWillBecomeVisible(e);
			}
		});
	}

	public void initDefaultTags(List<Tag> tags) {
		for (Tag tag : tags) {
			addNewTag(tag);
		}
	}

	private void addNewTag(final Tag tag) {
		JMenuItem itmTag = new JMenuItem(tag.getName());
		itmTag.setIcon(iconTag);
		String hexColor = tag.getHexColor();
		if (hexColor != null && !hexColor.trim().isEmpty()) {
			Color tagColor = Color.decode(tag.getHexColor());
			itmTag.setForeground(tagColor);
		}
		addComponentsToJComponent(mnuAvailableTags, itmTag);
		itmTag.addActionListener(new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				firePutTagEvent(tag);
				GameContextMenu.this.setVisible(true);
				SwingUtilities.invokeLater(new Runnable() {

					@Override
					public void run() {
						//							mnuManageTags.setPopupMenuVisible(GameContextMenu.this);
						MenuSelectionManager.defaultManager().setSelectedPath(new MenuElement[] { GameContextMenu.this, mnuManageTags });
					}
				});
			}
		});
	}

	private void addTagItem(final Tag tag) {
		JMenu mnuTag = new JMenu(tag.getName());
		String hexColor = tag.getHexColor();
		if (hexColor != null && !hexColor.trim().isEmpty()) {
			Color tagColor = Color.decode(hexColor);
			mnuTag.setForeground(tagColor);
		}
		JMenuItem itmRemoveTag = new JMenuItem(Messages.get(MessageConstants.REMOVE_TAG));
		//		JMenuItem itmRenameTag = new JMenuItem(Messages.get(MessageConstants.RENAME_TAG));
		mnuTag.setIcon(iconTag);
		itmRemoveTag.setIcon(iconRemoveTag);
		itmRemoveTag.addActionListener(new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				fireRemoveTagFromGameEvent(tag);
				GameContextMenu.this.setVisible(true);
				SwingUtilities.invokeLater(new Runnable() {

					@Override
					public void run() {
						MenuSelectionManager.defaultManager().setSelectedPath(new MenuElement[] { GameContextMenu.this, mnuManageTags });
					}
				});
			}
		});
		//		itmRenameTag.setIcon(iconRenameTag);
		addComponentsToJComponent(mnuTag, itmRemoveTag/*, itmRenameTag*/);
		tags.put(tag.getId(), mnuTag);
		addComponentsToJComponent(mnuManageTags, mnuTag);
		UIUtil.revalidateAndRepaint(this);
	}

	private void removeTagItem(int tagId) {
		mnuManageTags.remove(tags.get(tagId));
		tags.remove(tagId);
		UIUtil.revalidateAndRepaint(this);
	}

	protected void firePutTagEvent(Tag tag) {
		for (TagListener l : tagListeners) {
			l.tagAdded(new BroTagAddedEvent(tag));
		}
	}

	protected void fireRemoveTagFromGameEvent(Tag tag) {
		for (TagListener l : tagListeners) {
			l.tagRemoved(new BroTagRemovedEvent(tag));
		}
	}

	public void addPutTagListener(ActionListener l) {
	}

	public void initEmulators(List<BroEmulator> emulators, int defaultEmulatorId) {
		mnuRunWith.removeAll();
		ScreenSizeUtil.adjustValueToResolution(32);
		ButtonGroup group = new ButtonGroup();
		List<JRadioButtonMenuItem> radios = new ArrayList<>();
		for (final Emulator emu : emulators) {
			if (!emu.isInstalled()) {
				continue;
			}
			String s = "<html><strong>" + emu.getName() + "</strong> <br>(" + emu.getAbsolutePath() + ")</html>";
			Icon icon = IconStore.current().getEmulatorIcon(emu.getId());
			if (icon == null) {
				icon = FileSystemView.getFileSystemView().getSystemIcon(new File(emu.getAbsolutePath()));
			}
			JRadioButtonMenuItem rdb = new JRadioButtonMenuItem(s, icon);
			if (defaultEmulatorId == emu.getId()) {
				rdb.setSelected(true);
			}
			group.add(rdb);
			radios.add(rdb);
			addComponentsToJComponent(mnuRunWith, rdb);
			rdb.addActionListener(new ActionListener() {

				@Override
				public void actionPerformed(ActionEvent e) {
					fireRunGameWithEvent(emu.getId());
				}
			});
		}
		if (emulators.size() > 0) {
			mnuRunWith.add(new JSeparator());
		}
		ImageIcon iconBlank = ImageUtil.getImageIconFrom(Icons.get("blank", 48, 48));
		addComponentsToJComponent(mnuRunWith, new JMenuItem(Messages.get("setEmulator") + "...", iconBlank));
	}

	protected void fireRunGameWithEvent(int emulatorId) {
		for (RunGameWithListener l : runGameWithListeners) {
			l.runGameWith(emulatorId);
		}
	}

	public void addRunGameWithListener(RunGameWithListener l) {
		runGameWithListeners.add(l);
	}

	private void setIcons() {
		int size = ScreenSizeUtil.is3k() ? 24 : 16;
		mnuShowTrailerWeb.setIcon(ImageUtil.getImageIconFrom(Icons.get("video", size, size)));
		mnuShowCoverWeb.setIcon(ImageUtil.getFlatSVGIconFrom(Icons.get("picture"), size, new Color(181, 201, 255)));
		itmRunGame.setIcon(ImageUtil.getFlatSVGIconFrom(Icons.get("runGame"), size, new Color(40, 167, 69)));
		itmRunEmulator.setIcon(ImageUtil.getFlatSVGIconFrom(Icons.get("runGame"), size, new Color(181, 201, 255)));
		itmConfigureEmulator.setIcon(ImageUtil.getFlatSVGIconFrom(Icons.get("settings"), size, Color.LIGHT_GRAY));
		itmChangePlatform.setIcon(ImageUtil.getFlatSVGIconFrom(Icons.get("change"), size, Color.LIGHT_GRAY));
		itmComment.setIcon(ImageUtil.getImageIconFrom(Icons.get("gameComment", size, size)));
		itmCopyGamePath.setIcon(ImageUtil.getImageIconFrom(Icons.get("copy", size, size)));
		itmOpenGameFolder.setIcon(ImageUtil.getImageIconFrom(Icons.get("openFolder", size, size)));
		itmRemoveGame.setIcon(ImageUtil.getFlatSVGIconFrom(Icons.get("trash"), size, new Color(237, 67, 55)));
		itmRenameGame.setIcon(ImageUtil.getFlatSVGIconFrom(Icons.get("rename"), size, Color.LIGHT_GRAY));
		itmDefaultTagSource.setIcon(ImageUtil.getImageIconFrom(Icons.get("applicationIcon", size, size)));
		//		itmCoverDownload.setIcon(ImageUtil.getImageIconFrom(Icons.get("applicationIcon", size, size)));
		itmDefaultCoverSource.setIcon(ImageUtil.getFlatSVGIconFrom(Icons.get("google"), size));
		itmDefaultTrailerSource.setIcon(ImageUtil.getFlatSVGIconFrom(Icons.get("youtube"), size));
		itmGameProperties.setIcon(ImageUtil.getFlatSVGIconFrom(Icons.get("gameProperties"), size, Color.LIGHT_GRAY));
	}

	private void addComponentsToJComponent(JComponent component, Component... components) {
		//		Color color = IconStore.current().getCurrentTheme().getMenuBar().getColor();
		//		if (color == null) {
		//			color = IconStore.current().getCurrentTheme().getBackground().getColor().darker();
		//		}
		for (Component c : components) {
			//			if (c instanceof JComponent) {
			//				((JComponent) c).setOpaque(true);
			//				((JComponent) c).setBackground(color);
			//			}
			component.add(c);
		}
	}

	public void addRunGameListener(ActionListener l) {
		itmRunGame.addActionListener(l);
	}

	public void addConfigureEmulatorListener(ActionListener l) {
		itmConfigureEmulator.addActionListener(l);
	}

	public void addCoverFromComputerListener(ActionListener l) {
		itmAddCoverComputer.addActionListener(l);
	}

	public void addTagFromWebListener(ActionListener l) {
		itmDefaultTagSource.addActionListener(l);
	}

	public void addAutoSearchTagsListener(ActionListener l) {
		itmAutoSearchTags.addActionListener(l);
	}

	public void addCoverDownloadListener(ActionListener l) {
		itmCoverDownload.addActionListener(l);
	}

	public void addCoverFromWebListener(ActionListener l) {
		itmDefaultCoverSource.addActionListener(l);
	}

	public void addTrailerFromWebListener(ActionListener l) {
		itmDefaultTrailerSource.addActionListener(l);
	}

	public void addRemoveGameListener(Action l) {
		itmRemoveGame.addActionListener(l);
	}

	public void addRenameGameListener(Action l) {
		itmRenameGame.addActionListener(l);
	}

	public void addOpenGamePropertiesListener(ActionListener l) {
		itmGameProperties.addActionListener(l);
	}

	public void languageChanged() {
		itmRunGame.setText("<html><b>" + Messages.get(MessageConstants.RUN_GAME) + "</b></html>");
		mnuRunWith.setText(Messages.get(MessageConstants.RUN_WITH) + "...");
		itmRunWithDefault.setText(Messages.get(MessageConstants.SET_EMULATOR) + "...");
		itmRunConfigurations.setText(Messages.get(MessageConstants.RUN_CONFIGURATIONS) + "...");
		itmRunEmulator.setText(Messages.get(MessageConstants.RUN_EMULATOR));
		itmConfigureEmulator.setText(Messages.get(MessageConstants.CONFIGURE_EMULATOR));
		itmChangePlatform.setText(Messages.get(MessageConstants.CHANGE_PLATFORM) + "...");
		itmWebSearchSettings.setText(Messages.get(MessageConstants.WEB_SEARCH_SETTINGS) + "...");
		mnuRateGame.setText(Messages.get(MessageConstants.RATE_GAME));
		mnuAvailableTags.setText(Messages.get(MessageConstants.ADD_TAGS_MANUALLY));
		mnuImportTags.setText(Messages.get(MessageConstants.IMPORT_TAGS));
		itmDefaultImportTagSource.setText(Messages.get(MessageConstants.DEFAULT_TAG_SOURCE));
		mnuManageTags.setText(Messages.get(MessageConstants.MANAGE_TAGS));
		itmCreateNewTag.setText(Messages.get(MessageConstants.NEW_TAG));
		itmAutoSearchTags.setText(Messages.get(MessageConstants.AUTO_SEARCH_TAG));
		//		itmRemoveTag.setText(Messages.get(MessageConstants.REMOVE_TAG));
		//		itmRenameTag.setText(Messages.get(MessageConstants.RENAME_TAG));
		itmComment.setText(Messages.get(MessageConstants.GAME_COMMENT)+"...");
		itmAddCoverComputer.setText(Messages.get(MessageConstants.ADD_COVER_FROM_COMPUTER));
		mnuShowTagsWeb.setText(Messages.get(MessageConstants.TAG_FROM_WEB));
		mnuShowCoverWeb.setText(Messages.get(MessageConstants.COVER_FROM_WEB));
		mnuShowTrailerWeb.setText(Messages.get(MessageConstants.SHOW_TRAILER));
		itmDefaultTagSource.setText(Messages.get(MessageConstants.DEFAULT_TAG_SOURCE));
		itmDefaultCoverSource.setText(Messages.get(MessageConstants.DEFAULT_COVER_SOURCE));
		itmDefaultTrailerSource.setText(Messages.get(MessageConstants.DEFAULT_TRAILER_SOURCE));
		itmRenameGame.setText(Messages.get(MessageConstants.RENAME));
		itmRemoveGame.setText(Messages.get(MessageConstants.REMOVE));
		itmCopyGamePath.setText(Messages.get(MessageConstants.COPY_GAME_PATH));
		itmOpenGameFolder.setText(Messages.get(MessageConstants.OPEN_GAME_PATH));
		itmGameProperties.setText(Messages.get(MessageConstants.GAME_PROPERTIES));
	}

	public void addCopyGamePathListener(ActionListener l) {
		itmCopyGamePath.addActionListener(l);
	}

	public void addOpenGameFolderListener(ActionListener l) {
		itmOpenGameFolder.addActionListener(l);
	}

	public void addRateListener(RateListener l) {
		pnlRatingBar.addRateListener(l);
	}

	public void addTagListener(TagListener l) {
		tagListeners.add(l);
	}

	public void addCommentListener(ActionListener l) {
		itmComment.addActionListener(l);
	}

	@Override
	public void gameSelected(GameSelectionEvent e) {
		pnlRatingBar.gameSelected(e);
		mnuManageTags.removeAll();
		addComponentsToJComponent(mnuManageTags, itmAutoSearchTags, mnuAvailableTags, new JSeparator());
		List<Game> games = e.getGames();
		if (games != null && !games.isEmpty()) {
			Game firstGame = e.getGames().get(0);
			if (firstGame == null) {
				System.err.println("this should not happen in general. you have a problem elsewhere");
			} else {
				List<Tag> tags = firstGame.getTags();
				for (Tag tag : tags) {
					addTagItem(tag);
				}
			}
		}
	}

	@Override
	public void tagAdded(TagEvent e) {
		Tag tag = e.getTag();
		addTagItem(tag);
	}

	@Override
	public void tagRemoved(TagEvent e) {
		removeTagItem(e.getTag().getId());
	}
}
