package ch.sysout.emubro.ui.properties;

import java.awt.BorderLayout;
import java.awt.FlowLayout;
import java.awt.Image;
import java.awt.Insets;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.awt.event.MouseListener;
import java.util.ArrayList;
import java.util.List;

import javax.swing.AbstractButton;
import javax.swing.Action;
import javax.swing.BorderFactory;
import javax.swing.ButtonGroup;
import javax.swing.DefaultListModel;
import javax.swing.ImageIcon;
import javax.swing.JButton;
import javax.swing.JCheckBox;
import javax.swing.JComponent;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JList;
import javax.swing.JPanel;
import javax.swing.JRadioButton;
import javax.swing.JScrollPane;
import javax.swing.JSeparator;
import javax.swing.JSplitPane;
import javax.swing.JTabbedPane;
import javax.swing.JToggleButton;
import javax.swing.ListModel;
import javax.swing.SwingConstants;
import javax.swing.WindowConstants;
import javax.swing.border.Border;
import javax.swing.border.EmptyBorder;
import javax.swing.event.ListSelectionListener;

import com.jgoodies.forms.factories.Paddings;
import com.jgoodies.forms.layout.CellConstraints;
import com.jgoodies.forms.layout.FormLayout;

import ch.sysout.emubro.api.EmulatorListener;
import ch.sysout.emubro.api.PlatformListener;
import ch.sysout.emubro.api.event.EmulatorEvent;
import ch.sysout.emubro.api.event.PlatformEvent;
import ch.sysout.emubro.api.model.Emulator;
import ch.sysout.emubro.api.model.Explorer;
import ch.sysout.emubro.api.model.Platform;
import ch.sysout.emubro.controller.BroController.EmulatorListCellRenderer;
import ch.sysout.emubro.controller.BroController.PlatformListCellRenderer;
import ch.sysout.emubro.impl.model.BroEmulator;
import ch.sysout.emubro.ui.WrapLayout;
import ch.sysout.util.Messages;
import ch.sysout.util.ScreenSizeUtil;

public class PropertiesFrame extends JFrame implements PlatformListener, EmulatorListener {
	private static final long serialVersionUID = 1L;

	private JTabbedPane tpMain = new JTabbedPane();

	private ManagePlatformsPanel pnlManagePlatforms;
	private AdvancedPropertiesPanel pnlAdvancedProperties;

	private JButton btnOk;
	private JButton btnCancel;
	private JButton btnApply;

	private boolean configurationChanged;

	private Explorer explorer;

	public PropertiesFrame(Explorer explorer) {
		super();
		this.explorer = explorer;
		setTitle(Messages.get("settings"));
		setIconImages(getIcons());
		setLayout(new BorderLayout());
		setDefaultCloseOperation(WindowConstants.DISPOSE_ON_CLOSE);
		initComponents();
		createUI();
		adjustSizeWhenNeeded();
	}

	public JSplitPane getSpl1() {
		return pnlManagePlatforms.getSpl1();
	}

	/**
	 * this method adjusts the window size when the window width is shorter than
	 * the window height.<br>
	 * it simply looks nicer when it's wider.
	 */
	public void adjustSizeWhenNeeded() {
		int width = getWidth();
		setSize((int) (width * 2.5), (int) (width * 1.75));
	}

	private List<Image> getIcons() {
		List<Image> icons = new ArrayList<>();
		String[] dimensions = { "192x192", "96x96", "72x72", "48x48", "32x32", "16x16" };
		for (String d : dimensions) {
			icons.add(new ImageIcon(getClass().getResource("/images/" + d + "/logo.png")).getImage());
		}
		return icons;
	}

	private void initComponents() {
		pnlManagePlatforms = new ManagePlatformsPanel(explorer);
		pnlAdvancedProperties = new AdvancedPropertiesPanel();
		tpMain.setTabPlacement(SwingConstants.TOP);
		addListeners();
	}

	private void addListeners() {
		// closeWindowAction.putValue(Action.ACCELERATOR_KEY,
		// KeyStroke.getKeyStroke("control W"));
		// closeWindowAction.putValue(Action.ACCELERATOR_KEY,
		// KeyStroke.getKeyStroke("ESCAPE"));
		// getRootPane().getActionMap().put("closeAction", closeWindowAction);
		// getRootPane().getInputMap(JComponent.WHEN_IN_FOCUSED_WINDOW).put((KeyStroke)
		// closeWindowAction.getValue(Action.ACCELERATOR_KEY), "closeAction");
	}

	private void createUI() {
		JScrollPane spTab1 = new JScrollPane(pnlManagePlatforms);
		JScrollPane spTab2 = new JScrollPane(pnlAdvancedProperties);

		spTab1.setBorder(BorderFactory.createEmptyBorder());
		spTab2.setBorder(BorderFactory.createEmptyBorder());

		spTab1.getVerticalScrollBar().setUnitIncrement(16);
		spTab2.getVerticalScrollBar().setUnitIncrement(16);

		tpMain.addTab(Messages.get("general"), spTab1);
		tpMain.addTab(Messages.get("advanced"), spTab2);
		add(tpMain);

		FormLayout layout = new FormLayout("pref:grow, $button, $rgap, $button, $rgap, $button", "$ugap, default");
		JPanel pnl = new JPanel(layout);

		CellConstraints cc = new CellConstraints();
		pnl.add(btnOk = new JButton(Messages.get("ok")), cc.xy(2, 2));
		pnl.add(btnCancel = new JButton(Messages.get("cancel")), cc.xy(4, 2));
		pnl.add(btnApply = new JButton(Messages.get("apply")), cc.xy(6, 2));
		btnApply.setEnabled(false);
		add(pnl, BorderLayout.SOUTH);

		((JComponent) getContentPane()).setBorder(Paddings.TABBED_DIALOG);
		pack();
	}

	public void setPlatformListCellRenderer(PlatformListCellRenderer l) {
		pnlManagePlatforms.setPlatformListCellRenderer(l);
	}

	public void setEmulatorListCellRenderer(EmulatorListCellRenderer l) {
		pnlManagePlatforms.setEmulatorListCellRenderer(l);
	}

	public void addPlatformSelectedListener(ListSelectionListener l) {
		pnlManagePlatforms.addPlatformSelectedListener(l);
	}

	public void addRemovePlatformListener(Action l) {
		pnlManagePlatforms.addRemovePlatformListener(l);
	}

	public Platform getSelectedPlatform() {
		return pnlManagePlatforms.getSelectedPlatform();
	}

	public void addChangeConfigurationListener(ActionListener l) {
		pnlManagePlatforms.addChangeConfigurationListener(l);
		pnlAdvancedProperties.setChangeConfigurationListener(l);
	}

	public void addSaveConfigurationListener(ActionListener l) {
		btnApply.addActionListener(l);
	}

	public void setSaveAndExitConfigurationListener(ActionListener l) {
		btnOk.addActionListener(l);
	}

	public void setDiscardChangesAndExitListener(ActionListener l) {
		btnCancel.addActionListener(l);
	}

	class AdvancedPropertiesPanel extends JPanel implements ActionListener {
		private static final long serialVersionUID = 1L;

		private static final int MINIMALIST_SETTINGS = 0;
		private static final int RECOMMENDED_SETTINGS = 1;
		private static final int HARDCORE_SETTINGS = 2;

		private String applicationTitle = Messages.get("applicationTitle");
		private JCheckBox chkShowConfigWizardOnStartup = new JCheckBox(Messages.get("showConfigWizardOnStartup"));
		private JCheckBox chkQuickScanOnStartup = new JCheckBox(Messages.get("quickScanOnStartup"));
		private JCheckBox chkSearchForUpdateOnStart = new JCheckBox(Messages.get("searchForUpdatesOnStart"));
		private JCheckBox chkDoNothingOnGameStart = new JCheckBox(Messages.get("doNothingOnGameStart"));
		private JRadioButton rdbMinimizeAfterGameStart = new JRadioButton(
				Messages.get("minimizeAfterGameStart", applicationTitle));
		private JRadioButton rdbExitAfterGameStart = new JRadioButton(
				Messages.get("exitAfterGameStart", applicationTitle));
		private JCheckBox chkDoNothingOnGameEnd = new JCheckBox(Messages.get("doNothingOnGameEnd"));
		private JRadioButton rdbRestoreAfterGameEnd = new JRadioButton(
				Messages.get("restoreAfterGameEnd", applicationTitle));
		private JRadioButton rdbExitAfterGameEnd = new JRadioButton(Messages.get("exitAfterGameEnd", applicationTitle));
		private JCheckBox chkLastGameEnd = new JCheckBox(Messages.get("lastGameEnd"));
		private JCheckBox chkRunOnBoot = new JCheckBox(Messages.get("runOnBoot", applicationTitle));
		//		private JCheckBox chkStartGameOnBoot = new JCheckBox(Messages.get("startGameOnBoot", applicationTitle));
		private JCheckBox chkAssociateFilesWithApplication = new JCheckBox(
				Messages.get("associateFilesWithApplication", applicationTitle));
		private JCheckBox chkAssociateAllPlatforms = new JCheckBox(Messages.get("associateAllPlatforms"));
		private JCheckBox chkAutoAssociateNewPlatforms = new JCheckBox(Messages.get("autoAssociateNewPlatforms"));

		private ListModel<Platform> mdlLstAssociatePlatforms = new DefaultListModel<>();
		private JList<Platform> lstAssociatePlatforms = new JList<>(mdlLstAssociatePlatforms);
		private JScrollPane spAssociatePlatforms = new JScrollPane(lstAssociatePlatforms);

		private JToggleButton btnMinimalist = new JToggleButton("Minimalist settings");
		private JToggleButton btnRecommended = new JToggleButton("Recommended settings");
		private JToggleButton btnHardcore = new JToggleButton("Hardcore settings");

		private JCheckBox chkRunExternalTools = new JCheckBox(Messages.get("runExternalTools"));
		private JScrollPane spExternalTools = new JScrollPane();

		private JList<String> lstTools;

		public AdvancedPropertiesPanel() {
			super();
			initComponents();
			createUI();
		}

		public void setChangeConfigurationListener(ActionListener l) {
			btnMinimalist.addActionListener(l);
			btnRecommended.addActionListener(l);
			btnHardcore.addActionListener(l);
			chkAssociateAllPlatforms.addActionListener(l);
			chkAssociateFilesWithApplication.addActionListener(l);
			chkAutoAssociateNewPlatforms.addActionListener(l);
			chkDoNothingOnGameEnd.addActionListener(l);
			chkLastGameEnd.addActionListener(l);
			chkQuickScanOnStartup.addActionListener(l);
			chkRunOnBoot.addActionListener(l);
			chkSearchForUpdateOnStart.addActionListener(l);
			chkShowConfigWizardOnStartup.addActionListener(l);
			//			chkStartGameOnBoot.addActionListener(l);
			rdbExitAfterGameEnd.addActionListener(l);
			rdbExitAfterGameStart.addActionListener(l);
			rdbMinimizeAfterGameStart.addActionListener(l);
			rdbRestoreAfterGameEnd.addActionListener(l);
		}

		private void initComponents() {
			ButtonGroup grp = new ButtonGroup();
			grp.add(rdbMinimizeAfterGameStart);
			grp.add(rdbExitAfterGameStart);
			ButtonGroup grp2 = new ButtonGroup();
			grp2.add(rdbRestoreAfterGameEnd);
			grp2.add(rdbExitAfterGameEnd);
			addListeners();
		}

		private void addListeners() {
			ButtonGroup group = new ButtonGroup();
			group.add(btnMinimalist);
			group.add(btnRecommended);
			group.add(btnHardcore);

			btnMinimalist.addActionListener(this);
			btnRecommended.addActionListener(this);
			btnHardcore.addActionListener(this);
			chkRunExternalTools.addActionListener(this);
			chkDoNothingOnGameStart.addActionListener(this);
			chkDoNothingOnGameEnd.addActionListener(this);
			chkAssociateFilesWithApplication.addActionListener(this);
		}

		private void createUI() {
			FormLayout layout = new FormLayout("min:grow",
					"fill:pref, min, min, $pgap, fill:pref, $pgap, fill:pref, $pgap, fill:default, $pgap, fill:default, $pgap, fill:pref:grow");
			setLayout(layout);
			CellConstraints cc = new CellConstraints();
			Border border = Paddings.DLU4;
			int y = -1;
			int w = layout.getColumnCount();
			add(createDefaultSettingsPanel(border), cc.xyw(1, y += 2, w));
			add(new JSeparator(), cc.xyw(1, y += 2, w));
			add(createBootPanel(border), cc.xyw(1, y += 2, w));
			add(createStartupPanel(border), cc.xyw(1, y += 2, w));
			add(createGameStartPanel(border), cc.xy(1, y += 2));
			add(createGameEndPanel(border), cc.xy(1, y += 2));
			// add(createFileAssociationsPanel(border), cc.xyw(1, y+=2, w));
			setBorder(Paddings.DIALOG);
		}

		private JPanel createDefaultSettingsPanel(Border border) {
			// chkShowConfigWizardOnStartup.setBorder(new EmptyBorder(new
			// Insets(0, 0, 0, 50)));
			// chkQuickScanOnStartup.setBorder(new EmptyBorder(new Insets(0, 0,
			// 0, 50)));
			// chkSearchForUpdateOnStart.setBorder(new EmptyBorder(new Insets(0,
			// 0, 0, 50)));

			// FormLayout layout = new FormLayout("default",
			// "fill:pref, $lgap, fill:pref, $lgap, fill:pref");
			WrapLayout layout = new WrapLayout(FlowLayout.LEADING);
			layout.setHgap(0);
			JPanel pnlDefaultSettings = new JPanel(layout);
			pnlDefaultSettings.setBorder(border);
			// CellConstraints cc = new CellConstraints();
			pnlDefaultSettings.add(btnMinimalist);
			pnlDefaultSettings.add(btnRecommended);
			pnlDefaultSettings.add(btnHardcore);

			JPanel pnl = new JPanel(new BorderLayout());
			pnl.add(new JLabel("predefined settings"), BorderLayout.NORTH);
			// pnl.setBorder(BorderFactory.createTitledBorder(Messages.get("predefinedSettings")));
			pnl.add(pnlDefaultSettings);

			return pnl;
		}

		private JPanel createBootPanel(Border border) {
			// chkRunOnBoot.setBorder(new EmptyBorder(new Insets(0, 0, 0, 50)));

			// FormLayout layout = new FormLayout("default, $lcgap, default",
			// "fill:pref, $lgap, fill:pref");
			JPanel pnlBoot = new JPanel(new BorderLayout());
			pnlBoot.setBorder(border);
			// CellConstraints cc = new CellConstraints();
			pnlBoot.add(chkRunOnBoot, BorderLayout.NORTH);
			WrapLayout layout3 = new WrapLayout(FlowLayout.LEADING);
			layout3.setHgap(0);

			//			JPanel pnl3 = new JPanel(layout3);
			//			pnl3.setOpaque(false);
			//			pnl3.setBorder(BorderFactory.createEmptyBorder());
			//			pnl3.add(chkStartGameOnBoot);
			//			pnlBoot.add(pnl3);
			JPanel pnl = new JPanel(new BorderLayout());
			pnl.setBorder(BorderFactory.createTitledBorder(Messages.get("onBoot")));
			pnl.add(pnlBoot);

			// + chkRunOnBoot.getBorder().getBorderInsets(chkRunOnBoot).left

			// Border b = chkRunOnBoot.getBorder();
			// Insets insets = b.getBorderInsets(chkRunOnBoot);
			//
			// Border b2 = chkStartGameOnBoot.getBorder();
			// int left = ScreenSizeUtil.adjustValueToResolution(insets.left +
			// b2.getBorderInsets(chkStartGameOnBoot).left);
			//
			// chkRunOnBoot.setBorder(new EmptyBorder(
			// new Insets(insets.top,
			// left,
			// insets.bottom,
			// insets.right)
			// ));

			return pnl;
		}

		private JPanel createStartupPanel(Border border) {
			DefaultListModel<String> mdlLstTools = new DefaultListModel<>();
			lstTools = new JList<>(mdlLstTools);
			lstTools.setEnabled(false);
			mdlLstTools.addElement("SCP Server Setup");
			mdlLstTools.addElement("TocaEdit X360 Controller Emulator");
			spExternalTools.setViewportView(lstTools);

			// chkShowConfigWizardOnStartup.setBorder(new EmptyBorder(new
			// Insets(0, 0, 0, 50)));
			// chkQuickScanOnStartup.setBorder(new EmptyBorder(new Insets(0, 0,
			// 0, 50)));
			// chkSearchForUpdateOnStart.setBorder(new EmptyBorder(new Insets(0,
			// 0, 0, 50)));

			// FormLayout layout = new FormLayout("default",
			// "fill:pref, $lgap, fill:pref, $lgap, fill:pref");
			WrapLayout layout = new WrapLayout(FlowLayout.LEADING);
			layout.setHgap(0);
			JPanel pnlStartup = new JPanel(layout);
			pnlStartup.setBorder(border);
			// CellConstraints cc = new CellConstraints();
			pnlStartup.add(chkShowConfigWizardOnStartup);
			pnlStartup.add(chkQuickScanOnStartup);
			pnlStartup.add(chkSearchForUpdateOnStart);

			JPanel pnl = new JPanel(new BorderLayout());
			pnl.setBorder(BorderFactory.createTitledBorder(Messages.get("onApplicationStartup", applicationTitle)));
			pnl.add(pnlStartup);
			FormLayout layoutTools = new FormLayout("pref, min, min:grow", "fill:pref, $rgap, fill:default:grow");
			CellConstraints ccTools = new CellConstraints();
			JPanel pnlExternalTools = new JPanel(layoutTools);
			pnlExternalTools.add(chkRunExternalTools, ccTools.xy(1, 1));
			pnlExternalTools.add(spExternalTools, ccTools.xyw(1, 3, layoutTools.getColumnCount()));
			pnl.add(pnlExternalTools, BorderLayout.SOUTH);
			return pnl;
		}

		private JPanel createGameStartPanel(Border border) {
			// chkDoNothingOnGameStart.setBorder(new EmptyBorder(new Insets(0,
			// 0, 0, 50)));
			// rdbMinimizeAfterGameStart.setBorder(new EmptyBorder(new Insets(0,
			// 0, 0, 50)));
			// rdbExitAfterGameStart.setBorder(new EmptyBorder(new Insets(0, 0,
			// 0, 50)));

			JPanel pnl2 = new JPanel(new BorderLayout());
			pnl2.setBorder(border);
			pnl2.add(chkDoNothingOnGameStart, BorderLayout.NORTH);

			// FormLayout layout = new FormLayout("default",
			// "fill:pref, $lgap, fill:pref, $lgap, fill:pref");
			WrapLayout layout = new WrapLayout(FlowLayout.LEADING);
			JPanel pnlGameStart = new JPanel(layout);
			pnlGameStart.setOpaque(false);
			pnlGameStart.setBorder(border);
			// CellConstraints cc = new CellConstraints();
			pnlGameStart.add(rdbMinimizeAfterGameStart);
			pnlGameStart.add(rdbExitAfterGameStart);

			pnl2.add(pnlGameStart, BorderLayout.CENTER);
			JPanel pnl = new JPanel(new BorderLayout());
			pnl.setBorder(BorderFactory.createTitledBorder(Messages.get("onGameStart")));
			pnl.add(pnl2);

			return pnl;
		}

		private JPanel createGameEndPanel(Border border) {
			// chkDoNothingOnGameEnd.setBorder(new EmptyBorder(new Insets(0, 0,
			// 0, 50)));
			// rdbRestoreAfterGameEnd.setBorder(new EmptyBorder(new Insets(0, 0,
			// 0, 50)));
			// rdbExitAfterGameEnd.setBorder(new EmptyBorder(new Insets(0, 0, 0,
			// 50)));

			JPanel pnl2 = new JPanel(new BorderLayout());
			pnl2.setBorder(border);
			pnl2.add(chkDoNothingOnGameEnd, BorderLayout.NORTH);

			// FormLayout layout = new FormLayout("default",
			// "fill:pref, $lgap, fill:pref, $lgap, fill:pref");
			WrapLayout layout = new WrapLayout(FlowLayout.LEADING);
			JPanel pnlGameEnd = new JPanel(layout);
			pnlGameEnd.setOpaque(false);
			pnlGameEnd.setBorder(border);
			// CellConstraints cc = new CellConstraints();
			pnlGameEnd.add(rdbRestoreAfterGameEnd);
			pnlGameEnd.add(rdbExitAfterGameEnd);

			pnl2.add(pnlGameEnd, BorderLayout.CENTER);
			chkLastGameEnd.setBorder(border);
			pnl2.add(chkLastGameEnd, BorderLayout.SOUTH);

			JPanel pnl = new JPanel(new BorderLayout());
			pnl.setBorder(BorderFactory.createTitledBorder(Messages.get("onGameEnd")));
			pnl.add(pnl2);

			Border b = chkLastGameEnd.getBorder();
			Insets insets = b.getBorderInsets(chkLastGameEnd);

			Border b2 = rdbExitAfterGameEnd.getBorder();
			int left = ScreenSizeUtil
					.adjustValueToResolution(insets.left + b2.getBorderInsets(rdbExitAfterGameEnd).left);

			chkLastGameEnd.setBorder(new EmptyBorder(new Insets(0, insets.left + left, insets.bottom, insets.right)));

			return pnl;
		}

		@Override
		public void actionPerformed(ActionEvent e) {
			Object source = e.getSource();
			if (source == btnMinimalist) {
				setDefaultSettings(MINIMALIST_SETTINGS);

			}
			if (source == btnRecommended) {
				setDefaultSettings(RECOMMENDED_SETTINGS);

			} else if (source == btnHardcore) {
				setDefaultSettings(HARDCORE_SETTINGS);

			} else if (source == chkRunExternalTools) {
				boolean enable = ((AbstractButton) source).isSelected();
				lstTools.setEnabled(enable);

			} else if (source == chkDoNothingOnGameStart) {
				boolean enable = !((AbstractButton) source).isSelected();
				rdbMinimizeAfterGameStart.setEnabled(enable);
				rdbExitAfterGameStart.setEnabled(enable);

			} else if (source == chkDoNothingOnGameEnd) {
				boolean enable = !((AbstractButton) source).isSelected();
				rdbRestoreAfterGameEnd.setEnabled(enable);
				rdbExitAfterGameEnd.setEnabled(enable);
				chkLastGameEnd.setEnabled(enable);

			} else if (source == chkAssociateFilesWithApplication) {
				boolean enable = ((AbstractButton) source).isSelected();
				chkAssociateAllPlatforms.setEnabled(enable);
				chkAutoAssociateNewPlatforms.setEnabled(enable);
				spAssociatePlatforms.setEnabled(enable);
			}
		}

		private void setDefaultSettings(int defaultSettingsType) {
			boolean associateAllPlatforms = false;
			boolean autoAssociateNewPlatforms = false;
			boolean associateFilesWithApplication = false;
			boolean doNothingOnGameEnd = false;
			boolean doNothingOnGameStart = false;
			boolean quickScanOnStartup = false;
			boolean runOnBoot = false;
			boolean searchForUpdateOnStart = false;
			boolean showConfigWizardOnStartup = false;
			boolean startGameOnBoot = false;
			boolean lastGameEnd = false;
			boolean exitAfterGameEnd = false;
			boolean exitAfterGameStart = false;
			boolean minimizeAfterGameStart = false;
			boolean restoreAfterGameEnd = false;

			switch (defaultSettingsType) {
			case MINIMALIST_SETTINGS:
				associateAllPlatforms = false;
				autoAssociateNewPlatforms = false;
				associateFilesWithApplication = false;
				doNothingOnGameEnd = false;
				doNothingOnGameStart = false;
				quickScanOnStartup = false;
				runOnBoot = false;
				searchForUpdateOnStart = false;
				showConfigWizardOnStartup = false;
				startGameOnBoot = false;
				lastGameEnd = true;
				exitAfterGameEnd = true;
				exitAfterGameStart = true;
				minimizeAfterGameStart = true;
				restoreAfterGameEnd = true;
				break;
			case RECOMMENDED_SETTINGS:
				associateAllPlatforms = true;
				autoAssociateNewPlatforms = true;
				associateFilesWithApplication = true;
				doNothingOnGameEnd = false;
				doNothingOnGameStart = false;
				quickScanOnStartup = true;
				runOnBoot = false;
				searchForUpdateOnStart = true;
				showConfigWizardOnStartup = false;
				startGameOnBoot = false;
				lastGameEnd = true;
				exitAfterGameEnd = false;
				exitAfterGameStart = false;
				minimizeAfterGameStart = true;
				restoreAfterGameEnd = true;
				break;
			case HARDCORE_SETTINGS:
				associateAllPlatforms = true;
				autoAssociateNewPlatforms = true;
				associateFilesWithApplication = true;
				doNothingOnGameEnd = false;
				doNothingOnGameStart = false;
				quickScanOnStartup = true;
				runOnBoot = true;
				searchForUpdateOnStart = true;
				showConfigWizardOnStartup = false;
				startGameOnBoot = true;
				lastGameEnd = true;
				exitAfterGameEnd = false;
				exitAfterGameStart = false;
				minimizeAfterGameStart = true;
				restoreAfterGameEnd = true;
				break;
			}
			chkAssociateFilesWithApplication.setSelected(associateAllPlatforms);
			chkAssociateAllPlatforms.setSelected(autoAssociateNewPlatforms);
			chkAutoAssociateNewPlatforms.setSelected(associateFilesWithApplication);
			chkDoNothingOnGameEnd.setSelected(doNothingOnGameEnd);
			chkDoNothingOnGameStart.setSelected(doNothingOnGameStart);
			chkQuickScanOnStartup.setSelected(quickScanOnStartup);
			chkRunOnBoot.setSelected(runOnBoot);
			chkSearchForUpdateOnStart.setSelected(searchForUpdateOnStart);
			chkShowConfigWizardOnStartup.setSelected(showConfigWizardOnStartup);
			//			chkStartGameOnBoot.setSelected(startGameOnBoot);
			chkLastGameEnd.setSelected(lastGameEnd);
			rdbExitAfterGameEnd.setSelected(exitAfterGameEnd);
			rdbExitAfterGameStart.setSelected(exitAfterGameStart);
			rdbMinimizeAfterGameStart.setSelected(minimizeAfterGameStart);
			rdbRestoreAfterGameEnd.setSelected(restoreAfterGameEnd);

			chkAssociateAllPlatforms.setEnabled(associateFilesWithApplication);
			chkAutoAssociateNewPlatforms.setEnabled(associateFilesWithApplication);

			rdbMinimizeAfterGameStart.setEnabled(!doNothingOnGameStart);
			rdbExitAfterGameStart.setEnabled(!doNothingOnGameStart);

			rdbRestoreAfterGameEnd.setEnabled(!doNothingOnGameEnd);
			rdbExitAfterGameEnd.setEnabled(!doNothingOnGameEnd);
			chkLastGameEnd.setEnabled(!doNothingOnGameEnd);

		}

		public boolean isShowConfigWizardOnStartupChecked() {
			return chkShowConfigWizardOnStartup.isSelected();
		}

		public boolean isQuickScanOnStartupChecked() {
			return chkQuickScanOnStartup.isSelected();
		}

		public boolean isSearchForUpdateOnStartChecked() {
			return chkSearchForUpdateOnStart.isSelected();
		}

		public boolean isDoNothingOnGameStartChecked() {
			return chkDoNothingOnGameStart.isSelected();
		}

		public boolean isMinimizeAfterGameStartChecked() {
			return rdbMinimizeAfterGameStart.isSelected();
		}

		public boolean isExitAfterGameStartChecked() {
			return rdbExitAfterGameStart.isSelected();
		}

		public boolean isDoNothingOnGameEndChecked() {
			return chkDoNothingOnGameEnd.isSelected();
		}

		public boolean isRestoreAfterGameEndChecked() {
			return rdbRestoreAfterGameEnd.isSelected();
		}

		public boolean isExitAfterGameEndChecked() {
			return rdbExitAfterGameEnd.isSelected();
		}

		public boolean isLastGameEndChecked() {
			return chkLastGameEnd.isSelected();
		}

		public boolean isRunOnBootChecked() {
			return chkRunOnBoot.isSelected();
		}

		public boolean isStartGameOnBootChecked() {
			//			return chkStartGameOnBoot.isSelected();
			return false;
		}

		public boolean isAssociateFilesWithApplicationChecked() {
			return chkAssociateFilesWithApplication.isSelected();
		}

		public boolean isAssociateAllPlatformsChecked() {
			return chkAssociateAllPlatforms.isSelected();
		}

		public boolean isAutoAssociateNewPlatformsChecked() {
			return chkAutoAssociateNewPlatforms.isSelected();
		}
	}

	class PlatformPropertiesPanel extends JPanel {
		private static final long serialVersionUID = 1L;

		public PlatformPropertiesPanel() {
			super();
			createUI();
		}

		private void createUI() {
			FormLayout layout = new FormLayout("pref", "pref, $rgap, pref, $pgap, pref");
			setLayout(layout);
			new CellConstraints();
			setBorder(Paddings.DIALOG);
		}
	}

	public void adjustSplitPaneDividerSizes() {
		pnlManagePlatforms.adjustSplitPaneDividerSizes();
	}

	public boolean hasUnsavedChanges() {
		return configurationChanged;
	}

	public void configurationSaved() {
		configurationChanged = false;
		btnApply.setEnabled(false);
	}

	public void configurationChanged() {
		configurationChanged = true;
		btnApply.setEnabled(true);
	}

	public void adjustSplitPaneDividerLocations() {
		pnlManagePlatforms.adjustSplitPaneDividerLocations();
	}

	public void platformSelected(Platform selectedPlatform) {
		pnlManagePlatforms.platformSelected(selectedPlatform);
	}

	public void setPlatformListModel(ListModel<Platform> l) {
		pnlManagePlatforms.setPlatformListModel(l);
	}

	@Override
	public void platformAdded(PlatformEvent e) {
		pnlManagePlatforms.platformAdded(e);
	}

	@Override
	public void platformRemoved(PlatformEvent e) {
		pnlManagePlatforms.platformRemoved(e);
	}

	@Override
	public void emulatorAdded(EmulatorEvent e) {
		pnlManagePlatforms.emulatorAdded(e);
	}

	@Override
	public void emulatorRemoved(EmulatorEvent e) {
		pnlManagePlatforms.emulatorRemoved(e);
	}

	public void addRemoveEmulatorListener(Action l) {
		pnlManagePlatforms.addRemoveEmulatorListener(l);
	}

	public void addOpenEmulatorPropertiesPanelListener(ActionListener l) {
		pnlManagePlatforms.addOpenEmulatorPropertiesPanelListener(l);
	}

	public void addOpenEmulatorPropertiesPanelListener2(MouseListener l) {
		pnlManagePlatforms.addOpenEmulatorPropertiesPanelListener2(l);
	}

	public void setEmulators(List<BroEmulator> emulators) {
		pnlManagePlatforms.setEmulators(emulators);
	}

	public void showEmulatorPropertiesPanel(boolean b) {
		pnlManagePlatforms.showEmulatorPropertiesPanel(b);
	}

	public void configureEmulator(Platform platform, Emulator emulator) {
		tpMain.setSelectedIndex(0);
		pnlManagePlatforms.configureEmulator(platform, emulator);
	}
}
