package ch.sysout.emubro.ui;

import java.awt.BorderLayout;
import java.awt.Dimension;
import java.awt.dnd.DropTarget;
import java.awt.dnd.DropTargetListener;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.awt.event.MouseEvent;
import java.awt.event.MouseListener;
import java.io.File;
import java.util.List;

import javax.swing.AbstractButton;
import javax.swing.BorderFactory;
import javax.swing.DefaultListModel;
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

import ch.sysout.util.Icons;
import ch.sysout.util.Messages;
import ch.sysout.util.ScreenSizeUtil;

public class BrowseComputerPanel extends JPanel implements MouseListener {
	private static final long serialVersionUID = 1L;
	private JLabel lblDragDropCover = new JLabel(Messages.get("dragAndDropFolderHere"));
	private JButton btnAutoSearch = new JButton(Messages.get("searchNow"));
	private JButton btnCustomSearch = new JButton(Messages.get("searchCustom"));
	private JButton btnQuickSearch = new JButton(Messages.get("searchQuick"));
	private JButton btnLastSearch = new JButton(Messages.get("searchLast"));
	private JCheckBox chkGameSearch = new JCheckBox(Messages.get("searchGames"));
	private JCheckBox chkEmulatorSearch = new JCheckBox(Messages.get("searchEmulators"));
	private JButton btnQuickSearchNow = new JButton("Search now",
			ImageUtil.getImageIconFrom(Icons.get("search", 16, 16)));
	private JLabel lnkSearchResults = new JLinkLabel(Messages.get("searchLogs"));
	private JLabel lnkSearchSettings = new JLinkLabel(Messages.get("searchProgressSettings"));
	private JButton btnUncategorized = new JButton(Messages.get("archivesAndImageFiles", 0));
	private JButton btnSetupFiles = new JButton(Messages.get("setupFiles", 0));

	private JButton btnCustomSearchNow;

	private JPanel pnlBrowseOptionsPanel;
	private JPanel pnlBrowsePanel;
	private JScrollPane spBrowse;

	private DefaultListModel<String> mdlLstBrowse;

	private JLabel lblBrowse = new JLabel(Messages.get("browseCurrentDirectory"));
	private JTextArea txtBrowseComputer;
	private JScrollPane spBrowseComputer;
	private FileTree tree;
	private JPanel pnlSpace;
	private int counterUncategorized;
	private int counterSetupFiles;

	public BrowseComputerPanel() {
		super();
		pnlSpace = createSpacePanel();
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

		// btnAutoSearch.setIcon(ImageUtil.getImageIconFrom(Icons.get("search",
		// size, size)));
		btnUncategorized.setBorderPainted(false);
		btnUncategorized.setContentAreaFilled(false);
		btnUncategorized.setHorizontalAlignment(SwingConstants.LEFT);
		btnUncategorized.setVerticalAlignment(SwingConstants.CENTER);
		btnUncategorized.setIcon(ImageUtil.getImageIconFrom(Icons.get("archivAndImage", 22, 22)));
		btnUncategorized.addMouseListener(this);

		btnSetupFiles.setBorderPainted(false);
		btnSetupFiles.setContentAreaFilled(false);
		btnSetupFiles.setHorizontalAlignment(SwingConstants.LEFT);
		btnSetupFiles.setVerticalAlignment(SwingConstants.CENTER);
		btnSetupFiles.setIcon(ImageUtil.getImageIconFrom(Icons.get("setup", 22, 22)));
		btnSetupFiles.addMouseListener(this);

		FormLayout layout = new FormLayout("default, $ugap:grow, $lcgap, min:grow, $rgap, $lcgap, min:grow",
				"$ugap, fill:pref, $rgap, fill:pref");
		JPanel pnl = new JPanel(layout);
		CellConstraints cc = new CellConstraints();
		pnl.add(new JSeparator(), cc.xyw(1, 1, layout.getColumnCount()));
		pnl.add(lnkSearchResults, cc.xy(1, 2));
		pnl.add(lnkSearchSettings, cc.xy(1, 4));
		pnl.add(new JSeparator(SwingConstants.VERTICAL), cc.xywh(3, 2, 1, 3));
		pnl.add(btnUncategorized, cc.xywh(4, 2, 1, 3));
		pnl.add(new JSeparator(SwingConstants.VERTICAL), cc.xywh(6, 2, 1, 3));
		pnl.add(btnSetupFiles, cc.xywh(7, 2, 1, 3));
		add(pnl, BorderLayout.SOUTH);

		tree = new FileTree();
		btnCustomSearchNow = new JButton(Messages.get("searchNowShort"));
		btnCustomSearch.addActionListener(new ActionListener() {
			@Override
			public void actionPerformed(ActionEvent e) {
				remove(spBrowseComputer);
				tree.setBorder(BorderFactory.createEmptyBorder());
				add(tree);
				add(btnCustomSearchNow, BorderLayout.EAST);
				revalidate();
				repaint();
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
		btnCustomSearch.setIcon(ImageUtil.getImageIconFrom(Icons.get("openGamePath", size, size)));
		btnQuickSearch.setIcon(ImageUtil.getImageIconFrom(Icons.get("quickSearch", size, size)));
		btnLastSearch.setIcon(ImageUtil.getImageIconFrom(Icons.get("recentSearch", size, size)));

		btnQuickSearch.setEnabled(true);
		btnLastSearch.setEnabled(false);

		btnAutoSearch.setBorderPainted(false);
		btnAutoSearch.setContentAreaFilled(false);
		btnAutoSearch.setHorizontalAlignment(SwingConstants.LEFT);
		btnAutoSearch.setVerticalAlignment(SwingConstants.TOP);

		btnCustomSearch.setBorderPainted(false);
		btnCustomSearch.setContentAreaFilled(false);
		btnCustomSearch.setHorizontalAlignment(SwingConstants.LEFT);
		btnCustomSearch.setVerticalAlignment(SwingConstants.TOP);

		btnQuickSearch.setBorderPainted(false);
		btnQuickSearch.setContentAreaFilled(false);
		btnQuickSearch.setHorizontalAlignment(SwingConstants.LEFT);
		btnQuickSearch.setVerticalAlignment(SwingConstants.TOP);

		btnLastSearch.setBorderPainted(false);
		btnLastSearch.setContentAreaFilled(false);
		btnLastSearch.setHorizontalAlignment(SwingConstants.LEFT);
		btnLastSearch.setVerticalAlignment(SwingConstants.TOP);

		// btnQuickSearch.setEnabled(false);
		// btnLastSearch.setEnabled(false);

		btnAutoSearch.addMouseListener(this);
		btnCustomSearch.addMouseListener(this);
		btnQuickSearch.addMouseListener(this);
		btnLastSearch.addMouseListener(this);

		pnlBrowseOptionsPanel.add(btnAutoSearch, cc.xy(1, 1));
		pnlBrowseOptionsPanel.add(btnCustomSearch, cc.xy(3, 1));
		pnlBrowseOptionsPanel.add(btnQuickSearch, cc.xy(1, 3));
		pnlBrowseOptionsPanel.add(btnLastSearch, cc.xy(3, 3));
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

	private void createBrowsePanel() {
		pnlBrowsePanel = new JPanel();
		FormLayout layout = new FormLayout("min:grow", "fill:min:grow");
		pnlBrowsePanel.setLayout(layout);
		new CellConstraints();
		mdlLstBrowse = new DefaultListModel<>();
		txtBrowseComputer = new JTextArea();
		// txtBrowse.setBorder(BorderFactory.createEmptyBorder());
		txtBrowseComputer.setEditable(false);
		txtBrowseComputer.setLineWrap(true);
		txtBrowseComputer.setWrapStyleWord(false);
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

	@Override
	public void mouseClicked(MouseEvent e) {

	}

	@Override
	public void mouseEntered(MouseEvent e) {
		AbstractButton source = (AbstractButton) e.getSource();
		if (source == btnAutoSearch || source == btnCustomSearch || source == btnQuickSearch || source == btnLastSearch
				|| source == btnUncategorized || source == btnSetupFiles) {
			source.setBorderPainted(true);
			source.setContentAreaFilled(true);
		}
	}

	@Override
	public void mouseExited(MouseEvent e) {
		AbstractButton source = (AbstractButton) e.getSource();
		if (source == btnAutoSearch || source == btnCustomSearch || source == btnQuickSearch || source == btnLastSearch
				|| source == btnUncategorized || source == btnSetupFiles) {
			source.setBorderPainted(false);
			source.setContentAreaFilled(false);
		}
	}

	@Override
	public void mousePressed(MouseEvent e) {
	}

	@Override
	public void mouseReleased(MouseEvent e) {
	}

	public void searchProcessInitialized() {
		remove(spBrowseComputer);
		remove(tree);
		add(lblBrowse, BorderLayout.NORTH);
		add(spBrowse);
		revalidate();
		repaint();
	}

	public void searchProcessEnded() {
		remove(lblBrowse);
		remove(spBrowse);
		remove(tree);
		add(spBrowseComputer);
		revalidate();
		repaint();
	}

	public void directorySearched(String absolutePath) {
		txtBrowseComputer.setText(absolutePath);
		repaint();
	}

	public void languageChanged() {
		lblDragDropCover.setText(Messages.get("dragAndDropFolderHere"));
		btnAutoSearch.setText(Messages.get("searchNow"));
		btnCustomSearch.setText(Messages.get("searchCustom"));
		btnQuickSearch.setText(Messages.get("searchQuick"));
		btnLastSearch.setText(Messages.get("searchLast"));
		chkGameSearch.setText(Messages.get("searchGames"));
		chkEmulatorSearch.setText(Messages.get("searchEmulators"));
		btnQuickSearchNow.setText(Messages.get("searchNowShort"));
		lnkSearchResults.setText(Messages.get("searchLogs"));
		lnkSearchSettings.setText(Messages.get("searchProgressSettings"));
		lblBrowse.setText(Messages.get("browseCurrentDirectory"));
		btnUncategorized.setText(Messages.get("archivesAndImageFiles", counterUncategorized));
		btnSetupFiles.setText(Messages.get("setupFiles", counterSetupFiles));
	}

	public List<File> getSelectedDirectoriesToBrowse() {
		return tree.getSelectedDirectories();
	}

	public void rememberZipFile(String file) {
		btnUncategorized.setText(Messages.get("archivesAndImageFiles", counterUncategorized++));
	}

	public void rememberRarFile(String file) {
		btnUncategorized.setText(Messages.get("archivesAndImageFiles", counterUncategorized++));
	}

	public void rememberIsoFile(String file) {
		btnUncategorized.setText(Messages.get("archivesAndImageFiles", counterUncategorized++));
	}

	public void minimizeButtons() {
		btnUncategorized.setText(Messages.get("archivesAndImageFiles", counterUncategorized));
		btnSetupFiles.setText(Messages.get("setupFiles", counterSetupFiles));
		btnSetupFiles.setHorizontalAlignment(SwingConstants.CENTER);
		btnUncategorized.setHorizontalAlignment(SwingConstants.CENTER);
		btnSetupFiles.setHorizontalTextPosition(SwingConstants.CENTER);
		btnUncategorized.setHorizontalTextPosition(SwingConstants.CENTER);
		btnSetupFiles.setVerticalTextPosition(SwingConstants.BOTTOM);
		btnUncategorized.setVerticalTextPosition(SwingConstants.BOTTOM);
	}

	public void maximizeButtons() {
		btnUncategorized.setText(Messages.get("archivesAndImageFiles", counterUncategorized));
		btnSetupFiles.setText(Messages.get("setupFiles", counterSetupFiles));
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
}
