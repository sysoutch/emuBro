package ch.sysout.emubro.ui;

import java.awt.BorderLayout;
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

import com.jgoodies.forms.factories.Paddings;
import com.jgoodies.forms.layout.CellConstraints;
import com.jgoodies.forms.layout.FormLayout;

import ch.sysout.emubro.api.EmulatorListener;
import ch.sysout.emubro.api.GameListener;
import ch.sysout.emubro.api.event.EmulatorEvent;
import ch.sysout.emubro.api.event.GameAddedEvent;
import ch.sysout.emubro.api.event.GameRemovedEvent;
import ch.sysout.emubro.util.MessageConstants;
import ch.sysout.ui.ImageUtil;
import ch.sysout.util.Icons;
import ch.sysout.util.Messages;
import ch.sysout.util.ScreenSizeUtil;
import ch.sysout.util.UIUtil;

public class BrowseComputerPanel extends JPanel implements GameListener, EmulatorListener {
	private static final long serialVersionUID = 1L;
	private JLabel lblDragDropCover = new JLabel(Messages.get(MessageConstants.DRAG_AND_DROP_FOLDER_HERE));
	private JButton btnAutoSearch = new JButton(Messages.get(MessageConstants.SEARCH_NOW));
	private JButton btnCustomSearch = new JButton(Messages.get(MessageConstants.SEARCH_CUSTOM));
	private JButton btnQuickSearch = new JButton(Messages.get(MessageConstants.SEARCH_QUICK));
	private JButton btnLastSearch = new JButton(Messages.get(MessageConstants.SEARCH_LAST));
	private JCheckBox chkGameSearch = new JCheckBox(Messages.get(MessageConstants.SEARCH_GAMES));
	private JCheckBox chkEmulatorSearch = new JCheckBox(Messages.get(MessageConstants.SEARCH_EMULATORS));
	private JButton btnQuickSearchNow = new JButton(MessageConstants.SEARCH_NOW_SHORT, ImageUtil.getImageIconFrom(Icons.get("search", 16, 16)));
	private JButton lnkSearchResults = new JLinkButton(Messages.get(MessageConstants.SEARCH_LOGS));
	private JButton lnkSearchSettings = new JLinkButton(Messages.get(MessageConstants.SEARCH_PROGRESS_SETTINGS));
	private JButton btnUncategorized = new JButton(Messages.get(MessageConstants.ARCHIVES_AND_IMAGE_FILES, 0));
	private JButton btnSetupFiles = new JButton(Messages.get(MessageConstants.SETUP_FILES, 0));

	private JButton btnCustomSearchNow;

	private JPanel pnlBrowseOptionsPanel;
	private JScrollPane spBrowse;

	private JLabel lblBrowse = new JLabel(MessageConstants.BROWSE_CURRENT_DIRECTORY);
	private JTextArea txtBrowseComputer;
	private JScrollPane spBrowseComputer;
	private FileTree tree;
	private JPanel pnlSpace;
	private int counterUncategorized = 0;
	private JPanel pnlFileTree;
	JPanel pnlLinks;
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

		JPanel pnlOutter = new JPanel(new BorderLayout());
		pnlOutter.add(createBrowseOptionsPanel());
		spBrowseComputer = new JScrollPane() {
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
		spBrowseComputer.setViewportView(pnlOutter);
		spBrowseComputer.setHorizontalScrollBarPolicy(ScrollPaneConstants.HORIZONTAL_SCROLLBAR_NEVER);
		spBrowseComputer.setVerticalScrollBarPolicy(ScrollPaneConstants.VERTICAL_SCROLLBAR_ALWAYS);
		spBrowseComputer.getVerticalScrollBar().setUnitIncrement(16);
		spBrowseComputer.setBorder(BorderFactory.createEmptyBorder());

		createBrowsePanel();
		add(spBrowseComputer);

		btnUncategorized.setHorizontalAlignment(SwingConstants.LEFT);
		btnUncategorized.setVerticalAlignment(SwingConstants.CENTER);
		btnUncategorized.setIcon(ImageUtil.getImageIconFrom(Icons.get("archiveAndImage", 22, 22)));

		UIUtil.doHover(false, btnSetupFiles, btnUncategorized);
		btnSetupFiles.setHorizontalAlignment(SwingConstants.LEFT);
		btnSetupFiles.setVerticalAlignment(SwingConstants.CENTER);
		btnSetupFiles.setIcon(ImageUtil.getImageIconFrom(Icons.get("setup", 22, 22)));

		btnUncategorized.addMouseListener(UIUtil.getMouseAdapter());
		btnSetupFiles.addMouseListener(UIUtil.getMouseAdapter());

		FormLayout layout = new FormLayout("default, $ugap:grow, $lcgap, min:grow, $rgap, $lcgap, min:grow",
				"$ugap, fill:pref, $rgap, fill:pref");
		pnlLinks = new JPanel(layout);
		CellConstraints cc = new CellConstraints();
		pnlLinks.add(new JSeparator(), cc.xyw(1, 1, layout.getColumnCount()));
		pnlLinks.add(lnkSearchResults, cc.xy(1, 2));
		pnlLinks.add(lnkSearchSettings, cc.xy(1, 4));
		pnlLinks.add(new JSeparator(SwingConstants.VERTICAL), cc.xywh(3, 2, 1, 3));
		pnlLinks.add(btnUncategorized, cc.xywh(4, 2, 1, 3));
		pnlLinks.add(new JSeparator(SwingConstants.VERTICAL), cc.xywh(6, 2, 1, 3));
		pnlLinks.add(btnSetupFiles, cc.xywh(7, 2, 1, 3));
		add(pnlLinks, BorderLayout.SOUTH);

		tree = new FileTree();
		btnCustomSearchNow = new JButton(Messages.get(MessageConstants.SEARCH_NOW_SHORT));
		btnCustomSearchNow.setIcon(ImageUtil.getImageIconFrom(Icons.get("search", 24, 24)));
		UIUtil.doHover(false, btnCustomSearchNow);
		btnCustomSearchNow.addMouseListener(UIUtil.getMouseAdapter());
		pnlFileTree = new JPanel(new BorderLayout());
		pnlFileTree.add(tree);
		btnCustomSearchNow.setHorizontalAlignment(SwingConstants.LEFT);
		JPanel pnlButton = new JPanel(new WrapLayout(FlowLayout.LEFT));
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
		FormLayout layout = new FormLayout("default:grow, min, default:grow, $rgap, min, min",
				"fill:min, min, fill:min, $rgap, fill:default:grow, min");
		layout.setColumnGroup(1, 3);

		pnlBrowseOptionsPanel.setLayout(layout);
		CellConstraints cc = new CellConstraints();

		int size = ScreenSizeUtil.is3k() ? 32 : 24;
		btnAutoSearch.setIcon(ImageUtil.getImageIconFrom(Icons.get("search", size, size)));
		btnCustomSearch.setIcon(ImageUtil.getImageIconFrom(Icons.get("browseFolder", size, size)));
		btnQuickSearch.setIcon(ImageUtil.getImageIconFrom(Icons.get("quickSearch", size, size)));
		btnLastSearch.setIcon(ImageUtil.getImageIconFrom(Icons.get("recentSearch", size, size)));

		btnQuickSearch.setEnabled(false);
		btnLastSearch.setEnabled(false);

		btnAutoSearch.setHorizontalAlignment(SwingConstants.LEFT);
		btnAutoSearch.setVerticalAlignment(SwingConstants.TOP);
		btnAutoSearch.setHorizontalTextPosition(JLabel.RIGHT);
		btnAutoSearch.setVerticalTextPosition(JLabel.TOP);

		btnCustomSearch.setText("Right-TOP");
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

		UIUtil.doHover(false, btnAutoSearch, btnCustomSearch, btnQuickSearch, btnLastSearch);

		// btnQuickSearch.setEnabled(false);
		// btnLastSearch.setEnabled(false);

		btnAutoSearch.addMouseListener(UIUtil.getMouseAdapter());
		btnCustomSearch.addMouseListener(UIUtil.getMouseAdapter());
		btnQuickSearch.addMouseListener(UIUtil.getMouseAdapter());
		btnLastSearch.addMouseListener(UIUtil.getMouseAdapter());

		pnlBrowseOptionsPanel.add(btnAutoSearch, cc.xy(1, 1));
		pnlBrowseOptionsPanel.add(btnCustomSearch, cc.xy(3, 1));
		pnlBrowseOptionsPanel.add(btnQuickSearch, cc.xy(1, 3));
		pnlBrowseOptionsPanel.add(btnLastSearch, cc.xy(3, 3));
		//		pnlBrowseOptionsPanel.add(pnlFolderLinks, cc.xyw(1, 5, layout.getColumnCount()));

		lnkSearchResults.setIcon(ImageUtil.getImageIconFrom(Icons.get("serchLogs", 16, 16)));
		lnkSearchSettings.setIcon(ImageUtil.getImageIconFrom(Icons.get("settings2", 16, 16)));
		btnQuickSearch.addActionListener(new ActionListener() {
			private boolean b;

			@Override
			public void actionPerformed(ActionEvent e) {
				if (b) {
					layout.setRowGroup(1, 3);
					// pnlBrowseOptionsPanel.add(btnAutoSearch, cc.xy(1, 1));
					// pnlBrowseOptionsPanel.add(btnCustomSearch, cc.xy(3, 1));
					// pnlBrowseOptionsPanel.add(btnQuickSearch, cc.xy(1, 3));
					// pnlBrowseOptionsPanel.add(btnLastSearch, cc.xy(3, 3));
					pnlBrowseOptionsPanel.add(pnlSpace, cc.xyw(1, 5, layout.getColumnCount()));
					btnQuickSearch.requestFocusInWindow();
				} else {
					layout.setRowGroup(1, 6);
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
		Component btnFolder = new JButton("Folder 1");
		Component btnFolder2 = new JButton("Folder 2");
		Component btnFolder3 = new JButton("Folder 3");
		Component btnFolder4 = new JButton("Folder 4");
		Component btnFolder5 = new JButton("Folder 5");
		Component btnFolder6 = new JButton("Folder 6");
		Component btnFolder7 = new JButton("Folder 7");
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
		txtBrowseComputer.setLineWrap(true);
		txtBrowseComputer.setWrapStyleWord(false);
		txtBrowseComputer.setPreferredSize(new Dimension(0, 0));
		spBrowse = new JScrollPane(txtBrowseComputer);
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
		btnUncategorized.setText(Messages.get(MessageConstants.ARCHIVES_AND_IMAGE_FILES, counterUncategorized));
		btnSetupFiles.setText(Messages.get(MessageConstants.SETUP_FILES, 0));
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
		btnUncategorized.setText(Messages.get(MessageConstants.ARCHIVES_AND_IMAGE_FILES, counterUncategorized));
		btnSetupFiles.setText(Messages.get(MessageConstants.SETUP_FILES, 0));
		btnSetupFiles.setHorizontalAlignment(SwingConstants.CENTER);
		btnUncategorized.setHorizontalAlignment(SwingConstants.CENTER);
		btnSetupFiles.setHorizontalTextPosition(SwingConstants.CENTER);
		btnUncategorized.setHorizontalTextPosition(SwingConstants.CENTER);
		btnSetupFiles.setVerticalTextPosition(SwingConstants.BOTTOM);
		btnUncategorized.setVerticalTextPosition(SwingConstants.BOTTOM);
	}

	public void maximizeButtons() {
		btnUncategorized.setText(Messages.get(MessageConstants.ARCHIVES_AND_IMAGE_FILES, counterUncategorized));
		btnSetupFiles.setText(Messages.get(MessageConstants.SETUP_FILES, 0));
		btnSetupFiles.setHorizontalAlignment(SwingConstants.LEFT);
		btnUncategorized.setHorizontalAlignment(SwingConstants.LEFT);
		btnSetupFiles.setHorizontalTextPosition(SwingConstants.RIGHT);
		btnUncategorized.setHorizontalTextPosition(SwingConstants.RIGHT);
		btnSetupFiles.setVerticalTextPosition(SwingConstants.CENTER);
		btnUncategorized.setVerticalTextPosition(SwingConstants.CENTER);
	}

	public boolean isButtonsMinimized() {
		return btnSetupFiles.getText().isEmpty() || btnUncategorized.getText().isEmpty();
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
