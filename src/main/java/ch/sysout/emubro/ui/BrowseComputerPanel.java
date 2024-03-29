package ch.sysout.emubro.ui;

import java.awt.BorderLayout;
import java.awt.Color;
import java.awt.Component;
import java.awt.Dimension;
import java.awt.FlowLayout;
import java.awt.dnd.DropTarget;
import java.awt.dnd.DropTargetListener;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.io.File;
import java.util.List;

import javax.swing.BorderFactory;
import javax.swing.JButton;
import javax.swing.JCheckBox;
import javax.swing.JLabel;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.JSeparator;
import javax.swing.JTextArea;
import javax.swing.ScrollPaneConstants;
import javax.swing.SwingConstants;

import com.jgoodies.forms.factories.CC;
import com.jgoodies.forms.factories.Paddings;
import com.jgoodies.forms.layout.CellConstraints;
import com.jgoodies.forms.layout.FormLayout;

import ch.sysout.emubro.api.EmulatorListener;
import ch.sysout.emubro.api.GameListener;
import ch.sysout.emubro.api.event.EmulatorEvent;
import ch.sysout.emubro.api.event.GameAddedEvent;
import ch.sysout.emubro.api.event.GameRemovedEvent;
import ch.sysout.emubro.util.ColorConstants;
import ch.sysout.emubro.util.MessageConstants;
import ch.sysout.ui.util.ImageUtil;
import ch.sysout.ui.util.UIUtil;
import ch.sysout.util.Icons;
import ch.sysout.util.Messages;
import ch.sysout.util.ScreenSizeUtil;

public class BrowseComputerPanel extends JPanel implements GameListener, EmulatorListener {
	private static final long serialVersionUID = 1L;
	private JLabel lblDragDropCover = new JLabel(Messages.get(MessageConstants.DRAG_AND_DROP_FOLDER_HERE));
	private JButton btnAutoSearch = new JCustomButtonNew(Messages.get(MessageConstants.SEARCH_NOW));
	private JButton btnCustomSearch = new JCustomButtonNew(Messages.get(MessageConstants.SEARCH_CUSTOM));
	private JButton btnQuickSearch = new JCustomButtonNew(Messages.get(MessageConstants.SEARCH_QUICK));
	private JButton btnLastSearch = new JCustomButtonNew(Messages.get(MessageConstants.SEARCH_LAST));
	private JCheckBox chkGameSearch = new JCheckBox(Messages.get(MessageConstants.SEARCH_GAMES));
	private JCheckBox chkEmulatorSearch = new JCheckBox(Messages.get(MessageConstants.SEARCH_EMULATORS));
	private JButton btnQuickSearchNow = new JCustomButtonNew(MessageConstants.SEARCH_NOW_SHORT, ImageUtil.getFlatSVGIconFrom(Icons.get("search"), 16, Color.LIGHT_GRAY));
	private JButton lnkSearchResults = new JLinkButton(Messages.get(MessageConstants.SEARCH_LOGS));
	private JButton lnkSearchSettings = new JLinkButton(Messages.get(MessageConstants.SEARCH_PROGRESS_SETTINGS));
	private JButton btnCommonGameFolders = new JCustomButtonNew(Messages.get(MessageConstants.COMMON_GAME_FOLDERS, 0));
	private JButton btnCommonEmulatorFolders  = new JCustomButtonNew(Messages.get(MessageConstants.COMMON_EMULATOR_FOLDERS, 0));
	private JButton btnUncategorized = new JCustomButtonNew(Messages.get(MessageConstants.ARCHIVES_AND_IMAGE_FILES, 0));
	private JButton btnSetupFiles = new JCustomButtonNew(Messages.get(MessageConstants.SEARCH_CUSTOM, 0));

	private JButton btnCustomSearchNow;

	private JPanel pnlBrowseOptionsPanel;
	private JScrollPane spBrowse;

	private JLabel lblBrowse = new JLabel(MessageConstants.BROWSE_CURRENT_DIRECTORY);
	private JTextArea txtBrowseComputer;
	private JScrollPane spBrowseComputer;
	private FileTree tree;
	private JPanel pnlSpace;
	private int counterGameFolders = 0;
	private int counterEmulatorFolders = 0;
	private int counterUncategorized = 0;
	private int counterSetupFiles = 0;
	private JPanel pnlFileTree;
	JPanel pnlLinks;
	private FormLayout layoutNormal;
	private FormLayout layoutMinimized;
	private JPanel pnlOutter;
	//	private JPanel pnlFolderLinks;

	public BrowseComputerPanel() {
		super();
		pnlSpace = createSpacePanel();
		//		pnlFolderLinks = createFolderLinksPanel();
		createUI();
	}

	private void createUI() {
		setLayout(new BorderLayout());
		setBorder(Paddings.TABBED_DIALOG);
		setOpaque(false);

		pnlOutter = new JPanel(new BorderLayout());
		pnlOutter.setOpaque(false);
		pnlOutter.add(createBrowseOptionsPanel());
		spBrowseComputer = new JCustomScrollPane(pnlOutter) {
			private static final long serialVersionUID = 1L;
			private Dimension lastDimension;

			@Override
			public Dimension getPreferredSize() {
				if (lastDimension != null) {
					if (super.getPreferredSize().getHeight() == lastDimension.getHeight()) {
						return lastDimension;
					}
				}
				Dimension d = new Dimension(0, btnAutoSearch.getHeight());
				lastDimension = d;
				return d;
			}
		};
		spBrowseComputer.setOpaque(false);
		spBrowseComputer.getViewport().setOpaque(false);
		spBrowseComputer.setHorizontalScrollBarPolicy(ScrollPaneConstants.HORIZONTAL_SCROLLBAR_NEVER);
		spBrowseComputer.setVerticalScrollBarPolicy(ScrollPaneConstants.VERTICAL_SCROLLBAR_ALWAYS);
		spBrowseComputer.getVerticalScrollBar().setUnitIncrement(16);
		spBrowseComputer.setBorder(BorderFactory.createEmptyBorder());

		createBrowsePanel();
		add(spBrowseComputer);

		btnCommonGameFolders.setHorizontalAlignment(SwingConstants.LEFT);
		btnCommonGameFolders.setVerticalAlignment(SwingConstants.CENTER);
		btnCommonGameFolders.setIcon(ImageUtil.getFlatSVGIconFrom(Icons.get("folder"), 22, 22, ColorStore.current().getColor(ColorConstants.SVG_NO_COLOR)));

		btnCommonEmulatorFolders.setHorizontalAlignment(SwingConstants.LEFT);
		btnCommonEmulatorFolders.setVerticalAlignment(SwingConstants.CENTER);
		btnCommonEmulatorFolders.setIcon(ImageUtil.getFlatSVGIconFrom(Icons.get("folder"), 22, 22, ColorStore.current().getColor(ColorConstants.SVG_NO_COLOR)));

		btnUncategorized.setHorizontalAlignment(SwingConstants.LEFT);
		btnUncategorized.setVerticalAlignment(SwingConstants.CENTER);
		btnUncategorized.setIcon(ImageUtil.getImageIconFrom(Icons.get("archiveAndImage", 22, 22)));

		btnSetupFiles.setHorizontalAlignment(SwingConstants.LEFT);
		btnSetupFiles.setVerticalAlignment(SwingConstants.CENTER);
		btnSetupFiles.setIcon(ImageUtil.getImageIconFrom(Icons.get("setup", 22, 22)));

		FormLayout layout = new FormLayout("default, $ugap, $lcgap, min, $rgap, $lcgap, min, $rgap, $lcgap, min, $rgap, $lcgap, min, min:grow",
				"$ugap, fill:pref, $rgap, fill:pref");
		pnlLinks = new JPanel(layout);
		pnlLinks.setOpaque(false);
		CellConstraints cc = new CellConstraints();
		pnlLinks.add(new JSeparator(), cc.xyw(1, 1, layout.getColumnCount()));
		pnlLinks.add(lnkSearchResults, cc.xy(1, 2));
		pnlLinks.add(lnkSearchSettings, cc.xy(1, 4));

		pnlLinks.add(new JSeparator(SwingConstants.VERTICAL), cc.xywh(3, 2, 1, 3));
		pnlLinks.add(btnCommonGameFolders, cc.xywh(4, 2, 1, 3));
		pnlLinks.add(new JSeparator(SwingConstants.VERTICAL), cc.xywh(6, 2, 1, 3));
		pnlLinks.add(btnCommonEmulatorFolders, cc.xywh(7, 2, 1, 3));

		pnlLinks.add(new JSeparator(SwingConstants.VERTICAL), cc.xywh(9, 2, 1, 3));
		pnlLinks.add(btnUncategorized, cc.xywh(10, 2, 1, 3));
		pnlLinks.add(new JSeparator(SwingConstants.VERTICAL), cc.xywh(12, 2, 1, 3));
		pnlLinks.add(btnSetupFiles, cc.xywh(13, 2, 1, 3));
		add(pnlLinks, BorderLayout.SOUTH);

		tree = new FileTree();
		btnCustomSearchNow = new JCustomButton(Messages.get(MessageConstants.SEARCH_NOW_SHORT));
		btnCustomSearchNow.setIcon(ImageUtil.getFlatSVGIconFrom(Icons.get("search"), 16, Color.LIGHT_GRAY));
		pnlFileTree = new JPanel(new BorderLayout());
		pnlFileTree.setOpaque(false);
		pnlFileTree.add(tree);
		btnCustomSearchNow.setHorizontalAlignment(SwingConstants.LEFT);
		JPanel pnlButton = new JPanel(new WrapLayout(FlowLayout.LEFT));
		pnlButton.setOpaque(false);
		pnlButton.add(btnCustomSearchNow);
		pnlFileTree.add(pnlButton, BorderLayout.SOUTH);

		btnCustomSearch.addActionListener(new ActionListener() {
			@Override
			public void actionPerformed(ActionEvent e) {
				remove(spBrowseComputer);
				tree.setBorder(BorderFactory.createEmptyBorder());
				add(pnlFileTree);
				UIUtil.revalidateAndRepaint(BrowseComputerPanel.this);
				tree.requestFocusInWindow();
			}
		});
	}

	private JPanel createBrowseOptionsPanel() {
		pnlBrowseOptionsPanel = new JPanel() {
			private static final long serialVersionUID = 1L;
			private Dimension lastDimension;

			@Override
			public Dimension getPreferredSize() {
				if (lastDimension != null) {
					if (super.getPreferredSize().getHeight() == lastDimension.getHeight()) {
						return lastDimension;
					}
				}
				Dimension d = new Dimension(0, btnAutoSearch.getHeight() + btnQuickSearch.getHeight());
				lastDimension = d;
				return d;
			}
		};
		pnlBrowseOptionsPanel.setOpaque(false);

		layoutNormal = new FormLayout("default:grow, min, default:grow, $rgap, min, min",
				"fill:default, min, fill:default, $rgap, fill:default:grow, min");

		layoutMinimized = new FormLayout("default:grow",
				"fill:default, min, fill:default, min, fill:default, min, fill:default, $rgap, fill:default:grow, min");

		layoutNormal.setColumnGroup(1, 3);

		int size = ScreenSizeUtil.is3k() ? 32 : 24;
		btnAutoSearch.setIcon(ImageUtil.getFlatSVGIconFrom(Icons.get("search"), size, Color.LIGHT_GRAY));
		btnCustomSearch.setIcon(ImageUtil.getImageIconFrom(Icons.get("browseFolder", size, size)));
		btnQuickSearch.setIcon(ImageUtil.getImageIconFrom(Icons.get("quickSearch", size, size)));
		btnLastSearch.setIcon(ImageUtil.getImageIconFrom(Icons.get("recentSearch", size, size)));

		btnQuickSearch.setEnabled(false);
		btnLastSearch.setEnabled(false);

		btnAutoSearch.setHorizontalAlignment(SwingConstants.LEFT);
		btnAutoSearch.setVerticalAlignment(SwingConstants.TOP);
		btnAutoSearch.setHorizontalTextPosition(JLabel.RIGHT);
		btnAutoSearch.setVerticalTextPosition(JLabel.TOP);

		btnCustomSearch.setHorizontalAlignment(SwingConstants.LEFT);
		btnCustomSearch.setVerticalAlignment(SwingConstants.TOP);
		btnCustomSearch.setHorizontalTextPosition(JLabel.RIGHT);
		btnCustomSearch.setVerticalTextPosition(JLabel.TOP);

		btnQuickSearch.setHorizontalAlignment(SwingConstants.LEFT);
		btnQuickSearch.setVerticalAlignment(SwingConstants.TOP);
		btnQuickSearch.setHorizontalTextPosition(JLabel.RIGHT);
		btnQuickSearch.setVerticalTextPosition(JLabel.TOP);

		btnLastSearch.setHorizontalAlignment(SwingConstants.LEFT);
		btnLastSearch.setVerticalAlignment(SwingConstants.TOP);
		btnLastSearch.setHorizontalTextPosition(JLabel.RIGHT);
		btnLastSearch.setVerticalTextPosition(JLabel.TOP);

		// btnQuickSearch.setEnabled(false);
		// btnLastSearch.setEnabled(false);

		lnkSearchResults.setIcon(ImageUtil.getImageIconFrom(Icons.get("serchLogs", 16, 16)));
		lnkSearchSettings.setIcon(ImageUtil.getImageIconFrom(Icons.get("settings2", 16, 16)));

		switchToNormalView();

		btnQuickSearch.addActionListener(new ActionListener() {
			private boolean b;

			@Override
			public void actionPerformed(ActionEvent e) {
				if (b) {
					layoutNormal.setRowGroup(1, 3);
					// pnlBrowseOptionsPanel.add(btnAutoSearch, cc.xy(1, 1));
					// pnlBrowseOptionsPanel.add(btnCustomSearch, cc.xy(3, 1));
					// pnlBrowseOptionsPanel.add(btnQuickSearch, cc.xy(1, 3));
					// pnlBrowseOptionsPanel.add(btnLastSearch, cc.xy(3, 3));
					pnlBrowseOptionsPanel.add(pnlSpace, CC.xyw(1, 5, layoutNormal.getColumnCount()));
					btnQuickSearch.requestFocusInWindow();
				} else {
					layoutNormal.setRowGroup(1, 6);
					// pnlBrowseOptionsPanel.remove(btnAutoSearch);
					// pnlBrowseOptionsPanel.remove(btnCustomSearch);
					// pnlBrowseOptionsPanel.remove(btnLastSearch);
					// pnlBrowseOptionsPanel.add(btnQuickSearch, cc.xyw(1, 1,
					// 6));
					pnlBrowseOptionsPanel.remove(pnlSpace);
					btnQuickSearch.requestFocusInWindow();
				}
				revalidate();
				repaint();
				b = !b;
			}
		});
		return pnlBrowseOptionsPanel;
	}

	private void switchToNormalView() {
		pnlBrowseOptionsPanel.setLayout(layoutNormal);
		pnlBrowseOptionsPanel.add(btnAutoSearch, CC.xy(1, 1));
		pnlBrowseOptionsPanel.add(btnCustomSearch, CC.xy(3, 1));
		pnlBrowseOptionsPanel.add(btnQuickSearch, CC.xy(1, 3));
		pnlBrowseOptionsPanel.add(btnLastSearch, CC.xy(3, 3));
		//		pnlBrowseOptionsPanel.add(pnlFolderLinks, cc.xyw(1, 5, layout.getColumnCount()));
		UIUtil.revalidateAndRepaint(pnlBrowseOptionsPanel);
	}

	private void switchToMinimizedView() {
		pnlBrowseOptionsPanel.setLayout(layoutMinimized);
		pnlBrowseOptionsPanel.add(btnAutoSearch, CC.xy(1, 1));
		pnlBrowseOptionsPanel.add(btnCustomSearch, CC.xy(1, 3));
		pnlBrowseOptionsPanel.add(btnQuickSearch, CC.xy(1, 5));
		pnlBrowseOptionsPanel.add(btnLastSearch, CC.xy(1, 7));
		UIUtil.revalidateAndRepaint(pnlBrowseOptionsPanel);
	}

	private JPanel createSpacePanel() {
		JPanel pnl = new JPanel();
		pnl.setLayout(new FormLayout("min, $ugap, min", "fill:pref, $lgap, fill:pref"));
		CellConstraints cc = new CellConstraints();
		pnl.add(chkGameSearch, cc.xy(1, 1));
		pnl.add(chkEmulatorSearch, cc.xy(1, 3));
		pnl.add(btnQuickSearchNow, cc.xywh(3, 1, 1, 3));
		return pnl;
	}

	private JPanel createFolderLinksPanel() {
		JPanel pnl = new JPanel();
		Component btnFolder = new JCustomButton("Folder 1");
		Component btnFolder2 = new JCustomButton("Folder 2");
		Component btnFolder3 = new JCustomButton("Folder 3");
		Component btnFolder4 = new JCustomButton("Folder 4");
		Component btnFolder5 = new JCustomButton("Folder 5");
		Component btnFolder6 = new JCustomButton("Folder 6");
		Component btnFolder7 = new JCustomButton("Folder 7");
		pnl.add(btnFolder);
		pnl.add(btnFolder2);
		pnl.add(btnFolder3);
		pnl.add(btnFolder4);
		pnl.add(btnFolder5);
		pnl.add(btnFolder6);
		pnl.add(btnFolder7);
		return pnl;
	}

	private void createBrowsePanel() {
		txtBrowseComputer = new JTextArea();
		// txtBrowse.setBorder(BorderFactory.createEmptyBorder());
		txtBrowseComputer.setEditable(false);
		txtBrowseComputer.setFocusable(false);
		txtBrowseComputer.setLineWrap(true);
		txtBrowseComputer.setWrapStyleWord(false);
		txtBrowseComputer.setPreferredSize(new Dimension(0, 0));
		spBrowse = new JCustomScrollPane(txtBrowseComputer);
		spBrowse.setOpaque(false);
		spBrowse.getViewport().setOpaque(false);
		spBrowse.setBorder(BorderFactory.createEmptyBorder());
		spBrowse.getVerticalScrollBar().setUnitIncrement(16);
	}

	public void addAutoSearchListener(ActionListener l) {
		btnAutoSearch.addActionListener(l);
	}

	public void addQuickSearchListener(ActionListener l) {
		btnQuickSearch.addActionListener(l);
	}

	public void addCustomSearchListener(ActionListener l) {
		btnCustomSearchNow.addActionListener(l);
	}

	public void addLastSearchListener(ActionListener l) {
		btnLastSearch.addActionListener(l);
	}

	public void addCoverDragDropListener(DropTargetListener l) {
		new DropTarget(lblDragDropCover, l);
	}

	public void addShowUncategorizedFilesDialogListener(ActionListener l) {
		btnUncategorized.addActionListener(l);
	}

	public void searchProcessInitialized() {
		remove(spBrowseComputer);
		remove(pnlFileTree);
		add(lblBrowse, BorderLayout.NORTH);
		add(spBrowse);
		UIUtil.revalidateAndRepaint(this);
	}

	public void searchProcessEnded() {
		remove(lblBrowse);
		remove(spBrowse);
		add(spBrowseComputer);
		UIUtil.revalidateAndRepaint(this);
	}

	public void directorySearched(String absolutePath) {
		txtBrowseComputer.setText(absolutePath);
		repaint();
	}

	public void languageChanged() {
		lblDragDropCover.setText(Messages.get(MessageConstants.DRAG_AND_DROP_FOLDER_HERE));
		btnAutoSearch.setText(Messages.get(MessageConstants.SEARCH_NOW));
		btnCustomSearch.setText(Messages.get(MessageConstants.SEARCH_CUSTOM));
		btnQuickSearch.setText(Messages.get(MessageConstants.SEARCH_QUICK));
		btnLastSearch.setText(Messages.get(MessageConstants.SEARCH_LAST));
		chkGameSearch.setText(Messages.get(MessageConstants.SEARCH_GAMES));
		chkEmulatorSearch.setText(Messages.get(MessageConstants.SEARCH_EMULATORS));
		btnQuickSearchNow.setText(Messages.get(MessageConstants.SEARCH_NOW_SHORT));
		lnkSearchResults.setText(Messages.get(MessageConstants.SEARCH_LOGS));
		lnkSearchSettings.setText(Messages.get(MessageConstants.SEARCH_PROGRESS_SETTINGS));
		lblBrowse.setText(Messages.get(MessageConstants.BROWSE_CURRENT_DIRECTORY));
		btnCommonGameFolders.setText(Messages.get(MessageConstants.COMMON_GAME_FOLDERS, counterGameFolders));
		btnCommonEmulatorFolders.setText(Messages.get(MessageConstants.COMMON_EMULATOR_FOLDERS, counterEmulatorFolders));
		btnUncategorized.setText(Messages.get(MessageConstants.ARCHIVES_AND_IMAGE_FILES, counterUncategorized));
		btnSetupFiles.setText(Messages.get(MessageConstants.SETUP_FILES, counterSetupFiles));
	}

	public List<File> getSelectedDirectoriesToBrowse() {
		return tree.getSelectedDirectories();
	}

	public void rememberZipFile(String file) {
		btnUncategorized.setText(Messages.get(MessageConstants.ARCHIVES_AND_IMAGE_FILES, counterUncategorized++));
	}

	public void rememberRarFile(String file) {
		btnUncategorized.setText(Messages.get(MessageConstants.ARCHIVES_AND_IMAGE_FILES, counterUncategorized++));
	}

	public void rememberIsoFile(String file) {
		btnUncategorized.setText(Messages.get(MessageConstants.ARCHIVES_AND_IMAGE_FILES, counterUncategorized++));
	}

	public void minimizeButtons() {
		switchToMinimizedView();
		if (btnSetupFiles.getVerticalTextPosition() == SwingConstants.BOTTOM) {
			btnCommonGameFolders.setText("");
			btnCommonEmulatorFolders.setText("");
//			btnUncategorized.setText("");
//			btnSetupFiles.setText("");
		} else if (btnSetupFiles.getVerticalTextPosition() == SwingConstants.CENTER) {
			lnkSearchSettings.setText("");
			lnkSearchResults.setText("");
			btnCommonGameFolders.setText(Messages.get(MessageConstants.COMMON_GAME_FOLDERS, counterGameFolders));
			btnCommonGameFolders.setHorizontalAlignment(SwingConstants.CENTER);
			btnCommonGameFolders.setHorizontalTextPosition(SwingConstants.CENTER);
			btnCommonGameFolders.setVerticalTextPosition(SwingConstants.BOTTOM);
			btnCommonEmulatorFolders.setText(Messages.get(MessageConstants.COMMON_EMULATOR_FOLDERS, counterEmulatorFolders));
			btnCommonEmulatorFolders.setHorizontalAlignment(SwingConstants.CENTER);
			btnCommonEmulatorFolders.setHorizontalTextPosition(SwingConstants.CENTER);
			btnCommonEmulatorFolders.setVerticalTextPosition(SwingConstants.BOTTOM);
			btnUncategorized.setText(Messages.get(MessageConstants.ARCHIVES_AND_IMAGE_FILES, counterUncategorized));
			btnUncategorized.setHorizontalAlignment(SwingConstants.CENTER);
			btnUncategorized.setHorizontalTextPosition(SwingConstants.CENTER);
			btnUncategorized.setVerticalTextPosition(SwingConstants.BOTTOM);
			btnSetupFiles.setText(Messages.get(MessageConstants.SETUP_FILES, counterSetupFiles));
			btnSetupFiles.setHorizontalAlignment(SwingConstants.CENTER);
			btnSetupFiles.setHorizontalTextPosition(SwingConstants.CENTER);
			btnSetupFiles.setVerticalTextPosition(SwingConstants.BOTTOM);
		}
	}

	public void maximizeButtons() {
		switchToNormalView();
		lnkSearchSettings.setText(Messages.get(MessageConstants.SEARCH_PROGRESS_SETTINGS));
		lnkSearchResults.setText(Messages.get(MessageConstants.SEARCH_LOGS));
		btnCommonGameFolders.setText(Messages.get(MessageConstants.COMMON_GAME_FOLDERS, counterGameFolders));
		btnCommonGameFolders.setHorizontalAlignment(SwingConstants.LEFT);
		btnCommonGameFolders.setHorizontalTextPosition(SwingConstants.RIGHT);
		btnCommonGameFolders.setVerticalTextPosition(SwingConstants.CENTER);

		btnCommonEmulatorFolders.setText(Messages.get(MessageConstants.COMMON_EMULATOR_FOLDERS, counterEmulatorFolders));
		btnCommonEmulatorFolders.setHorizontalAlignment(SwingConstants.LEFT);
		btnCommonEmulatorFolders.setHorizontalTextPosition(SwingConstants.RIGHT);
		btnCommonEmulatorFolders.setVerticalTextPosition(SwingConstants.CENTER);

		btnUncategorized.setText(Messages.get(MessageConstants.ARCHIVES_AND_IMAGE_FILES, counterUncategorized));
		btnUncategorized.setHorizontalAlignment(SwingConstants.LEFT);
		btnUncategorized.setHorizontalTextPosition(SwingConstants.RIGHT);
		btnUncategorized.setVerticalTextPosition(SwingConstants.CENTER);

		btnSetupFiles.setText(Messages.get(MessageConstants.SETUP_FILES, counterSetupFiles));
		btnSetupFiles.setHorizontalAlignment(SwingConstants.LEFT);
		btnSetupFiles.setHorizontalTextPosition(SwingConstants.RIGHT);
		btnSetupFiles.setVerticalTextPosition(SwingConstants.CENTER);
	}

	@Override
	public void gameAdded(GameAddedEvent e) {
		btnQuickSearch.setEnabled(true);
	}

	@Override
	public void gameRemoved(GameRemovedEvent e) {
		if (e.getGameCount() == 0) {
			btnQuickSearch.setEnabled(false);
		}
	}

	@Override
	public void emulatorAdded(EmulatorEvent e) {
		btnQuickSearch.setEnabled(true);
	}

	@Override
	public void emulatorRemoved(EmulatorEvent e) {
		// TODO Auto-generated method stub

	}

	public void activateQuickSearchButton(boolean gamesOrPlatformsFound) {
		btnQuickSearch.setEnabled(gamesOrPlatformsFound);
	}
}
