package ch.sysout.emubro.ui;

import java.awt.BorderLayout;
import java.awt.Color;
import java.awt.Component;
import java.awt.Dimension;
import java.awt.Font;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.awt.font.TextAttribute;
import java.time.LocalDateTime;
import java.time.ZonedDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.TimeUnit;

import javax.swing.BorderFactory;
import javax.swing.JButton;
import javax.swing.JComponent;
import javax.swing.JDialog;
import javax.swing.JLabel;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.JSeparator;
import javax.swing.JTabbedPane;
import javax.swing.JTable;
import javax.swing.JTextArea;
import javax.swing.JToggleButton;
import javax.swing.ListSelectionModel;
import javax.swing.SwingConstants;
import javax.swing.SwingUtilities;
import javax.swing.WindowConstants;
import javax.swing.table.DefaultTableCellRenderer;
import javax.swing.table.TableCellRenderer;
import javax.swing.table.TableColumn;
import javax.swing.table.TableColumnModel;

import org.apache.commons.io.FilenameUtils;

import com.jgoodies.forms.factories.Paddings;
import com.jgoodies.forms.layout.CellConstraints;
import com.jgoodies.forms.layout.FormLayout;
import com.jgoodies.forms.layout.RowSpec;

import ch.sysout.emubro.api.model.Emulator;
import ch.sysout.emubro.api.model.Explorer;
import ch.sysout.emubro.api.model.Game;
import ch.sysout.emubro.api.model.Platform;
import ch.sysout.emubro.impl.model.EmulatorConstants;
import ch.sysout.emubro.util.MessageConstants;
import ch.sysout.ui.util.ImageUtil;
import ch.sysout.ui.util.UIUtil;
import ch.sysout.util.Icons;
import ch.sysout.util.Messages;
import ch.sysout.util.ScreenSizeUtil;

public class GamePropertiesDialog extends JDialog {
	private static final long serialVersionUID = 1L;

	private JTabbedPane tpMain = new JTabbedPane();
	private JPanel pnlMain = new ScrollablePanel();
	private JLinkButton lnkGamePath;
	private JLabel txtGameFilename;
	private Font fontUnderline;
	private Font fontNotUnderline;
	private Map<TextAttribute, Integer> fontAttributesNotUnderlined = new HashMap<>();
	private Map<TextAttribute, Integer> fontAttributes = new HashMap<>();
	private JButton btnOk;
	private JButton btnCancel;
	private JButton btnApply;
	private JTextArea txtGameName;
	private Explorer explorer;
	private IconStore iconStore;
	private JToggleButton btnModify;
	private JComponent pnlSpEmulators;
	private JLabel lblDateAdded = new JLabel();

	private JLabel lblIcon;

	public GamePropertiesDialog(Explorer explorer) {
		super();
		this.explorer = explorer;
		iconStore = IconStore.current();
		setLayout(new BorderLayout());
		setIconImage(ImageUtil.getFlatSVGIconFrom(Icons.get("gameProperties"), 24, Color.LIGHT_GRAY).getImage());
		setDefaultCloseOperation(WindowConstants.DISPOSE_ON_CLOSE);
		setModalityType(ModalityType.APPLICATION_MODAL);
		initComponents();
		addListeners();
		createUI();
		//		setUndecorated(true);
		pack();
		setMinimumSize(getPreferredSize());
		SwingUtilities.invokeLater(new Runnable() {

			@Override
			public void run() {
				setSize(getPreferredSize());
			}
		});
	}


	public void setGames(List<Game> games) {
		List<Game> game = explorer.getCurrentGames();
		setTitle("Eigenschaften von " + game.toString());
		txtGameName.setText(game.toString());
		txtGameFilename.setText(FilenameUtils.getName(explorer.getFiles(explorer.getCurrentGames().get(0)).get(0)));
		lblDateAdded.setText(UIUtil.format(game.get(0).getDateAdded()));
		int platformId = game.get(0).getPlatformId();
		lblIcon.setIcon(iconStore.getPlatformIcon(platformId));
	}

	private void addListeners() {
		UIUtil.installEscapeCloseOperation(this);
		btnOk.addActionListener(new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				dispose();
			}
		});
		btnCancel.addActionListener(new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				dispose();
			}
		});
	}

	private void initComponents() {
		btnOk = new JCustomButton(Messages.get(MessageConstants.OK));
		btnCancel = new JCustomButton(Messages.get(MessageConstants.CANCEL));

		createMainPanel();
		FormLayout layout = new FormLayout("min:grow", "fill:min:grow");
		JPanel pnl = new JPanel();
		pnl.setOpaque(false);
		pnl.setLayout(layout);
		pnl.setMinimumSize(new Dimension(0, 0));
		CellConstraints cc = new CellConstraints();
		pnl.add(pnlMain, cc.xy(1, 1));
		JScrollPane sp = new JCustomScrollPane(pnl);
		sp.setOpaque(false);
		sp.getViewport().setOpaque(false);
		sp.setBorder(BorderFactory.createEmptyBorder());
		sp.getVerticalScrollBar().setUnitIncrement(16);
		// JScrollPane spMain = new JScrollPane(pnl);
		// spMain.setBorder(BorderFactory.createEmptyBorder());
		// spMain.getVerticalScrollBar().setUnitIncrement(16);
		tpMain.addTab(Messages.get(MessageConstants.GENERAL), sp);

		txtGameName.setEditable(false);
		final int oldPreferredHeight = txtGameName.getPreferredSize().height;
		SwingUtilities.invokeLater(new Runnable() {

			@Override
			public void run() {
				int newPreferredHeight = txtGameName.getPreferredSize().height;
				int difference = newPreferredHeight - oldPreferredHeight;
				if (difference > 0) {
					GamePropertiesDialog diss = GamePropertiesDialog.this;
					diss.setPreferredSize(new Dimension(diss.getWidth(), diss.getHeight()+difference));
				}
			}
		});
	}

	private void createUI() {
		//		getRootPane().setBorder(Paddings.TABBED_DIALOG);
		tpMain.setBorder(Paddings.TABBED_DIALOG);
		add(tpMain, BorderLayout.CENTER);
		//		tpMain.getRootPane().setOpaque(false);
		FormLayout layout = new FormLayout("24dlu:grow, $button, $rgap, $button, $rgap, $button", "$rgap, fill:pref");
		layout.setColumnGroup(2, 4, 6);
		JPanel pnlFooter = new JPanel(layout);
		pnlFooter.setOpaque(false);
		CellConstraints cc = new CellConstraints();
		pnlFooter.add(btnOk, cc.xy(2, 2));
		pnlFooter.add(btnCancel, cc.xy(4, 2));
		pnlFooter.add(btnApply = new JCustomButton(Messages.get(MessageConstants.APPLY)), cc.xy(6, 2));
		btnApply.setEnabled(false);
		layout.setColumnGroup(2, 4, 6);
		add(pnlFooter, BorderLayout.SOUTH);
	}

	private void createMainPanel() {
		final FormLayout layout = new FormLayout("default, $lcgap, default, $ugap:grow, $button, min, min",
				"fill:default, fill:default:grow, $ugap, fill:pref, $ugap, fill:pref, $rgap, fill:pref, fill:$ugap, fill:pref, $ugap,"
						+ "fill:pref, $rgap, top:pref, $ugap, fill:pref, $ugap, fill:pref, $rgap, fill:pref, $rgap, fill:pref, fill:min");
		pnlMain.setLayout(layout);
		pnlMain.setOpaque(false);
		pnlMain.setBorder(Paddings.TABBED_DIALOG);
		final CellConstraints cc = new CellConstraints();
		final Platform platform = explorer.getPlatform(explorer.getCurrentGames().get(0).getPlatformId());
		pnlMain.add(lblIcon = new JLabel(iconStore.getPlatformIcon(platform.getId())), cc.xy(1, 1));
		lblIcon.setHorizontalAlignment(SwingConstants.LEFT);
		txtGameName = new JTextArea();
		JScrollPane spGameName = new JScrollPane(txtGameName);
		spGameName.setOpaque(false);
		spGameName.getViewport().setOpaque(false);
		pnlMain.add(spGameName, cc.xywh(3, 1, layout.getColumnCount() - 2, 2));
		txtGameName.setCaretPosition(0);
		txtGameName.setLineWrap(true);
		txtGameName.setWrapStyleWord(true);
		txtGameName.setMinimumSize(new Dimension(0, 0));
		pnlMain.add(new JSeparator(), cc.xyw(1, 4, layout.getColumnCount()));
		pnlMain.add(new JLabel(Messages.get(MessageConstants.COLUMN_PLATFORM) + ":"), cc.xy(1, 6));
		pnlMain.add(new JLabel(platform.getName()), cc.xyw(3, 6, layout.getColumnCount() - 2));
		pnlMain.add(new JLabel(Messages.get(MessageConstants.RUN_WITH) + ":"), cc.xy(1, 8));

		Game game = explorer.getCurrentGames().get(0);
		boolean emulatorFromGame = game.hasEmulator();
		Emulator emulator = (emulatorFromGame) ? explorer.getEmulatorFromGame(game.getId())
				: explorer.getEmulatorFromPlatform(platform.getId());
		String emulatorName = null;
		int emulatorId;
		if (emulator != null) {
			emulatorName = emulator.getName();
			emulatorId = emulator.getId();
		} else {
			emulatorName = "";
			emulatorId = EmulatorConstants.NO_EMULATOR;
		}
		pnlMain.add(new JLabel(emulatorName), cc.xy(3, 8));
		pnlMain.add(btnModify = new JCustomToggleButton(Messages.get(MessageConstants.MODIFY)), cc.xy(5, 8));

		int rowHeight = ScreenSizeUtil.adjustValueToResolution(32);
		final EmulatorTableModel model = new EmulatorTableModel(platform.getEmulators(), emulatorId);
		final JTable tblEmulators = new JTableDoubleClickOnHeaderFix();
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
		JScrollPane spEmulators = new JCustomScrollPane(tblEmulators);
		pnlSpEmulators = new JPanel(new BorderLayout());
		pnlSpEmulators.setBorder(Paddings.DLU4);
		pnlSpEmulators.add(spEmulators);
		btnModify.addActionListener(new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				if (btnModify.isSelected()) {
					layout.setRowSpec(2, RowSpec.decode("fill:pref"));
					layout.setRowSpec(9, RowSpec.decode("fill:$ugap:grow"));
					pnlMain.add(pnlSpEmulators, cc.xyw(1, 9, layout.getColumnCount()));
					GamePropertiesDialog diss = GamePropertiesDialog.this;
					int superHeight = (int) (diss.getPreferredSize().getHeight());
					//					if (diss.getHeight() < diss.getPreferredSize().getHeight() + 128)) {
					if (diss.getHeight() < superHeight+128) {
						diss.setSize(new Dimension(diss.getWidth(), superHeight+128));
					} else {
						if (diss.getHeight() < superHeight+128) {
							diss.setSize(new Dimension(diss.getWidth(), superHeight + (128 - diss.getHeight() - superHeight)));
						}
					}
					UIUtil.revalidateAndRepaint(pnlMain);
					Game game = explorer.getCurrentGames().get(0);
					boolean emulatorFromGame = game.hasEmulator();
					for (int i = 0; i < model.getRowCount(); i++) {
						if (emulatorFromGame) {
							if (game.getDefaultEmulatorId() == model.getEmulator(i).getId()) {
								tblEmulators.setRowSelectionInterval(i, i);
								break;
							}
						} else {
							if (platform.getDefaultEmulator() == model.getEmulator(i)) {
								tblEmulators.setRowSelectionInterval(i, i);
								break;
							}
						}
					}
					tblEmulators.scrollRectToVisible(tblEmulators.getCellRect(tblEmulators.getSelectedRow(), 0, true));
				} else {
					pnlMain.remove(pnlSpEmulators);
					layout.setRowSpec(2, RowSpec.decode("fill:pref:grow"));
					layout.setRowSpec(9, RowSpec.decode("fill:$ugap"));
					GamePropertiesDialog diss = GamePropertiesDialog.this;
					int superHeight = (int) diss.getPreferredSize().getHeight();
					diss.setSize(new Dimension(diss.getWidth(), superHeight));
					UIUtil.revalidateAndRepaint(pnlMain);
				}
			}
		});
		pnlMain.add(new JSeparator(), cc.xyw(1, 10, layout.getColumnCount()));

		String name = FilenameUtils.getName(explorer.getFiles(explorer.getCurrentGames().get(0)).get(0));
		String parent = FilenameUtils.getFullPathNoEndSeparator(explorer.getFiles(explorer.getCurrentGames().get(0)).get(0));

		pnlMain.add(new JLabel(Messages.get(MessageConstants.FILE_NAME) + ":"), cc.xy(1, 12));
		pnlMain.add(txtGameFilename = new JLabel(name), cc.xyw(3, 12, layout.getColumnCount() - 2));
		pnlMain.add(new JLabel(Messages.get(MessageConstants.COLUMN_FILE_PATH) + ":"), cc.xy(1, 14	));
		pnlMain.add(lnkGamePath = new JLinkButton(parent), cc.xyw(3, 14, layout.getColumnCount() - 2));

		txtGameFilename.setMinimumSize(new Dimension(0, 0));
		lnkGamePath.setOpaque(false);
		ZonedDateTime lastPlayed = explorer.getCurrentGames().get(0).getLastPlayed();
		if (lastPlayed == null) {

		} else {
			LocalDateTime now = LocalDateTime.now();
			long seconds = TimeUnit.MILLISECONDS.toSeconds(now.getSecond() - lastPlayed.getSecond());
			long minutes = TimeUnit.MILLISECONDS.toMinutes(now.getMinute() - lastPlayed.getMinute());
			long hours = TimeUnit.MILLISECONDS.toHours(now.getHour() - lastPlayed.getHour());
			long days = TimeUnit.MILLISECONDS.toDays(now.getDayOfMonth() - lastPlayed.getDayOfMonth());

			String sPlayCount = "";
			int playCount = explorer.getCurrentGames().get(0).getPlayCount();
			switch (playCount) {
			case 0:
				sPlayCount = Messages.get(MessageConstants.NEVER_PLAYED);
				break;
			case 1:
				sPlayCount = Messages.get(MessageConstants.PLAY_COUNT3, playCount);
				break;
			default:
				sPlayCount = Messages.get(MessageConstants.PLAY_COUNT2, playCount);
			}

			String ago = "";
			if (days > 0) {
				ago = days + " " + ((days == 1) ? Messages.get(MessageConstants.DAY) : Messages.get(MessageConstants.DAYS));
			} else if (hours > 0) {
				ago = hours + " " + ((hours == 1) ? Messages.get(MessageConstants.HOUR) : Messages.get(MessageConstants.HOURS));
			} else if (minutes > 0) {
				ago = minutes + " " + ((minutes == 1) ? Messages.get(MessageConstants.MINUTE) : Messages.get(MessageConstants.MINUTES));
			} else {
				ago = ((seconds == 0) ? Messages.get(MessageConstants.JUST_NOW)
						: (seconds + " "
								+ ((seconds == 1) ? Messages.get(MessageConstants.SECOND) : Messages.get(MessageConstants.SECONDS))));
			}
			if (Locale.getDefault().equals(Locale.GERMAN)) {
				ago = "Vor " + ago;
			}
			if (Locale.getDefault().equals(Locale.ENGLISH)) {
				ago += " ago";
			}
			if (Locale.getDefault().equals(Locale.FRENCH)) {
				ago = "Avant " + ago;
			}
			pnlMain.add(new JLabel(sPlayCount), cc.xyw(3, 20, layout.getColumnCount() - 2));
			pnlMain.add(new JLabel(ago), cc.xyw(3, 22, layout.getColumnCount() - 2));
		}
		pnlMain.add(new JSeparator(), cc.xyw(1, 16, layout.getColumnCount()));
		pnlMain.add(new JLabel(Messages.get(MessageConstants.DATE_ADDED) + ":"), cc.xy(1, 18));
		pnlMain.add(lblDateAdded, cc.xyw(3, 18, layout.getColumnCount() - 2));
		pnlMain.add(new JLabel(Messages.get(MessageConstants.PLAY_COUNT) + ":"), cc.xy(1, 20));
		pnlMain.add(new JLabel(Messages.get(MessageConstants.LAST_PLAYED) + ":"), cc.xy(1, 22));

		TableColumnModel tcm = tblEmulators.getColumnModel();
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

	private void setGamePathUnderlined(boolean underlined) {
		if (fontUnderline == null) {
			fontAttributes.put(TextAttribute.UNDERLINE, TextAttribute.UNDERLINE_ON);
		}
		if (fontNotUnderline == null) {
			fontAttributesNotUnderlined.put(TextAttribute.UNDERLINE, -1);
		}
		if (underlined) {
			fontUnderline = lnkGamePath.getFont().deriveFont(fontAttributes);
			lnkGamePath.setFont(fontUnderline);
		} else {
			fontNotUnderline = lnkGamePath.getFont().deriveFont(fontAttributesNotUnderlined);
			lnkGamePath.setFont(fontNotUnderline);
		}
	}

	public void languageChanged() {
		Component comp = tpMain.getTabComponentAt(0);
		if (comp != null) {
			comp.setName(Messages.get(MessageConstants.GENERAL));
		}
	}

	public void scrollGameNameTextFieldToTop() {
		txtGameName.setCaretPosition(0);
	}
}
