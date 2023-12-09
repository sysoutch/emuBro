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
import javax.swing.JButton;
import javax.swing.JCheckBox;
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
import ch.sysout.emubro.api.TagListener;
import ch.sysout.emubro.api.event.EmulatorEvent;
import ch.sysout.emubro.api.event.PlatformEvent;
import ch.sysout.emubro.api.event.TagEvent;
import ch.sysout.emubro.api.model.Emulator;
import ch.sysout.emubro.api.model.Explorer;
import ch.sysout.emubro.api.model.Platform;
import ch.sysout.emubro.controller.BroController.EmulatorListCellRenderer;
import ch.sysout.emubro.controller.BroController.PlatformListCellRenderer;
import ch.sysout.emubro.impl.model.BroEmulator;
import ch.sysout.emubro.ui.ColorStore;
import ch.sysout.emubro.ui.JCustomScrollPane;
import ch.sysout.emubro.ui.WrapLayout;
import ch.sysout.emubro.ui.event.ThemeChangeEvent;
import ch.sysout.emubro.ui.listener.ThemeListener;
import ch.sysout.emubro.util.ColorConstants;
import ch.sysout.emubro.util.MessageConstants;
import ch.sysout.ui.util.ImageUtil;
import ch.sysout.ui.util.UIUtil;
import ch.sysout.util.Icons;
import ch.sysout.util.Messages;
import ch.sysout.util.ScreenSizeUtil;

public class PropertiesFrame extends JFrame implements PlatformListener, EmulatorListener, TagListener, ThemeListener {
	private static final long serialVersionUID = 1L;

	private JTabbedPane tpMain = new JTabbedPane();

	private ManagePlatformsPanel pnlManagePlatforms;
	private JPanel pnlInput = new JPanel();
	private AdvancedPropertiesPanel pnlAdvancedProperties;

	private Explorer explorer;

	private JPanel pnlMain;

	public PropertiesFrame(Explorer explorer) {
		super();
		this.explorer = explorer;
		setTitle(Messages.get(MessageConstants.SETTINGS));
		setIconImages(UIUtil.getApplicationIcons());
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
		setSize(width * 3, (int) (width * 1.75));
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
		pnlMain = new JPanel(new BorderLayout()) {
			private static final long serialVersionUID = 1L;

			//			@Override
			//			protected void paintComponent(Graphics g) {
			//				super.paintComponent(g);
			//				Graphics2D g2d = (Graphics2D) g.create();
			//				int panelWidth = getWidth();
			//				int panelHeight = getHeight();
			//				Theme currentTheme = IconStore.current().getCurrentTheme();
			//				if (currentTheme.getView().hasGradientPaint()) {
			//					GradientPaint p = currentTheme.getView().getGradientPaint();
			//					g2d.setPaint(p);
			//				} else if (currentTheme.getView().hasColor()) {
			//					g2d.setColor(currentTheme.getView().getColor());
			//				}
			//				g2d.fillRect(0, 0, panelWidth, panelHeight);
			//				g2d.dispose();
			//			}
		};
		pnlMain.setOpaque(false);
		pnlMain.setBorder(Paddings.TABBED_DIALOG);
		JScrollPane spTabGeneral = new JCustomScrollPane(pnlManagePlatforms);
		JScrollPane spTabInput = new JCustomScrollPane(pnlInput);
		JScrollPane spTab2 = new JCustomScrollPane(pnlAdvancedProperties);
		spTabGeneral.setBorder(BorderFactory.createEmptyBorder());
		spTab2.setBorder(BorderFactory.createEmptyBorder());

		spTabGeneral.getVerticalScrollBar().setUnitIncrement(16);
		spTab2.getVerticalScrollBar().setUnitIncrement(16);

		tpMain.addTab(Messages.get(MessageConstants.GENERAL), spTabGeneral);
		tpMain.addTab(Messages.get(MessageConstants.INPUT), spTabInput);
		tpMain.addTab(Messages.get(MessageConstants.ADVANCED), spTab2);
		//		tpMain.setEnabledAt(1, false);
		pnlMain.add(tpMain);
		add(pnlMain);
		pack();
	}

	public void addDefaultEmulatorListener(DefaultEmulatorListener l) {
		pnlManagePlatforms.addDefaultEmulatorListener(l);
	}

	public void addDownloadEmulatorListener(ActionListener l) {
		pnlManagePlatforms.addDownloadEmulatorListener(l);
	}

	public void addDownloadEmulatorListener(MouseListener l) {
		pnlManagePlatforms.addDownloadEmulatorListener(l);
	}

	public void addSearchForEmulatorListener(ActionListener l) {
		pnlManagePlatforms.addSearchForEmulatorListener(l);
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

	class AdvancedPropertiesPanel extends JPanel implements ActionListener {
		private static final long serialVersionUID = 1L;

		private static final int MINIMALIST_SETTINGS = 0;
		private static final int RECOMMENDED_SETTINGS = 1;
		private static final int HARDCORE_SETTINGS = 2;

		private String applicationTitle = Messages.get(MessageConstants.APPLICATION_TITLE);
		private JCheckBox chkShowConfigWizardOnStartup = new JCheckBox(Messages.get(MessageConstants.SHOW_CONFIG_WIZARD_ON_STARTUP));
		private JCheckBox chkQuickScanOnStartup = new JCheckBox(Messages.get(MessageConstants.QUICK_SCAN_ON_STARTUP));
		private JCheckBox chkSearchForUpdateOnStart = new JCheckBox(Messages.get(MessageConstants.SEARCH_FOR_UPDATES_ON_START));
		private JCheckBox chkDoNothingOnGameStart = new JCheckBox(Messages.get(MessageConstants.DO_NOTHING_ON_GAME_START));
		private JRadioButton rdbMinimizeAfterGameStart = new JRadioButton(
				Messages.get(MessageConstants.MINIMIZE_AFTER_GAME_START, applicationTitle));
		private JRadioButton rdbExitAfterGameStart = new JRadioButton(
				Messages.get(MessageConstants.EXIT_AFTER_GAME_START, applicationTitle));
		private JCheckBox chkDoNothingOnGameEnd = new JCheckBox(Messages.get(MessageConstants.DO_NOTHING_ON_GAME_END));
		private JRadioButton rdbRestoreAfterGameEnd = new JRadioButton(
				Messages.get(MessageConstants.RESTORE_AFTER_GAME_END, applicationTitle));
		private JRadioButton rdbExitAfterGameEnd = new JRadioButton(Messages.get(MessageConstants.EXIT_AFTER_GAME_END, applicationTitle));
		private JCheckBox chkLastGameEnd = new JCheckBox(Messages.get(MessageConstants.LAST_GAME_END));
		private JCheckBox chkRunOnBoot = new JCheckBox(Messages.get(MessageConstants.RUN_ON_BOOT, applicationTitle));
		//				private JCheckBox chkStartGameOnBoot = new JCheckBox(Messages.get(MessageConstants.START_GAME_ON_BOOT, applicationTitle));
		private JCheckBox chkAssociateFilesWithApplication = new JCheckBox(
				Messages.get(MessageConstants.ASSOCIATE_FILES_WITH_APPLICATION, applicationTitle));
		private JCheckBox chkAssociateAllPlatforms = new JCheckBox(Messages.get(MessageConstants.ASSOCIATE_ALL_PLATFORMS));
		private JCheckBox chkAutoAssociateNewPlatforms = new JCheckBox(Messages.get(MessageConstants.AUTO_ASSOCIATE_NEW_PLATFORMS));

		private ListModel<Platform> mdlLstAssociatePlatforms = new DefaultListModel<>();
		private JList<Platform> lstAssociatePlatforms = new JList<>(mdlLstAssociatePlatforms);
		private JScrollPane spAssociatePlatforms = new JCustomScrollPane(lstAssociatePlatforms);

		private JToggleButton btnMinimalist = new JToggleButton("Minimalist settings");
		private JToggleButton btnRecommended = new JToggleButton("Recommended settings");
		private JToggleButton btnHardcore = new JToggleButton("Hardcore settings");

		private JCheckBox chkRunExternalTools = new JCheckBox(Messages.get(MessageConstants.RUN_EXTERNAL_TOOLS));
		private DefaultListModel<String> mdlLstTools = new DefaultListModel<>();
		private JList<String> lstTools = new JList<>(mdlLstTools);
		private JScrollPane spExternalTools = new JCustomScrollPane(lstTools);

		public AdvancedPropertiesPanel() {
			super();
			initComponents();
			createUI();
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
			pnl.setBorder(BorderFactory.createTitledBorder(Messages.get(MessageConstants.ON_BOOT)));
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
			lstTools.setEnabled(false);
			mdlLstTools.addElement("SCP Server Setup");
			mdlLstTools.addElement("TocaEdit X360 Controller Emulator");

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
			pnl.setBorder(BorderFactory.createTitledBorder(Messages.get(MessageConstants.ON_APPLICATION_STARTUP, applicationTitle)));
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
			pnl.setBorder(BorderFactory.createTitledBorder(Messages.get(MessageConstants.ON_GAME_START)));
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
			pnl.setBorder(BorderFactory.createTitledBorder(Messages.get(MessageConstants.ON_GAME_END)));
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

	public void addRemoveEmulatorListener2(ActionListener l) {
		pnlManagePlatforms.addRemoveEmulatorListener(l);
	}

	public void addOpenEmulatorPropertiesPanelListener(ActionListener l) {
		pnlManagePlatforms.addOpenEmulatorPropertiesPanelListener(l);
	}

	public void addOpenEmulatorPropertiesPanelListener2(MouseListener l) {
		pnlManagePlatforms.addOpenEmulatorPropertiesPanelListener2(l);
	}

	public void addRunEmulatorListener(ActionListener l) {
		pnlManagePlatforms.addRunEmulatorListener(l);
	}

	public void addOpenWebsiteListener(ActionListener l) {
		pnlManagePlatforms.addOpenWebsiteListener(l);
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

	@Override
	public void tagAdded(TagEvent e) {
	}

	@Override
	public void tagRemoved(TagEvent e) {
	}

	public Emulator getSelectedEmulator() {
		return pnlManagePlatforms.getSelectedEmulator();
	}

	public Emulator getSelectedDownloadEmulator() {
		return pnlManagePlatforms.getSelectedDownloadEmulator();
	}

	public JPanel getMainPanel() {
		return pnlMain;
	}

	@Override
	public void themeChanged(ThemeChangeEvent e) {
		setIconImages(UIUtil.getApplicationIcons());
	}
}
