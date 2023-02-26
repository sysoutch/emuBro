package ch.sysout.emubro.controller;

import java.awt.BorderLayout;
import java.awt.Dialog.ModalityType;
import java.awt.FlowLayout;
import java.awt.Window;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.awt.event.AdjustmentEvent;
import java.awt.event.AdjustmentListener;
import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

import javax.swing.DefaultListModel;
import javax.swing.JButton;
import javax.swing.JCheckBox;
import javax.swing.JComboBox;
import javax.swing.JDialog;
import javax.swing.JLabel;
import javax.swing.JList;
import javax.swing.JOptionPane;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.SwingConstants;
import javax.swing.SwingUtilities;
import javax.swing.WindowConstants;
import javax.swing.border.TitledBorder;
import javax.swing.event.ListSelectionEvent;
import javax.swing.event.ListSelectionListener;

import com.jgoodies.forms.factories.Paddings;
import com.jgoodies.forms.layout.CellConstraints;
import com.jgoodies.forms.layout.FormLayout;
import com.jgoodies.validation.view.ValidationComponentUtils;

import ch.sysout.emubro.api.model.Game;
import ch.sysout.emubro.impl.event.BroGameRenamedEvent;
import ch.sysout.emubro.ui.JCustomButtonNew;
import ch.sysout.emubro.ui.JExtendedComboBox;
import ch.sysout.emubro.ui.JExtendedTextField;
import ch.sysout.emubro.util.MessageConstants;
import ch.sysout.ui.util.ImageUtil;
import ch.sysout.ui.util.UIUtil;
import ch.sysout.util.Icons;
import ch.sysout.util.Messages;
import ch.sysout.util.ScreenSizeUtil;

public class RenameWindow implements ActionListener {
	private JButton btnAutoSetLetterCase = new JButton(Messages.get(MessageConstants.CAPITAL_SMALL_LETTERS));
	private JLabel lblSpaces = new JLabel(Messages.get(MessageConstants.REPLACE));
	private JLabel lblBrackets = new JLabel(Messages.get(MessageConstants.REMOVE_BRACKETS));
	private JLabel lblOr = new JLabel(Messages.get(MessageConstants.OR));
	private JLabel lblOr2 = new JLabel(Messages.get(MessageConstants.OR));
	private JButton btnSpacesDots = new JButton(Messages.get(MessageConstants.DOTS));
	private JButton btnSpacesUnderlines = new JButton(Messages.get(MessageConstants.UNDERLINES));
	private JButton btnSpacesHyphens = new JButton(Messages.get(MessageConstants.HYPHENS));
	private JButton btnSpacesCamelCase = new JButton(Messages.get(MessageConstants.SPLIT_CAMEL_CASE));
	//		private JButton btnBracket1 = new JButton("(PAL), (Europe), ...");
	private JButton btnBracket1 = new JButton("(  )");
	//		private JButton btnBracket2 = new JButton("[SCES-12345], [!], ...");
	private JButton btnBracket2 = new JButton("[  ]");
	JComboBox<Object> cmbParentFolders;

	private ListSelectionListener listener;
	private ListSelectionListener listener2;
	private AdjustmentListener listener3;
	private AdjustmentListener listener4;

	{
		btnAutoSetLetterCase.addActionListener(this);
		btnSpacesDots.addActionListener(this);
		btnSpacesUnderlines.addActionListener(this);
		btnSpacesHyphens.addActionListener(this);
		btnSpacesCamelCase.addActionListener(this);
		btnBracket1.addActionListener(this);
		btnBracket2.addActionListener(this);
	}

	public RenameWindow(List<String> reverseList) {
		String lblEnterNewName = Messages.get(MessageConstants.ENTER_NEW_NAME);
		String[] arrReverseList = reverseList.toArray(new String[reverseList.size()]);
		cmbParentFolders = new JExtendedComboBox<Object>(arrReverseList);
		txtRenameFile.setEnabled(false);
		chkRenameFile.setOpaque(false);
		chkRenameFile.addActionListener(new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				txtRenameFile.setEnabled(chkRenameFile.isSelected());
				UIUtil.revalidateAndRepaint(txtRenameFile.getParent());
			}
		});
		String toolTipParentFolders = Messages.get(MessageConstants.CHOOSE_NAME_FROM_PARENT_FOLDER);
		cmbParentFolders.setToolTipText(toolTipParentFolders);
		cmbParentFolders.setEditable(true);
		FormLayout layoutWrapper = new FormLayout("pref, $ugap, pref, min:grow, min",
				"min, $rgap, min, $rgap, min, $rgap, min");
		layoutWrapper.setRowGroup(1, 3, 5, 7);
		//			layoutWrapper.setRowGroup(1, 3, 5);
		CellConstraints cc = new CellConstraints();
		JPanel pnlWrapWrapper = new JPanel(new BorderLayout());
		TitledBorder titledBorder = new TitledBorder(null, Messages.get(MessageConstants.RENAMING_OPTIONS), 0, TitledBorder.TOP);
		final JButton btn = new JButton();
		btn.setFocusPainted(false);
		btn.setContentAreaFilled(false);
		btn.setBorder(titledBorder);
		btn.add(pnlWrapWrapper);
		btn.addMouseListener(new MouseAdapter() {
			@Override
			public void mouseEntered(MouseEvent e) {
				super.mouseEntered(e);
				btn.setContentAreaFilled(true);
			}
			@Override
			public void mouseExited(MouseEvent e) {
				super.mouseExited(e);
				btn.setContentAreaFilled(false);
			}
		});
		btn.addActionListener(new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				showMoreOptions = false;
			}
		});

		JPanel pnlWrapper = new JPanel(layoutWrapper);
		pnlWrapper.addMouseListener(new MouseAdapter() {
			@Override
			public void mouseEntered(MouseEvent e) {
				super.mouseEntered(e);
				btn.setContentAreaFilled(false);
			}
			@Override
			public void mouseExited(MouseEvent e) {
				super.mouseExited(e);
				btn.setContentAreaFilled(false);
			}
		});
		//			pnlWrapper.setBackground(ValidationComponentUtils.getMandatoryBackground());
		pnlWrapper.setBorder(Paddings.TABBED_DIALOG);
		JPanel pnlBrackets = new JPanel(new FlowLayout(FlowLayout.LEFT));
		pnlBrackets.add(lblBrackets);
		pnlBrackets.add(btnBracket1);
		pnlBrackets.add(lblOr);
		pnlBrackets.add(btnBracket2);
		pnlBrackets.add(lblBracketsExample);
		pnlWrapper.add(pnlBrackets, cc.xyw(1, 1, layoutWrapper.getColumnCount()-1));

		JPanel pnlSpaces = new JPanel(new FlowLayout(FlowLayout.LEFT));
		pnlSpaces.add(lblSpaces);
		pnlSpaces.add(btnSpacesDots);
		pnlSpaces.add(new JLabel(", "));
		pnlSpaces.add(btnSpacesUnderlines);
		pnlSpaces.add(lblOr2);
		pnlSpaces.add(btnSpacesHyphens);
		pnlSpaces.add(lblWithSpaces);
		pnlWrapper.add(pnlSpaces, cc.xyw(1, 3, layoutWrapper.getColumnCount()-1));

		JPanel pnlAutoCase = new JPanel(new FlowLayout(FlowLayout.LEFT));
		JPanel pnlCamelCase = new JPanel(new FlowLayout(FlowLayout.LEFT));
		//			pnlAutoCase.setBackground(ValidationComponentUtils.getMandatoryBackground());
		//			pnlCamelCase.setBackground(ValidationComponentUtils.getMandatoryBackground());

		pnlAutoCase.add(btnAutoSetLetterCase);
		pnlCamelCase.add(btnSpacesCamelCase);
		pnlWrapper.add(pnlAutoCase, cc.xyw(1, 5, layoutWrapper.getColumnCount()));
		pnlWrapper.add(pnlCamelCase, cc.xyw(1, 7, layoutWrapper.getColumnCount()));

		pnlWrapWrapper.add(pnlWrapper);

		//			btnBracket1.setBackground(Color.RED);
		//			btnBracket2.setBackground(Color.RED);
		//			btnSpacesDots.setBackground(Color.ORANGE);
		//			btnSpacesUnderlines.setBackground(Color.ORANGE);
		pnlBrackets.setBackground(ValidationComponentUtils.getErrorBackground());
		pnlSpaces.setBackground(ValidationComponentUtils.getWarningBackground());
		//			pnlAutoCase.setBackground(ValidationComponentUtils.getMandatoryBackground());
		//			pnlCamelCase.setBackground(ValidationComponentUtils.getMandatoryBackground());

		final JButton btnMoreRenamingOptions = new JCustomButtonNew(Messages.get(MessageConstants.RENAMING_OPTIONS));
		int size = ScreenSizeUtil.is3k() ? 24 : 16;
		btnMoreRenamingOptions.setIcon(ImageUtil.getImageIconFrom(Icons.get("arrowDown", size, size)));
		btnMoreRenamingOptions.setHorizontalAlignment(SwingConstants.LEFT);
		btnMoreRenamingOptions.addFocusListener(UIUtil.getFocusAdapterKeepHoverWhenSelected());
		btnMoreRenamingOptions.addActionListener(new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent evt) {
				Window w = SwingUtilities.getWindowAncestor(btnMoreRenamingOptions);
				if (w != null) {
					showMoreOptions = true;
					w.dispose();
				}
			}
		});
		Object[] message = {
				lblEnterNewName + "\n",
				cmbParentFolders,
				toolTipParentFolders,
				"\n",
				btnMoreRenamingOptions
		};
		Object[] messageEnlarged = {
				lblEnterNewName + "\n",
				cmbParentFolders,
				toolTipParentFolders,
				"\n",
				btn/*,
			"\n",
			chkRenameFile,
			txtRenameFile*/
		};
		cmbParentFolders.addAncestorListener(new RequestFocusListener());
		cmbParentFolders.getEditor().selectAll();

		int resp = JOptionPane.CANCEL_OPTION;
		if (!showMoreOptions) {
			resp = JOptionPane.showConfirmDialog(view, message, Messages.get(MessageConstants.RENAME_GAME),
					JOptionPane.OK_CANCEL_OPTION, JOptionPane.QUESTION_MESSAGE);
			if (resp == JOptionPane.CANCEL_OPTION) {
				return;
			}
		}
		if (resp != JOptionPane.OK_OPTION) {
			if (showMoreOptions) {
				resp = JOptionPane.showConfirmDialog(view, messageEnlarged, Messages.get(MessageConstants.RENAME_GAME),
						JOptionPane.OK_CANCEL_OPTION, JOptionPane.QUESTION_MESSAGE);
			}
		}
		if (resp == JOptionPane.OK_OPTION) {
			String newName = cmbParentFolders.getEditor().getItem().toString();
			renameGameNow(game, oldName, newName);
		}
	}

	private void renameGameNow(Game game, String oldName, String newName) {
		if (!oldName.equals(newName)) {
			renameGame(game.getId(), newName);
			try {
				explorerDAO.renameGame(game.getId(), newName);
			} catch (SQLException e) {
				// TODO Auto-generated catch block
				e.printStackTrace();
			}
			renameGameListener.gameRenamed(new BroGameRenamedEvent(game, newName));
			// it makes no sense make use of the advanced renaming feature
			// when there are no other games in the list
			if (explorer.getGameCount() > 1) {
				final String oldNameDef = oldName;
				final String newNameDef = newName;
				SwingUtilities.invokeLater(new Runnable() {

					JCheckBox chkRenameFile = new JCheckBox(Messages.get(MessageConstants.RENAME_FILE_ON_DISK));
					JExtendedTextField txtRenameFile = new JExtendedTextField("");
					private JLabel lblBracketsExample = new JLabel(Messages.get(MessageConstants.BRACKETS_EXAMPLE));
					private JLabel lblWithSpaces = new JLabel(Messages.get(MessageConstants.WITH_SPACES));
					private JCheckBox chkDots = new JCheckBox(Messages.get(MessageConstants.REMOVE_DOTS));
					private JCheckBox chkUnderlines = new JCheckBox(Messages.get(MessageConstants.REMOVE_UNDERLINES));
					protected boolean showMoreOptions;

					@Override
					public void run() {
						boolean brackets1 = false;
						boolean brackets2 = false;
						boolean dots = false;
						boolean underlines = false;
						String regexBracket1 = "^(.*)\\(.*\\)(.*)$";
						String regexBracket2 = "^(.*)\\[.*\\](.*)$";
						String regexDots = "^.*(\\.+).*$";
						String regexUnderlines = "^.*(\\_+).*$";
						String tempOldName = oldNameDef;
						String source;
						List<String> bracketsList1 = new ArrayList<>();
						List<String> bracketsList2 = new ArrayList<>();

						do {
							source = getBrackets(tempOldName, '(', ')');
							if (source != null && !source.isEmpty()) {
								tempOldName = tempOldName.replace(source, "").trim();
								bracketsList1.add(source);
							}
						} while (source != null && !source.isEmpty());

						do {
							source = getBrackets(tempOldName, '[', ']');
							if (source != null && !source.isEmpty()) {
								tempOldName = tempOldName.replace(source, "").trim();
								bracketsList2.add(source);
							}
						} while (source != null && !source.isEmpty());

						if (oldNameDef.matches(regexBracket1)) {
							if (!newNameDef.matches(regexBracket1)) {
								brackets1 = true;
							} else {
								// FIXME change implementation
								//									int countOld = StringUtils.countMatches(oldNameDef, "(");
								//									int countNew = StringUtils.countMatches(newNameDef, "(");
								//									if (countOld > countNew) {
								//										brackets1 = true;
								//									}
							}
						}
						if (oldNameDef.matches(regexBracket2)) {
							if (!newNameDef.matches(regexBracket2)) {
								brackets2 = true;
							} else {
								// FIXME change implementation
								//									int countOld = StringUtils.countMatches(oldNameDef, "[");
								//									int countNew = StringUtils.countMatches(newNameDef, "[");
								//									if (countOld > countNew) {
								//										brackets2 = true;
								//									}
							}
						}
						if (oldNameDef.matches(regexDots) && !newNameDef.matches(regexDots)) {
							dots = true;
						}
						if (oldNameDef.matches(regexUnderlines) && !newNameDef.matches(regexUnderlines)) {
							underlines = true;
						}
						if (brackets1 || brackets2 || dots || underlines) {
							chkDots.setVisible(dots);
							chkUnderlines.setVisible(underlines);
							chkDots.setSelected(dots);
							chkUnderlines.setSelected(underlines);
							JCheckBox chkNeverShowThisAgain = new JCheckBox(Messages.get(MessageConstants.RENAME_WITHOUT_ASK));
							String msg = Messages.get(MessageConstants.RENAME_OTHER_GAMES)+"\n";
							List<Object> messageList = new ArrayList<>();
							messageList.add(msg);
							List<JCheckBox> dynamicCheckBoxes = new ArrayList<>();
							JCheckBox chkBrackets = new JCheckBox(Messages.get(MessageConstants.REMOVE_BRACKETS));
							chkBrackets.setSelected(true);
							messageList.add(chkBrackets);
							for (String brack : bracketsList1) {
								JCheckBox chk = new JCheckBox(brack);
								dynamicCheckBoxes.add(chk);
								chk.setSelected(true);
								messageList.add(chk);
							}
							for (String brack : bracketsList2) {
								JCheckBox chk = new JCheckBox(brack);
								dynamicCheckBoxes.add(chk);
								chk.setSelected(true);
								messageList.add(chk);
							}
							// this has been done for putting a line wrap only when the brackets checkboxes were added
							//									if (messageList.size() > 1) {
							//										if (dots || underlines) {
							//											JLabel lineWrap = new JLabel(" ");
							//											messageList.add(lineWrap);
							//										}
							//									}
							messageList.add(chkDots);
							messageList.add(chkUnderlines);
							messageList.add(new JLabel(" "));
							messageList.add(chkNeverShowThisAgain);
							Object[] stockArr = new Object[messageList.size()];
							stockArr = messageList.toArray(stockArr);
							String title = Messages.get(MessageConstants.SHOW_RENAME_GAMES_DIALOG);
							int request = JOptionPane.showConfirmDialog(view, stockArr, title, JOptionPane.YES_NO_OPTION);
							if (request == JOptionPane.YES_OPTION) {
								dots = chkDots.isSelected();
								underlines = chkUnderlines.isSelected();
								showRenameGamesDialog(dynamicCheckBoxes, dots, underlines);
							}
						}
					}
				});
			}
		}
	}

	private String getBrackets(String string, char bracketType1, char bracketType2) {
		String withoutBrackets = string.replaceAll("^.*(\\"+bracketType1+".*\\"+bracketType2+").*$", "$1");
		boolean hasBrackets = withoutBrackets.contains(""+bracketType1) && withoutBrackets.contains(""+bracketType2);
		if (hasBrackets) {
			return withoutBrackets;
		}
		return null;
	}

	protected void showRenameGamesDialog(List<JCheckBox> dynamicCheckBoxes, boolean dots, boolean underlines) {
		final JDialog dlg = new JDialog();
		dlg.setDefaultCloseOperation(WindowConstants.DISPOSE_ON_CLOSE);
		dlg.setModalityType(ModalityType.APPLICATION_MODAL);
		dlg.setTitle("Rename games");
		FormLayout layout = new FormLayout("min:grow, $rgap, min:grow",
				"fill:default, $rgap, fill:default:grow, $rgap, fill:default");
		CellConstraints cc = new CellConstraints();
		JPanel pnl = new JPanel();
		pnl.setLayout(layout);
		pnl.setBorder(Paddings.DIALOG);
		lstMatches = new JList<>();
		lstPreviews = new JList<>();
		listener = new ListSelectionListener() {

			@Override
			public void valueChanged(ListSelectionEvent e) {
				if (listener2 != null) {
					lstPreviews.removeListSelectionListener(listener2);
				}
				lstPreviews.setSelectedIndex(lstMatches.getSelectedIndex());
				if (listener2 != null) {
					lstPreviews.addListSelectionListener(listener2);
				}
				lstPreviews.repaint();
			}
		};
		listener2 = new ListSelectionListener() {

			@Override
			public void valueChanged(ListSelectionEvent e) {
				if (listener != null) {
					lstMatches.removeListSelectionListener(listener);
				}
				lstMatches.setSelectedIndex(lstPreviews.getSelectedIndex());
				if (listener != null) {
					lstMatches.addListSelectionListener(listener);
				}
				lstMatches.repaint();
			}
		};
		lstMatches.addListSelectionListener(listener);
		lstPreviews.addListSelectionListener(listener2);

		JPanel pnlOptions = new JPanel();
		FormLayout layoutWrapper = new FormLayout("pref, $ugap, pref, min:grow, min",
				"min, $rgap, min, $rgap, min, $rgap, min");
		layoutWrapper.setRowGroup(1, 3, 5, 7);
		//			layoutWrapper.setRowGroup(1, 3, 5);
		CellConstraints cc2 = new CellConstraints();
		JPanel pnlWrapWrapper = new JPanel(new BorderLayout());
		JPanel pnlWrapper = new JPanel(layoutWrapper);
		JPanel pnlBrackets = new JPanel(new FlowLayout(FlowLayout.LEFT));
		pnlBrackets.add(lblBrackets);
		pnlBrackets.add(btnBracket1);
		pnlBrackets.add(lblOr);
		pnlBrackets.add(btnBracket2);
		pnlBrackets.add(lblBracketsExample);
		pnlWrapper.add(pnlBrackets, cc2.xyw(1, 1, layoutWrapper.getColumnCount()-1));

		JPanel pnlSpaces = new JPanel(new FlowLayout(FlowLayout.LEFT));
		pnlSpaces.add(lblSpaces);
		pnlSpaces.add(btnSpacesDots);
		pnlSpaces.add(new JLabel(", "));
		pnlSpaces.add(btnSpacesUnderlines);
		pnlSpaces.add(lblOr2);
		pnlSpaces.add(btnSpacesHyphens);
		pnlSpaces.add(lblWithSpaces);
		pnlWrapper.add(pnlSpaces, cc2.xyw(1, 3, layoutWrapper.getColumnCount()-1));

		JPanel pnlAutoCase = new JPanel(new FlowLayout(FlowLayout.LEFT));
		JPanel pnlCamelCase = new JPanel(new FlowLayout(FlowLayout.LEFT));
		//			pnlAutoCase.setBackground(ValidationComponentUtils.getMandatoryBackground());
		//			pnlCamelCase.setBackground(ValidationComponentUtils.getMandatoryBackground());

		pnlAutoCase.add(btnAutoSetLetterCase);
		pnlCamelCase.add(btnSpacesCamelCase);
		pnlWrapper.add(pnlAutoCase, cc2.xyw(1, 5, layoutWrapper.getColumnCount()));
		pnlWrapper.add(pnlCamelCase, cc2.xyw(1, 7, layoutWrapper.getColumnCount()));

		pnlWrapWrapper.add(pnlWrapper);
		pnlOptions.add(pnlWrapWrapper);


		final JScrollPane spMatches = new JScrollPane(lstMatches);
		final JScrollPane spPreview = new JScrollPane(lstPreviews);
		spMatches.getVerticalScrollBar().addAdjustmentListener(new AdjustmentListener() {

			@Override
			public void adjustmentValueChanged(AdjustmentEvent e) {
				spPreview.getVerticalScrollBar().setValue(e.getValue());
			}
		});
		spPreview.getVerticalScrollBar().addAdjustmentListener(new AdjustmentListener() {

			@Override
			public void adjustmentValueChanged(AdjustmentEvent e) {
				spMatches.getVerticalScrollBar().setValue(e.getValue());
			}
		});
		listener3 = new AdjustmentListener() {

			@Override
			public void adjustmentValueChanged(AdjustmentEvent e) {
				spMatches.getHorizontalScrollBar().removeAdjustmentListener(listener4);
				spPreview.getHorizontalScrollBar().setValue(e.getValue());
				spPreview.getHorizontalScrollBar().addAdjustmentListener(listener4);
			}
		};
		spMatches.getHorizontalScrollBar().addAdjustmentListener(listener3);
		listener4 = new AdjustmentListener() {

			@Override
			public void adjustmentValueChanged(AdjustmentEvent e) {
				spMatches.getHorizontalScrollBar().removeAdjustmentListener(listener3);
				spMatches.getHorizontalScrollBar().setValue(e.getValue());
				spMatches.getHorizontalScrollBar().addAdjustmentListener(listener3);
			}
		};
		spPreview.getHorizontalScrollBar().addAdjustmentListener(listener4);
		JButton btnRenameGames = new JButton("rename now");
		btnRenameGames.addActionListener(new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				for (int i = 0; i < lstMatches.getModel().getSize(); i++) {
					Game g = lstMatches.getModel().getElementAt(i);
					String newName = lstPreviews.getModel().getElementAt(i);
					explorer.renameGame(g.getId(), newName);
					try {
						explorerDAO.renameGame(g.getId(), newName);
					} catch (SQLException e1) {
						// TODO Auto-generated catch block
						e1.printStackTrace();
					}
				}
				dlg.dispose();
			}
		});
		//			pnl.add(pnlOptions, cc.xyw(1, 1, layout.getColumnCount()));
		pnl.add(spMatches, cc.xy(1, 3));
		pnl.add(spPreview, cc.xy(3, 3));
		pnl.add(btnRenameGames, cc.xyw(1, 5, layout.getColumnCount()));
		dlg.add(pnl);
		checkForRenamingGames(dynamicCheckBoxes, dots, underlines);
		dlg.pack();
		dlg.setLocationRelativeTo(view);
		dlg.setVisible(true);
	}

	private void checkForRenamingGames(List<JCheckBox> dynamicCheckBoxes, boolean dots, boolean underlines) {
		DefaultListModel<Game> mdlLstMatches = new DefaultListModel<>();
		DefaultListModel<String> mdlLstPreviews = new DefaultListModel<>();
		for (Game g : explorer.getGames()) {
			String gameName = g.getName();
			for (JCheckBox chk : dynamicCheckBoxes) {
				if (chk.isSelected()) {
					if (g.getName().toLowerCase().contains(chk.getText().trim().replaceAll("\\s+"," ").toLowerCase())) {
						if (!mdlLstMatches.contains(g)) {
							mdlLstMatches.addElement(g);
						}
						gameName = gameName.replace(chk.getText(), "").trim().replaceAll("\\s+"," ");
					}
				}
			}
			if (dots && gameName.contains(".")) {
				if (!mdlLstMatches.contains(g)) {
					mdlLstMatches.addElement(g);
				}
				gameName = gameName.replace(".", " ").trim().replaceAll("\\s+"," ");
			}
			if (underlines && gameName.contains("_")) {
				if (!mdlLstMatches.contains(g)) {
					mdlLstMatches.addElement(g);
				}
				gameName = gameName.replace("_", " ").trim().replaceAll("\\s+"," ");
			}
			if (mdlLstMatches.contains(g)) {
				mdlLstPreviews.addElement(gameName);
			}
		}
		lstMatches.setModel(mdlLstMatches);
		lstPreviews.setModel(mdlLstPreviews);
	}

	{
		btnAutoSetLetterCase.addActionListener(this);
		btnSpacesDots.addActionListener(this);
		btnSpacesUnderlines.addActionListener(this);
		btnSpacesHyphens.addActionListener(this);
		btnSpacesCamelCase.addActionListener(this);
		btnBracket1.addActionListener(this);
		btnBracket2.addActionListener(this);
	}

	public void languageChanged() {
		txtRenameFile.languageChanged();
		btnAutoSetLetterCase = new JButton(Messages.get(MessageConstants.CAPITAL_SMALL_LETTERS));
		lblSpaces.setText(Messages.get(MessageConstants.REPLACE));
		lblBrackets.setText(Messages.get(MessageConstants.REMOVE_BRACKETS));
		lblOr.setText(Messages.get(MessageConstants.OR));
		lblOr2.setText(Messages.get(MessageConstants.OR));
		btnSpacesDots.setText(Messages.get(MessageConstants.DOTS));
		btnSpacesUnderlines.setText(Messages.get(MessageConstants.UNDERLINES));
		btnSpacesHyphens.setText(Messages.get(MessageConstants.HYPHENS));
		btnSpacesCamelCase.setText(Messages.get(MessageConstants.SPLIT_CAMEL_CASE));
		chkRenameFile.setText(Messages.get(MessageConstants.RENAME_FILE_ON_DISK));
		lblBracketsExample.setText(Messages.get(MessageConstants.BRACKETS_EXAMPLE));
		lblWithSpaces.setText(Messages.get(MessageConstants.WITH_SPACES));
		chkDots.setText(Messages.get(MessageConstants.REMOVE_DOTS));
		chkUnderlines.setText(Messages.get(MessageConstants.REMOVE_UNDERLINES));
	}

	@Override
	public void actionPerformed(ActionEvent e) {
		if (e.getSource() == btnSpacesDots) {
			String item = cmbParentFolders.getEditor().getItem().toString();
			cmbParentFolders.getEditor().setItem(removeUnnecessarySpaces(item.replace(".", " ")));
		} else if (e.getSource() == btnSpacesUnderlines) {
			String item = cmbParentFolders.getEditor().getItem().toString();
			cmbParentFolders.getEditor().setItem(removeUnnecessarySpaces(item.replace("_", " ")));
		} else if (e.getSource() == btnSpacesHyphens) {
			String item = cmbParentFolders.getEditor().getItem().toString();
			cmbParentFolders.getEditor().setItem(removeUnnecessarySpaces(item.replace("-", " ")));
		} else if (e.getSource() == btnSpacesCamelCase) {
			String item = cmbParentFolders.getEditor().getItem().toString();
			String undoCamelCase = "";
			for (String w : item.split("(?<!(^|[A-Z]))(?=[A-Z])|(?<!^)(?=[A-Z][a-z])")) {
				undoCamelCase += w + " ";
			}
			cmbParentFolders.getEditor().setItem(removeUnnecessarySpaces(undoCamelCase));
		} else if (e.getSource() == btnAutoSetLetterCase) {
			String source = cmbParentFolders.getEditor().getItem().toString();
			StringBuffer res = new StringBuffer();
			String[] strArr = source.split(" ");
			for (String str : strArr) {
				char[] stringArray = str.trim().toCharArray();
				if (stringArray.length > 0) {
					stringArray[0] = Character.toUpperCase(stringArray[0]);
					for (int i = 1; i < stringArray.length; i++) {
						stringArray[i] = Character.toLowerCase(stringArray[i]);
					}
					str = new String(stringArray);
					res.append(str).append(" ");
				}
			}
			cmbParentFolders.getEditor().setItem(res.toString().trim());
		} else if (e.getSource() == btnBracket1) {
			boolean hasBrackets = false;
			do {
				hasBrackets = removeBrackets('(',')');
			} while (hasBrackets);
		} else if (e.getSource() == btnBracket2) {
			boolean hasBrackets = false;
			do {
				hasBrackets = removeBrackets('[',']');
			} while (hasBrackets);
		} else {
			renameGame(this);
		}
	}

	private String removeUnnecessarySpaces(String item) {
		String tmp = item;
		while (tmp.contains("  ")) {
			tmp = tmp.replace("  ", " ");
		}
		return tmp;
	}

	private boolean removeBrackets(char bracketType1, char bracketType2) {
		String source = cmbParentFolders.getEditor().getItem().toString();
		String withoutBrackets = source.replaceAll("^.*(\\"+bracketType1+".*\\"+bracketType2+").*$", "$1");
		boolean hasBrackets = withoutBrackets.contains(""+bracketType1) && withoutBrackets.contains(""+bracketType2);
		if (hasBrackets) {
			cmbParentFolders.getEditor().setItem(source.replace(withoutBrackets, "").trim().replaceAll("\\s+"," "));
		}
		return hasBrackets;
	}

	{
		btnAutoSetLetterCase.addActionListener(this);
		btnSpacesDots.addActionListener(this);
		btnSpacesUnderlines.addActionListener(this);
		btnSpacesHyphens.addActionListener(this);
		btnSpacesCamelCase.addActionListener(this);
		btnBracket1.addActionListener(this);
		btnBracket2.addActionListener(this);
	}
}
