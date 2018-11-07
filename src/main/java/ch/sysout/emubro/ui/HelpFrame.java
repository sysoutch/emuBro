package ch.sysout.emubro.ui;

import java.awt.BorderLayout;
import java.awt.Component;
import java.awt.Dimension;
import java.awt.Image;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;

import javax.swing.AbstractButton;
import javax.swing.ButtonGroup;
import javax.swing.ImageIcon;
import javax.swing.JButton;
import javax.swing.JCheckBox;
import javax.swing.JEditorPane;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.JTextField;
import javax.swing.JToggleButton;
import javax.swing.JTree;
import javax.swing.SwingConstants;
import javax.swing.event.HyperlinkEvent;
import javax.swing.event.HyperlinkListener;

import com.jgoodies.forms.factories.Paddings;
import com.jgoodies.forms.layout.CellConstraints;
import com.jgoodies.forms.layout.FormLayout;
import com.jgoodies.forms.layout.RowSpec;

import ch.sysout.emubro.util.MessageConstants;
import ch.sysout.ui.ImageUtil;
import ch.sysout.util.Icons;
import ch.sysout.util.Messages;
import ch.sysout.util.ScreenSizeUtil;
import ch.sysout.util.UIUtil;

public class HelpFrame extends JFrame implements ActionListener {
	private static final long serialVersionUID = 1L;

	int size = ScreenSizeUtil.is3k() ? 24 : 16;
	private JTextField txtSearch = new JTextField("Search help content (Ctrl+F)");

	private JButton btnSearch = new JButton(ImageUtil.getImageIconFrom(Icons.get("search", 16, 16)));
	private JButton btnHome = new JButton(ImageUtil.getImageIconFrom(Icons.get("home", size, size)));
	private JButton btnPrevious = new JButton(ImageUtil.getImageIconFrom(Icons.get("previous", size, size)));
	private JButton btnNext = new JButton(ImageUtil.getImageIconFrom(Icons.get("next", size, size)));
	private JButton btnPrint = new JButton(ImageUtil.getImageIconFrom(Icons.get("print", size, size)));
	private JButton btnSave = new JButton(ImageUtil.getImageIconFrom(Icons.get("save", size, size)));
	private JButton btnClose = new JButton(Messages.get("close"));
	private JEditorPane edit1;
	private JScrollPane sp;
	private JCheckBox chkAlwayOnTop = new JCheckBox(Messages.get(MessageConstants.ALWAYS_ON_TOP));

	private HelpTopic topicEmuBro = new HelpTopic(Messages.get("applicationTitle"), "/help/emubro.html");
	private HelpPage pageEmuBroAbout = new HelpPage("About "+Messages.get("applicationTitle"), "/help/emubro-about.html");

	private HelpTopic topicEmulators = new HelpTopic(Messages.get(MessageConstants.EMULATORS), "/help/emulators.html");
	private HelpPage pageEmulatorsAbout = new HelpPage("What is an emulator?", "/help/emulators-about-emulators.html");
	private HelpPage pageEmulatorsDownload = new HelpPage("Download an emulator", "/help/emulators-download-emulator.html");
	private HelpPage pageEmulatorsInstall = new HelpPage("Install an emulator", "/help/emulators-install-emulator.html");
	private HelpPage pageEmulatorsAdd = new HelpPage("Add an emulator", "/help/emulators-add-emulator.html");
	private HelpPage pageEmulatorsRemove = new HelpPage("Remove an emulator", "/help/emulators-remove-emulator.html");
	private HelpPage pageEmulatorsConfigure = new HelpPage("Configure an emulator?", "/help/emulators-configure-emulator.html");

	private HelpTopic topicExploreComputer = new HelpTopic("Explore computer", "/help/explore-computer.html");
	private HelpPage pageExploreComputerSearchNow = new HelpPage("Search now", "/help/explore-computer-search-now.html");
	private HelpPage pageExploreComputerCustomSearch = new HelpPage("Custom search", "/help/explore-computer-custom-search.html");
	private HelpPage pageExploreComputerQuickSearch = new HelpPage("Quick-Search", "/help/explore-computer-quick-search.html");
	private HelpPage pageExploreComputerLastSearch = new HelpPage("Repeat last search mode", "/help/explore-computer-repeat-last-search.html");

	private HelpTopic topicGames = new HelpTopic("Games", "/help/games.html");
	private HelpPage pageGamesAddGame = new HelpPage("Add a game", "/help/games-add-game.html");
	private HelpPage pageGamesRemoveGame = new HelpPage("Remove a game", "/help/games-remove-game.html");
	private HelpPage pageGamesGameProperties = new HelpPage("Change game properties", "/help/games-change-game-properties.html");

	private HelpTopic topicAppearance = new HelpTopic("Appearance", "/help/appearance.html");
	private HelpPage pageAppearanceView = new HelpPage("View", "/help/appearance-view.html");
	private HelpPage pageAppearanceCoverSize = new HelpPage("Set cover size", "/help/appearance-set-cover-size.html");
	private HelpPage pageAppearanceLanguage = new HelpPage("Language", "/help/appearance-language.html");

	//			showContent("/help/find-covers.html");
	//			showContent("/help/notifications.html");
	//			showContent("/help/advanced-settings.html");
	//			showContent("/help/updates.html");
	//			showContent("/help/help-us.html");
	private String[] strings4 = {
			"Configure platforms",
	};

	private String[] strings6 = {
			"Language",
			"Find tags",
			"Find covers",
			"Notifications",
			"Advanced settings",
			"Updates",
			"Help us"
	};

	private HelpTopic[] topics = {
			topicEmuBro,
			topicEmulators,
			topicExploreComputer,
			topicGames,
			topicAppearance
	};

	private Map<AbstractButton, HelpTopic> map = new HashMap<>();
	private Map<AbstractButton, HelpPage> map2 = new HashMap<>();

	private HelpTopic lastExpandedTopic;

	public HelpFrame() {
		setTitle("Help");
		setDefaultCloseOperation(DISPOSE_ON_CLOSE);
		setAlwaysOnTop(true);
		// setModalityType(ModalityType.APPLICATION_MODAL);
		setIconImages(getIcons());
		// setResizable(false);
		initComponents();
		createUI();
		pack();
		setSize(new Dimension(getWidth()*2, getHeight()*2));
		//		adjustSizeWhenNeeded();
		//		setMinimumSize(getSize());
	}

	public void adjustSizeWhenNeeded() {
		int width = getWidth();
		int height = getHeight();
		setSize(width * 2, (int) (height * 1.25));
	}

	private List<Image> getIcons() {
		List<Image> icons = new ArrayList<>();
		String[] dimensions = { "48x48", "32x32", "24x24", "16x16" };
		for (String d : dimensions) {
			icons.add(new ImageIcon(getClass().getResource("/images/logo/" + d + "/logo.png")).getImage());
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
	}

	private void createUI() {
		setLayout(new BorderLayout());
		getRootPane().setBorder(Paddings.DIALOG);
		JPanel pnl = new JPanel(new BorderLayout());
		pnl.add(createNavigationPanel(), BorderLayout.WEST);
		pnl.add(createContentPanel(), BorderLayout.CENTER);
		add(createButtonBarPanel(), BorderLayout.NORTH);
		add(pnl, BorderLayout.CENTER);
		add(chkAlwayOnTop, BorderLayout.SOUTH);
	}

	private Component createButtonBarPanel() {
		JPanel pnl = new JPanel();
		FormLayout layout = new FormLayout(
				"min, $lcgap, min, $ugap, default:grow, $lcgap, min",
				"fill:min, $rgap, fill:min:grow");
		pnl.setLayout(layout);
		CellConstraints cc = new CellConstraints();
		pnl.add(btnSave, cc.xy(1, 1));
		pnl.add(btnPrint, cc.xy(3, 1));
		pnl.add(txtSearch, cc.xy(5, 1));
		pnl.add(btnSearch, cc.xy(7, 1));
		return pnl;
	}

	private Component createNavigationPanel() {
		topicEmuBro.addHelpPage(pageEmuBroAbout);

		topicEmulators.addHelpPage(pageEmulatorsAbout);
		topicEmulators.addHelpPage(pageEmulatorsDownload);
		topicEmulators.addHelpPage(pageEmulatorsInstall);
		topicEmulators.addHelpPage(pageEmulatorsAdd);
		topicEmulators.addHelpPage(pageEmulatorsRemove);
		topicEmulators.addHelpPage(pageEmulatorsConfigure);

		topicExploreComputer.addHelpPage(pageExploreComputerSearchNow);
		topicExploreComputer.addHelpPage(pageExploreComputerCustomSearch);
		topicExploreComputer.addHelpPage(pageExploreComputerQuickSearch);
		topicExploreComputer.addHelpPage(pageExploreComputerLastSearch);

		topicGames.addHelpPage(pageGamesAddGame);
		topicGames.addHelpPage(pageGamesRemoveGame);
		topicGames.addHelpPage(pageGamesGameProperties);

		topicAppearance.addHelpPage(pageAppearanceView);
		topicAppearance.addHelpPage(pageAppearanceCoverSize);
		topicAppearance.addHelpPage(pageAppearanceLanguage);

		JPanel pnl = new JPanel(new BorderLayout());
		FormLayout layout = new FormLayout("default",
				"");
		JPanel pnlWrapper = new JPanel(layout);
		CellConstraints cc = new CellConstraints();
		int rowCount = 0;
		ButtonGroup grp = new ButtonGroup();
		for (HelpTopic topic : topics) {
			layout.appendRow(RowSpec.decode("fill:pref"));
			rowCount++;
			JToggleButton btn = new JToggleButton(topic.getName());
			grp.add(btn);
			UIUtil.doHover(false, btn);
			btn.addMouseListener(UIUtil.getMouseAdapterKeepHoverWhenSelected());
			btn.addFocusListener(UIUtil.getFocusAdapterKeepHoverWhenSelected());
			btn.setHorizontalAlignment(SwingConstants.LEFT);
			pnlWrapper.add(btn, cc.xy(1, rowCount));
			btn.setIcon(ImageUtil.getImageIconFrom(Icons.get("applicationIcon", 32, 32)));
			btn.addActionListener(this);
			map.put(btn, topic);

			for (HelpPage page : topic.getHelpPages()) {
				layout.appendRow(RowSpec.decode("fill:pref"));
				rowCount++;
				JButton btnPage = new JButton(page.getName());
				grp.add(btnPage);
				UIUtil.doHover(false, btnPage);
				btnPage.addMouseListener(UIUtil.getMouseAdapterKeepHoverWhenSelected());
				btnPage.addFocusListener(UIUtil.getFocusAdapterKeepHoverWhenSelected());
				btnPage.setHorizontalAlignment(SwingConstants.LEFT);
				pnlWrapper.add(btnPage, cc.xy(1, rowCount));
				//			btn.setIcon(ImageUtil.getImageIconFrom(Icons.get("applicationIcon", 32, 32)));
				btnPage.addActionListener(this);
				btnPage.setVisible(false);
				map2.put(btnPage, page);
			}

		}
		JScrollPane sp = new JScrollPane(pnlWrapper);
		sp.getVerticalScrollBar().setUnitIncrement(16);
		sp.setHorizontalScrollBarPolicy(JScrollPane.HORIZONTAL_SCROLLBAR_NEVER);
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
			InputStream is = HelpFrame.class.getResourceAsStream(path);
			BufferedReader bi = new BufferedReader(new InputStreamReader(is));
			String line;
			while ((line = bi.readLine()) != null) {
				if (line.contains("images/de/browseComputer.png")) {
					String imgsrc = HelpFrame.class.getClassLoader().getSystemResource("help/images/de/browseComputer.png").toString();
					out.append(line.replace("images/de/browseComputer.png", imgsrc));
				} else if (line.contains("images/de/searchNow.png")) {
					String imgsrc = HelpFrame.class.getClassLoader().getSystemResource("help/images/de/searchNow.png").toString();
					out.append(line.replace("images/de/searchNow.png", imgsrc));
				} else if (line.contains("images/de/customSearch.png")) {
					String imgsrc = HelpFrame.class.getClassLoader().getSystemResource("help/images/de/customSearch.png").toString();
					out.append(line.replace("images/de/customSearch.png", imgsrc));
				} else if (line.contains("images/de/customSearch2.png")) {
					String imgsrc = HelpFrame.class.getClassLoader().getSystemResource("help/images/de/customSearch2.png").toString();
					out.append(line.replace("images/de/customSearch2.png", imgsrc));
				} else if (line.contains("images/de/quickSearch.png")) {
					String imgsrc = HelpFrame.class.getClassLoader().getSystemResource("help/images/de/quickSearch.png").toString();
					out.append(line.replace("images/de/quickSearch.png", imgsrc));
				} else if (line.contains("images/de/repeatLastSearch.png")) {
					String imgsrc = HelpFrame.class.getClassLoader().getSystemResource("help/images/de/repeatLastSearch.png").toString();
					out.append(line.replace("images/de/repeatLastSearch.png", imgsrc));
				} else if (line.contains("images/de/chooseLanguage.png")) {
					String imgsrc = HelpFrame.class.getClassLoader().getSystemResource("help/images/de/chooseLanguage.png").toString();
					out.append(line.replace("images/de/chooseLanguage.png", imgsrc));
				} else if (line.contains("images/de/defaultProgram.png")) {
					String imgsrc = HelpFrame.class.getClassLoader().getSystemResource("help/images/de/defaultProgram.png").toString();
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
		AbstractButton source = (AbstractButton) e.getSource();
		if (source == btnClose) {
			dispose();
		} else {
			if (map.containsKey(source)) {
				HelpTopic topic = map.get(source);
				showContent(topic.getHtmlFile());
				expandPages(topic);
			} else if (map2.containsKey(source)) {
				HelpPage page = map2.get(source);
				showContent(page.getHtmlFile());
			}
		}
	}

	private void expandPages(HelpTopic topic) {
		if (lastExpandedTopic != null) {
			for (Entry<AbstractButton, HelpTopic> t : map.entrySet()) {
				if (t.getValue() == lastExpandedTopic) {
					AbstractButton btn = t.getKey();
					UIUtil.doHover(false, btn);
				}
			}
			for (HelpPage page : lastExpandedTopic.getHelpPages()) {
				for (Entry<AbstractButton, HelpPage> p : map2.entrySet()) {
					if (p.getValue() == page) {
						AbstractButton btn = p.getKey();
						btn.setVisible(false);
					}
				}
			}
		}
		for (HelpPage page : topic.getHelpPages()) {
			for (Entry<AbstractButton, HelpPage> p : map2.entrySet()) {
				if (p.getValue() == page) {
					AbstractButton btn = p.getKey();
					btn.setVisible(true);
				}
			}
		}
		lastExpandedTopic = topic;
	}

	public void languageChanged() {
		chkAlwayOnTop.setText(Messages.get(MessageConstants.ALWAYS_ON_TOP));
		btnClose.setText(Messages.get(MessageConstants.CLOSE));
	}
}
