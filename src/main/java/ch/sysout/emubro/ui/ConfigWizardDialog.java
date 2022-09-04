package ch.sysout.emubro.ui;

import java.awt.BorderLayout;
import java.awt.Image;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.util.ArrayList;
import java.util.List;

import javax.swing.AbstractButton;
import javax.swing.JButton;
import javax.swing.JCheckBox;
import javax.swing.JDialog;
import javax.swing.JLabel;
import javax.swing.JPanel;
import javax.swing.JSeparator;
import javax.swing.SwingConstants;
import javax.swing.UIManager;
import javax.swing.WindowConstants;

import com.jgoodies.forms.factories.Paddings;
import com.jgoodies.forms.layout.CellConstraints;
import com.jgoodies.forms.layout.FormLayout;
import com.jgoodies.forms.layout.RowSpec;

import ch.sysout.emubro.api.model.Explorer;
import ch.sysout.emubro.impl.BroConfigWizardListener;
import ch.sysout.emubro.util.MessageConstants;
import ch.sysout.ui.util.ImageUtil;
import ch.sysout.ui.util.UIUtil;
import ch.sysout.util.Icons;
import ch.sysout.util.Messages;

public class ConfigWizardDialog extends JDialog implements ActionListener {
	private static final long serialVersionUID = 1L;

	private static final String HEADER_TITLE = "<html><h2>" + Messages.get("applicationTitle")
	+ " Konfigurations-Assistent</h2></html>";

	private JPanel pnlHeader = new JPanel();
	private JPanel pnlNavigation = new JPanel();
	private JPanel pnlContent = new JPanel();
	private JPanel pnlFooter = new JPanel();

	private JLabel lblStep1 = new JLabel(Messages.get(MessageConstants.WELCOME));
	private JLinkButton lnkStep2 = new JLinkButton(Messages.get(MessageConstants.PLATFORMS));
	private JLinkButton lnkStep3 = new JLinkButton(Messages.get(MessageConstants.EMULATORS));
	private JLinkButton lnkStep4 = new JLinkButton(Messages.get(MessageConstants.FINISH));

	private JCheckBox chkShowOnStart = new JCheckBox("Assistenten beim Start anzeigen");

	private JButton btnBack = new JCustomButton("< Zurück");
	private JButton btnForward = new JCustomButton("Weiter >");
	private JButton btnCancel = new JCustomButton("Abbrechen");

	private JPanel[] contentPanels = {
			// new ManageEmulatorsPanel(new GameExplorer()),
			new GeneralConfigPanel(), new PlatformConfigPanel(), new EmulatorConfigPanel(), new FinishConfigPanel() };

	private JPanel currentContentPanel = contentPanels[0];

	private List<BroConfigWizardListener> listeners = new ArrayList<>();

	private Explorer explorer;

	private AbstractButton btnDiscord = new JCustomButton(ImageUtil.getImageIconFrom(Icons.get("discordBanner")));
	private AbstractButton btnReddit = new JCustomButton(ImageUtil.getImageIconFrom(Icons.get("redditBanner")));

	private JPanel pnlSocialWrapper;

	private FormLayout layout;

	public ConfigWizardDialog(Explorer explorer) {
		super();
		this.explorer = explorer;
		setTitle(Messages.get("configureWizard", Messages.get("applicationTitle")));
		setDefaultCloseOperation(WindowConstants.DO_NOTHING_ON_CLOSE);
		setModalityType(ModalityType.APPLICATION_MODAL);
		setIconImages(getIcons());
		initComponents();
		createUI();
		btnForward.requestFocusInWindow();
		setSize(getWidth(), (int) (getWidth() * 0.75));
		setMinimumSize(getSize());
		setLocationRelativeTo(null);
	}

	private List<Image> getIcons() {
		List<Image> icons = new ArrayList<>();
		int[] sizes = { 24, 16 };
		for (int s : sizes) {
			icons.add(ImageUtil.getImageIconFrom(Icons.get("configWizard", s, s)).getImage());
		}
		return icons;
	}

	private void initComponents() {
		btnBack.setVisible(false);
		addListeners();
	}

	private void addListeners() {
		addActionListeners(chkShowOnStart, btnBack, btnForward);
	}

	private void addActionListeners(AbstractButton... buttons) {
		for (AbstractButton btn : buttons) {
			btn.addActionListener(this);
		}
	}

	private void createUI() {
		layout = new FormLayout("pref, min, min:grow",
				"pref, min, fill:pref, min, top:pref:grow, min, pref");
		JPanel pnlMain = new JPanel(layout) {
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
		CellConstraints cc = new CellConstraints();
		pnlMain.add(pnlHeader, cc.xyw(1, 1, layout.getColumnCount()));
		pnlMain.add(new JSeparator(), cc.xyw(1, 2, layout.getColumnCount()));
		pnlMain.add(pnlNavigation, cc.xy(1, 3));
		pnlMain.add(new JSeparator(SwingConstants.VERTICAL), cc.xywh(2, 3, 1, layout.getRowCount()-4));
		pnlContent.setLayout(new BorderLayout());
		pnlContent.setOpaque(false);
		pnlMain.add(pnlContent, cc.xy(3, 3));

		pnlSocialWrapper = new JPanel(new BorderLayout());
		pnlSocialWrapper.setOpaque(false);
		JPanel pnlSocial = new JPanel();
		pnlSocial.setOpaque(false);
		pnlSocial.add(btnDiscord);
		pnlSocial.add(btnReddit);
		pnlSocialWrapper.add(pnlSocial, BorderLayout.WEST);

		pnlMain.add(pnlSocialWrapper, cc.xy(3, 5));
		pnlMain.add(new JSeparator(), cc.xyw(1, 6, layout.getColumnCount()));
		pnlMain.add(pnlFooter, cc.xyw(1, 7, layout.getColumnCount()));

		createHeaderUI();
		createNavigationUI();
		createFooterUI();

		setBorders();

		pnlContent.add(currentContentPanel);
		add(pnlMain);
		pack();
	}

	private void createHeaderUI() {
		FormLayout layout = new FormLayout("pref, $ugap, pref:grow", "pref, pref");
		pnlHeader.setLayout(layout);

		CellConstraints cc = new CellConstraints();
		JLabel lblIcon = new JLabel(ImageUtil.getImageIconFrom(Icons.get("applicationIcon", 48, 48)));
		pnlHeader.add(lblIcon, cc.xy(1, 1));

		pnlHeader.add(new JLabel(HEADER_TITLE), cc.xy(3, 1));

		pnlHeader.setBackground(UIManager.getColor("List.background"));
	}

	private void createNavigationUI() {
		FormLayout layoutNavigation = new FormLayout("pref, $ugap",
				"pref, $ugap, pref, $ugap, pref, $ugap, pref, $ugap, pref, $ugap:grow");
		pnlNavigation.setLayout(layoutNavigation);
		pnlNavigation.setOpaque(false);
		CellConstraints cc = new CellConstraints();
		pnlNavigation.add(lblStep1, cc.xy(1, 1));
		pnlNavigation.add(lnkStep2, cc.xy(1, 3));
		pnlNavigation.add(lnkStep3, cc.xy(1, 5));
		pnlNavigation.add(lnkStep4, cc.xy(1, 7));
	}

	private void createFooterUI() {
		FormLayout layoutFooter = new FormLayout("pref, $ugap:grow, $button, $rgap, $button, $ugap, $ugap, $button",
				"pref");
		// layoutFooter.setColumnGroup(3, 5);
		pnlFooter.setLayout(layoutFooter);
		pnlFooter.setOpaque(false);

		CellConstraints cc = new CellConstraints();
		chkShowOnStart.setOpaque(false);
		pnlFooter.add(chkShowOnStart, cc.xy(1, 1));
		pnlFooter.add(btnBack, cc.xy(3, 1));
		pnlFooter.add(btnForward, cc.xy(5, 1));
		pnlFooter.add(btnCancel, cc.xy(8, 1));
	}

	private void setBorders() {
		pnlHeader.setBorder(Paddings.DIALOG);
		pnlNavigation.setBorder(Paddings.DIALOG);
		pnlContent.setBorder(Paddings.DIALOG);
		pnlFooter.setBorder(Paddings.DIALOG);
	}

	@Override
	public void actionPerformed(ActionEvent e) {
		Object source = e.getSource();
		if (source == btnBack) {
			for (int i = contentPanels.length - 1; i > 0; i--) {
				if (currentContentPanel == contentPanels[i]) {
					pnlContent.remove(currentContentPanel);
					currentContentPanel = contentPanels[i - 1];
					break;
				}
			}
			pnlContent.add(currentContentPanel);
			UIUtil.revalidateAndRepaint(this);
			boolean notFirstPanel = currentContentPanel != contentPanels[0];
			adjustLayout(notFirstPanel);
			btnBack.setVisible(notFirstPanel);
			btnForward.setText("Weiter >");
		} else if (source == btnForward) {
			for (int i = 0; i < contentPanels.length - 1; i++) {
				if (currentContentPanel == contentPanels[i]) {
					pnlContent.remove(currentContentPanel);
					currentContentPanel = contentPanels[i + 1];
					break;
				}
			}
			pnlContent.add(currentContentPanel);
			UIUtil.revalidateAndRepaint(this);
			boolean notFirstPanel = currentContentPanel != contentPanels[0];
			adjustLayout(notFirstPanel);
			btnBack.setVisible(notFirstPanel);
			btnForward.setText(
					(currentContentPanel != contentPanels[contentPanels.length - 1]) ? "Weiter >" : "Fertigstellen");
		}
	}

	private void adjustLayout(boolean notFirstPanel) {
		String rowSpecContentString = "fill:pref:grow";
		String rowSpecContentString2 = "fill:pref";
		String rowSpecSocialString = "pref";
		String rowSpecSocialString2 = "top:pref:grow";
		RowSpec rowSpecContent = notFirstPanel ? RowSpec.decode(rowSpecContentString) : RowSpec.decode(rowSpecContentString2);
		RowSpec rowSpecSocial = notFirstPanel ? RowSpec.decode(rowSpecSocialString) : RowSpec.decode(rowSpecSocialString2);
		layout.setRowSpec(3, rowSpecContent);
		layout.setRowSpec(5, rowSpecSocial);
	}

	class GeneralConfigPanel extends JPanel {
		private static final long serialVersionUID = 1L;
		private String message = "<html>" + "<h3>Willkommen im " + Messages.get("applicationTitle")
		+ " Konfigurations-Assistenten</h3><p>"
		+ "Dieser Assistent führt dich durch die Konfiguration von " + Messages.get("applicationTitle")+"<p>"
		+ "<p><p>Wenn du Fragen, Probleme oder sonst was hast was du uns mitteilen willst, joine unseren <strong>Discord Server</strong> oder schau auf <strong>Reddit</strong> vorbei."
		+ "</html>";

		public GeneralConfigPanel() {
			super(new BorderLayout());
			setOpaque(false);
			JLabel textPane = new JLabel(message);
			add(textPane, BorderLayout.NORTH);
		}
	}

	class PlatformConfigPanel extends JPanel {
		private static final long serialVersionUID = 1L;

		private String message = "" + "<html>" + "<h3>Plattformen hinzufügen</h3>" + "<p>" + "</html>";

		public PlatformConfigPanel() {
			super();
			setOpaque(false);
			add(new JLabel(message));
		}
	}

	class EmulatorConfigPanel extends JPanel {

		private static final long serialVersionUID = 1L;

		private String message = "" + "<html>" + "<h3>Emulatoren hinzufügen</h3>" + "<p>" + "</html>";

		public EmulatorConfigPanel() {
			super();
			setOpaque(false);
			add(new JLabel(message));
		}
	}

	class CoverConfigPanel extends JPanel {

		private static final long serialVersionUID = 1L;

		private String message = "" + "<html>" + "<h3>Covers hinzufügen</h3>" + "<p>" + "</html>";

		public CoverConfigPanel() {
			super();
			add(new JLabel(message));
		}
	}

	class FinishConfigPanel extends JPanel {

		private static final long serialVersionUID = 1L;

		private String message = "" + "<html>" + "<h3>Konfiguration abgeschlossen</h3>" + "<p>" + "</html>";

		public FinishConfigPanel() {
			super();
			setOpaque(false);
			add(new JLabel(message));
		}
	}

	public boolean isShowOnStartSelected() {
		return chkShowOnStart.isSelected();
	}

	public void addExitConfigWizardListener(ActionListener l) {
		btnCancel.addActionListener(l);
	}

	public void addDiscordListener(ActionListener l) {
		btnDiscord.addActionListener(l);
	}

	public void addRedditListener(ActionListener l) {
		btnReddit.addActionListener(l);
	}
}
