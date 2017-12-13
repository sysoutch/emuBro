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

import ch.sysout.emubro.impl.BroConfigWizardListener;
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

	private JLabel lblStep1 = new JLabel2("Willkommen");
	private JLinkButton lnkStep2 = new JLinkButton("Emulatoren und Spiele");
	private JLinkButton lnkStep3 = new JLinkButton("Covers hinzufügen");
	private JLinkButton lnkStep4 = new JLinkButton("Fertigstellen");

	private JCheckBox chkDontShowAgain = new JCheckBox("Assistenten nicht mehr anzeigen");

	private JButton btnBack = new JButton("< Zurück");
	private JButton btnForward = new JButton("Weiter >");
	private JButton btnCancel = new JButton("Abbrechen");

	private JPanel[] contentPanels = {
			// new ManageEmulatorsPanel(new GameExplorer()),
			new GeneralConfigPanel(), new CoverConfigPanel(), new FinishConfigPanel() };

	private JPanel currentContentPanel = contentPanels[0];

	private List<BroConfigWizardListener> listeners = new ArrayList<>();

	public ConfigWizardDialog() {
		super();
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
		addActionListeners(chkDontShowAgain, btnBack, btnForward);
	}

	private void addActionListeners(AbstractButton... buttons) {
		for (AbstractButton btn : buttons) {
			btn.addActionListener(this);
		}
	}

	private void createUI() {
		FormLayout layout = new FormLayout("pref, min, pref:grow", "pref, min, fill:pref:grow, min, pref");
		setLayout(layout);

		CellConstraints cc = new CellConstraints();
		add(pnlHeader, cc.xyw(1, 1, layout.getColumnCount()));
		add(new JSeparator(), cc.xyw(1, 2, layout.getColumnCount()));
		add(pnlNavigation, cc.xy(1, 3));
		add(new JSeparator(SwingConstants.VERTICAL), cc.xy(2, 3));
		add(pnlContent, cc.xy(3, 3));
		add(new JSeparator(), cc.xyw(1, 4, layout.getColumnCount()));
		add(pnlFooter, cc.xyw(1, 5, layout.getColumnCount()));

		createHeaderUI();
		createNavigationUI();
		createFooterUI();

		setBorders();

		pnlContent.add(currentContentPanel);

		pack();
	}

	private void createHeaderUI() {
		FormLayout layout = new FormLayout("pref, $ugap, pref:grow", "pref, pref");
		pnlHeader.setLayout(layout);

		CellConstraints cc = new CellConstraints();
		JLabel lblIcon = new JLabel(ImageUtil.getImageIconFrom(Icons.get("applicationIcon", 48, 48)));
		pnlHeader.add(lblIcon, cc.xy(1, 1));

		pnlHeader.add(new JLabel2(HEADER_TITLE), cc.xy(3, 1));

		pnlHeader.setBackground(UIManager.getColor("List.background"));
	}

	private void createNavigationUI() {
		FormLayout layoutNavigation = new FormLayout("pref, $ugap",
				"pref, $ugap, pref, $ugap, pref, $ugap, pref, $ugap, pref, $ugap:grow");
		pnlNavigation.setLayout(layoutNavigation);

		CellConstraints cc = new CellConstraints();
		pnlNavigation.add(lblStep1, cc.xy(1, 1));
		pnlNavigation.add(lnkStep2, cc.xy(1, 3));
		pnlNavigation.add(lnkStep3, cc.xy(1, 5));
		pnlNavigation.add(lnkStep4, cc.xy(1, 7));

		pnlContent.setLayout(new BorderLayout());
	}

	private void createFooterUI() {
		FormLayout layoutFooter = new FormLayout("pref, $ugap:grow, $button, $rgap, $button, $ugap, $ugap, $button",
				"pref");
		// layoutFooter.setColumnGroup(3, 5);
		pnlFooter.setLayout(layoutFooter);

		CellConstraints cc = new CellConstraints();
		pnlFooter.add(chkDontShowAgain, cc.xy(1, 1));
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
			validate();
			repaint();

			btnBack.setVisible(currentContentPanel != contentPanels[0]);
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
			validate();
			repaint();

			btnBack.setVisible(currentContentPanel != contentPanels[0]);

			btnForward.setText(
					(currentContentPanel != contentPanels[contentPanels.length - 1]) ? "Weiter >" : "Fertigstellen");
		}
	}

	class GeneralConfigPanel extends JPanel {
		private static final long serialVersionUID = 1L;
		private String message = "<html>" + "<h3>Willkommen im " + Messages.get("applicationTitle")
				+ " Konfigurations-Assistenten</h3>" + "<p>"
				+ "Dieser Assistent führt dich durch die Konfiguration von " + Messages.get("applicationTitle")
				+ ".<p><p>" + "Klicke auf \"Weiter\" um fortzufahren oder \"Abbrechen\" um den Assistenten zu beenden."
				+ "</html>";

		public GeneralConfigPanel() {
			super();
			add(new JLabel2(message));
		}
	}

	class EmulatorConfigPanel extends JPanel {

		private static final long serialVersionUID = 1L;

		private String message = "" + "<html>" + "<h3>Emulatoren hinzufügen</h3>" + "<p>" + "</html>";

		public EmulatorConfigPanel() {
			super();
			add(new JLabel(message));
		}
	}

	class PlatformConfigPanel extends JPanel {
		private static final long serialVersionUID = 1L;

		private String message = "" + "<html>" + "<h3>Plattformen hinzufügen</h3>" + "<p>" + "</html>";

		public PlatformConfigPanel() {
			super();
			add(new JLabel2(message));
		}
	}

	class CoverConfigPanel extends JPanel {

		private static final long serialVersionUID = 1L;

		private String message = "" + "<html>" + "<h3>Covers hinzufügen</h3>" + "<p>" + "</html>";

		public CoverConfigPanel() {
			super();
			add(new JLabel2(message));
		}
	}

	class FinishConfigPanel extends JPanel {

		private static final long serialVersionUID = 1L;

		private String message = "" + "<html>" + "<h3>Konfiguration abgeschlossen</h3>" + "<p>" + "</html>";

		public FinishConfigPanel() {
			super();
			add(new JLabel2(message));
		}
	}

	public boolean isDontShowSelected() {
		return chkDontShowAgain.isSelected();
	}
}
