package ch.sysout.emubro.ui;

import java.awt.BorderLayout;
import java.awt.Component;
import java.awt.Image;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.List;

import javax.swing.JButton;
import javax.swing.JCheckBox;
import javax.swing.JDialog;
import javax.swing.JEditorPane;
import javax.swing.JLabel;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.JSeparator;
import javax.swing.JTextField;
import javax.swing.JTree;
import javax.swing.SwingConstants;
import javax.swing.event.HyperlinkEvent;
import javax.swing.event.HyperlinkListener;
import javax.swing.event.TreeSelectionEvent;
import javax.swing.event.TreeSelectionListener;
import javax.swing.tree.DefaultMutableTreeNode;
import javax.swing.tree.TreePath;

import com.jgoodies.forms.factories.Paddings;
import com.jgoodies.forms.layout.CellConstraints;
import com.jgoodies.forms.layout.FormLayout;

import ch.sysout.emubro.util.MessageConstants;
import ch.sysout.ui.ImageUtil;
import ch.sysout.util.Icons;
import ch.sysout.util.Messages;
import ch.sysout.util.ScreenSizeUtil;
import ch.sysout.util.UIUtil;

public class HelpDialog extends JDialog implements ActionListener, TreeSelectionListener {
	private static final long serialVersionUID = 1L;

	int size = ScreenSizeUtil.is3k() ? 24 : 16;
	private JTextField txtSearch = new JTextField("Search help content (Ctrl+F)");
	private JButton btnSearch = new JButton(ImageUtil.getImageIconFrom(Icons.get("search", 16, 16)));

	private JButton btnHome = new JButton(ImageUtil.getImageIconFrom(Icons.get("home", size, size)));
	private JButton btnPrevious = new JButton(ImageUtil.getImageIconFrom(Icons.get("previous", size, size)));
	private JButton btnNext = new JButton(ImageUtil.getImageIconFrom(Icons.get("next", size, size)));
	private JButton btnPrint = new JButton(ImageUtil.getImageIconFrom(Icons.get("print", size, size)));
	private JButton btnSave = new JButton(ImageUtil.getImageIconFrom(Icons.get("save", size, size)));

	private JTree treeTopics;

	private JButton btnClose = new JButton(Messages.get("close"));

	private JEditorPane edit1;

	private JScrollPane sp;

	private JCheckBox chkAlwayOnTop = new JCheckBox(Messages.get(MessageConstants.ALWAYS_ON_TOP));

	public HelpDialog() {
		setTitle("Help");
		setDefaultCloseOperation(DISPOSE_ON_CLOSE);
		setAlwaysOnTop(true);
		// setModalityType(ModalityType.APPLICATION_MODAL);
		setIconImages(getIcons());
		// setResizable(false);
		initComponents();
		createUI();
		pack();
		adjustSizeWhenNeeded();
		treeTopics.setSelectionRow(0);
		//		setMinimumSize(getSize());
	}

	public void adjustSizeWhenNeeded() {
		int width = getWidth();
		int height = getHeight();
		setSize(width * 2, (int) (height * 1.25));
	}

	private List<Image> getIcons() {
		List<Image> icons = new ArrayList<>();
		String[] sizes = { "32", "24", "16" };
		for (String s : sizes) {
			icons.add(ImageUtil.getImageIconFrom(Icons.get("help", s, s)).getImage());
		}
		return icons;
	}

	private void initComponents() {
		chkAlwayOnTop.setSelected(isAlwaysOnTop());
		chkAlwayOnTop.addActionListener(new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				setAlwaysOnTop(chkAlwayOnTop.isSelected());
			}
		});

		DefaultMutableTreeNode root = new DefaultMutableTreeNode(Messages.get("applicationTitle"));
		DefaultMutableTreeNode nodeApplication = new DefaultMutableTreeNode("About "+Messages.get("applicationTitle"));

		DefaultMutableTreeNode nodeEmulator = new DefaultMutableTreeNode(Messages.get(MessageConstants.EMULATORS));
		DefaultMutableTreeNode nodeEmulatorWhatIsAnEmulator = new DefaultMutableTreeNode("What is an emulator?");
		DefaultMutableTreeNode nodeEmulatorDownloadEmulator = new DefaultMutableTreeNode("Download an emulator");
		DefaultMutableTreeNode nodeEmulatorInstallEmulator = new DefaultMutableTreeNode("Install an emulator");
		DefaultMutableTreeNode nodeEmulatorAddEmulator = new DefaultMutableTreeNode("Add an emulator");
		DefaultMutableTreeNode nodeEmulatorRemoveEmulator = new DefaultMutableTreeNode("Remove an emulator");
		DefaultMutableTreeNode nodeEmulatorsConfigureEmulators = new DefaultMutableTreeNode("Configure an emulator");

		DefaultMutableTreeNode nodeExploreComputer = new DefaultMutableTreeNode("Explore computer");
		DefaultMutableTreeNode nodeExploreComputerSearchNow = new DefaultMutableTreeNode("Search now");
		DefaultMutableTreeNode nodeExploreComputerCustomSearch = new DefaultMutableTreeNode("Custom search");
		DefaultMutableTreeNode nodeExploreComputerQuickSearch = new DefaultMutableTreeNode("Quick-Search");
		DefaultMutableTreeNode nodeExploreComputerRepeatLastSearch = new DefaultMutableTreeNode("Repeat last search mode");

		DefaultMutableTreeNode nodeGames = new DefaultMutableTreeNode("Games");
		DefaultMutableTreeNode nodeGamesAddGame = new DefaultMutableTreeNode("Add a game");
		DefaultMutableTreeNode nodeGamesRemoveGame = new DefaultMutableTreeNode("Remove a game");
		DefaultMutableTreeNode nodeGamesGameProperties = new DefaultMutableTreeNode("Change game properties");

		DefaultMutableTreeNode nodeSettingsConfigurePlatforms = new DefaultMutableTreeNode("Configure platforms");
		DefaultMutableTreeNode nodeAppearance = new DefaultMutableTreeNode("Appearance");
		DefaultMutableTreeNode nodeAppearanceView = new DefaultMutableTreeNode("View");
		DefaultMutableTreeNode nodeAppearanceCoverSize = new DefaultMutableTreeNode("Set cover size");
		DefaultMutableTreeNode nodeAppearanceLanguage = new DefaultMutableTreeNode("Language");

		DefaultMutableTreeNode nodeFindTags = new DefaultMutableTreeNode("Find tags");
		DefaultMutableTreeNode nodeFindCovers = new DefaultMutableTreeNode("Find covers");
		DefaultMutableTreeNode nodeNotifications = new DefaultMutableTreeNode("Notifications");
		DefaultMutableTreeNode nodeAdvancedSettings = new DefaultMutableTreeNode("Advanced settings");
		DefaultMutableTreeNode nodeUpdates = new DefaultMutableTreeNode("Updates");
		DefaultMutableTreeNode nodeHelpUs = new DefaultMutableTreeNode("Help us");
		root.add(nodeApplication);
		root.add(nodeEmulator);
		nodeEmulator.add(nodeEmulatorWhatIsAnEmulator);
		nodeEmulator.add(nodeEmulatorDownloadEmulator);
		nodeEmulator.add(nodeEmulatorInstallEmulator);
		nodeEmulator.add(nodeEmulatorAddEmulator);
		nodeEmulator.add(nodeEmulatorRemoveEmulator);
		nodeEmulator.add(nodeEmulatorsConfigureEmulators);

		nodeGames.add(nodeGamesAddGame);
		nodeGames.add(nodeGamesRemoveGame);
		nodeGames.add(nodeGamesGameProperties);
		root.add(nodeGames);

		nodeExploreComputer.add(nodeExploreComputerSearchNow);
		nodeExploreComputer.add(nodeExploreComputerCustomSearch);
		nodeExploreComputer.add(nodeExploreComputerQuickSearch);
		nodeExploreComputer.add(nodeExploreComputerRepeatLastSearch);
		root.add(nodeExploreComputer);

		nodeAppearance.add(nodeAppearanceView);
		nodeAppearance.add(nodeAppearanceCoverSize);
		nodeAppearance.add(nodeAppearanceLanguage);
		root.add(nodeAppearance);

		root.add(nodeFindTags);
		root.add(nodeFindCovers);
		root.add(nodeNotifications);
		root.add(nodeSettingsConfigurePlatforms);
		root.add(nodeAdvancedSettings);
		root.add(nodeUpdates);
		root.add(nodeHelpUs);

		// create the tree by passing in the root node
		treeTopics = new JTree(root);
		treeTopics.addTreeSelectionListener(this);
		expandAllNodes(treeTopics, 0, treeTopics.getRowCount());
	}

	private void createUI() {
		setLayout(new BorderLayout());
		getRootPane().setBorder(Paddings.DIALOG);
		add(createButtonBarPanel(), BorderLayout.NORTH);

		JPanel pnl = new JPanel(new BorderLayout());
		pnl.add(createNavigationPanel(), BorderLayout.WEST);
		pnl.add(createContentPanel(), BorderLayout.CENTER);

		add(chkAlwayOnTop, BorderLayout.SOUTH);

		add(pnl, BorderLayout.CENTER);
	}

	private Component createButtonBarPanel() {
		JPanel pnl = new JPanel();
		FormLayout layout = new FormLayout(
				"default, $lcgap, min, $lcgap, min, $lcgap, min, $lcgap, default, $lcgap, min, $lcgap, min, $ugap, default:grow, $lcgap, min",
				"fill:min, $rgap, fill:min:grow");
		pnl.setLayout(layout);
		CellConstraints cc = new CellConstraints();

		pnl.add(btnHome, cc.xy(1, 1));
		pnl.add(btnPrevious, cc.xy(3, 1));
		pnl.add(btnNext, cc.xy(5, 1));
		pnl.add(new JSeparator(SwingConstants.VERTICAL), cc.xy(7, 1));
		pnl.add(btnSave, cc.xy(9, 1));
		pnl.add(btnPrint, cc.xy(11, 1));

		pnl.add(txtSearch, cc.xy(15, 1));
		pnl.add(btnSearch, cc.xy(17, 1));

		return pnl;
	}

	private Component createNavigationPanel() {
		JPanel pnl = new JPanel(new BorderLayout());
		new CellConstraints();
		JScrollPane sp = new JScrollPane(treeTopics);
		pnl.add(sp);
		return pnl;
	}

	private void expandAllNodes(JTree tree, int startingIndex, int rowCount) {
		for (int i = startingIndex; i < rowCount; i++) {
			tree.expandRow(i);
		}
		if (tree.getRowCount() != rowCount) {
			expandAllNodes(tree, rowCount, tree.getRowCount());
		}
	}

	private Component createContentPanel() {
		JPanel pnl = new JPanel(new BorderLayout());
		edit1 = new JEditorPane("text/html", "");
		edit1.putClientProperty(JEditorPane.HONOR_DISPLAY_PROPERTIES, Boolean.TRUE);
		JLabel lblDummy = new JLabel("dummy");
		edit1.setFont(lblDummy.getFont());
		edit1.setEditable(false);
		edit1.addHyperlinkListener(new HyperlinkListener() {
			@Override
			public void hyperlinkUpdate(HyperlinkEvent hle) {
				if (HyperlinkEvent.EventType.ACTIVATED.equals(hle.getEventType())) {
					System.out.println(hle.getURL());
				}
			}
		});

		sp = new JScrollPane(edit1);
		sp.getVerticalScrollBar().setUnitIncrement(16);
		pnl.add(sp);
		return pnl;
	}

	private void showContent(String path) {
		StringBuilder out = new StringBuilder();
		try {
			InputStream is = HelpDialog.class.getResourceAsStream(path);
			BufferedReader bi = new BufferedReader(new InputStreamReader(is));
			String line;
			while ((line = bi.readLine()) != null) {
				if (line.contains("images/de/browseComputer.png")) {
					String imgsrc = HelpDialog.class.getClassLoader().getSystemResource("help/images/de/browseComputer.png").toString();
					out.append(line.replace("images/de/browseComputer.png", imgsrc));
				} else if (line.contains("images/de/searchNow.png")) {
					String imgsrc = HelpDialog.class.getClassLoader().getSystemResource("help/images/de/searchNow.png").toString();
					out.append(line.replace("images/de/searchNow.png", imgsrc));
				} else if (line.contains("images/de/customSearch.png")) {
					String imgsrc = HelpDialog.class.getClassLoader().getSystemResource("help/images/de/customSearch.png").toString();
					out.append(line.replace("images/de/customSearch.png", imgsrc));
				} else if (line.contains("images/de/customSearch2.png")) {
					String imgsrc = HelpDialog.class.getClassLoader().getSystemResource("help/images/de/customSearch2.png").toString();
					out.append(line.replace("images/de/customSearch2.png", imgsrc));
				} else if (line.contains("images/de/quickSearch.png")) {
					String imgsrc = HelpDialog.class.getClassLoader().getSystemResource("help/images/de/quickSearch.png").toString();
					out.append(line.replace("images/de/quickSearch.png", imgsrc));
				} else if (line.contains("images/de/repeatLastSearch.png")) {
					String imgsrc = HelpDialog.class.getClassLoader().getSystemResource("help/images/de/repeatLastSearch.png").toString();
					out.append(line.replace("images/de/repeatLastSearch.png", imgsrc));
				} else if (line.contains("images/de/chooseLanguage.png")) {
					String imgsrc = HelpDialog.class.getClassLoader().getSystemResource("help/images/de/chooseLanguage.png").toString();
					out.append(line.replace("images/de/chooseLanguage.png", imgsrc));
				} else if (line.contains("images/de/defaultProgram.png")) {
					String imgsrc = HelpDialog.class.getClassLoader().getSystemResource("help/images/de/defaultProgram.png").toString();
					out.append(line.replace("images/de/defaultProgram.png", imgsrc));
				} else {
					out.append(line);
				}
			}
		} catch (IOException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
		edit1.setText(out.toString());
		UIUtil.scrollToTop(edit1);
	}

	@Override
	public void actionPerformed(ActionEvent e) {
		Object source = e.getSource();
		if (source == btnClose) {
			dispose();
		}
	}

	public void languageChanged() {
		chkAlwayOnTop.setText(Messages.get(MessageConstants.ALWAYS_ON_TOP));
		btnClose.setText(Messages.get(MessageConstants.CLOSE));
	}

	@Override
	public void valueChanged(TreeSelectionEvent e) {
		TreePath path = e.getPath();
		Object lastPathComponent = path.getLastPathComponent();
		switch (lastPathComponent.toString()) {
		case "emuBro":
			showContent("/help/emubro.html");
			break;
		case "About emuBro":
			showContent("/help/emubro-about.html");
			break;
		case "Emulators":
			showContent("/help/emulators.html");
			break;
		case "What is an emulator?":
			showContent("/help/emulators-about-emulators.html");
			break;
		case "Download an emulator":
			showContent("/help/emulators-download-emulator.html");
			break;
		case "Install an emulator":
			showContent("/help/emulators-install-emulator.html");
			break;
		case "Add an emulator":
			showContent("/help/emulators-add-emulator.html");
			break;
		case "Remove an emulator":
			showContent("/help/emulators-remove-emulator.html");
			break;
		case "Configure an emulator":
			showContent("/help/emulators-configure-emulator.html");
			break;
		case "Configure platforms":
			showContent("/help/03-blank.html");
			break;
		case "Configure emulators":
			break;
		case "Games":
			showContent("/help/games.html");
			break;
		case "Add a game":
			showContent("/help/games-add-game.html");
			break;
		case "Remove a game":
			showContent("/help/games-remove-game.html");
			break;
		case "Change game properties":
			showContent("/help/games-change-game-properties.html");
			break;
		case "Explore computer":
			showContent("/help/explore-computer.html");
			break;
		case "Search now":
			showContent("/help/explore-computer-search-now.html");
			break;
		case "Custom search":
			showContent("/help/explore-computer-custom-search.html");
			break;
		case "Quick-Search":
			showContent("/help/explore-computer-quick-search.html");
			break;
		case "Repeat last search mode":
			showContent("/help/explore-computer-repeat-last-search.html");
			break;
		case "Appearance":
			showContent("/help/appearance.html");
			break;
		case "View":
			showContent("/help/appearance-view.html");
			break;
		case "Set cover size":
			showContent("/help/appearance-set-cover-size.html");
			break;
		case "Language":
			showContent("/help/appearance-language.html");
			break;
		case "Find covers":
			showContent("/help/find-covers.html");
			break;
		case "Notifications":
			showContent("/help/notifications.html");
			break;
		case "Advanced settings":
			showContent("/help/advanced-settings.html");
			break;
		case "Updates":
			showContent("/help/updates.html");
			break;
		case "Help us":
			showContent("/help/help-us.html");
			break;
		}
	}
}
