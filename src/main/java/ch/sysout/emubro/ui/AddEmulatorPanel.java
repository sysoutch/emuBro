package ch.sysout.emubro.ui;

import java.awt.BorderLayout;
import java.awt.Desktop;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.awt.event.FocusAdapter;
import java.awt.event.FocusEvent;
import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;
import java.beans.PropertyChangeEvent;
import java.beans.PropertyChangeListener;
import java.io.File;
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
import javax.swing.JSplitPane;
import javax.swing.JTextField;
import javax.swing.ListModel;
import javax.swing.SwingConstants;
import javax.swing.event.ListSelectionEvent;
import javax.swing.event.ListSelectionListener;

import com.jgoodies.forms.factories.Paddings;
import com.jgoodies.forms.layout.CellConstraints;
import com.jgoodies.forms.layout.FormLayout;

import ch.sysout.emubro.api.model.Emulator;
import ch.sysout.emubro.controller.BroController.EmulatorListCellRenderer;
import ch.sysout.emubro.impl.model.GameConstants;
import ch.sysout.ui.ImageUtil;
import ch.sysout.util.Icons;
import ch.sysout.util.ScreenSizeUtil;
import ch.sysout.util.UIUtil;

public class AddEmulatorPanel extends JPanel {
	private static final long serialVersionUID = 1L;

	private AbstractButton btnBack;
	private SupportedEmulatorsPanel pnlSupportedEmulators;
	private ReadyToInstallEmulatorsPanel pnlReadyToInstallEmulators;

	private AbstractButton btnDownloadEmulators = new JButton("Download emulators");

	protected int minimumDividerLocation = -1;

	public AddEmulatorPanel() {
		super(new BorderLayout(0, 10));
		int size = ScreenSizeUtil.is3k() ? 24 : 16;
		JPanel pnlTop = new JPanel(new BorderLayout());
		btnBack = new JButton("Back to overview", ImageUtil.getImageIconFrom(Icons.get("previous2", size, size)));
		pnlTop.add(btnBack, BorderLayout.WEST);
		add(pnlTop, BorderLayout.NORTH);
		pnlSupportedEmulators = new SupportedEmulatorsPanel();
		pnlReadyToInstallEmulators = new ReadyToInstallEmulatorsPanel();
		JSplitPane spl = new JSplitPane();
		spl.setBorder(BorderFactory.createEmptyBorder());
		spl.setContinuousLayout(true);
		spl.setOrientation(JSplitPane.VERTICAL_SPLIT);
		spl.setResizeWeight(0.0d);
		spl.setTopComponent(btnDownloadEmulators);
		spl.setBottomComponent(pnlReadyToInstallEmulators);
		add(spl);

		PropertyChangeListener listener = new PropertyChangeListener() {
			@Override
			public void propertyChange(PropertyChangeEvent e) {
				int val = (int) e.getNewValue();
				if (val <= spl.getMinimumDividerLocation()) {
					if (spl.getTopComponent() != btnDownloadEmulators) {
						minimumDividerLocation = spl.getMinimumDividerLocation();
						spl.setTopComponent(btnDownloadEmulators);
						spl.setDividerLocation(spl.getMinimumDividerLocation());
					}
				} else {
					if (spl.getTopComponent() != pnlSupportedEmulators) {
						spl.setTopComponent(pnlSupportedEmulators);
						if (minimumDividerLocation != -1) {
							spl.setDividerLocation(minimumDividerLocation);
						}
					}
				}
			}
		};
		spl.addPropertyChangeListener(JSplitPane.DIVIDER_LOCATION_PROPERTY, listener);

		btnDownloadEmulators.addActionListener(new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				spl.setTopComponent(pnlSupportedEmulators);
				spl.setResizeWeight(0.5d);
			}
		});
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
			lstSupportedEmulators.addMouseListener(new MouseAdapter() {
				@Override
				public void mouseClicked(MouseEvent e) {
					super.mouseClicked(e);
					if (e.getClickCount() == 2) {
						Emulator selectedEmulator = lstSupportedEmulators.getSelectedValue();
						if (selectedEmulator != null) {
							openWebsite(selectedEmulator.getWebsite());
						}
					}
				}
			});
			btnDownloadEmulator = new JButton("Download emulator");
			btnDownloadEmulator.setHorizontalAlignment(SwingConstants.LEFT);
			btnDownloadEmulator.setEnabled(false);
			UIUtil.doHover(false, btnDownloadEmulator);
			btnDownloadEmulator.addActionListener(this);
			btnDownloadEmulator.addMouseListener(UIUtil.getMouseAdapter());
			btnDownloadEmulator.addFocusListener(new FocusAdapter() {
				@Override
				public void focusGained(FocusEvent e) {
					super.focusGained(e);
					AbstractButton source = (AbstractButton) e.getSource();
					UIUtil.doHover(true, source);
				}

				@Override
				public void focusLost(FocusEvent e) {
					super.focusLost(e);
					AbstractButton source = (AbstractButton) e.getSource();
					UIUtil.doHover(false, source);
				}
			});
			int rowHeight = ScreenSizeUtil.adjustValueToResolution(32);
			lstSupportedEmulators.setFixedCellHeight(rowHeight);
			spSupportedEmulators = new JScrollPane(lstSupportedEmulators);
		}

		private void createUI() {
			setBorder(BorderFactory.createTitledBorder("Title"));
			setLayout(new BorderLayout());
			FormLayout layout = new FormLayout("min:grow, min, pref",
					"fill:default:grow, $rgap, fill:pref");
			CellConstraints cc = new CellConstraints();
			JPanel pnl = new JPanel(layout);
			pnl.setBorder(Paddings.TABBED_DIALOG);
			pnl.add(spSupportedEmulators, cc.xyw(1, 1, layout.getColumnCount()));
			pnl.add(btnDownloadEmulator, cc.xy(1, 3));
			add(pnl);
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
				Emulator selectedEmulator = lstSupportedEmulators.getSelectedValue();
				if (selectedEmulator != null) {
					openWebsite(selectedEmulator.getWebsite());
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
			String userHome = System.getProperty("user.home");
			txtSearchForEmulator = new JTextField(userHome + File.separator + "Downloads");
			btnSearchForEmulator = new JButton("Scan now");
			btnSearchForEmulator.setHorizontalAlignment(SwingConstants.LEFT);
			btnSearchForEmulator.setEnabled(false);
			btnAddEmulator.setHorizontalAlignment(SwingConstants.RIGHT);
			btnAddEmulator.setEnabled(false);
			UIUtil.doHover(false, btnSearchForEmulator, btnAddEmulator);
			btnSearchForEmulator.addMouseListener(UIUtil.getMouseAdapter());
		}

		private void createUI() {
			FormLayout layout = new FormLayout("min, $lcgap, min:grow, $rgap, min, $rgap, min",
					"fill:default:grow, $lgap, fill:pref, $rgap, fill:pref");
			CellConstraints cc = new CellConstraints();
			setLayout(layout);
			setBorder(Paddings.TABBED_DIALOG);
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

	private void openWebsite(String website) {
		if (Desktop.isDesktopSupported()) {
			try {
				URI uri = new URI(website);
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
