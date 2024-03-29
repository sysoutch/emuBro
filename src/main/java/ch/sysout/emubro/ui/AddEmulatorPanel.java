package ch.sysout.emubro.ui;

import java.awt.BorderLayout;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.awt.event.FocusAdapter;
import java.awt.event.FocusEvent;
import java.awt.event.MouseListener;
import java.beans.PropertyChangeEvent;
import java.beans.PropertyChangeListener;
import java.io.File;

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
import ch.sysout.ui.util.ImageUtil;
import ch.sysout.ui.util.UIUtil;
import ch.sysout.util.Icons;
import ch.sysout.util.ScreenSizeUtil;
import ch.sysout.util.ValidationUtil;

public class AddEmulatorPanel extends JPanel {
	private static final long serialVersionUID = 1L;

	private AbstractButton btnBack;
	private SupportedEmulatorsPanel pnlDownloadEmulators;
	private ReadyToInstallEmulatorsPanel pnlReadyToInstallEmulators;

	private AbstractButton btnDownloadEmulators = new JCustomButtonNew("<html><strong>Step 1:</strong> Download an emulator</html>", ImageUtil.getImageIconFrom(Icons.get("fromWeb", 32, 32)));
	private AbstractButton btnReadyToInstallEmulators = new JCustomButtonNew("<html><strong>Step 2:</strong> Add your emulator</html>", ImageUtil.getImageIconFrom(Icons.get("fromComputer", 32, 32)));

	protected int minimumDividerLocation = -1;
	protected int maximumDividerLocation = -1;

	public AddEmulatorPanel() {
		super(new BorderLayout(0, 10));
		int size = ScreenSizeUtil.is3k() ? 24 : 16;
		JPanel pnlTop = new JPanel(new BorderLayout());
		btnBack = new JCustomButton("Back to overview", ImageUtil.getImageIconFrom(Icons.get("previous2", size, size)));
		pnlTop.add(btnBack, BorderLayout.WEST);
		add(pnlTop, BorderLayout.NORTH);
		pnlDownloadEmulators = new SupportedEmulatorsPanel();
		pnlReadyToInstallEmulators = new ReadyToInstallEmulatorsPanel();
		final JSplitPane spl = new JSplitPane();
		spl.setBorder(BorderFactory.createEmptyBorder());
		spl.setContinuousLayout(true);
		spl.setOrientation(JSplitPane.VERTICAL_SPLIT);
		spl.setResizeWeight(1.0d);
		spl.setTopComponent(pnlDownloadEmulators);
		spl.setBottomComponent(btnReadyToInstallEmulators);
		add(spl);

		btnDownloadEmulators.setHorizontalAlignment(SwingConstants.LEFT);
		btnDownloadEmulators.addFocusListener(UIUtil.getFocusAdapter());

		btnReadyToInstallEmulators.setHorizontalAlignment(SwingConstants.LEFT);
		btnReadyToInstallEmulators.addFocusListener(UIUtil.getFocusAdapter());

		PropertyChangeListener listener = new PropertyChangeListener() {
			@Override
			public void propertyChange(PropertyChangeEvent e) {
				int val = (int) e.getNewValue();
				if (val <= spl.getMinimumDividerLocation()) {
					if (spl.getTopComponent() == pnlDownloadEmulators) {
						minimumDividerLocation = spl.getMinimumDividerLocation();
						spl.setTopComponent(btnDownloadEmulators);
						spl.setDividerLocation(spl.getMinimumDividerLocation());
						spl.setResizeWeight(0.0d);
					}
				} else if (val >= spl.getMaximumDividerLocation()) {
					if (spl.getBottomComponent() == pnlReadyToInstallEmulators) {
						maximumDividerLocation = spl.getMaximumDividerLocation();
						spl.setBottomComponent(btnReadyToInstallEmulators);
						spl.setDividerLocation(spl.getMaximumDividerLocation());
						spl.setResizeWeight(1.0d);
					}
				} else {
					if (spl.getTopComponent() == btnDownloadEmulators) {
						spl.setTopComponent(pnlDownloadEmulators);
						spl.setResizeWeight(0.5d);
					}
					if (spl.getBottomComponent() == btnReadyToInstallEmulators) {
						spl.setBottomComponent(pnlReadyToInstallEmulators);
						spl.setResizeWeight(0.5d);
					}
				}
			}
		};
		spl.addPropertyChangeListener(JSplitPane.DIVIDER_LOCATION_PROPERTY, listener);

		btnDownloadEmulators.addActionListener(new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				spl.setTopComponent(pnlDownloadEmulators);
				spl.setBottomComponent(btnReadyToInstallEmulators);
				spl.setResizeWeight(1.0d);
			}
		});
		btnReadyToInstallEmulators.addActionListener(new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				spl.setTopComponent(btnDownloadEmulators);
				spl.setBottomComponent(pnlReadyToInstallEmulators);
				spl.setResizeWeight(0.0d);
			}
		});
	}

	public void setListModel(ListModel<Emulator> model) {
		pnlDownloadEmulators.lstSupportedEmulators.setModel(model);
	}

	public void setEmulatorListCellRenderer(EmulatorListCellRenderer l) {
		pnlDownloadEmulators.lstSupportedEmulators.setCellRenderer(l);
		pnlReadyToInstallEmulators.lstReadyToAddEmulators.setCellRenderer(l);
	}

	public void addGoBackListener(ActionListener l) {
		btnBack.addActionListener(l);
	}

	public class SupportedEmulatorsPanel extends JPanel implements ListSelectionListener {
		private static final long serialVersionUID = 1L;

		private JList<Emulator> lstSupportedEmulators = new JList<>();
		private JScrollPane spSupportedEmulators;
		private JButton btnDownloadEmulator;
		private JButton btnDownloadEmulatorAptGet;

		public SupportedEmulatorsPanel() {
			initComponents();
			createUI();
		}

		private void initComponents() {
			lstSupportedEmulators.addListSelectionListener(this);
			btnDownloadEmulator = new JCustomButton("Download emulator");
			btnDownloadEmulatorAptGet = new JCustomButton("apt-get install");
			btnDownloadEmulator.setHorizontalAlignment(SwingConstants.LEFT);
			btnDownloadEmulator.setEnabled(false);

			btnDownloadEmulatorAptGet.setHorizontalAlignment(SwingConstants.LEFT);
			btnDownloadEmulatorAptGet.setEnabled(false);

			btnDownloadEmulator.addFocusListener(new FocusAdapter() {
				@Override
				public void focusGained(FocusEvent e) {
					super.focusGained(e);
					AbstractButton source = (AbstractButton) e.getSource();
				}

				@Override
				public void focusLost(FocusEvent e) {
					super.focusLost(e);
					AbstractButton source = (AbstractButton) e.getSource();
				}
			});
			btnDownloadEmulatorAptGet.addFocusListener(new FocusAdapter() {
				@Override
				public void focusGained(FocusEvent e) {
					super.focusGained(e);
					AbstractButton source = (AbstractButton) e.getSource();
				}

				@Override
				public void focusLost(FocusEvent e) {
					super.focusLost(e);
					AbstractButton source = (AbstractButton) e.getSource();
				}
			});
			int rowHeight = ScreenSizeUtil.adjustValueToResolution(32);
			lstSupportedEmulators.setFixedCellHeight(rowHeight);
			spSupportedEmulators = new JScrollPane(lstSupportedEmulators);
		}

		private void createUI() {
			setBorder(BorderFactory.createTitledBorder("Step 1: Download an emulator"));
			setLayout(new BorderLayout());
			FormLayout layout = new FormLayout("min, $rgap, min, min, min:grow",
					"fill:default:grow, $rgap, fill:pref");
			CellConstraints cc = new CellConstraints();
			JPanel pnl = new JPanel(layout);
			pnl.setBorder(Paddings.TABBED_DIALOG);
			pnl.add(spSupportedEmulators, cc.xyw(1, 1, layout.getColumnCount()));
			pnl.add(btnDownloadEmulator, cc.xy(1, 3));
			if (ValidationUtil.isUnix()) {
				pnl.add(btnDownloadEmulatorAptGet, cc.xy(3, 3));
			}
			add(pnl);
		}

		private Emulator getSelectedEmulator() {
			return lstSupportedEmulators.getSelectedValue();
		}

		@Override
		public void valueChanged(ListSelectionEvent e) {
			if (!e.getValueIsAdjusting()) {
				e.getSource();

				int index = lstSupportedEmulators.getSelectedIndex();
				boolean b = index != -1;
				Emulator emulator = null;
				if (b) {
					emulator = lstSupportedEmulators.getSelectedValue();
				}
				btnDownloadEmulator.setEnabled(b);
				btnDownloadEmulatorAptGet.setEnabled(b);
				//			for (GameListener l : listeners) {
				//				l.gameSelected(event);
				//			}
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
			btnAddEmulator = new JCustomButton("Add emulator", ImageUtil.getImageIconFrom(Icons.get("add", 24, 24)));
			lblSearchForEmulator = new JLabel("Scan folder for emulators:");
			String userHome = System.getProperty("user.home");
			txtSearchForEmulator = new JTextField(userHome + File.separator + "Downloads");
			btnSearchForEmulator = new JCustomButton("Scan now");
			btnSearchForEmulator.setHorizontalAlignment(SwingConstants.LEFT);
			btnAddEmulator.setHorizontalAlignment(SwingConstants.RIGHT);
			btnAddEmulator.setEnabled(false);
		}

		private void createUI() {
			FormLayout layout = new FormLayout("min, $lcgap, min:grow, $rgap, min, $rgap, min",
					"fill:default:grow, $lgap, fill:default, $rgap, fill:default");
			CellConstraints cc = new CellConstraints();
			setLayout(layout);
			setBorder(Paddings.TABBED_DIALOG);
			add(spReadyToAddEmulators, cc.xyw(1, 1, layout.getColumnCount()));
			add(lblSearchForEmulator, cc.xy(1, 3));
			add(txtSearchForEmulator, cc.xyw(3, 3, 2));
			add(btnSearchForEmulator, cc.xy(7, 3));
			add(btnAddEmulator, cc.xy(7, 5));
		}

		@Override
		public void valueChanged(ListSelectionEvent e) {
			// TODO Auto-generated method stub

		}
	}

	public void addDownloadEmulatorListener(ActionListener l) {
		pnlDownloadEmulators.btnDownloadEmulator.addActionListener(l);
	}

	public void addDownloadEmulatorListener(MouseListener l) {
		pnlDownloadEmulators.lstSupportedEmulators.addMouseListener(l);
	}

	public void addSearchForEmulatorListener(ActionListener l) {
		pnlReadyToInstallEmulators.btnSearchForEmulator.addActionListener(l);
	}

	public Emulator getSelectedEmulator() {
		return pnlDownloadEmulators.getSelectedEmulator();
	}
}
