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
import javax.swing.JDialog;
import javax.swing.JEditorPane;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.JSeparator;
import javax.swing.JTextField;
import javax.swing.JTree;
import javax.swing.SwingConstants;
import javax.swing.event.HyperlinkEvent;
import javax.swing.event.HyperlinkListener;
import javax.swing.tree.DefaultMutableTreeNode;

import com.jgoodies.forms.factories.Paddings;
import com.jgoodies.forms.layout.CellConstraints;
import com.jgoodies.forms.layout.FormLayout;

import ch.sysout.ui.ImageUtil;
import ch.sysout.util.Icons;
import ch.sysout.util.Messages;
import ch.sysout.util.ScreenSizeUtil;
import ch.sysout.util.UIUtil;

public class HelpDialog extends JDialog implements ActionListener {
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
		//		setMinimumSize(getSize());
	}

	public void adjustSizeWhenNeeded() {
		int width = getWidth();
		int height = getHeight();
		setSize((int) (width * 1.25), height);
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
		// create the root node
		DefaultMutableTreeNode root = new DefaultMutableTreeNode(Messages.get("applicationTitle"));
		// create the child nodes
		DefaultMutableTreeNode emulatorsNode = new DefaultMutableTreeNode("Add emulators");
		DefaultMutableTreeNode emulatorsNode1 = new DefaultMutableTreeNode("Search on disk");
		DefaultMutableTreeNode emulatorsNode2 = new DefaultMutableTreeNode("Drag and drop");

		DefaultMutableTreeNode gamesNode = new DefaultMutableTreeNode("Add games");
		DefaultMutableTreeNode gamesNode1 = new DefaultMutableTreeNode("Search on disk");
		DefaultMutableTreeNode gamesNode2 = new DefaultMutableTreeNode("Drag and drop");

		DefaultMutableTreeNode node0 = new DefaultMutableTreeNode("Configure platforms");
		DefaultMutableTreeNode node01 = new DefaultMutableTreeNode("Configure emulators");

		DefaultMutableTreeNode node1 = new DefaultMutableTreeNode("Explore computer");
		DefaultMutableTreeNode node10 = new DefaultMutableTreeNode("Search now");
		DefaultMutableTreeNode node11 = new DefaultMutableTreeNode("Custom search");
		DefaultMutableTreeNode node12 = new DefaultMutableTreeNode("Quick-Search");
		DefaultMutableTreeNode node13 = new DefaultMutableTreeNode("Repeat last search mode");

		DefaultMutableTreeNode node2 = new DefaultMutableTreeNode("Settings");
		DefaultMutableTreeNode node3 = new DefaultMutableTreeNode("Game properties");
		DefaultMutableTreeNode node4 = new DefaultMutableTreeNode("Find covers");
		DefaultMutableTreeNode node5 = new DefaultMutableTreeNode("Notifications");
		DefaultMutableTreeNode node6 = new DefaultMutableTreeNode("View");
		DefaultMutableTreeNode node7 = new DefaultMutableTreeNode("Language");
		DefaultMutableTreeNode node8 = new DefaultMutableTreeNode("Updates");
		DefaultMutableTreeNode node9 = new DefaultMutableTreeNode("Help us");

		emulatorsNode.add(emulatorsNode1);
		emulatorsNode.add(emulatorsNode2);
		root.add(emulatorsNode);

		gamesNode.add(gamesNode1);
		gamesNode.add(gamesNode2);
		root.add(gamesNode);

		root.add(node0);
		root.add(node01);

		node1.add(node10);
		node1.add(node11);
		node1.add(node12);
		node1.add(node13);
		root.add(node1);

		root.add(node2);
		root.add(node3);
		root.add(node4);
		root.add(node5);
		root.add(node6);
		root.add(node7);
		root.add(node8);
		root.add(node9);

		// create the tree by passing in the root node
		treeTopics = new JTree(root);
		expandAllNodes(treeTopics, 0, treeTopics.getRowCount());
	}

	private void createUI() {
		setLayout(new BorderLayout());
		getRootPane().setBorder(Paddings.DIALOG);
		add(createButtonBarPanel(), BorderLayout.NORTH);

		JPanel pnl = new JPanel(new BorderLayout());
		pnl.add(createNavigationPanel(), BorderLayout.WEST);
		pnl.add(createContentPanel(), BorderLayout.CENTER);

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

	public void showContent(String path) {
		StringBuilder out = new StringBuilder();
		try {
			InputStream is = HelpDialog.class.getResourceAsStream(path);
			BufferedReader bi = new BufferedReader(new InputStreamReader(is));
			String line;
			while ((line = bi.readLine()) != null) {
				out.append(line);
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
		btnClose.setText(Messages.get("close"));
	}
}
