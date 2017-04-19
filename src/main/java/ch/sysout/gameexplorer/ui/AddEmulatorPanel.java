package ch.sysout.gameexplorer.ui;

import java.awt.BorderLayout;
import java.awt.Desktop;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.io.IOException;
import java.net.URI;
import java.net.URISyntaxException;

import javax.swing.AbstractButton;
import javax.swing.BorderFactory;
import javax.swing.JButton;
import javax.swing.JLabel;
import javax.swing.JList;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.JTextField;
import javax.swing.ListModel;
import javax.swing.SwingConstants;
import javax.swing.event.ListSelectionEvent;
import javax.swing.event.ListSelectionListener;

import com.jgoodies.forms.layout.CellConstraints;
import com.jgoodies.forms.layout.FormLayout;

import ch.sysout.gameexplorer.api.model.Emulator;
import ch.sysout.gameexplorer.controller.BroController.EmulatorListCellRenderer;
import ch.sysout.gameexplorer.impl.model.GameConstants;
import ch.sysout.util.Icons;
import ch.sysout.util.ScreenSizeUtil;

public class AddEmulatorPanel extends JPanel {
	private static final long serialVersionUID = 1L;

	private AbstractButton btnBack;
	private SupportedEmulatorsPanel pnlSupportedEmulators;
	private ReadyToInstallEmulatorsPanel pnlReadyToInstallEmulators;

	public AddEmulatorPanel() {
		super(new BorderLayout());
		int size = ScreenSizeUtil.is3k() ? 24 : 16;
		JPanel pnlTop = new JPanel(new BorderLayout());
		btnBack = new JButton("Back to overview", ImageUtil.getImageIconFrom(Icons.get("previous2", size, size)));
		pnlTop.add(btnBack, BorderLayout.WEST);
		add(pnlTop, BorderLayout.NORTH);
		pnlSupportedEmulators = new SupportedEmulatorsPanel();
		pnlReadyToInstallEmulators = new ReadyToInstallEmulatorsPanel();
		JPanel pnl = new JPanel(new BorderLayout());

		pnlSupportedEmulators.setBorder(BorderFactory.createTitledBorder("Supported emulators"));
		pnl.add(pnlSupportedEmulators, BorderLayout.NORTH);
		pnl.add(pnlReadyToInstallEmulators, BorderLayout.CENTER);
		add(pnl);
	}

	public void setListModel(ListModel<Emulator> model) {
		pnlSupportedEmulators.lstSupportedEmulators.setModel(model);
	}

	public void setEmulatorListCellRenderer(EmulatorListCellRenderer l) {
		pnlSupportedEmulators.lstSupportedEmulators.setCellRenderer(l);
		pnlReadyToInstallEmulators.lstReadyToAddEmulators.setCellRenderer(l);
	}

	public void addGoBackListener(ActionListener l) {
		btnBack.addActionListener(l);
	}

	public class SupportedEmulatorsPanel extends JPanel implements ListSelectionListener, ActionListener {
		private static final long serialVersionUID = 1L;

		private JList<Emulator> lstSupportedEmulators = new JList<>();
		private JScrollPane spSupportedEmulators;
		private JButton btnDownloadEmulator;

		public SupportedEmulatorsPanel() {
			initComponents();
			createUI();
		}

		private void initComponents() {
			lstSupportedEmulators.addListSelectionListener(this);
			btnDownloadEmulator = new JButton("Download emulator");
			btnDownloadEmulator.setHorizontalAlignment(SwingConstants.LEFT);
			btnDownloadEmulator.setEnabled(false);
			btnDownloadEmulator.setBorderPainted(false);
			btnDownloadEmulator.setContentAreaFilled(false);
			btnDownloadEmulator.addActionListener(this);
			int rowHeight = ScreenSizeUtil.adjustValueToResolution(32);
			lstSupportedEmulators.setFixedCellHeight(rowHeight);
			spSupportedEmulators = new JScrollPane(lstSupportedEmulators);
		}

		private void createUI() {
			FormLayout layout = new FormLayout("min:grow, min, pref",
					"fill:default:grow, $rgap, fill:pref");
			CellConstraints cc = new CellConstraints();
			setLayout(layout);
			add(spSupportedEmulators, cc.xyw(1, 1, layout.getColumnCount()));
			add(btnDownloadEmulator, cc.xy(1, 3));
		}

		@Override
		public void valueChanged(ListSelectionEvent e) {
			if (!e.getValueIsAdjusting()) {
				e.getSource();

				int index = lstSupportedEmulators.getSelectedIndex();
				boolean b = index != GameConstants.NO_GAME;
				Emulator emulator = null;
				if (b) {
					emulator = lstSupportedEmulators.getSelectedValue();
				}
				btnDownloadEmulator.setEnabled(b);
				//			for (GameListener l : listeners) {
				//				l.gameSelected(event);
				//			}
			}
		}

		@Override
		public void actionPerformed(ActionEvent e) {
			if (e.getSource() == btnDownloadEmulator) {
				if (Desktop.isDesktopSupported()) {
					try {
						URI uri = new URI(lstSupportedEmulators.getSelectedValue().getWebsite());
						Desktop.getDesktop().browse(uri);
					} catch (IOException e1) {
						// TODO Auto-generated catch block
						e1.printStackTrace();
					} catch (URISyntaxException e1) {
						// TODO Auto-generated catch block
						e1.printStackTrace();
					}
				}
			}
		}
	}

	public class ReadyToInstallEmulatorsPanel extends JPanel implements ListSelectionListener {
		private static final long serialVersionUID = 1L;

		private JList<Emulator> lstReadyToAddEmulators = new JList<>();
		private JScrollPane spReadyToAddEmulators;
		private JLabel lblSearchForEmulator;
		private JTextField txtSearchForEmulator;
		private JButton btnSearchForEmulator;
		private AbstractButton btnAddEmulator;

		public ReadyToInstallEmulatorsPanel() {
			initComponents();
			createUI();
		}

		private void initComponents() {
			lstReadyToAddEmulators.addListSelectionListener(this);

			int rowHeight = ScreenSizeUtil.adjustValueToResolution(32);
			lstReadyToAddEmulators.setFixedCellHeight(rowHeight);
			spReadyToAddEmulators = new JScrollPane(lstReadyToAddEmulators);
			btnAddEmulator = new JButton("Add emulator", ImageUtil.getImageIconFrom(Icons.get("add", 24, 24)));
			lblSearchForEmulator = new JLabel("Scan folder for emulators:");
			txtSearchForEmulator = new JTextField("downloads");
			btnSearchForEmulator = new JButton("Scan now");
			btnSearchForEmulator.setHorizontalAlignment(SwingConstants.LEFT);
			btnSearchForEmulator.setEnabled(false);
			btnSearchForEmulator.setBorderPainted(false);
			btnSearchForEmulator.setContentAreaFilled(false);
			btnAddEmulator.setHorizontalAlignment(SwingConstants.RIGHT);
			btnAddEmulator.setEnabled(false);
			btnAddEmulator.setBorderPainted(false);
			btnAddEmulator.setContentAreaFilled(false);
		}

		private void createUI() {
			FormLayout layout = new FormLayout("min, $lcgap, min:grow, $rgap, min, $rgap, min",
					"fill:default:grow, $lgap, fill:pref, $rgap, fill:pref");
			CellConstraints cc = new CellConstraints();
			setLayout(layout);
			add(spReadyToAddEmulators, cc.xyw(1, 1, layout.getColumnCount()));
			add(lblSearchForEmulator, cc.xy(1, 3));
			add(txtSearchForEmulator, cc.xy(3, 3));
			add(btnSearchForEmulator, cc.xy(5, 3));
			add(btnAddEmulator, cc.xy(7, 5));
		}

		@Override
		public void valueChanged(ListSelectionEvent e) {
			// TODO Auto-generated method stub

		}
	}
}
