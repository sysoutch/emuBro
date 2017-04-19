package ch.sysout.gameexplorer.view;

import java.awt.BorderLayout;
import java.awt.Color;
import java.awt.Component;
import java.awt.Graphics;
import java.awt.event.MouseEvent;
import java.awt.event.WindowAdapter;
import java.awt.event.WindowEvent;
import java.awt.event.WindowListener;
import java.io.File;
import java.util.Vector;

import javax.swing.Icon;
import javax.swing.ImageIcon;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JOptionPane;
import javax.swing.JScrollPane;
import javax.swing.JTree;
import javax.swing.SwingUtilities;
import javax.swing.ToolTipManager;
import javax.swing.UIManager;
import javax.swing.event.TreeExpansionEvent;
import javax.swing.event.TreeExpansionListener;
import javax.swing.tree.DefaultMutableTreeNode;
import javax.swing.tree.DefaultTreeModel;
import javax.swing.tree.TreeCellRenderer;
import javax.swing.tree.TreePath;
import javax.swing.tree.TreeSelectionModel;

public class FileTreeViewer extends JFrame {
	private static final long serialVersionUID = 1L;

	public static final ImageIcon ICON_COMPUTER = new ImageIcon("");
	public static final ImageIcon ICON_DISK = new ImageIcon("defaults1.png");
	public static final ImageIcon ICON_FOLDER = new ImageIcon("fol_orig.png");
	public static final ImageIcon ICON_EXPANDEDFOLDER = new ImageIcon("folder_open.png");

	protected JTree m_tree;
	protected DefaultTreeModel m_model;

	AddCheckBoxToTree AddCh = new AddCheckBoxToTree();

	private AddCheckBoxToTree.CheckTreeManager checkTreeManager;

	protected TreePath m_clickedPath;

	public FileTreeViewer() {
		super("Demo tree check box");
		setSize(400, 300);

		DefaultMutableTreeNode top = new DefaultMutableTreeNode(new IconData(ICON_COMPUTER, null, "Computer"));

		DefaultMutableTreeNode node;
		File[] roots = File.listRoots();
		for (int k = 0; k < roots.length; k++) {
			node = new DefaultMutableTreeNode(new IconData(ICON_DISK, null, new FileNode(roots[k])));
			top.add(node);
			node.add(new DefaultMutableTreeNode(new Boolean(true)));
		}

		m_model = new DefaultTreeModel(top);

		m_tree = new JTree(m_model) {
			/**
			 * 
			 */
			private static final long serialVersionUID = 1L;

			@Override
			public String getToolTipText(MouseEvent ev) {
				if (ev == null) {
					return null;
				}
				TreePath path = m_tree.getPathForLocation(ev.getX(), ev.getY());
				if (path != null) {
					FileNode fnode = getFileNode(getTreeNode(path));
					if (fnode == null) {
						return null;
					}
					File f = fnode.getFile();
					return (f == null ? null : f.getPath());
				}
				return null;
			}
		};

		ToolTipManager.sharedInstance().registerComponent(m_tree);

		m_tree.putClientProperty("JTree.lineStyle", "Angled");

		TreeCellRenderer renderer = new IconCellRenderer();
		m_tree.setCellRenderer(renderer);

		m_tree.addTreeExpansionListener(new DirExpansionListener());

		m_tree.getSelectionModel().setSelectionMode(TreeSelectionModel.SINGLE_TREE_SELECTION);
		m_tree.setShowsRootHandles(true);
		m_tree.setEditable(false);

		checkTreeManager = AddCh.new CheckTreeManager(m_tree, null);

		JScrollPane s = new JScrollPane();
		s.getViewport().add(m_tree);
		getContentPane().add(s, BorderLayout.CENTER);

		WindowListener wndCloser = new WindowAdapter() {
			@Override
			public void windowClosing(WindowEvent e) {
				System.exit(0);
			}
		};

		addWindowListener(wndCloser);
		setVisible(true);
	}

	DefaultMutableTreeNode getTreeNode(TreePath path) {
		return (DefaultMutableTreeNode) (path.getLastPathComponent());
	}

	FileNode getFileNode(DefaultMutableTreeNode node) {
		if (node == null) {
			return null;
		}
		Object obj = node.getUserObject();
		if (obj instanceof IconData) {
			obj = ((IconData) obj).getObject();
		}
		if (obj instanceof FileNode) {
			return (FileNode) obj;
		} else {
			return null;
		}
	}

	public AddCheckBoxToTree.CheckTreeManager getCheckTreeManager() {
		return checkTreeManager;
	}

	// Make sure expansion is threaded and updating the tree model
	// only occurs within the event dispatching thread.
	class DirExpansionListener implements TreeExpansionListener {
		@Override
		public void treeExpanded(TreeExpansionEvent event) {
			final DefaultMutableTreeNode node = getTreeNode(event.getPath());
			final FileNode fnode = getFileNode(node);

			Thread runner = new Thread() {
				@Override
				public void run() {
					if (fnode != null && fnode.expand(node)) {
						Runnable runnable = new Runnable() {
							@Override
							public void run() {
								m_model.reload(node);
							}
						};
						SwingUtilities.invokeLater(runnable);
					}
				}
			};
			runner.start();
		}

		@Override
		public void treeCollapsed(TreeExpansionEvent event) {
		}
	}
}

class IconCellRenderer extends JLabel implements TreeCellRenderer {
	private static final long serialVersionUID = 1L;

	protected Color m_textSelectionColor;
	protected Color m_textNonSelectionColor;
	protected Color m_bkSelectionColor;
	protected Color m_bkNonSelectionColor;
	protected Color m_borderSelectionColor;

	protected boolean m_selected;

	public IconCellRenderer() {
		super();
		m_textSelectionColor = UIManager.getColor("Tree.selectionForeground");
		m_textNonSelectionColor = UIManager.getColor("Tree.textForeground");
		m_bkSelectionColor = UIManager.getColor("Tree.selectionBackground");
		m_bkNonSelectionColor = UIManager.getColor("Tree.textBackground");
		m_borderSelectionColor = UIManager.getColor("Tree.selectionBorderColor");
		setOpaque(false);
	}

	@Override
	public Component getTreeCellRendererComponent(JTree tree, Object value, boolean sel, boolean expanded, boolean leaf,
			int row, boolean hasFocus) {
		DefaultMutableTreeNode node = (DefaultMutableTreeNode) value;
		Object obj = node.getUserObject();
		setText(obj.toString());

		if (obj instanceof Boolean) {
			setText("Retrieving data...");
		}

		if (obj instanceof IconData) {
			IconData idata = (IconData) obj;
			if (expanded) {
				setIcon(idata.getExpandedIcon());
			} else {
				setIcon(idata.getIcon());
			}
		} else {
			setIcon(null);
		}

		setFont(tree.getFont());
		setForeground(sel ? m_textSelectionColor : m_textNonSelectionColor);
		setBackground(sel ? m_bkSelectionColor : m_bkNonSelectionColor);
		m_selected = sel;
		return this;
	}

	@Override
	public void paintComponent(Graphics g) {
		Color bColor = getBackground();
		Icon icon = getIcon();

		g.setColor(bColor);
		int offset = 0;
		if (icon != null && getText() != null) {
			offset = (icon.getIconWidth() + getIconTextGap());
		}
		g.fillRect(offset, 0, getWidth() - 1 - offset, getHeight() - 1);

		if (m_selected) {
			g.setColor(m_borderSelectionColor);
			g.drawRect(offset, 0, getWidth() - 1 - offset, getHeight() - 1);
		}

		super.paintComponent(g);
	}
}

class IconData {
	protected Icon m_icon;
	protected Icon m_expandedIcon;
	protected Object m_data;

	public IconData(Icon icon, Object data) {
		m_icon = icon;
		m_expandedIcon = null;
		m_data = data;
	}

	public IconData(Icon icon, Icon expandedIcon, Object data) {
		m_icon = icon;
		m_expandedIcon = expandedIcon;
		m_data = data;
	}

	public Icon getIcon() {
		return m_icon;
	}

	public Icon getExpandedIcon() {
		return m_expandedIcon != null ? m_expandedIcon : m_icon;
	}

	public Object getObject() {
		return m_data;
	}

	@Override
	public String toString() {
		return m_data.toString();
	}
}

class FileNode {
	protected File m_file;

	public FileNode(File file) {
		m_file = file;
	}

	public File getFile() {
		return m_file;
	}

	@Override
	public String toString() {
		return m_file.getName().length() > 0 ? m_file.getName() : m_file.getPath();
	}

	public boolean expand(DefaultMutableTreeNode parent) {
		DefaultMutableTreeNode flag = (DefaultMutableTreeNode) parent.getFirstChild();
		if (flag == null) {
			return false;
		}
		Object obj = flag.getUserObject();
		if (!(obj instanceof Boolean)) {
			return false; // Already expanded
		}

		parent.removeAllChildren(); // Remove Flag

		File[] files = listFiles();
		if (files == null) {
			return true;
		}

		Vector<FileNode> v = new Vector<>();

		for (int k = 0; k < files.length; k++) {
			File f = files[k];
			if (!(f.isDirectory())) {
				continue;
			}

			FileNode newNode = new FileNode(f);

			boolean isAdded = false;
			for (int i = 0; i < v.size(); i++) {
				FileNode nd = v.elementAt(i);
				if (newNode.compareTo(nd) < 0) {
					v.insertElementAt(newNode, i);
					isAdded = true;
					break;
				}
			}
			if (!isAdded) {
				v.addElement(newNode);
			}
		}

		for (int i = 0; i < v.size(); i++) {
			FileNode nd = v.elementAt(i);
			IconData idata = new IconData(FileTreeViewer.ICON_FOLDER, FileTreeViewer.ICON_EXPANDEDFOLDER, nd);
			DefaultMutableTreeNode node = new DefaultMutableTreeNode(idata);
			parent.add(node);

			if (nd.hasSubDirs()) {
				node.add(new DefaultMutableTreeNode(new Boolean(true)));
			}
		}

		return true;
	}

	public boolean hasSubDirs() {
		File[] files = listFiles();
		if (files == null) {
			return false;
		}
		for (int k = 0; k < files.length; k++) {
			if (files[k].isDirectory()) {
				return true;
			}
		}
		return false;
	}

	public int compareTo(FileNode toCompare) {
		return m_file.getName().compareToIgnoreCase(toCompare.m_file.getName());
	}

	protected File[] listFiles() {
		if (!m_file.isDirectory()) {
			return null;
		}
		try {
			return m_file.listFiles();
		} catch (Exception ex) {
			JOptionPane.showMessageDialog(null, "Error reading directory " + m_file.getAbsolutePath(), "Warning",
					JOptionPane.WARNING_MESSAGE);
			return null;
		}
	}
}