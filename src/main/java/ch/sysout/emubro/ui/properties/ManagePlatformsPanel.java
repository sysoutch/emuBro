package ch.sysout.emubro.ui.properties;

import java.awt.BorderLayout;
import java.awt.Color;
import java.awt.Component;
import java.awt.Dimension;
import java.awt.FileDialog;
import java.awt.FlowLayout;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.awt.event.FocusEvent;
import java.awt.event.FocusListener;
import java.awt.event.ItemListener;
import java.awt.event.KeyAdapter;
import java.awt.event.KeyEvent;
import java.awt.event.MouseListener;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileReader;
import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Vector;

import javax.swing.AbstractButton;
import javax.swing.Action;
import javax.swing.BorderFactory;
import javax.swing.DefaultListModel;
import javax.swing.ImageIcon;
import javax.swing.JButton;
import javax.swing.JCheckBox;
import javax.swing.JComboBox;
import javax.swing.JLabel;
import javax.swing.JList;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.JSpinner;
import javax.swing.JSplitPane;
import javax.swing.JTabbedPane;
import javax.swing.JTable;
import javax.swing.JTextArea;
import javax.swing.JTextField;
import javax.swing.JToggleButton;
import javax.swing.KeyStroke;
import javax.swing.ListModel;
import javax.swing.ListSelectionModel;
import javax.swing.ScrollPaneConstants;
import javax.swing.SwingConstants;
import javax.swing.SwingUtilities;
import javax.swing.UIManager;
import javax.swing.border.Border;
import javax.swing.event.ListSelectionEvent;
import javax.swing.event.ListSelectionListener;
import javax.swing.event.TreeModelEvent;
import javax.swing.event.TreeModelListener;
import javax.swing.table.DefaultTableCellRenderer;
import javax.swing.table.JTableHeader;
import javax.swing.table.TableCellRenderer;
import javax.swing.table.TableColumn;
import javax.swing.table.TableColumnModel;
import javax.swing.text.JTextComponent;
import javax.swing.tree.TreeModel;
import javax.swing.tree.TreePath;

import com.jgoodies.forms.factories.CC;
import org.apache.commons.io.FilenameUtils;

import com.jgoodies.forms.factories.Paddings;
import com.jgoodies.forms.layout.CellConstraints;
import com.jgoodies.forms.layout.FormLayout;
import com.jgoodies.forms.layout.RowSpec;

import ch.sysout.emubro.api.event.EmulatorEvent;
import ch.sysout.emubro.api.event.PlatformEvent;
import ch.sysout.emubro.api.model.Emulator;
import ch.sysout.emubro.api.model.Explorer;
import ch.sysout.emubro.api.model.Platform;
import ch.sysout.emubro.controller.BroController.EmulatorListCellRenderer;
import ch.sysout.emubro.controller.BroController.PlatformListCellRenderer;
import ch.sysout.emubro.impl.model.BroEmulator;
import ch.sysout.emubro.ui.AddEmulatorPanel;
import ch.sysout.emubro.ui.AddPlatformDialog;
import ch.sysout.emubro.ui.ColorStore;
import ch.sysout.emubro.ui.EmulatorTableCellRenderer;
import ch.sysout.emubro.ui.EmulatorTableModel;
import ch.sysout.emubro.ui.JCustomButton;
import ch.sysout.emubro.ui.JCustomButtonNew;
import ch.sysout.emubro.ui.JCustomScrollPane;
import ch.sysout.emubro.ui.JCustomToggleButton;
import ch.sysout.emubro.ui.JLinkButton;
import ch.sysout.emubro.ui.JTableDoubleClickOnHeaderFix;
import ch.sysout.emubro.ui.SortedListModel;
import ch.sysout.emubro.ui.TableColumnAdjuster;
import ch.sysout.emubro.util.ColorConstants;
import ch.sysout.emubro.util.MessageConstants;
import ch.sysout.ui.util.ImageUtil;
import ch.sysout.ui.util.UIUtil;
import ch.sysout.util.Icons;
import ch.sysout.util.Messages;
import ch.sysout.util.ScreenSizeUtil;
import net.tomahawk.XFileDialog;

public class ManagePlatformsPanel extends JPanel {
	private static final long serialVersionUID = 1L;

	private PlatformsPanel pnlPlatforms = new PlatformsPanel();
	private EmulatorsPanel pnlEmulators = new EmulatorsPanel();
	private JSplitPane spl00;
	private JPanel pnlPlatformsEmulatorsComboWrapper;

	private Explorer explorer;

	public List<DefaultEmulatorListener> defaultEmulatorListeners = new ArrayList<>();

	public ManagePlatformsPanel(Explorer explorer) {
		super(new BorderLayout());
		this.explorer = explorer;
		initComponents();
		createUI();
	}

	private void initComponents() {
		Border border = Paddings.DLU4;
		Border titledBorderPlatforms = BorderFactory.createTitledBorder("Platforms");
		Border titledBorderEmulators = BorderFactory.createTitledBorder("Emulators");
		pnlPlatforms.setBorder(BorderFactory.createCompoundBorder(titledBorderPlatforms, border));
		pnlEmulators.setBorder(BorderFactory.createCompoundBorder(titledBorderEmulators, border));
		setMnemonics();
		addListeners();
	}

	private void setMnemonics() {
	}

	private void addListeners() {
	}

	private void createUI() {
		pnlPlatforms.setOpaque(false);
		pnlEmulators.setOpaque(false);
		FormLayout layout = new FormLayout("min:grow", "fill:min:grow");
		setLayout(layout);
		CellConstraints cc = new CellConstraints();
		pnlPlatformsEmulatorsComboWrapper = new JPanel(new BorderLayout());
		pnlPlatformsEmulatorsComboWrapper.setOpaque(false);
		//pnlPlatformsEmulatorsComboWrapper.setBorder(Paddings.TABBED_DIALOG);
		pnlPlatformsEmulatorsComboWrapper.add(pnlPlatforms, BorderLayout.CENTER);
		spl00 = new JSplitPane(JSplitPane.HORIZONTAL_SPLIT, pnlPlatformsEmulatorsComboWrapper, pnlEmulators);
		spl00.setBorder(BorderFactory.createEmptyBorder());
		spl00.setContinuousLayout(true);
		add(spl00, cc.xy(1, 1));
	}

	public void setPlatformListCellRenderer(PlatformListCellRenderer l) {
		pnlPlatforms.lstPlatforms.setCellRenderer(l);
	}

	public void setEmulatorListCellRenderer(EmulatorListCellRenderer l) {
		// pnlEmulators.lstEmulators.setCellRenderer(l);
		pnlEmulators.pnlAddEmulator.setEmulatorListCellRenderer(l);
	}

	public void addPlatformSelectedListener(ListSelectionListener l) {
		pnlPlatforms.addPlatformSelectedListener(l);
	}

	public void addRemovePlatformListener(Action l) {
		pnlPlatforms.addRemovePlatformListener(l);
	}

	public Platform getSelectedPlatform() {
		return pnlPlatforms.lstPlatforms.getSelectedValue();
	}

	public Emulator getSelectedEmulator() {
		return pnlEmulators.getSelectedEmulator(getSelectedPlatform().getId());
	}

	public Emulator getSelectedDownloadEmulator() {
		return pnlEmulators.getSelectedDownloadEmulator();
	}

	public void adjustSplitPaneDividerSizes() {
		int dividerSize = pnlEmulators.spl1.getDividerSize();
		int value = ScreenSizeUtil.adjustValueToResolution(dividerSize);
		pnlEmulators.spl1.setDividerSize(value);
	}

	public JSplitPane getSpl1() {
		return pnlEmulators.getSpl1();
	}

	public void adjustSplitPaneDividerLocations() {
		pnlEmulators.adjustSplitPaneDividerLocations();
	}

	public void platformSelected(Platform selectedPlatform) {
		pnlPlatforms.platformSelected(selectedPlatform);
		pnlEmulators.platformSelected(selectedPlatform);
	}

	public void setPlatformListModel(ListModel<Platform> l) {
		pnlPlatforms.lstPlatforms.setModel(l);
	}

	public void platformAdded(PlatformEvent e) {
		((DefaultListModel<Platform>) pnlPlatforms.lstPlatforms.getModel()).addElement(e.getPlatform());
	}

	public void platformRemoved(PlatformEvent e) {
		((DefaultListModel<Platform>) pnlPlatforms.lstPlatforms.getModel()).removeElement(e.getPlatform());
	}

	public void emulatorAdded(EmulatorEvent e) {
		pnlEmulators.emulatorAdded(e);
	}

	public void emulatorRemoved(EmulatorEvent e) {
		pnlEmulators.emulatorRemoved(e);
	}

	public void addRemoveEmulatorListener(Action l) {
		pnlEmulators.addRemoveEmulatorListener(l);
	}

	public void addRemoveEmulatorListener(ActionListener l) {
		pnlEmulators.addRemoveEmulatorListener(l);
	}

	public void setEmulators(List<BroEmulator> emulators) {
		pnlEmulators.setEmulators(emulators);
	}

	public void addOpenEmulatorPropertiesPanelListener(ActionListener l) {
		pnlEmulators.addOpenEmulatorPropertiesPanelListener(l);
	}

	public void addOpenEmulatorPropertiesPanelListener2(MouseListener l) {
		pnlEmulators.addOpenEmulatorPropertiesPanelListener2(l);
	}

	public void addRunEmulatorListener(ActionListener l) {
		pnlEmulators.addRunEmulatorListener(l);
	}

	public void addOpenWebsiteListener(ActionListener l) {
		pnlEmulators.addOpenWebsiteListener(l);
	}

	public void showEmulatorPropertiesPanel(boolean b) {
		pnlEmulators.showEmulatorPropertiesPanel(b);
	}

	class PlatformsPanel extends JPanel implements ActionListener {
		private static final long serialVersionUID = 1L;

		private JList<Platform> lstPlatforms = new JList<>();
		private JLinkButton btnAddPlatform = new JLinkButton("Create new platform");
		//		private JButton btnRemovePlatform = new JButton();
		private JButton btnEditPlatform = new JCustomButton(Messages.get(MessageConstants.CONFIGURE));
		private JCheckBox chkShowOnlyInstalledPlatforms = new JCheckBox(Messages.get(MessageConstants.SHOW_ONLY_INSTALLED_PLATFORMS));
		private JScrollPane spLstPlatforms;

		public PlatformsPanel() {
			initComponents();
			createUI();
			setIcons();
			addListeners();
		}

		private void initComponents() {
			btnEditPlatform.setEnabled(false);
			lstPlatforms.setSelectionMode(ListSelectionModel.SINGLE_SELECTION);
		}

		private void createUI() {
			int rowHeight = ScreenSizeUtil.adjustValueToResolution(32);
			lstPlatforms.setFixedCellHeight(rowHeight);
			lstPlatforms.setOpaque(false);
			chkShowOnlyInstalledPlatforms.setOpaque(false);
			chkShowOnlyInstalledPlatforms.setToolTipText(Messages.get(MessageConstants.TOOL_TIP_SHOW_ONLY_INSTALLED_PLATFORMS));
			chkShowOnlyInstalledPlatforms.setMinimumSize(new Dimension(0, 0));
			FormLayout layout = new FormLayout("default, $rgap:grow, pref",
					"fill:default:grow, $lgap, fill:pref, $rgap, fill:pref");
			setLayout(layout);
			CellConstraints cc = new CellConstraints();
			spLstPlatforms = new JCustomScrollPane(lstPlatforms) {
				private static final long serialVersionUID = 1L;

				//				@Override
				//				protected void paintComponent(Graphics g) {
				//					super.paintComponent(g);
				//					Graphics2D g2d = (Graphics2D) g.create();
				//					int panelWidth = getWidth();
				//					int panelHeight = getHeight();
				//					Theme currentTheme = IconStore.current().getCurrentTheme();
				//					if (currentTheme.getView().hasGradientPaint()) {
				//						GradientPaint p = currentTheme.getView().getGradientPaint();
				//						g2d.setPaint(p);
				//					} else if (currentTheme.getView().hasColor()) {
				//						g2d.setColor(currentTheme.getView().getColor());
				//					}
				//					g2d.fillRect(0, 0, panelWidth, panelHeight);
				//					g2d.dispose();
				//				}
			};
			spLstPlatforms.setOpaque(false);
			spLstPlatforms.getViewport().setOpaque(false);
			add(spLstPlatforms, cc.xyw(1, 1, layout.getColumnCount()));
			add(chkShowOnlyInstalledPlatforms, cc.xyw(1, 3, layout.getColumnCount()));
			add(btnAddPlatform, cc.xy(1, 5));
			add(btnEditPlatform, cc.xy(3, 5));
			spLstPlatforms.setHorizontalScrollBarPolicy(ScrollPaneConstants.HORIZONTAL_SCROLLBAR_NEVER);
		}

		private void setIcons() {
			int size = ScreenSizeUtil.is3k() ? 32 : 24;
		}

		private void addListeners() {
			addActionListeners(this, btnAddPlatform, btnEditPlatform, chkShowOnlyInstalledPlatforms);
		}

		public void addRemovePlatformListener(Action l) {
			lstPlatforms.getInputMap().put(KeyStroke.getKeyStroke("DELETE"), "actionRemovePlatform");
			lstPlatforms.getActionMap().put("actionRemovePlatform", l);
		}

		/**
		 * @param buttons
		 */
		private void addActionListeners(ActionListener src, AbstractButton... buttons) {
			for (AbstractButton btn : buttons) {
				btn.addActionListener(src);
			}
		}

		@Override
		public void actionPerformed(ActionEvent e) {
			Object source = e.getSource();
			if (source == btnAddPlatform) {
				new AddPlatformDialog().setVisible(true);
			} else if (source == chkShowOnlyInstalledPlatforms) {
				SortedListModel<Platform> model = (SortedListModel<Platform>) lstPlatforms.getModel();
				Platform selectedPlatform = lstPlatforms.getSelectedValue();
				if (chkShowOnlyInstalledPlatforms.isSelected()) {
					for (int i = model.getSize()-1; i >= 0; i--) {
						int platformId = model.getElementAt(i).getId();
						if (!explorer.hasGamesOrEmulators(platformId)) {
							model.removeElement(model.getElementAt(i));
						}
					}
					if (selectedPlatform != null) {
						lstPlatforms.setSelectedValue(selectedPlatform, true);
					}
				} else {
					for (Platform platform : explorer.getPlatforms()) {
						int platformId = platform.getId();
						if (!explorer.hasGamesOrEmulators(platformId)) {
							model.add(platform);
						}
					}
					if (selectedPlatform != null) {
						if (explorer.hasGamesOrEmulators(selectedPlatform.getId())) {
							lstPlatforms.setSelectedValue(selectedPlatform, true);
						} else {
							lstPlatforms.setSelectedValue(null, false);
						}
					}
				}
			}
		}

		public void addPlatformSelectedListener(ListSelectionListener l) {
			lstPlatforms.getSelectionModel().addListSelectionListener(l);
		}

		public void platformSelected(Platform selectedPlatform) {
			boolean selected = selectedPlatform != null;
			btnEditPlatform.setEnabled(selected);
		}
	}

	class GameDirectoriesPanel extends JPanel {
		private static final long serialVersionUID = 1L;

		private JLabel lblSearchGames = new JLabel("Games");

		private JScrollPane spGameDirectories;

		// FileSystemModel mdlTreeFileSystem = new FileSystemModel(new
		// File("D:/"));
		// JTree treeGameDirectories = new JTree();

		public GameDirectoriesPanel() {
			FormLayout layout = new FormLayout("default:grow", "fill:pref, $lgap, fill:default:grow");
			setLayout(layout);
			CellConstraints cc = new CellConstraints();
			add(lblSearchGames, cc.xy(1, 1));

			// File svgFile = new
			// File("D:/files/workspace/JGameExplorer/res/images/folder-saved-search.svg");
			// ImageIcon icon = ImageUtil.getImageIconFrom(p);
			// JLabel lbl = new JLabel("downloads");
			// lbl.setVerticalTextPosition(SwingConstants.BOTTOM);
			// lbl.setHorizontalTextPosition(SwingConstants.CENTER);
			// lbl.setIcon(icon);

			// ico = new ImageIcon(icon);
			// JLabel lbl2 = new JLabel("games");
			// lbl2.setVerticalTextPosition(SwingConstants.BOTTOM);
			// lbl2.setHorizontalTextPosition(SwingConstants.CENTER);
			// lbl2.setIcon(icon);

			JPanel pnl = new JPanel(new FlowLayout());
			// pnl.setBorder(Paddings.DLU4);
			// pnl.add(lbl);
			// pnl.add(lbl2);

			JPanel pnl2 = new JPanel(new BorderLayout());
			pnl2.add(pnl, BorderLayout.WEST);
			add(spGameDirectories = new JScrollPane(pnl2), cc.xy(1, 3));
		}
	}

	class EmulatorsPanel extends JPanel implements ListSelectionListener, ActionListener {
		private static final long serialVersionUID = 1L;
		private JTable tblEmulators;
		private JButton btnAddEmulator = new JCustomButtonNew("", ImageUtil.getImageIconFrom(Icons.get("add", 24, 24)));
		private JButton btnRemoveEmulator = new JCustomButtonNew("", ImageUtil.getImageIconFrom(Icons.get("remove2", 24, 24)));
		private JButton btnSetDefaultEmulator = new JCustomButton(Messages.get(MessageConstants.SET_DEFAULT));
		private JButton btnEmulatorProperties = new JCustomButton(Messages.get(MessageConstants.CONFIGURE));
		private JToggleButton btnEmulatorProperties2 = new JCustomToggleButton(Messages.get(MessageConstants.CONFIGURE));
		private EmulatorConfigurationPanel pnlEmulatorConfiguration;
		private JSplitPane spl1 = new JSplitPane(JSplitPane.VERTICAL_SPLIT);
		private JPanel pnlAvailableEmulators = new JPanel();
		private JPanel pnlEmulatorOverview;
		private AddEmulatorPanel pnlAddEmulator;
		protected JPanel pnlSelectedEmulatorMinimized;
		private Map<Integer, EmulatorTableModel> emulatorModels = new HashMap<>();
		private JLinkButton lnkRunEmulator = new JLinkButton("Start emulator");
		private JLinkButton lnkOpenFolder = new JLinkButton("Open Folder");
		private JLinkButton lnkWebsite = new JLinkButton("Visit website");
		public JScrollPane spConfigurationFile;
		private JScrollPane spEmulators;
		private Map<Integer, ListModel<Emulator>> defaultEmulatorModels = new HashMap<>();
		private JPanel pnlNoPlatformSelected = new JPanel();
		private Component lastTopComponent;
		public boolean makeInput;

		public EmulatorsPanel() {
			super(new BorderLayout());
			setBorder(Paddings.TABBED_DIALOG);
			pnlNoPlatformSelected.setOpaque(false);
			pnlNoPlatformSelected.add(new JLabel("<html><center>No platform currently selected.<br><br>Select a platform from the list on the left to show its emulators</center></html>"));
			int rowHeight = ScreenSizeUtil.adjustValueToResolution(32);
			EmulatorTableModel model = new EmulatorTableModel(null);
			tblEmulators = new JTableDoubleClickOnHeaderFix();
			tblEmulators.setOpaque(false);
			tblEmulators.setPreferredScrollableViewportSize(tblEmulators.getPreferredSize());
			tblEmulators.setRowHeight(rowHeight);
			tblEmulators.setAutoscrolls(false);
			tblEmulators.getTableHeader().setReorderingAllowed(false);
			tblEmulators.setIntercellSpacing(new Dimension(0, 0));
			tblEmulators.setFillsViewportHeight(true);
			tblEmulators.setShowGrid(false);
			tblEmulators.setAutoResizeMode(JTable.AUTO_RESIZE_OFF);
			tblEmulators.setSelectionMode(ListSelectionModel.SINGLE_SELECTION);
			tblEmulators.setModel(model);
			doModelShit();
			pnlEmulatorOverview = createEmulatorOverviewPanel();
			pnlEmulatorOverview.setVisible(false);
			pnlSelectedEmulatorMinimized = createSelectedEmulatorMinimizedPanel();
			pnlAddEmulator = new AddEmulatorPanel();
			add(pnlEmulatorOverview);
			setIcons();
			setToolTipText();
			addListeners();
		}

		public Emulator getSelectedEmulator(int platformId) {
			EmulatorTableModel emulatorModel = emulatorModels.get(platformId);
			int row = tblEmulators.getSelectedRow();
			return emulatorModel.getEmulator(tblEmulators.convertRowIndexToModel(row));
		}

		public Emulator getSelectedDownloadEmulator() {
			return pnlAddEmulator.getSelectedEmulator();
		}

		private JPanel createEmulatorOverviewPanel() {
			JPanel pnl = new JPanel(new BorderLayout());
			// lstEmulators.setPreferredSize(new Dimension(0,0));
			btnRemoveEmulator.setEnabled(false);
			btnSetDefaultEmulator.setIcon(ImageUtil.getFlatSVGIconFrom(Icons.get("checkMark"), 22, new Color(40, 167, 69)));
			btnSetDefaultEmulator.setEnabled(false);
			btnAddEmulator.setEnabled(false);
			btnEmulatorProperties.setEnabled(false);

			// pnlAvailableEmulators.setBorder(Paddings.TABBED_DIALOG);
			FormLayout layout = new FormLayout("default, min, default, $ugap:grow, default, $rgap, default",
					"fill:default:grow, $lgap, fill:pref");
			pnlAvailableEmulators.setLayout(layout);
			pnlAvailableEmulators.setOpaque(false);
			CellConstraints cc = new CellConstraints();
			spEmulators = new JCustomScrollPane(tblEmulators);
			spEmulators.setOpaque(false);
			spEmulators.getViewport().setOpaque(false);
			pnlAvailableEmulators.add(spEmulators, cc.xyw(1, 1, layout.getColumnCount()));
			pnlAvailableEmulators.add(btnAddEmulator, cc.xy(1, 3));
			pnlAvailableEmulators.add(btnRemoveEmulator, cc.xy(3, 3));
			pnlAvailableEmulators.add(btnSetDefaultEmulator, cc.xy(5, 3));
			pnlAvailableEmulators.add(btnEmulatorProperties, cc.xy(7, 3));

			JPanel pnlEmulatorConfiguration = new JPanel(new BorderLayout());
			pnlEmulatorConfiguration.add(createEmulatorConfigurationPanel());
			spl1.setBorder(BorderFactory.createEmptyBorder());
			spl1.setTopComponent(pnlAvailableEmulators);
			// spl1.setBottomComponent(pnlEmulatorConfiguration);
			spl1.setDividerSize(0);

			spl1.setContinuousLayout(true);
			// spl1.setResizeWeight(0);
			pnl.add(spl1);
			return pnl;
		}

		private JPanel createSelectedEmulatorMinimizedPanel() {
			JPanel pnl = new JPanel();
			pnl.setOpaque(false);
			// pnl.setBorder(Paddings.TABBED_DIALOG);
			FormLayout layout = new FormLayout("pref, $ugap, pref, $ugap, pref, min:grow, $rgap, pref",
					"fill:pref, $rgap");
			pnl.setLayout(layout);
			CellConstraints cc = new CellConstraints();
			//			pnl.add(lblSelectedEmulator, cc.xyw(1, 1, layout.getColumnCount() - 2));
			//			lblSelectedEmulator.setMinimumSize(new Dimension(0, 0));

			pnl.add(lnkRunEmulator, cc.xy(1, 1));
			pnl.add(lnkOpenFolder, cc.xy(3, 1));
			pnl.add(lnkWebsite, cc.xy(5, 1));
			pnl.add(btnEmulatorProperties2, cc.xy(layout.getColumnCount(), 1));
			return pnl;
		}

		public JSplitPane getSpl1() {
			return spl1;
		}

		private JPanel createEmulatorConfigurationPanel() {
			if (pnlEmulatorConfiguration == null) {
				pnlEmulatorConfiguration = new EmulatorConfigurationPanel();
				pnlEmulatorConfiguration.setOpaque(false);
			}
			return pnlEmulatorConfiguration;
		}

		private void setIcons() {
			ScreenSizeUtil.is3k();
		}

		private void setToolTipText() {
			btnRemoveEmulator.setToolTipText("Ausgewählten Emulator entfernen");
			btnSetDefaultEmulator.setToolTipText("Ausgewählten Emulator als Standard festlegen");
		}

		private void addListeners() {
			tblEmulators.getSelectionModel().addListSelectionListener(this);
			btnAddEmulator.addActionListener(this);
			pnlAddEmulator.addGoBackListener(new ActionListener() {

				@Override
				public void actionPerformed(ActionEvent e) {
					remove(pnlAddEmulator);
					add(pnlEmulatorOverview);
					UIUtil.revalidateAndRepaint(ManagePlatformsPanel.this);
				}
			});

			btnSetDefaultEmulator.addActionListener(new ActionListener() {

				@Override
				public void actionPerformed(ActionEvent e) {
					JList<Platform> lstPlatforms = pnlPlatforms.lstPlatforms;
					int selectedPlatformIndex = lstPlatforms.getSelectedIndex();
					ListModel<Platform> platformModel = lstPlatforms.getModel();
					Platform platform = platformModel.getElementAt(selectedPlatformIndex);
					Emulator emulator = ((Emulator) tblEmulators.getValueAt(tblEmulators.getSelectedRow(), -1));
					platform.setDefaultEmulatorId(emulator.getId());
					btnSetDefaultEmulator.setEnabled(false);
					for (int i = 0; i < tblEmulators.getRowCount(); i++) {
						((EmulatorTableModel) tblEmulators.getModel()).fireTableCellUpdated(i, 0);
					}
					tblEmulators.repaint();
					fireDefaultEmulatorSet(platform, emulator.getId());
				}
			});

			btnEmulatorProperties2.addActionListener(new ActionListener() {

				@Override
				public void actionPerformed(ActionEvent e) {
					showEmulatorPropertiesPanel(false);
					UIUtil.revalidateAndRepaint(ManagePlatformsPanel.this);
				}
			});
		}

		public void addDefaultEmulatorListener(DefaultEmulatorListener l) {
			defaultEmulatorListeners.add(l);
		}

		protected void fireDefaultEmulatorSet(Platform platform, int emulatorId) {
			for (DefaultEmulatorListener l : defaultEmulatorListeners) {
				l.defaultEmulatorSet(platform, emulatorId);
			}
		}

		public void addRemoveEmulatorListener(Action l) {
			tblEmulators.getInputMap().put(KeyStroke.getKeyStroke("DELETE"), "actionRemoveEmulator");
			tblEmulators.getActionMap().put("actionRemoveEmulator", l);
		}

		public void addRemoveEmulatorListener(ActionListener l) {
			btnRemoveEmulator.addActionListener(l);
		}

		public void addOpenEmulatorPropertiesPanelListener(ActionListener l) {
			btnEmulatorProperties.addActionListener(l);
		}

		public void addOpenEmulatorPropertiesPanelListener2(MouseListener l) {
			tblEmulators.addMouseListener(l);
		}

		public void addRunEmulatorListener(ActionListener l) {
			lnkRunEmulator.addActionListener(l);
		}

		public void addOpenWebsiteListener(ActionListener l) {
			lnkWebsite.addActionListener(l);
		}

		protected void showEmulatorPropertiesPanel(boolean b) {
			if (tblEmulators.getSelectedRow() == -1) {
				showAddEmulatorPanel(pnlPlatforms.lstPlatforms.getSelectedValue());
				return;
			}
			if (b) {
				//				EmulatorTableModel model = (EmulatorTableModel) tblEmulators.getModel();
				//				String labeltext = "";
				//				ImageIcon ico = null;
				//				if (model.getRowCount() > 0) {
				//					Emulator emulator = (Emulator) model.getValueAt(tblEmulators.convertRowIndexToModel(0), -1);
				//					labeltext = emulator.getName() + " (" + emulator.getPath() + ")";
				//					// FIXME cache icons
				//					ico = ImageUtil.getImageIconFrom("/images/emulators/" + emulator.getIconFilename());
				//				}
				spl1.setTopComponent(pnlSelectedEmulatorMinimized);
				spl1.setBottomComponent(pnlEmulatorConfiguration);
				spl1.setDividerLocation(spl1.getMinimumDividerLocation());
				btnEmulatorProperties2.setSelected(true);

				pnlPlatformsEmulatorsComboWrapper.removeAll();
				pnlPlatformsEmulatorsComboWrapper.add(pnlPlatforms, BorderLayout.NORTH);
				pnlPlatformsEmulatorsComboWrapper.add(pnlAvailableEmulators, BorderLayout.CENTER);
				pnlPlatforms.btnAddPlatform.setVisible(false);
				pnlPlatforms.btnEditPlatform.setVisible(false);
				pnlPlatforms.chkShowOnlyInstalledPlatforms.setVisible(false);
				btnSetDefaultEmulator.setText("");
				btnEmulatorProperties.setVisible(false);
			} else {
				pnlPlatformsEmulatorsComboWrapper.removeAll();
				pnlPlatformsEmulatorsComboWrapper.add(pnlPlatforms, BorderLayout.CENTER);
				spl1.setTopComponent(pnlAvailableEmulators);
				spl1.setBottomComponent(null);
				pnlPlatforms.btnAddPlatform.setVisible(true);
				pnlPlatforms.btnEditPlatform.setVisible(true);
				pnlPlatforms.chkShowOnlyInstalledPlatforms.setVisible(true);
				btnSetDefaultEmulator.setText(Messages.get(MessageConstants.SET_DEFAULT));
				btnEmulatorProperties.setVisible(true);
			}
			SwingUtilities.invokeLater(new Runnable() {

				@Override
				public void run() {
					JList<Platform> lst = pnlPlatforms.lstPlatforms;
					JTable tbl = pnlEmulators.tblEmulators;
					lst.ensureIndexIsVisible(pnlPlatforms.lstPlatforms.getSelectedIndex());
					tbl.scrollRectToVisible(tbl.getCellRect(tbl.getSelectedRow(), 0, true));

				}
			});
		}

		class EmulatorConfigurationPanel extends JPanel {
			private static final long serialVersionUID = 1L;
			private JTabbedPane tpMain = new JTabbedPane();
			private JTextArea txtCommandLineArguments = new JTextArea();
			private JTextArea txtRunCommandsBefore = new JTextArea();
			private JTextArea txtGameCodeRegexes = new JTextArea();
			private JTextArea txtConfigurationFile = new JTextArea();
			private JPanel pnlGeneralSettings;
			private JPanel pnlCommandLineArguments = new JPanel(new BorderLayout());
			private JPanel pnlRunCommandsBefore = new JPanel(new BorderLayout());
			private JPanel pnlGameCodeRegexes = new JPanel(new BorderLayout());
			private JPanel pnlConfigurationFile = new JPanel();
			private JPanel pnlSupportedFileTypes = new JPanel(new BorderLayout());
			private DefaultListModel<String> mdlLstSupportedFileTypes = new DefaultListModel<>();
			private JList<String> txtSupportedFileTypes = new JList<>(mdlLstSupportedFileTypes);
			private JLinkButton txtConfigFilePath = new JLinkButton();
			private JPanel pnlInputConfiguration;
			private JScrollPane spInputConfiguration;
			private JScrollPane spGeneralSettings;
			private JScrollPane spEmulatorConfiguration;
			private JScrollPane spCommandLineArguments;
			private JScrollPane spRunCommandsBefore;
			private JScrollPane spGameCodeRegexes;
			private JLabel lblName = new JLabel();
			private JLabel txtPath = new JLabel();
			private ArrayList<String> buttonsTop;
			private ArrayList<String> buttonsLeft;
			private ArrayList<String> buttonsRight;
			private AbstractButton btnFileChooser = new JCustomButton("...");
			private XFileDialog fcSetCover;

			public EmulatorConfigurationPanel() {
				super(new BorderLayout());
				initComponents();
				createUI();
			}

			public void showName(String name) {
				lblName.setText(name);
			}

			public void showPath(String path) {
				txtPath.setText("<html><a href=" + path + ">" + path + "</a></html>");
			}

			public void showWebsite(String website) {
				lnkWebsite.setToolTipText(website);
			}

			public void showEmulatorPath(String path) {
				lnkRunEmulator.setToolTipText(path);
			}

			public void showCommandLineArguments(String startParameters) {
				txtCommandLineArguments.setText(startParameters);
				if (startParameters == null || startParameters.trim().isEmpty()) {
					ImageIcon icon = ImageUtil.getImageIconFrom(Icons.get("warning", 16, 16));
					tpMain.setIconAt(0, icon);
				} else {
					tpMain.setIconAt(0, null);
				}
			}

			public void showRunCommandsBefore(List<String> runCommandsBefore) {
				txtRunCommandsBefore.setText(runCommandsBefore.toString());
				txtRunCommandsBefore.setCaretPosition(0);
				spRunCommandsBefore.getHorizontalScrollBar().setValue(0);
				spRunCommandsBefore.getVerticalScrollBar().setValue(0);
			}

			public void showGameCodeRegexes(List<String> gameCodeRegexes) {
				txtGameCodeRegexes.setText(gameCodeRegexes.toString());
				txtGameCodeRegexes.setCaretPosition(0);
				spGameCodeRegexes.getHorizontalScrollBar().setValue(0);
				spGameCodeRegexes.getVerticalScrollBar().setValue(0);
			}

			public JPanel showConfigurationFilePanel(String configFilePath) throws FileNotFoundException, IOException {
				File file = new File(configFilePath);
				return showConfigurationFilePanel(file);
			}

			public JPanel showConfigurationFilePanel(File file) throws FileNotFoundException, IOException {
				String configFilePath = file.getAbsolutePath();
				if (!file.exists() || file.isDirectory()) {
					throw new FileNotFoundException(configFilePath);
				}
				BufferedReader br = new BufferedReader(new FileReader(file));
				String s = "";
				FormLayout layout = new FormLayout("min, $lcgap, min:grow, $ugap, default");
				CellConstraints cc = new CellConstraints();
				JPanel pnlGrid = new JPanel(layout);
				pnlGrid.setOpaque(false);

				int type = 0;
				int doMode = -1;
				while ((s = br.readLine()) != null) {
					if (s.startsWith("[") && s.endsWith("]")) {
						doMode = 0;
						s.split("\\\\");
						type = 0;
						String title = s;
						JButton btn = new JCustomButton(title.replace("[", "").replace("]", "").trim());
						btn.setHorizontalAlignment(SwingConstants.LEFT);
						layout.appendRow(RowSpec.decode("fill:pref"));
						pnlGrid.add(btn, cc.xyw(1, layout.getRowCount(), layout.getColumnCount()));
						// }
					} else if (s.trim().startsWith("!version")) {
						type = 0;
						doMode = 1;
					} else {
						if (doMode == 0) {
							if (s.contains("=")) {
								String[] arr = s.split("=");
								if (arr != null && arr.length > 0) {
									String key = arr[0];
									if (arr.length > 1) {
										String valueWithComment = arr[1];
										String[] arr2 = valueWithComment.split("#");
										String value = arr2[0];
										JLabel lblKey = new JLabel(key.trim() + ":");
										JTextField txtValue = null;
										JCheckBox chkValue = null;
										JSpinner spinner = null;
										boolean onOrTrue = value.trim().equalsIgnoreCase("on") || value.trim().equalsIgnoreCase("true");
										boolean offOrFalse = value.trim().equalsIgnoreCase("off") || value.trim().equalsIgnoreCase("false");
										if (onOrTrue || offOrFalse) {
											chkValue = new JCheckBox(value.trim());
											chkValue.setOpaque(false);
											chkValue.setSelected(onOrTrue);
											if (arr2.length > 1) {
												String comment = arr2[1].trim();
												chkValue.setToolTipText(comment.trim());
												String toolTip = chkValue.getToolTipText();
												//												chkValue.setForeground(toolTip != null && !toolTip.isEmpty()
												//														? ValidationComponentUtils.getMandatoryForeground()
												//																: chkValue.getForeground());
											}
										} else {
											try {
												long valueLong = Long.parseLong(value.trim());
												if (valueLong <= Integer.MAX_VALUE) {
													spinner = new JSpinner();
													spinner.setValue(valueLong);
													if (arr2.length > 1) {
														String comment = arr2[1].trim();
														spinner.setToolTipText(comment.trim());
														String toolTip = spinner.getToolTipText();
														//														spinner.setForeground(toolTip != null && !toolTip.isEmpty()
														//																? ValidationComponentUtils.getMandatoryForeground()
														//																		: spinner.getForeground());
													}
												} else {
													txtValue = new JTextField(value.trim());
													if (arr2.length > 1) {
														String comment = arr2[1].trim();
														txtValue.setToolTipText(comment.trim());
														String toolTip = txtValue.getToolTipText();
														//														txtValue.setForeground(toolTip != null && !toolTip.isEmpty()
														//																? ValidationComponentUtils.getMandatoryForeground()
														//																		: txtValue.getForeground());
													}
												}
											} catch (NumberFormatException e) {
												txtValue = new JTextField(value.trim());
												if (arr2.length > 1) {
													String comment = arr2[1].trim();
													txtValue.setToolTipText(comment.trim());
													String toolTip = txtValue.getToolTipText();
													//													txtValue.setForeground(toolTip != null && !toolTip.isEmpty()
													//															? ValidationComponentUtils.getMandatoryForeground()
													//																	: txtValue.getForeground());
												}
											}
										}
										layout.appendRow(RowSpec.decode("fill:pref"));
										if (type == 0) {
											pnlGrid.add(lblKey, cc.xy(1, layout.getRowCount()));

											if (txtValue != null) {
												pnlGrid.add(txtValue, cc.xy(3, layout.getRowCount()));
												String toolTipText = txtValue.getToolTipText();
												if (toolTipText != null && !toolTipText.trim().isEmpty()) {
													JLabel lbl = new JLabel(ImageUtil.getImageIconFrom(Icons.get("info", 16, 16)));
													lbl.setToolTipText(toolTipText);
													lbl.setMinimumSize(new Dimension(0, 0));
													pnlGrid.add(lbl, cc.xy(5, layout.getRowCount()));
												}
											} else if (chkValue != null) {
												pnlGrid.add(chkValue, cc.xy(3, layout.getRowCount()));
												String toolTipText = chkValue.getToolTipText();
												if (toolTipText != null && !toolTipText.trim().isEmpty()) {
													JLabel lbl = new JLabel(ImageUtil.getImageIconFrom(Icons.get("info", 16, 16)));
													lbl.setToolTipText(toolTipText);
													lbl.setMinimumSize(new Dimension(0, 0));
													pnlGrid.add(lbl, cc.xy(5, layout.getRowCount()));
												}
											} else if (spinner != null) {
												pnlGrid.add(spinner, cc.xy(3, layout.getRowCount()));
												String toolTipText = spinner.getToolTipText();
												if (toolTipText != null && !toolTipText.trim().isEmpty()) {
													JLabel lbl = new JLabel(ImageUtil.getImageIconFrom(Icons.get("info", 16, 16)));
													lbl.setToolTipText(toolTipText);
													lbl.setMinimumSize(new Dimension(0, 0));
													pnlGrid.add(lbl, cc.xy(5, layout.getRowCount()));
												}
											}
										} else if (type == 1) {
											// pnlGrid.add(lblKey, cc.xy(3, layout.getRowCount()));
											// pnlGrid.add(txtValue, cc.xy(4, layout.getRowCount()));
											// pnlGrid.add(new JLabel(txtValue.getToolTipText()),
											// cc.xy(6, layout.getRowCount()));
										}
									}
								}
							}
						} else if (doMode == 1) {
							if (s.contains(" ")) {
								String[] arr = s.split(" ");
								if (arr != null && arr.length > 0) {
									String key = arr[0];
									if (arr.length > 1) {
										String valueWithComment = arr[1];
										JLabel lblKey = new JLabel(key.trim() + ":");
										JTextField txtValue = new JTextField(valueWithComment.trim());
										layout.appendRow(RowSpec.decode("fill:pref"));
										if (type == 0) {
											pnlGrid.add(lblKey, cc.xy(1, layout.getRowCount()));
											pnlGrid.add(txtValue, cc.xy(3, layout.getRowCount()));
										} else if (type == 1) {
										}
									}
								}
							}
						}
					}
				}
				br.close();
				return pnlGrid;
			}

			public void showSupportedFileTypes(List<String> fileTypes) {
				mdlLstSupportedFileTypes.removeAllElements();
				for (String s : fileTypes) {
					mdlLstSupportedFileTypes.addElement(s);
				}
			}

			private void initComponents() {
				txtPath.setMinimumSize(new Dimension(0, 0)); // do not delete
				// that line.
				// otherwise
				// text doesnt
				// wrap
				// correctly

				spGeneralSettings = new JCustomScrollPane(createGeneralSettingsPanel());
				//				spGeneralSettings.setBorder(BorderFactory.createEmptyBorder());
				spGeneralSettings.getVerticalScrollBar().setUnitIncrement(16);

				spEmulatorConfiguration = new JCustomScrollPane(createGeneralSettingsPanel());
				spEmulatorConfiguration.getVerticalScrollBar().setUnitIncrement(16);


				spInputConfiguration = new JCustomScrollPane(createInputConfigurationPanel());
				//				spInputConfiguration.setBorder(BorderFactory.createEmptyBorder());
				spInputConfiguration.getVerticalScrollBar().setUnitIncrement(16);

				//				tpMain.setUI(new CustomTabbedPaneUI());
				//				tpMain.setBorder(BorderFactory.createEmptyBorder());
				tpMain.addTab(Messages.get(MessageConstants.GENERAL), spGeneralSettings);
				tpMain.addTab(Messages.get(MessageConstants.CONFIGURE), spEmulatorConfiguration);
				tpMain.addTab(Messages.get(MessageConstants.GRAPHICS), new JPanel());
				tpMain.addTab(Messages.get(MessageConstants.INPUT), spInputConfiguration);
				tpMain.addTab(Messages.get(MessageConstants.PLUGINS), new JPanel());
				tpMain.addTab(Messages.get(MessageConstants.ADVANCED), pnlConfigurationFile);
				tpMain.setTabPlacement(SwingConstants.TOP);
				tpMain.setTabLayoutPolicy(JTabbedPane.SCROLL_TAB_LAYOUT);
				txtConfigurationFile.setEditable(false);
				tpMain.setVisible(false);
				//					@Override
				//					public void mouseClicked(MouseEvent e) {
				//						if (e.getSource() == lnkWebsite) {
				//							if (Desktop.isDesktopSupported()) {
				//								try {
				//									Desktop.getDesktop().browse(new URI(lnkWebsite.getToolTipText()));
				//								} catch (IOException e1) {
				//									// TODO Auto-generated catch block
				//									e1.printStackTrace();
				//								} catch (URISyntaxException e1) {
				//									// TODO Auto-generated catch block
				//									e1.printStackTrace();
				//								}
				//							}
				//						} else if (e.getSource() == lnkRunEmulator) {
				//							try {
				//								String emulatorPath = lnkRunEmulator.getToolTipText();
				//								String emulatorPathNoFile = FilenameUtils.getFullPath(emulatorPath);
				//								Runtime.getRuntime().exec(emulatorPath, null, new File(emulatorPathNoFile));
				//							} catch (IOException e1) {
				//								String message = "Failed to start the emulator.\n\n"
				//										+ "Detailed error message:";
				//								String title = "Cannot run emulator";
				//								JTextArea txt = new JTextArea(e1.getMessage());
				//								txt.setLineWrap(true);
				//								txt.setWrapStyleWord(false);
				//								Object[] obj = {
				//										message,
				//										txt
				//								};
				//								JOptionPane.showConfirmDialog(lnkRunEmulator, obj, title, JOptionPane.ERROR_MESSAGE);
				//							}
				//						}
				//					}

				btnFileChooser.addActionListener(new ActionListener() {

					@Override
					public void actionPerformed(ActionEvent e) {
						// JFileChooser fc = new JFileChooser();
						File dirOrFile = new File(txtConfigFilePath.getText());
						// fc.setSelectedFile(dirOrFile);
						// int result = fc.showOpenDialog(spConfigurationFile);
						// if (result == JFileChooser.APPROVE_OPTION) {
						// txtConfigFilePath.setText(fc.getSelectedFile().getAbsolutePath());
						// try {
						// String configFilePath = txtConfigFilePath.getText();
						// Component pnl =
						// pnlEmulatorConfiguration.showConfigurationFilePanel(configFilePath);
						// spConfigurationFile.setViewportView(pnl);
						// } catch (FileNotFoundException e1) {
						// e1.printStackTrace();
						// } catch (IOException e1) {
						// e1.printStackTrace();
						// }
						// }

						showFileChooser(dirOrFile);
					}
				});
			}

			private void showFileChooser(File dirOrFile) {
				if (fcSetCover == null) {
					fcSetCover = new XFileDialog(Messages.get(MessageConstants.CHOOSE_CONFIGURATION_FILE));
					fcSetCover.setMode2(FileDialog.LOAD);
				}
				String dir = (dirOrFile.isFile() ? FilenameUtils.getFullPathNoEndSeparator(dirOrFile.getAbsolutePath())
						: dirOrFile.getAbsolutePath());
				fcSetCover.setDirectory2(dir);
				String filename = fcSetCover.getFile();
				if (filename != null && !filename.trim().isEmpty()) {
					String dirr = fcSetCover.getDirectory();
					filename = dirr + (dirr.endsWith(File.separator) ? "" : File.separator) + filename;
					txtConfigFilePath.setText(filename);
					try {
						String configFilePath = txtConfigFilePath.getText();
						Component pnl = pnlEmulatorConfiguration.showConfigurationFilePanel(configFilePath);
						spConfigurationFile.setViewportView(pnl);
					} catch (FileNotFoundException e1) {
						e1.printStackTrace();
					} catch (IOException e1) {
						e1.printStackTrace();
					}
				}
				fcSetCover.dispose();
			}

			private Component createGeneralSettingsPanel() {
				pnlGeneralSettings = new JPanel();
				pnlGeneralSettings.setOpaque(false);
				pnlGeneralSettings.setBorder(Paddings.TABBED_DIALOG);
				FormLayout layout = new FormLayout("default, min, min:grow", "fill:min:grow");
				CellConstraints cc = new CellConstraints();
				pnlGeneralSettings.setLayout(layout);
				pnlGeneralSettings.add(createGeneralSettingsPanel2(), cc.xyw(1, 1, layout.getColumnCount()));
				return pnlGeneralSettings;
			}

			private Component createGeneralSettingsPanel2() {
				FormLayout layout = new FormLayout("default, $ugap, min:grow",
						"fill:pref, $rgap, fill:min:grow, $ugap, fill:min:grow, $ugap, fill:min:grow");
				// layout.setRowGroup(9, 13);
				JPanel pnl = new JPanel(layout);
				pnl.setOpaque(false);
				pnl.add(new JLabel("<html><strong>Supported filetypes</strong></html>"), CC.xy(1, 1));
				pnl.add(pnlSupportedFileTypes, CC.xywh(1, 3, 1, layout.getRowCount()-2));
				pnl.add(new JLabel("<html><strong>Startup parameters</strong></html>"), CC.xy(3, 1));
				pnl.add(pnlCommandLineArguments, CC.xy(3, 3));
				pnl.add(pnlRunCommandsBefore, CC.xy(3, 5));
				pnl.add(pnlGameCodeRegexes, CC.xy(3, 7));
				return pnl;
			}

			private Component createInputConfigurationPanel() {
				pnlInputConfiguration = new JPanel();
				pnlInputConfiguration.setOpaque(false);
				pnlInputConfiguration.setBorder(Paddings.TABBED_DIALOG);
				pnlInputConfiguration.setLayout(new BorderLayout(20, 20));
				pnlInputConfiguration.add(createTopPanel(), BorderLayout.NORTH);
				pnlInputConfiguration.add(createLeftPanel(), BorderLayout.WEST);
				pnlInputConfiguration.add(createRightPanel(), BorderLayout.EAST);
				pnlInputConfiguration.add(createBottomPanel(), BorderLayout.SOUTH);
				pnlInputConfiguration.add(createCenterPanel(), BorderLayout.CENTER);
				return pnlInputConfiguration;
			}

			private Component createCenterPanel() {
				JPanel pnl = new JPanel(new BorderLayout());
				pnl.setOpaque(false);
				JCustomButtonNew btnGamePad = new JCustomButtonNew("Drop an image of a controller here", ImageUtil.getFlatSVGIconFrom(Icons.get("gamepadXbox"), 128, ColorStore.current().getColor(ColorConstants.SVG_NO_COLOR)));
				btnGamePad.setHorizontalTextPosition(SwingConstants.CENTER);
				btnGamePad.setVerticalTextPosition(SwingUtilities.TOP);
				pnl.add(btnGamePad);
				return pnl;
			}

			private Component createBottomPanel() {
				JPanel pnl = new JPanel();
				pnl.setOpaque(false);
				return pnl;
			}

			private Component createRightPanel() {
				buttonsRight = new ArrayList<>();
				buttonsRight.add("X");
				buttonsRight.add("Y");
				buttonsRight.add("B");
				buttonsRight.add("A");

				JPanel pnl3 = new JPanel(new BorderLayout());
				pnl3.setOpaque(false);
				FormLayout layout = new FormLayout("pref, $rgap, $button",
						"min:grow, fill:pref, $rgap, fill:pref, $rgap, fill:pref, $rgap, fill:pref, min:grow");
				JPanel pnl4 = new JPanel(layout);
				pnl4.setOpaque(false);
				pnl4.setBorder(BorderFactory.createTitledBorder("Buttons"));
				CellConstraints cc = new CellConstraints();

				int x = 1;
				int y = 2;
				for (String btn : buttonsRight) {
					JTextComponent txt = createInputTextField();
					pnl4.add(new JLabel(btn), cc.xy(x, y));
					pnl4.add(txt, cc.xy(x + 2, y));
					y += 2;
				}
				pnl3.add(pnl4, BorderLayout.CENTER);
				return pnl3;
			}

			private Component createLeftPanel() {
				buttonsLeft = new ArrayList<>();
				buttonsLeft.add("Up");
				buttonsLeft.add("Left");
				buttonsLeft.add("Down");
				buttonsLeft.add("Right");

				JPanel pnl = new JPanel(new BorderLayout());
				pnl.setOpaque(false);
				FormLayout layout = new FormLayout("pref, $rgap, pref",
						"min:grow, fill:pref, $rgap, fill:pref, $rgap, fill:pref, $rgap, fill:pref, min:grow");
				JPanel pnl4 = new JPanel(layout);
				pnl4.setOpaque(false);
				pnl4.setBorder(BorderFactory.createTitledBorder("Digital Pad"));
				CellConstraints cc = new CellConstraints();

				int x = 1;
				int y = 2;
				for (String btn : buttonsLeft) {
					JTextComponent txt = createInputTextField();
					pnl4.add(new JLabel(btn), cc.xy(x, y));
					pnl4.add(txt, cc.xy(x + 2, y));
					y += 2;
				}
				pnl.add(pnl4, BorderLayout.CENTER);
				return pnl;
			}

			private Component createTopPanel() {
				//				/* Create an event object for the underlying plugin to populate */
				//				Event event = new Event();
				//
				//				/* Get the available controllers */
				//				Controller[] controllers = ControllerEnvironment.getDefaultEnvironment().getControllers();
				//				for (int i = 0; i < controllers.length; i++) {
				//					/* Remember to poll each one */
				//					controllers[i].poll();
				//
				//					/* Get the controllers event queue */
				//					EventQueue queue = controllers[i].getEventQueue();
				//
				//					/* For each object in the queue */
				//					while (queue.getNextEvent(event)) {
				//						/* Get event component */
				//						net.java.games.input.Component comp = event.getComponent();
				//						/* Process event (your awesome code) */
				//						System.out.println(comp.getPollData());
				//					}
				//				}

				buttonsTop = new ArrayList<>();
				buttonsTop.add("Left shoulder");
				buttonsTop.add("Right Shoulder");
				buttonsTop.add("Select");
				buttonsTop.add("Start");
				JPanel pnl0 = new JPanel(new BorderLayout());
				pnl0.setOpaque(false);
				FormLayout layout = new FormLayout("pref, $rgap, pref, $rgap, pref, $rgap, pref",
						"fill:pref, $ugap, fill:pref, $lgap, fill:pref");
				JPanel pnl1 = new JPanel(layout);
				pnl1.setOpaque(false);
				CellConstraints cc = new CellConstraints();

				JComboBox<String> cmbPlayer = new JComboBox<>();
				cmbPlayer.addItem("Player 1");
				cmbPlayer.addItem("Player 2");
				cmbPlayer.addItem("Player 3");
				cmbPlayer.addItem("Player 4");
				JComboBox<String> cmbController = new JComboBox<>();
				cmbController.addItem("Keyboard/Mouse");
				pnl1.add(cmbPlayer, cc.xyw(1, 1, 3));
				pnl1.add(cmbController, cc.xyw(5, 1, 3));
				int x = 1;
				int y = 3;
				for (String btn : buttonsTop) {
					JTextComponent txt = createInputTextField();
					pnl1.add(new JLabel(btn), cc.xy(x, y));
					pnl1.add(txt, cc.xy(x += 2, y));
					if (x == layout.getColumnCount()) {
						x = 1;
						y += 2;
					} else {
						x += 2;
					}
				}
				pnl0.add(pnl1, BorderLayout.CENTER);
				return pnl0;
			}

			private void createUI() {
				add(tpMain);

				spCommandLineArguments = new JCustomScrollPane(txtCommandLineArguments);
				spCommandLineArguments.setOpaque(false);
				spCommandLineArguments.getViewport().setOpaque(false);
				pnlCommandLineArguments.setOpaque(false);
				pnlCommandLineArguments.add(spCommandLineArguments);

				spRunCommandsBefore = new JCustomScrollPane(txtRunCommandsBefore);
				pnlRunCommandsBefore.add(spRunCommandsBefore);

				spGameCodeRegexes = new JCustomScrollPane(txtGameCodeRegexes);
				pnlGameCodeRegexes.add(spGameCodeRegexes);

				spConfigurationFile = new JCustomScrollPane(null);
				spConfigurationFile.setOpaque(false);
				spConfigurationFile.getViewport().setOpaque(false);
				spConfigurationFile.getVerticalScrollBar().setUnitIncrement(16);
				spConfigurationFile.setBorder(BorderFactory.createEmptyBorder());

				FormLayout layout = new FormLayout("min:grow",
						"fill:default:grow, $lgap, fill:pref");
				pnlConfigurationFile.setLayout(layout);
				CellConstraints cc = new CellConstraints();

				pnlConfigurationFile.setOpaque(false);
				pnlConfigurationFile.setBorder(Paddings.TABBED_DIALOG);
				pnlConfigurationFile.add(spConfigurationFile, cc.xy(1, 1));

				JPanel pnlConfigFilePath = new JPanel(new BorderLayout());
				pnlConfigFilePath.setOpaque(false);
				pnlConfigFilePath.add(new JLabel("File path: "), BorderLayout.WEST);
				txtConfigFilePath.setMinimumSize(new Dimension(0, 0));
				pnlConfigFilePath.add(txtConfigFilePath);
				pnlConfigFilePath.add(btnFileChooser, BorderLayout.EAST);
				pnlConfigurationFile.add(pnlConfigFilePath, cc.xy(1, 3));

				JScrollPane spSupportedFileTypes = new JCustomScrollPane(txtSupportedFileTypes);
				spSupportedFileTypes.setOpaque(false);
				spSupportedFileTypes.getViewport().setOpaque(false);
				pnlSupportedFileTypes.setOpaque(false);
				pnlSupportedFileTypes.add(spSupportedFileTypes);
			}

			public void setEmulator(Emulator emulator) {
				String name = emulator.getName();
				String path = emulator.getAbsolutePath();
				String website = emulator.getWebsite();
				String startParameters = emulator.getStartParameters();
				List<String> fileTypes = emulator.getSupportedFileTypes();
				String parent = new File(emulator.getAbsolutePath()).getParent();
				String configFilePathEdited = emulator.getConfigFilePath().replace("/", File.separator).trim();
				final String configFilePath = parent + ((configFilePathEdited.startsWith(File.separator))
						? configFilePathEdited : File.separator + configFilePathEdited);
				List<String> runCommandsBefore = emulator.getRunCommandsBefore();
				List<String> gameCodeRegexes = getSelectedPlatform().getGameCodeRegexes();
				showName(name);
				showPath(path);
				showEmulatorPath(path);
				showWebsite(website);
				showCommandLineArguments(startParameters);
				showRunCommandsBefore(runCommandsBefore);
				showGameCodeRegexes(gameCodeRegexes);
				txtConfigurationFile.setText("Loading file content...");
				txtConfigFilePath.setText(configFilePath);
				showSupportedFileTypes(fileTypes);
				try {
					// final String showConfigurationFile =
					// pnlEmulatorConfiguration.showConfigurationFile(configFilePath);
					final String showConfigurationFile = "";
					spConfigurationFile
					.setViewportView(showConfigurationFilePanel(configFilePath));

					if (!showConfigurationFile.isEmpty()) {
						txtConfigurationFile.setText(showConfigurationFile);
						txtConfigurationFile.setForeground(UIManager.getColor("Label.foreground"));
						txtConfigurationFile.setCaretPosition(0);
					}
				} catch (FileNotFoundException e1) {
					if (configFilePathEdited.isEmpty()) {
						txtConfigurationFile.setText("no configuration file available");
						txtConfigurationFile.getText().toLowerCase().indexOf("configuration");
						"configuration".length();
					} else {
						txtConfigurationFile.setText("Configuration file not exists at expected location.\r\n"
								+ "Maybe the file will be created when you start the emulator.\n\r\n\r"
								+ "Do the following:\n\r" + "* Start the emulator\n\r"
								+ "* then reload this view\r\n" + "or\n\r"
								+ "* set a new configuration file location");
						txtConfigurationFile.setForeground(Color.RED);
					}
				} catch (IOException e1) {
					txtConfigurationFile.setText("error reading configuration file\r\n" + configFilePath);
					txtConfigurationFile.setForeground(Color.RED);
				}
			}
		}

		public void adjustSplitPaneDividerLocations() {
			spl1.setDividerLocation(0.25);
		}

		public JTextComponent createInputTextField() {
			final JTextField txt = new JTextField("Unassigned");
			//			txt.setBackground(ValidationComponentUtils.getWarningBackground());
			txt.setEditable(false);
			txt.setHorizontalAlignment(SwingConstants.CENTER);
			txt.addFocusListener(new FocusListener() {

				@Override
				public void focusLost(FocusEvent e) {
					checkInput(txt);
				}

				@Override
				public void focusGained(FocusEvent e) {
					enterInput(txt);
				}
			});
			return txt;
		}

		protected void enterInput(final JTextComponent txt) {
			if (makeInput) {
				return;
			}
			makeInput = true;
			//			txt.setBackground(ValidationComponentUtils.getMandatoryBackground());
			txt.addKeyListener(new KeyAdapter() {
				@Override
				public void keyPressed(KeyEvent e) {
					super.keyPressed(e);
					String input = ""+e.getKeyChar();
					txt.setText(input.toUpperCase());
				}
			});
		}

		protected void checkInput(JTextComponent txt) {
			if (!makeInput) {
				return;
			}
			makeInput = false;
			txt.setBackground(UIManager.getColor("TextField.background"));
		}

		@Override
		public void valueChanged(ListSelectionEvent e) {
			if (e.getValueIsAdjusting()) {
				return;
			}
			int selectedRow = tblEmulators.getSelectedRow();
			boolean b = selectedRow != -1;
			btnRemoveEmulator.setEnabled(b);
			lnkRunEmulator.setVisible(b);
			lnkWebsite.setVisible(b);
			pnlEmulatorConfiguration.tpMain.setVisible(b);
			if (b) {
				EmulatorTableModel model = (EmulatorTableModel) tblEmulators.getModel();
				Emulator emulator = (Emulator) model.getValueAt(tblEmulators.convertRowIndexToModel(selectedRow), -1);
				Platform platform = pnlPlatforms.lstPlatforms.getSelectedValue();
				boolean defaultEmulator = platform.getDefaultEmulator() == emulator;
				pnlEmulators.btnSetDefaultEmulator.setEnabled(!defaultEmulator);
				pnlEmulatorConfiguration.setEmulator(emulator);
			} else {
				btnSetDefaultEmulator.setEnabled(false);
				pnlEmulatorConfiguration.txtCommandLineArguments.setText("");
				pnlEmulatorConfiguration.txtConfigurationFile.setText("");
				pnlEmulatorConfiguration.mdlLstSupportedFileTypes.removeAllElements();
			}
			btnEmulatorProperties.setEnabled(b);
			UIUtil.revalidateAndRepaint(pnlEmulatorConfiguration.tpMain);
		}

		public void setEmulators(List<BroEmulator> emulators) {
			EmulatorTableModel model = new EmulatorTableModel(emulators);
			for (BroEmulator emu : emulators) {
				model.addRow(emu);
			}
		}

		public void emulatorAdded(EmulatorEvent e) {
			EmulatorTableModel emulatorModel = emulatorModels.get(e.getPlatform().getId());
			if (emulatorModel != null) {
				emulatorModel.addRow(e.getEmulator());
			}
		}

		public void emulatorRemoved(EmulatorEvent e) {
			EmulatorTableModel emulatorModel = emulatorModels.get(e.getPlatform().getId());
			if (emulatorModel != null) {
				emulatorModel.removeEmulator(e.getEmulator());
			}
		}

		public void platformSelected(Platform selectedPlatform) {
			//			spl1.setTopComponent(pnlAvailableEmulators);
			//			spl1.setBottomComponent(null);
			//			pnlPlatformsEmulatorsComboWrapper.removeAll();
			//			pnlPlatformsEmulatorsComboWrapper.add(pnlPlatforms, BorderLayout.CENTER);
			//			pnlPlatforms.btnAddPlatform.setVisible(true);
			//			pnlPlatforms.btnRemovePlatform.setVisible(true);
			//			pnlPlatforms.btnEditPlatform.setVisible(true);
			//			btnSetDefaultEmulator.setVisible(true);
			//			btnEmulatorProperties.setVisible(true);
			if (selectedPlatform != null) {
				int platformId = selectedPlatform.getId();
				if (!emulatorModels.containsKey(platformId)) {
					List<BroEmulator> emulators = selectedPlatform.getEmulators();
					EmulatorTableModel model = new EmulatorTableModel(emulators);
					emulatorModels.put(platformId, model);
					tblEmulators.setModel(model);
				} else {
					EmulatorTableModel model = emulatorModels.get(platformId);
					tblEmulators.setModel(model);
				}
				doModelShit();

				if (pnlNoPlatformSelected.isVisible()) {
					pnlNoPlatformSelected.setVisible(false);
					pnlEmulatorOverview.setVisible(true);
					remove(pnlNoPlatformSelected);
					add(pnlEmulatorOverview);
				}
			} else {
				lastTopComponent = spl1.getTopComponent();
				if (!pnlNoPlatformSelected.isVisible()) {
					pnlNoPlatformSelected.setVisible(true);
					pnlEmulatorOverview.setVisible(false);
					pnlAddEmulator.setVisible(false);
					remove(pnlEmulatorOverview);
					add(pnlNoPlatformSelected);
				}
			}
			UIUtil.revalidateAndRepaint(this);
			boolean selected = selectedPlatform != null;
			btnAddEmulator.setEnabled(selected);
		}

		private void doModelShit() {
			int selectedIndex = pnlPlatforms.lstPlatforms.getSelectedIndex();
			if (selectedIndex != -1) {
				TableColumnModel tcm = tblEmulators.getColumnModel();
				ListModel<Platform> model2 = pnlPlatforms.lstPlatforms.getModel();
				Platform platform = model2.getElementAt(selectedIndex);
				DefaultTableCellRenderer renderer = new EmulatorTableCellRenderer(platform);
				tcm.getColumn(1).setCellRenderer(renderer);
				TableCellRenderer renderer2 = tblEmulators.getTableHeader().getDefaultRenderer();
				((JLabel) renderer2).setHorizontalAlignment(SwingConstants.LEFT);
				tblEmulators.getTableHeader().setDefaultRenderer(renderer2);
				TableColumn column0 = tcm.getColumn(0);
				TableColumnAdjuster adjuster = new TableColumnAdjuster(tblEmulators);
				adjuster.adjustColumn(0);
				adjuster.adjustColumn(1);
				column0.setResizable(false);
				tblEmulators.setAutoResizeMode(JTable.AUTO_RESIZE_LAST_COLUMN);
			}
		}

		@Override
		public void actionPerformed(ActionEvent e) {
			if (e.getSource() == btnAddEmulator) {
				showAddEmulatorPanel(pnlPlatforms.lstPlatforms.getSelectedValue());
			}
		}

		private void showDefaultEmulatorsForPlatform(Platform platform) {
			int platformId = platform.getId();
			if (!defaultEmulatorModels.containsKey(platformId)) {
				ListModel<Emulator> lstMdlDefaultEmulators = new DefaultListModel<>();
				for (Emulator emu : platform.getEmulators()) {
					if (!emu.isInstalled()) {
						((DefaultListModel<Emulator>) lstMdlDefaultEmulators).addElement(emu);
					}
				}
				pnlAddEmulator.setListModel(lstMdlDefaultEmulators);
				defaultEmulatorModels.put(platformId, lstMdlDefaultEmulators);
			} else {
				ListModel<Emulator> lstMdlDefaultEmulators = defaultEmulatorModels.get(platformId);
				pnlAddEmulator.setListModel(lstMdlDefaultEmulators);
			}
		}

		public void showAddEmulatorPanel(Platform platform) {
			if (platform != null) {
				// TODO dirty workaround for repaint. change it some time
				remove(pnlEmulatorOverview);
				add(pnlAddEmulator);
				showDefaultEmulatorsForPlatform(platform);
				UIUtil.revalidateAndRepaint(this);
			}
		}

		public int getEmulatorIndex(Emulator emulator) {
			EmulatorTableModel model = (EmulatorTableModel) tblEmulators.getModel();
			for (int i = 0; i < model.getRowCount(); i++) {
				if (emulator == model.getEmulator(i)) {
					return i;
				}
			}
			return -1;
		}
	}

	class CheckBoxHeader extends JCheckBox implements TableCellRenderer {
		private static final long serialVersionUID = 1L;

		protected CheckBoxHeader rendererComponent;
		protected int column;
		protected boolean mousePressed = false;

		public CheckBoxHeader(ItemListener itemListener) {
			rendererComponent = this;
			rendererComponent.addItemListener(itemListener);
		}

		@Override
		public Component getTableCellRendererComponent(JTable table, Object value, boolean isSelected, boolean hasFocus,
				int row, int column) {
			if (table != null) {
				JTableHeader header = table.getTableHeader();
				if (header != null) {
					rendererComponent.setForeground(header.getForeground());
					rendererComponent.setBackground(header.getBackground());
					rendererComponent.setFont(header.getFont());
				}
			}
			setColumn(column);
			rendererComponent.setText("");
			setBorder(UIManager.getBorder("TableHeader.cellBorder"));
			return rendererComponent;
		}

		protected void setColumn(int column) {
			this.column = column;
		}

		public int getColumn() {
			return column;
		}
	}

	class FileSystemModel implements TreeModel {
		private File root;

		private Vector<TreeModelListener> listeners = new Vector<TreeModelListener>();

		public FileSystemModel(File rootDirectory) {
			root = rootDirectory;
		}

		@Override
		public Object getRoot() {
			return root;
		}

		@Override
		public Object getChild(Object parent, int index) {
			File directory = (File) parent;
			String[] children = directory.list();
			return new TreeFile(directory, children[index]);
		}

		@Override
		public int getChildCount(Object parent) {
			File file = (File) parent;
			if (file.isDirectory()) {
				String[] fileList = file.list();
				if (fileList != null) {
					return file.list().length;
				}
			}
			return 0;
		}

		@Override
		public boolean isLeaf(Object node) {
			File file = (File) node;
			return file.isFile();
		}

		@Override
		public int getIndexOfChild(Object parent, Object child) {
			File directory = (File) parent;
			File file = (File) child;
			String[] children = directory.list();
			for (int i = 0; i < children.length; i++) {
				if (file.getName().equals(children[i])) {
					return i;
				}
			}
			return -1;
		}

		@Override
		public void valueForPathChanged(TreePath path, Object value) {
			File oldFile = (File) path.getLastPathComponent();
			String fileParentPath = oldFile.getParent();
			String newFileName = (String) value;
			File targetFile = new File(fileParentPath, newFileName);
			oldFile.renameTo(targetFile);
			File parent = new File(fileParentPath);
			int[] changedChildrenIndices = { getIndexOfChild(parent, targetFile) };
			Object[] changedChildren = { targetFile };
			fireTreeNodesChanged(path.getParentPath(), changedChildrenIndices, changedChildren);

		}

		private void fireTreeNodesChanged(TreePath parentPath, int[] indices, Object[] children) {
			TreeModelEvent event = new TreeModelEvent(this, parentPath, indices, children);
			Iterator iterator = listeners.iterator();
			TreeModelListener listener = null;
			while (iterator.hasNext()) {
				listener = (TreeModelListener) iterator.next();
				listener.treeNodesChanged(event);
			}
		}

		@Override
		public void addTreeModelListener(TreeModelListener listener) {
			listeners.add(listener);
		}

		@Override
		public void removeTreeModelListener(TreeModelListener listener) {
			listeners.remove(listener);
		}

		private class TreeFile extends File {
			public TreeFile(File parent, String child) {
				super(parent, child);
			}

			@Override
			public String toString() {
				return getName();
			}
		}
	}

	public void showAddEmulatorPanel() {
		pnlEmulators.showAddEmulatorPanel(pnlPlatforms.lstPlatforms.getSelectedValue());
	}

	public void configureEmulator(Platform platform, Emulator emulator) {
		EmulatorTableModel model = (EmulatorTableModel) pnlEmulators.tblEmulators.getModel();
		//			Emulator emulator = (Emulator) model.getValueAt(tblEmulators.convertRowIndexToModel(selectedRow), -1);
		Emulator defaultEmulator = platform.getDefaultEmulator();

		pnlPlatforms.lstPlatforms.setSelectedValue(platform, true);
		int index = -1;
		if (emulator != null) {
			index = pnlEmulators.getEmulatorIndex(emulator);
		} else {
			index = (defaultEmulator == null) ? -1
					: pnlEmulators.getEmulatorIndex(defaultEmulator);
		}
		if (index < 1 || index > pnlEmulators.tblEmulators.getRowCount() + 1) {
			pnlEmulators.btnAddEmulator.requestFocusInWindow();
			pnlEmulators.tblEmulators.clearSelection();
		} else {
			pnlEmulators.btnEmulatorProperties.requestFocusInWindow();
			pnlEmulators.tblEmulators.setRowSelectionInterval(index, index);
		}
	}

	public void addDefaultEmulatorListener(DefaultEmulatorListener l) {
		pnlEmulators.addDefaultEmulatorListener(l);
	}

	public void addDownloadEmulatorListener(ActionListener l) {
		pnlEmulators.pnlAddEmulator.addDownloadEmulatorListener(l);
	}

	public void addDownloadEmulatorListener(MouseListener l) {
		pnlEmulators.pnlAddEmulator.addDownloadEmulatorListener(l);
	}

	public void addSearchForEmulatorListener(ActionListener l) {
		pnlEmulators.pnlAddEmulator.addSearchForEmulatorListener(l);
	}
}